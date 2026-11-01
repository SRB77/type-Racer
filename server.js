const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { getPassage } = require('./quotes');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Rooms storage
// roomCode -> { code, hostId, timeLimit, mode, passage, status, players: { [id]: player } }
const rooms = new Map();

// Room code generator
const WORDS = ['RACE', 'FAST', 'ZOOM', 'DASH', 'LOVE', 'BOLT', 'WIND', 'FIRE', 'STAR', 'MOON', 'DUET', 'TWIN'];
function generateRoomCode() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${word}-${num}`;
}

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ${socket.id}`);

  // Create a new room
  socket.on('create_room', ({ playerName, avatar, timeLimit = 30, mode = 'quote' }) => {
    const roomCode = generateRoomCode();
    const player = {
      id: socket.id,
      name: (playerName || 'Player 1').trim().slice(0, 15),
      avatar: avatar || '🏎️',
      ready: true,
      progress: 0,
      typedChars: 0,
      correctChars: 0,
      wpm: 0,
      accuracy: 100,
      finished: false,
      rank: null
    };

    const room = {
      code: roomCode,
      hostId: socket.id,
      timeLimit: parseInt(timeLimit, 10) || 30,
      mode: mode || 'quote', // 'quote' or 'timed'
      passage: '',
      status: 'waiting', // 'waiting' | 'countdown' | 'racing' | 'finished'
      players: { [socket.id]: player },
      timerInterval: null
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.roomCode = roomCode;

    socket.emit('room_created', {
      roomCode,
      isHost: true,
      roomState: sanitizeRoomState(room)
    });

    console.log(`[Room Created] ${roomCode} by ${player.name}`);
  });

  // Join existing room
  socket.on('join_room', ({ roomCode, playerName, avatar }) => {
    const code = (roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      return socket.emit('error_message', { message: 'Room not found. Check the code!' });
    }

    if (Object.keys(room.players).length >= 4) {
      return socket.emit('error_message', { message: 'Room is currently full (max 4 racers)!' });
    }

    if (room.status === 'racing' || room.status === 'countdown') {
      return socket.emit('error_message', { message: 'Race already in progress! Please wait for next round.' });
    }

    const player = {
      id: socket.id,
      name: (playerName || `Racer ${Object.keys(room.players).length + 1}`).trim().slice(0, 15),
      avatar: avatar || '🚀',
      ready: false,
      progress: 0,
      typedChars: 0,
      correctChars: 0,
      wpm: 0,
      accuracy: 100,
      finished: false,
      rank: null
    };

    room.players[socket.id] = player;
    socket.join(code);
    socket.roomCode = code;

    socket.emit('room_joined', {
      roomCode: code,
      isHost: room.hostId === socket.id,
      roomState: sanitizeRoomState(room)
    });

    // Notify others in room
    io.to(code).emit('room_updated', sanitizeRoomState(room));
    console.log(`[Room Joined] ${code} by ${player.name}`);
  });

  // Toggle ready status
  socket.on('toggle_ready', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || !room.players[socket.id]) return;

    room.players[socket.id].ready = !room.players[socket.id].ready;
    io.to(room.code).emit('room_updated', sanitizeRoomState(room));
  });

  // Update room settings (host only)
  socket.on('update_settings', ({ timeLimit, mode }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;

    if (timeLimit !== undefined) room.timeLimit = parseInt(timeLimit, 10);
    if (mode !== undefined) room.mode = mode;

    io.to(room.code).emit('room_updated', sanitizeRoomState(room));
  });

  // Start Race (Host only)
  socket.on('start_race', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (room.status === 'countdown' || room.status === 'racing') return;

    // Reset player race stats
    Object.values(room.players).forEach(p => {
      p.progress = 0;
      p.typedChars = 0;
      p.correctChars = 0;
      p.wpm = 0;
      p.accuracy = 100;
      p.finished = false;
      p.rank = null;
    });

    room.status = 'countdown';
    room.passage = getPassage(room.mode, room.timeLimit);
    room.ranksCount = 0;

    let count = 3;
    io.to(room.code).emit('countdown_start', { count });

    const countdownTimer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        io.to(room.code).emit('countdown_tick', { count });
      } else {
        clearInterval(countdownTimer);
        room.status = 'racing';
        room.startTime = Date.now();

        io.to(room.code).emit('race_started', {
          passage: room.passage,
          duration: room.timeLimit,
          mode: room.mode,
          startTime: room.startTime,
          players: room.players
        });

        // If time-based countdown, run server ticker
        let remaining = room.timeLimit;
        if (room.timerInterval) clearInterval(room.timerInterval);

        room.timerInterval = setInterval(() => {
          remaining -= 1;
          io.to(room.code).emit('timer_tick', { remaining });

          if (remaining <= 0) {
            clearInterval(room.timerInterval);
            finishRace(room);
          }
        }, 1000);
      }
    }, 1000);
  });

  // Real-time progress update from player
  socket.on('typing_progress', ({ progress, typedChars, correctChars, wpm, accuracy }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.status !== 'racing') return;

    const player = room.players[socket.id];
    if (!player || player.finished) return;

    player.progress = Math.min(100, Math.max(0, Math.round(progress)));
    player.typedChars = typedChars;
    player.correctChars = correctChars;
    player.wpm = Math.max(0, Math.round(wpm));
    player.accuracy = Math.round(accuracy);

    // Broadcast to room
    io.to(room.code).emit('opponent_progress', {
      playerId: socket.id,
      progress: player.progress,
      wpm: player.wpm,
      accuracy: player.accuracy,
      typedChars: player.typedChars
    });

    // Check if player completed 100%
    if (player.progress >= 100 && !player.finished) {
      player.finished = true;
      room.ranksCount = (room.ranksCount || 0) + 1;
      player.rank = room.ranksCount;

      io.to(room.code).emit('player_finished', {
        playerId: socket.id,
        rank: player.rank,
        wpm: player.wpm,
        accuracy: player.accuracy
      });

      // Check if all players finished
      const allFinished = Object.values(room.players).every(p => p.finished);
      if (allFinished) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        finishRace(room);
      }
    }
  });

  // Rematch / Play Again
  socket.on('play_again', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    room.status = 'waiting';
    if (room.timerInterval) clearInterval(room.timerInterval);

    Object.values(room.players).forEach(p => {
      p.ready = false;
      p.progress = 0;
      p.typedChars = 0;
      p.correctChars = 0;
      p.wpm = 0;
      p.accuracy = 100;
      p.finished = false;
      p.rank = null;
    });

    io.to(room.code).emit('room_reset', sanitizeRoomState(room));
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ${socket.id}`);
    const code = socket.roomCode;
    if (!code) return;

    const room = rooms.get(code);
    if (!room) return;

    delete room.players[socket.id];
    const remainingPlayers = Object.keys(room.players);

    if (remainingPlayers.length === 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      rooms.delete(code);
      console.log(`[Room Deleted] ${code}`);
    } else {
      // Reassign host if host left
      if (room.hostId === socket.id) {
        room.hostId = remainingPlayers[0];
      }
      io.to(code).emit('player_left', {
        leftPlayerId: socket.id,
        newHostId: room.hostId,
        roomState: sanitizeRoomState(room)
      });
    }
  });
});

function finishRace(room) {
  room.status = 'finished';

  // Sort and assign ranks to unfinished players based on progress & wpm
  const sorted = Object.values(room.players).sort((a, b) => {
    if (a.rank && b.rank) return a.rank - b.rank;
    if (a.rank) return -1;
    if (b.rank) return 1;
    if (b.progress !== a.progress) return b.progress - a.progress;
    return b.wpm - a.wpm;
  });

  sorted.forEach((p, idx) => {
    if (!p.rank) p.rank = idx + 1;
  });

  io.to(room.code).emit('race_finished', {
    results: sorted,
    roomState: sanitizeRoomState(room)
  });
}

function sanitizeRoomState(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    timeLimit: room.timeLimit,
    mode: room.mode,
    status: room.status,
    players: room.players
  };
}

server.listen(PORT, () => {
  console.log(`🚀 TypeRacer Server running at http://localhost:${PORT}`);
});
