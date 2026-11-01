# 🏎️ TypeRacer Multiplayer

A sleek, real-time 1v1 typing race game inspired by Monkeytype's dark aesthetic and TypeRacer's competitive multiplayer fun.

Built for playing head-to-head with someone special across the internet! 💕

---

## 🚀 Features

- **Authentic Monkeytype Aesthetic**: JetBrains Mono typography, charcoal dark mode, smooth golden caret, color-coded feedback (correct, mistake, untyped).
- **Real-Time 1v1 Multiplayer**:
  - Live opponent race tracks: see your opponent's avatar slide forward and their live WPM update as they type.
  - Synchronized 3.. 2.. 1.. GO! countdown.
  - 1-click **"📋 Copy Invite Link"** button to text/DM directly to your partner.
- **Audio Synthesizer (Zero Audio Files)**:
  - Built-in Web Audio API mechanical switch clicks, countdown beeps, and victory chimes (with mute toggle).
- **Game Modes**:
  - 15s, 30s, or 60s Time Trials.
  - Quotes Mode (sweet, thoughtful, and classic phrases).
  - Words Mode (common English words).
  - Solo Practice Mode when you want to warm up alone.
- **Podium & Celebration**:
  - Winner announcement with confetti explosion 🎉
  - Full match stats breakdown (WPM, Accuracy, Characters).
  - Instant rematch button.

---

## ⚡ Instant Play Across the Internet (No Cloud Deploy Needed!)

If you want to play together **right this second**:

1. Make sure the server is running:
   ```bash
   npm start
   ```
2. In a second terminal window, run a free tunnel:
   ```bash
   npx localtunnel --port 3000
   ```
3. Copy the URL it gives you (e.g. `https://xxxx.loca.lt`) and send it to your partner. You are both connected instantly!

---

## 🌐 Permanent Cloud Hosting (Railway / Render)

Since this app uses persistent WebSockets (`socket.io`), it runs as a unified full-stack Node.js app:

### Deploy to Railway (Recommended)
1. Push this project to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit of TypeRacer multiplayer"
   git remote add origin https://github.com/<your-username>/typeracergame.git
   git push -u origin main
   ```
2. Go to [railway.app](https://railway.app) and click **"New Project"** -> **"Deploy from GitHub repo"**.
3. Select your repository. Railway automatically detects `npm start` and deploys it in ~30 seconds.
4. Go to **Settings** -> **Generate Domain** to get your public HTTPS link (e.g. `https://typeracer.up.railway.app`)!

### Deploy to Render
1. Push to GitHub.
2. Go to [render.com](https://render.com) -> **New Web Service**.
3. Connect repo, set **Build Command** to `npm install`, and **Start Command** to `npm start`.
4. Done!

---

## 🛠️ Local Development

```bash
npm install
npm run dev   # or npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
