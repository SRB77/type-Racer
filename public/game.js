// TypeRacer Multiplayer Client Engine

const socket = io();

// State
let currentUser = {
  name: localStorage.getItem('typeracer_name') || '',
  avatar: localStorage.getItem('typeracer_avatar') || '🏎️'
};

let currentRoom = null;
let isHost = false;
let isSolo = false;

// Typing Game State
let passageText = "";
let currentIndex = 0;
let userInputs = []; // array of { char, status: 'correct'|'incorrect' }
let startTime = null;
let totalTypedCount = 0;
let correctTypedCount = 0;
let isRacing = false;
let raceInterval = null;
let soloTimer = null;

// DOM Elements
const soundToggleBtn = document.getElementById('sound-toggle');
const connectionStatus = document.getElementById('connection-status');
const setupScreen = document.getElementById('setup-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const raceScreen = document.getElementById('race-screen');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');
const resultsModal = document.getElementById('results-modal');
const toastEl = document.getElementById('toast');

// Inputs
const playerNameInput = document.getElementById('player-name-input');
const avatarGrid = document.getElementById('avatar-selector');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const joinCodeInput = document.getElementById('join-code-input');
const soloPracticeBtn = document.getElementById('solo-practice-btn');

// Lobby Elements
const roomCodeDisplay = document.getElementById('room-code-display');
const copyLinkBtn = document.getElementById('copy-link-btn');
const hostSettings = document.getElementById('host-settings');
const racersLobbyList = document.getElementById('racers-lobby-list');
const toggleReadyBtn = document.getElementById('toggle-ready-btn');
const startRaceBtn = document.getElementById('start-race-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');

// Race Elements
const raceTracks = document.getElementById('race-tracks');
const raceTimer = document.getElementById('race-timer');
const liveWpm = document.getElementById('live-wpm');
const liveAcc = document.getElementById('live-acc');
const liveChars = document.getElementById('live-chars');
const wordsContainer = document.getElementById('words-container');
const wordsDisplay = document.getElementById('words-display');
const caret = document.getElementById('caret');
const hiddenInput = document.getElementById('hidden-input');

// Results Elements
const resultsTrophy = document.getElementById('results-trophy');
const resultsTitle = document.getElementById('results-title');
const resultsTbody = document.getElementById('results-tbody');
const resultsAgainBtn = document.getElementById('results-again-btn');
const resultsLobbyBtn = document.getElementById('results-lobby-btn');

// Initialize UI
if (currentUser.name) {
  playerNameInput.value = currentUser.name;
} else {
  const randomNum = Math.floor(100 + Math.random() * 900);
  playerNameInput.value = `Racer_${randomNum}`;
  currentUser.name = playerNameInput.value;
}

// Select saved avatar
document.querySelectorAll('.avatar-opt').forEach(opt => {
  if (opt.dataset.avatar === currentUser.avatar) {
    opt.classList.add('selected');
  } else {
    opt.classList.remove('selected');
  }
  opt.addEventListener('click', () => {
    document.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    currentUser.avatar = opt.dataset.avatar;
    localStorage.setItem('typeracer_avatar', currentUser.avatar);
  });
});

playerNameInput.addEventListener('input', (e) => {
  currentUser.name = e.target.value.trim();
  localStorage.setItem('typeracer_name', currentUser.name);
});

// Sound Toggle
soundToggleBtn.addEventListener('click', () => {
  const enabled = window.soundController.toggle();
  soundToggleBtn.textContent = enabled ? '🔊' : '🔇';
  showToast(enabled ? 'Sound turned ON' : 'Sound muted');
});
soundToggleBtn.textContent = window.soundController.enabled ? '🔊' : '🔇';

// Check URL query parameters for invite link
const urlParams = new URLSearchParams(window.location.search);
const inviteCode = urlParams.get('room');
if (inviteCode) {
  joinCodeInput.value = inviteCode.toUpperCase();
}

// Toast helper
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// Socket Connection Status
socket.on('connect', () => {
  connectionStatus.textContent = '🟢 Online';
  connectionStatus.style.color = '#4ade80';
});

socket.on('disconnect', () => {
  connectionStatus.textContent = '🔴 Offline';
  connectionStatus.style.color = '#f87171';
});

socket.on('error_message', ({ message }) => {
  alert(message);
});

// ==========================================
// 1. LOBBY & ROOM ACTIONS
// ==========================================

createRoomBtn.addEventListener('click', () => {
  window.soundController.init();
  isSolo = false;
  socket.emit('create_room', {
    playerName: currentUser.name,
    avatar: currentUser.avatar,
    timeLimit: 30,
    mode: 'quote'
  });
});

joinRoomBtn.addEventListener('click', () => {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (!code) {
    alert('Please enter a room code!');
    return;
  }
  window.soundController.init();
  isSolo = false;
  socket.emit('join_room', {
    roomCode: code,
    playerName: currentUser.name,
    avatar: currentUser.avatar
  });
});

soloPracticeBtn.addEventListener('click', () => {
  window.soundController.init();
  isSolo = true;
  startSoloRace();
});

copyLinkBtn.addEventListener('click', () => {
  if (!currentRoom) return;
  const inviteUrl = `${window.location.origin}?room=${currentRoom.code}`;
  navigator.clipboard.writeText(inviteUrl).then(() => {
    showToast('📋 Invite link copied! Send it to her 💕');
  }).catch(() => {
    showToast(`Room Code: ${currentRoom.code}`);
  });
});

toggleReadyBtn.addEventListener('click', () => {
  socket.emit('toggle_ready');
});

startRaceBtn.addEventListener('click', () => {
  socket.emit('start_race');
});

leaveRoomBtn.addEventListener('click', () => {
  location.reload();
});

// Host settings listener
document.querySelectorAll('#host-settings .config-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!isHost) return;

    if (btn.dataset.time) {
      document.querySelectorAll('#host-settings [data-time]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      socket.emit('update_settings', { timeLimit: parseInt(btn.dataset.time, 10) });
    } else if (btn.dataset.mode) {
      document.querySelectorAll('#host-settings [data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      socket.emit('update_settings', { mode: btn.dataset.mode });
    }
  });
});

// ==========================================
// 2. SOCKET EVENT HANDLERS
// ==========================================

socket.on('room_created', ({ roomCode, isHost: hostStatus, roomState }) => {
  currentRoom = roomState;
  isHost = hostStatus;
  setupScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
  updateLobbyUI(roomState);
});

socket.on('room_joined', ({ roomCode, isHost: hostStatus, roomState }) => {
  currentRoom = roomState;
  isHost = hostStatus;
  setupScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
  updateLobbyUI(roomState);
});

socket.on('room_updated', (roomState) => {
  currentRoom = roomState;
  isHost = roomState.hostId === socket.id;
  updateLobbyUI(roomState);
});

socket.on('countdown_start', ({ count }) => {
  lobbyScreen.classList.add('hidden');
  resultsModal.classList.add('hidden');
  countdownOverlay.classList.remove('hidden');
  countdownNumber.textContent = count;
  window.soundController.playTick();
});

socket.on('countdown_tick', ({ count }) => {
  countdownNumber.textContent = count;
  // Trigger animation replay
  countdownNumber.style.animation = 'none';
  void countdownNumber.offsetHeight;
  countdownNumber.style.animation = 'popScale 0.6s ease-out';
  window.soundController.playTick();
});

socket.on('race_started', ({ passage, duration, players }) => {
  countdownOverlay.classList.add('hidden');
  raceScreen.classList.remove('hidden');
  window.soundController.playGo();

  setupRace(passage, duration, players);
});

socket.on('timer_tick', ({ remaining }) => {
  raceTimer.textContent = remaining;
  if (remaining <= 5) {
    raceTimer.style.color = 'var(--error-color)';
    window.soundController.playTick();
  } else {
    raceTimer.style.color = 'var(--main-color)';
  }
});

socket.on('opponent_progress', ({ playerId, progress, wpm, accuracy }) => {
  updateRacerTrack(playerId, progress, wpm, accuracy);
});

socket.on('player_finished', ({ playerId, rank }) => {
  const track = document.getElementById(`track-${playerId}`);
  if (track) {
    const badge = track.querySelector('.track-rank-badge');
    if (badge) {
      badge.textContent = rank === 1 ? '🥇 1st' : rank === 2 ? '🥈 2nd' : `#${rank}`;
      badge.classList.remove('hidden');
    }
  }
});

socket.on('race_finished', ({ results }) => {
  finishRace(results);
});

socket.on('room_reset', (roomState) => {
  currentRoom = roomState;
  resultsModal.classList.add('hidden');
  raceScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
  updateLobbyUI(roomState);
});

socket.on('player_left', ({ leftPlayerId, newHostId, roomState }) => {
  currentRoom = roomState;
  isHost = newHostId === socket.id;
  updateLobbyUI(roomState);
  showToast('A racer left the room');
});

// ==========================================
// 3. LOBBY UI LOGIC
// ==========================================

function updateLobbyUI(room) {
  roomCodeDisplay.textContent = room.code;

  // Update Settings Pills
  document.querySelectorAll('#host-settings [data-time]').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.time, 10) === room.timeLimit);
    b.style.pointerEvents = isHost ? 'auto' : 'none';
  });
  document.querySelectorAll('#host-settings [data-mode]').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === room.mode);
    b.style.pointerEvents = isHost ? 'auto' : 'none';
  });

  // Host buttons
  if (isHost) {
    startRaceBtn.classList.remove('hidden');
    toggleReadyBtn.classList.add('hidden');
  } else {
    startRaceBtn.classList.add('hidden');
    toggleReadyBtn.classList.remove('hidden');
  }

  // Render Racers List
  racersLobbyList.innerHTML = '';
  const players = Object.values(room.players);

  players.forEach(p => {
    const isMe = p.id === socket.id;
    const isRoomHost = p.id === room.hostId;

    const row = document.createElement('div');
    row.className = 'flex justify-between items-center';
    row.style.background = 'var(--bg-color)';
    row.style.padding = '0.75rem 1rem';
    row.style.borderRadius = '8px';
    row.style.border = isMe ? '1px solid var(--main-color)' : '1px solid var(--border-color)';

    row.innerHTML = `
      <div class="flex items-center gap-2">
        <span style="font-size: 1.5rem;">${p.avatar}</span>
        <span style="font-weight: 600;">${p.name} ${isMe ? '(You)' : ''}</span>
        ${isRoomHost ? '<span class="badge-tag" style="font-size: 0.75rem;">HOST 👑</span>' : ''}
      </div>
      <div>
        <span class="badge-tag" style="${p.ready || isRoomHost ? 'color: #4ade80; border-color: #4ade80;' : 'color: var(--sub-color);'}">
          ${isRoomHost ? 'READY' : p.ready ? 'READY 👍' : 'WAITING...'}
        </span>
      </div>
    `;
    racersLobbyList.appendChild(row);
  });
}

// ==========================================
// 4. RACING & TYPING ENGINE
// ==========================================

function setupRace(passage, duration, players) {
  passageText = passage;
  currentIndex = 0;
  userInputs = [];
  startTime = Date.now();
  totalTypedCount = 0;
  correctTypedCount = 0;
  isRacing = true;

  raceTimer.textContent = duration;
  raceTimer.style.color = 'var(--main-color)';
  liveWpm.textContent = '0';
  liveAcc.textContent = '100%';
  liveChars.textContent = '0';

  // Render Racers Tracks
  raceTracks.innerHTML = '';
  Object.values(players).forEach(p => {
    const isMe = p.id === socket.id;
    const track = document.createElement('div');
    track.className = 'track-card';
    track.id = `track-${p.id}`;
    track.innerHTML = `
      <div class="track-info">
        <div class="track-player-name">
          <span>${p.avatar}</span>
          <span>${p.name} ${isMe ? '(You)' : ''}</span>
          <span class="track-rank-badge badge-tag hidden" style="font-size: 0.75rem; margin-left: 0.5rem;"></span>
        </div>
        <div class="track-stats">
          <span>WPM: <strong class="track-wpm">0</strong></span>
          <span>ACC: <strong class="track-acc">100%</strong></span>
        </div>
      </div>
      <div class="track-rail">
        <div class="track-progress-fill"></div>
        <div class="track-runner" style="left: 0%;">${p.avatar}</div>
        <span class="track-finish-flag">🏁</span>
      </div>
    `;
    raceTracks.appendChild(track);
  });

  // Render Passage text into character spans
  renderPassageText();

  // Focus hidden input
  hiddenInput.value = '';
  hiddenInput.focus();
  updateCaretPosition();
}

function renderPassageText() {
  wordsDisplay.innerHTML = '';
  const words = passageText.split(' ');

  let globalCharIdx = 0;
  words.forEach((word, wordIdx) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word';
    wordSpan.style.display = 'inline-block';
    wordSpan.style.marginRight = '0.55em';

    for (let i = 0; i < word.length; i++) {
      const letterSpan = document.createElement('span');
      letterSpan.className = 'letter';
      letterSpan.id = `char-${globalCharIdx}`;
      letterSpan.textContent = word[i];
      wordSpan.appendChild(letterSpan);
      globalCharIdx++;
    }

    // Space after word (except last word)
    if (wordIdx < words.length - 1) {
      const spaceSpan = document.createElement('span');
      spaceSpan.className = 'letter';
      spaceSpan.id = `char-${globalCharIdx}`;
      spaceSpan.textContent = ' ';
      wordSpan.appendChild(spaceSpan);
      globalCharIdx++;
    }

    wordsDisplay.appendChild(wordSpan);
  });
}

function updateCaretPosition() {
  const targetChar = document.getElementById(`char-${currentIndex}`);
  if (targetChar) {
    const rect = targetChar.getBoundingClientRect();
    const containerRect = wordsContainer.getBoundingClientRect();

    caret.style.left = `${rect.left - containerRect.left}px`;
    caret.style.top = `${rect.top - containerRect.top}px`;
    caret.style.height = `${rect.height}px`;
  } else if (currentIndex >= passageText.length) {
    // Caret at the end
    const lastChar = document.getElementById(`char-${passageText.length - 1}`);
    if (lastChar) {
      const rect = lastChar.getBoundingClientRect();
      const containerRect = wordsContainer.getBoundingClientRect();
      caret.style.left = `${rect.right - containerRect.left}px`;
      caret.style.top = `${rect.top - containerRect.top}px`;
      caret.style.height = `${rect.height}px`;
    }
  }
}

// Ensure clicking container focuses hidden input
wordsContainer.addEventListener('click', () => {
  hiddenInput.focus();
});
document.addEventListener('keydown', (e) => {
  if (isRacing && document.activeElement !== hiddenInput) {
    hiddenInput.focus();
  }
});

// Keystroke handler
hiddenInput.addEventListener('keydown', (e) => {
  if (!isRacing) return;

  // Ignore navigation/meta keys
  if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'Tab') {
    return;
  }

  const expectedChar = passageText[currentIndex];

  if (e.key === 'Backspace') {
    if (currentIndex > 0) {
      currentIndex--;
      const charEl = document.getElementById(`char-${currentIndex}`);
      if (charEl) {
        charEl.className = 'letter';
      }
      userInputs.pop();
      updateStats();
      updateCaretPosition();
      sendProgressUpdate();
    }
    return;
  }

  if (e.key.length === 1) {
    e.preventDefault();
    totalTypedCount++;

    const isCorrect = (e.key === expectedChar);
    if (isCorrect) {
      correctTypedCount++;
      window.soundController.playKeypress();
    } else {
      window.soundController.playError();
    }

    const charEl = document.getElementById(`char-${currentIndex}`);
    if (charEl) {
      charEl.className = `letter ${isCorrect ? 'correct' : 'incorrect'}`;
    }

    userInputs.push({ char: e.key, correct: isCorrect });
    currentIndex++;

    updateStats();
    updateCaretPosition();
    sendProgressUpdate();

    // Check if finished passage
    if (currentIndex >= passageText.length) {
      if (isSolo) {
        finishSoloRace();
      }
    }
  }
});

function updateStats() {
  const elapsedMinutes = Math.max(0.01, (Date.now() - startTime) / 60000);
  const wpm = Math.round((correctTypedCount / 5) / elapsedMinutes);
  const accuracy = totalTypedCount > 0 ? Math.round((correctTypedCount / totalTypedCount) * 100) : 100;

  liveWpm.textContent = wpm;
  liveAcc.textContent = `${accuracy}%`;
  liveChars.textContent = `${correctTypedCount}/${totalTypedCount}`;

  // Update own track
  const myProgress = Math.round((currentIndex / passageText.length) * 100);
  updateRacerTrack(socket.id || 'solo', myProgress, wpm, accuracy);
}

function updateRacerTrack(playerId, progress, wpm, accuracy) {
  const track = document.getElementById(`track-${playerId}`);
  if (!track) return;

  const boundedProgress = Math.min(100, Math.max(0, progress));
  const runner = track.querySelector('.track-runner');
  const fill = track.querySelector('.track-progress-fill');
  const wpmEl = track.querySelector('.track-wpm');
  const accEl = track.querySelector('.track-acc');

  if (runner) runner.style.left = `${boundedProgress}%`;
  if (fill) fill.style.width = `${boundedProgress}%`;
  if (wpmEl) wpmEl.textContent = wpm;
  if (accEl) accEl.textContent = `${accuracy}%`;
}

function sendProgressUpdate() {
  if (isSolo) return;
  const elapsedMinutes = Math.max(0.01, (Date.now() - startTime) / 60000);
  const wpm = Math.round((correctTypedCount / 5) / elapsedMinutes);
  const accuracy = totalTypedCount > 0 ? Math.round((correctTypedCount / totalTypedCount) * 100) : 100;
  const progress = (currentIndex / passageText.length) * 100;

  socket.emit('typing_progress', {
    progress,
    typedChars: totalTypedCount,
    correctChars: correctTypedCount,
    wpm,
    accuracy
  });
}

// ==========================================
// 5. FINISH & RESULTS MODAL
// ==========================================

function finishRace(results) {
  isRacing = false;
  resultsModal.classList.remove('hidden');

  const myResult = results.find(r => r.id === socket.id);
  const isWinner = myResult && myResult.rank === 1;

  if (isWinner) {
    resultsTrophy.textContent = '🏆';
    resultsTitle.textContent = 'Victory! You Won!';
    resultsSubtitle.textContent = 'Speedy fingers! Confetti for the champion 🎉';
    window.soundController.playVictory();
    // Confetti explosion
    if (window.confetti) {
      window.confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  } else {
    resultsTrophy.textContent = '🥈';
    resultsTitle.textContent = 'Race Finished!';
    resultsSubtitle.textContent = 'Great match! So close!';
  }

  // Populate results table
  resultsTbody.innerHTML = '';
  results.forEach(r => {
    const isMe = r.id === socket.id;
    const tr = document.createElement('tr');
    tr.style.fontWeight = isMe ? '700' : 'normal';
    tr.innerHTML = `
      <td>${r.rank === 1 ? '🥇 1st' : r.rank === 2 ? '🥈 2nd' : `#${r.rank}`}</td>
      <td>${r.avatar} ${r.name} ${isMe ? '(You)' : ''}</td>
      <td class="text-gold" style="font-weight: 700;">${r.wpm}</td>
      <td>${r.accuracy}%</td>
      <td>${r.correctChars || 0}</td>
    `;
    resultsTbody.appendChild(tr);
  });
}

resultsAgainBtn.addEventListener('click', () => {
  if (isSolo) {
    resultsModal.classList.add('hidden');
    startSoloRace();
  } else {
    socket.emit('play_again');
  }
});

resultsLobbyBtn.addEventListener('click', () => {
  if (isSolo) {
    location.reload();
  } else {
    socket.emit('play_again');
  }
});

// ==========================================
// 6. SOLO PRACTICE MODE LOGIC
// ==========================================

const SOLO_QUOTES = [
  "You do not find the happy life. You make it with every step you take.",
  "In all the world, there is no heart for me like yours. In all the world, there is no love for you like mine.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts in every race.",
  "You are my favorite notification, my easiest hello, and my hardest goodbye.",
  "The quick brown fox jumps over the lazy dog while dreaming of endless adventures under the starlit sky."
];

function startSoloRace() {
  setupScreen.classList.add('hidden');
  lobbyScreen.classList.add('hidden');
  resultsModal.classList.add('hidden');
  countdownOverlay.classList.remove('hidden');

  let count = 3;
  countdownNumber.textContent = count;
  window.soundController.playTick();

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      countdownNumber.textContent = count;
      window.soundController.playTick();
    } else {
      clearInterval(timer);
      countdownOverlay.classList.add('hidden');
      raceScreen.classList.remove('hidden');
      window.soundController.playGo();

      const quote = SOLO_QUOTES[Math.floor(Math.random() * SOLO_QUOTES.length)];
      const soloPlayers = {
        'solo': {
          id: 'solo',
          name: currentUser.name || 'You',
          avatar: currentUser.avatar,
          wpm: 0,
          accuracy: 100
        }
      };

      setupRace(quote, 30, soloPlayers);

      let remaining = 30;
      if (soloTimer) clearInterval(soloTimer);
      soloTimer = setInterval(() => {
        remaining--;
        raceTimer.textContent = remaining;
        if (remaining <= 0) {
          clearInterval(soloTimer);
          finishSoloRace();
        }
      }, 1000);
    }
  }, 1000);
}

function finishSoloRace() {
  if (soloTimer) clearInterval(soloTimer);
  const elapsedMinutes = Math.max(0.01, (Date.now() - startTime) / 60000);
  const wpm = Math.round((correctTypedCount / 5) / elapsedMinutes);
  const accuracy = totalTypedCount > 0 ? Math.round((correctTypedCount / totalTypedCount) * 100) : 100;

  finishRace([{
    id: 'solo',
    name: currentUser.name || 'You',
    avatar: currentUser.avatar,
    rank: 1,
    wpm,
    accuracy,
    correctChars: correctTypedCount
  }]);
}
