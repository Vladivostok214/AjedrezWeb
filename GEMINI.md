# ♟️ AjedrezWeb - Noir-Tech Chess Platform

A high-performance, ultra-lightweight 1v1 online chess platform designed with a *Noir-Tech* aesthetic. It supports real-time play, synchronized chess clocks, algebraic move history, integrated chat, and an offline AI training mode.

## 🚀 Architecture & Tech Stack

- **Frontend**: React 19 (TypeScript), Vite, Tailwind CSS v4.
- **Game Engine**: `chess.js` (logic) + `react-chessboard` v5 (UI).
- **Communication**: Native Node.js WebSockets (`ws`) with a custom `SocketContext` provider and heartbeat mechanism.
- **State Management**: Orchestrator pattern in `RoomPage` separating game logic (`useChessGame`) from network transport.
- **Real-time Synchronization**: Latency-compensated clocks and mutual agreement protocols for rematches and draws.

## 🛠️ Commands & Development

### Frontend (Root Directory)
- `npm run dev`: Starts the Vite development server (default: `http://localhost:5173`).
- `npm run build`: Compiles the project using `tsc` and `vite build`.
- `npm run lint`: Performs static analysis using ESLint.
- `npm run preview`: Previews the production build locally.

### Backend (Signaling Server)
- `cd server && npm start`: Starts the Node.js signaling server (default: `port 3001`).
- `cd server && npm run build`: Mock build script for PaaS compatibility.

## 🎨 Development Conventions

### Aesthetic & UI (Noir-Tech)
- **Visuals**: Dark mode by default, utilizing `accent-violet` and `accent-cyan` gradients.
- **Responsiveness**: Mobile-first design. Use "Drawers" for History and Chat on small screens.
- **Transitions**: Smooth transitions and "glow" effects (Glassmorphism) using Tailwind CSS v4 filters and opacity loops.

### Architectural Patterns
- **Custom Hooks**: All chess logic must reside in `useChessGame.ts`. UI components should be pure and driven by this hook's state.
- **Socket Communication**: Use `registerHandler` and `sendMessage` from `useSocket`. Avoid direct WebSocket manipulation in components.
- **Error Handling**: Implement graceful degradation for network loss (automatic reconnection every 3s).

### Deployment
- **Frontend**: Optimized for Vercel (see `vercel.json`).
- **Backend**: Designed for persistent PaaS (Render, Railway, Fly.io) with `/health` check support.
- **Env Vars**: Use `VITE_SIGNALING_URL` to point the client to the production backend.

## 📌 Roadmap & TODOs
- [ ] Implement move sounds and haptic feedback.
- [ ] Add support for "En Passant" and "Castling" notifications in the floating UI.
- [ ] Persistence of player stats via LocalStorage or simple DB.
