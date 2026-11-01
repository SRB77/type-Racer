const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { getPassage } = require('./quotes');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint for Railway/Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Rooms storage
// roomCode -> room object
const rooms = new Map();

// Room code generator
const WORDS = ['RACE', 'FAST', 'ZOOM', 'DASH', 'LOVE', 'BOLT', 'WIND', 'FIRE', 'STAR', 'MOON', 'DUET', 'TWIN'];
function generateRoomCode() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${word}-${num}`;
}

function createPlayerObject(socketId, name, avatar) {
  return {
    id: socketId,
    name: (name || 'Racer').trim().slice(0, 15),
    avatar: avatar || '🏎️',
    ready: false,
    progress: 0,
    typedChars: 0,
    correctChars: 0,
    incorrectChars: 0,
    wpm: 0,
    rawWpm: 0,
    accuracy: 100,
    timeTaken: 0,
    finished: false,
    rank: null
  };
}

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ${socket.id}`);

  // Create a new room
  socket.on('create_room', ({ playerName, avatar, timeLimit = 30, mode = 'quote' }) => {
    const roomCode = generateRoomCode();
    const player = createPlayerObject(socket.id, playerName || 'Player 1', avatar || '🏎️');
    player.ready = true; // Host is ready by default

    const room = {
      code: roomCode,
      hostId: socket.id,
      timeLimit: parseInt(timeLimit, 10) || 30,
      mode: mode || 'quote',
      passage: '',
      status: 'waiting', // 'waiting' | 'countdown' | 'racing' | 'finished'
      players: { [socket.id]: player },
      timerInterval: null,
      ranksCount: 0,
      startTime: null
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
      return socket.emit('error_message', { message: 'Room is full (max 4 racers)!' });
    }

    if (room.status === 'racing' || room.status === 'countdown') {
      return socket.emit('error_message', { message: 'Race already in progress! Please wait for the next round.' });
    }

    const player = createPlayerObject(socket.id, playerName || `Racer ${Object.keys(room.players).length + 1}`, avatar || '🚀');

    room.players[socket.id] = player;
    socket.join(code);
    socket.roomCode = code;

    socket.emit('room_joined', {
      roomCode: code,
      isHost: room.hostId === socket.id,
      roomState: sanitizeRoomState(room)
    });

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
      p.incorrectChars = 0;
      p.wpm = 0;
      p.rawWpm = 0;
      p.accuracy = 100;
      p.timeTaken = 0;
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

        // Run server race timer
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
  socket.on('typing_progress', ({ progress, typedChars, correctChars, incorrectChars, wpm, rawWpm, accuracy }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.status !== 'racing') return;

    const player = room.players[socket.id];
    if (!player || player.finished) return;

    player.progress = Math.min(100, Math.max(0, Math.round(progress)));
    player.typedChars = typedChars || 0;
    player.correctChars = correctChars || 0;
    player.incorrectChars = incorrectChars || 0;
    player.wpm = Math.max(0, Math.round(wpm || 0));
    player.rawWpm = Math.max(0, Math.round(rawWpm || 0));
    player.accuracy = Math.round(accuracy || 100);

    // Broadcast live stats to opponents
    io.to(room.code).emit('opponent_progress', {
      playerId: socket.id,
      progress: player.progress,
      wpm: player.wpm,
      rawWpm: player.rawWpm,
      accuracy: player.accuracy,
      typedChars: player.typedChars,
      correctChars: player.correctChars
    });
  });

  // Explicit player finished event (locks in their final metrics)
  socket.on('player_finished_typing', ({ wpm, rawWpm, accuracy, correctChars, incorrectChars, totalChars, timeTaken }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.status !== 'racing') return;

    const player = room.players[socket.id];
    if (!player || player.finished) return;

    player.finished = true;
    player.progress = 100;
    player.wpm = Math.max(0, Math.round(wpm || 0));
    player.rawWpm = Math.max(0, Math.round(rawWpm || 0));
    player.accuracy = Math.round(accuracy || 100);
    player.correctChars = correctChars || 0;
    player.incorrectChars = incorrectChars || 0;
    player.typedChars = totalChars || 0;
    player.timeTaken = timeTaken || 0;

    room.ranksCount = (room.ranksCount || 0) + 1;
    player.rank = room.ranksCount;

    // Broadcast that this player finished
    io.to(room.code).emit('player_finished', {
      playerId: socket.id,
      rank: player.rank,
      wpm: player.wpm,
      rawWpm: player.rawWpm,
      accuracy: player.accuracy,
      timeTaken: player.timeTaken
    });

    // Check if all players in the room are finished
    const allFinished = Object.values(room.players).every(p => p.finished);
    if (allFinished) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      finishRace(room);
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
      p.incorrectChars = 0;
      p.wpm = 0;
      p.rawWpm = 0;
      p.accuracy = 100;
      p.timeTaken = 0;
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
      if (room.hostId === socket.id) {
        room.hostId = remainingPlayers[0];
      }
      io.to(code).emit('player_left', {
        leftPlayerId: socket.id,
        newHostId: room.hostId,
        roomState: sanitizeRoomState(room)
      });

      // If race was running and remaining players are all finished, finalize
      if (room.status === 'racing') {
        const allFinished = Object.values(room.players).every(p => p.finished);
        if (allFinished) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          finishRace(room);
        }
      }
    }
  });
});

function finishRace(room) {
  room.status = 'finished';

  const elapsedTotal = room.startTime ? Math.round((Date.now() - room.startTime) / 1000) : room.timeLimit;

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
    if (!p.timeTaken) p.timeTaken = elapsedTotal;
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

// Graceful termination for production
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => process.exit(0));
});

server.listen(PORT, () => {
  console.log(`🚀 TypeRacer Server running at http://localhost:${PORT}`);
});
