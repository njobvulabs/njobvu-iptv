# Njobvu IPTV

Njobvu IPTV is a modern, high-performance IPTV streaming application built with React, Vite, and Tailwind CSS. It provides a seamless experience for browsing and watching IPTV channels from multiple curated M3U sources.

## Features

- **Multi-Source Support:** Automatically fetches and parses channels from reliable IPTV playlists (APSAT, Tubi, IPTV-org).
- **Advanced HLS Player:** Powered by `hls.js`, supporting quality selection (up to 4K), Picture-in-Picture (PiP), and full-screen mode.
- **Smart Categorization:** Channels are automatically grouped into categories like News, Sports, Movies, and more.
- **Real-Time Search:** Fast, responsive search to find your favorite channels instantly.
- **Favorites & History:** Keep track of your most-watched channels and quickly access your favorites.
- **Responsive Design:** A beautiful, dark-themed UI optimized for both mobile and desktop devices.
- **Performance Optimized:** Features lazy loading for channel icons and efficient state management for a smooth experience.
- **Offline Cache:** Channels are cached locally for faster subsequent loads.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS 4
- **Streaming:** HLS.js
- **Icons:** Lucide React
- **Routing:** React Router DOM 7
- **State Management:** React Hooks & Local Storage

## Getting Started

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

## Configuration

The application is pre-configured with several high-quality IPTV sources. You can modify or add more sources in `src/hooks/useM3U.ts`.

## License

This project is private and intended for personal use.
