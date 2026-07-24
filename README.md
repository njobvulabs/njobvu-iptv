# Njobvu IPTV

Njobvu IPTV is a modern, high-performance IPTV streaming application built with React, Vite, TypeScript, and Tailwind CSS. It delivers a seamless, feature-packed television streaming experience across desktop, mobile, and smart TV browsers.

---

## 🚀 Key Features

### 📡 Playlist & M3U Management
- **Custom Playlists:** Add custom M3U/M3U8 URLs, upload local `.m3u` files, or connect using **Xtream Codes** login credentials.
- **Multi-Source Bundling:** Automatically aggregates default sources with user custom playlists.
- **CORS Proxy Integration:** Toggle custom CORS proxies to bypass restrictive media servers.

### 📺 Electronic Program Guide (EPG)
- **Live Program Schedules:** View current and upcoming show titles, program progress bars, and descriptions.
- **TV Guide Modal:** Browse EPG schedules across all channels with quick search and channel filters.

### 🎮 Smart TV Remote & Keyboard Navigation
- **Direct Channel Jump:** Type numbers (e.g. `102`) to jump directly to a channel.
- **Keyboard Shortcuts:**
  - `Space` / `K` - Play / Pause
  - `Up` / `Down` - Previous / Next Channel
  - `Left` / `Right` - Volume Adjust
  - `M` - Toggle Mute
  - `F` - Fullscreen Mode
  - `A` - Cycle Aspect Ratio
  - `S` - Sleep Timer
  - `I` - Stream Info & Metrics
  - `C` / `L` - Channel List Drawer

### 🎬 Advanced HLS Media Player
- **Quality Switching:** Auto-adaptive or manual resolution picker (144p up to 4K).
- **Aspect Ratio Controls:** Toggle between `Fit`, `Fill/Crop`, `16:9`, `4:3`, and `Stretch`.
- **Multi-Track Audio & Subtitles:** Select available multi-language audio streams and closed captions.
- **Stream Health & Metrics Overlay:** Monitor real-time Bitrate (Kbps), Bandwidth (Mbps), Buffer Health, and Latency.
- **Sleep Timer:** Auto-stop playback with 15m, 30m, 1h, or 2h timers.

### 🔒 Parental Controls & Security
- **4-Digit PIN Protection:** Lock sensitive categories or specific channels behind a secure PIN.
- **Category Locking:** Block access to adult or custom categories across the app.

### 📁 Custom Folders & Organization
- **User Folders:** Group favorite channels into custom folders (e.g. *Weekend Sports*, *Late Night Movies*).
- **Global Search:** Instant real-time search across all channels, categories, and M3U playlists.
- **Channel Sorting:** Sort channels Alphabetically, by Most Watched, or by Group.

### 📱 Progressive Web App (PWA)
- **Standalone Installation:** Installable on Android, iOS, Windows, and macOS as a standalone desktop/mobile app.
- **Fast Startup:** Local caching for near-instant cold startup.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS 4
- **Streaming Engine:** HLS.js
- **Icons:** Lucide React
- **Routing:** React Router DOM 7
- **Storage:** Web LocalStorage & IndexedDB Caching

---

## 🏁 Getting Started

### Prerequisites

- Node.js (v22 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/njobvulabs/njobvu-iptv.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## 📄 License

This project is open-source under Njobvu Labs.
