# Dynamic Album Player

A web application that allows creators to release an album where users can select and deselect individual tracks (like drums, vocals, bass, etc.) to customize their listening experience.

## Features

- 🎵 Multi-track audio playback with Web Audio API
- 🎛️ Real-time track toggling (enable/disable individual tracks)
- 🎨 Modern, responsive UI
- 🐳 Docker deployment ready
- ⚡ Built with React + TypeScript + Vite

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Audio**: Web Audio API
- **Deployment**: Docker + Nginx

## Development

### Prerequisites

- Node.js 20+ and npm

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Adding Audio Tracks

1. Create a `public/audio/` directory
2. Add your audio files (e.g., `vocals.mp3`, `drums.mp3`, etc.)
3. Update the track URLs in `src/components/AudioPlayer.tsx`:

```typescript
const defaultTracks: Track[] = [
  { id: 'vocals', name: 'Vocals', url: '/audio/vocals.mp3', enabled: true },
  { id: 'drums', name: 'Drums', url: '/audio/drums.mp3', enabled: true },
  // ... more tracks
]
```

## Docker Deployment

### Using Docker Compose (Recommended)

1. Build and run:
```bash
docker-compose up -d
```

2. Access the app at `http://localhost:8080`

3. Stop the container:
```bash
docker-compose down
```

### Using Docker directly

1. Build the image:
```bash
docker build -t dynamic-album-player .
```

2. Run the container:
```bash
docker run -d -p 8080:80 --name dynamic-album-player dynamic-album-player
```

3. Access the app at `http://localhost:8080`

4. Stop and remove:
```bash
docker stop dynamic-album-player
docker rm dynamic-album-player
```

## Production Build

Build for production:
```bash
npm run build
```

The production build will be in the `dist/` directory.

## Project Structure

```
Dynamic_album_player/
├── src/
│   ├── components/
│   │   ├── AudioPlayer.tsx      # Main audio player component
│   │   └── AudioPlayer.css
│   ├── App.tsx                  # Main app component
│   ├── App.css
│   ├── main.tsx                 # Entry point
│   └── index.css               # Global styles
├── public/                      # Static assets (add audio files here)
├── Dockerfile                   # Docker build configuration
├── docker-compose.yml           # Docker Compose configuration
├── nginx.conf                   # Nginx server configuration
└── package.json
```

## License

MIT
