# Jugger Tournament App

A modern web-based Jugger sports tournament management application built with Next.js and React. This application provides comprehensive tournament management and real-time game control for Jugger sports with offline capabilities and peer-to-peer synchronization.

## Features

- 🏆 Tournament management with multiple formats
- ⏱️ Real-time Jugger timer with stone counting
- 📱 Progressive Web App (PWA) with offline support
- 🌐 Internationalization (German/English)
- 🎨 Multiple visual themes
- 🔄 Peer-to-peer synchronization across devices
- 📊 Live scoreboard for spectators
- 🎮 Referee control panel

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Internationalization**: next-i18next
- **PWA**: next-pwa
- **Database**: IndexedDB with Dexie.js
- **Real-time**: WebRTC for P2P synchronization

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
```

This creates an optimized production build that can be deployed to GitHub Pages or any static hosting service.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable React components
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── utils/              # Utility functions

public/
├── locales/            # Translation files
└── manifest.json       # PWA manifest
```

## Development

The project follows modern React and Next.js best practices:

- TypeScript for type safety
- Tailwind CSS for styling
- Component-based architecture
- Custom hooks for state logic
- Internationalization support

## License

This project is licensed under the MIT License.
A jugger Sports panel for my Vouluntairy work coocked with ai 
