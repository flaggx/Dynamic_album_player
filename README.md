# Dynamic Album Player

A web application that allows creators to release an album where users can select and deselect individual tracks (like drums, vocals, bass, etc.) to customize their listening experience.

## Features

- 🎵 Multi-track audio playback with Web Audio API
- 🎛️ Real-time track toggling (enable/disable individual tracks)
- 🔐 Authentication with Auth0
- 🎨 Modern, responsive UI
- 🐳 Docker deployment ready
- ⚡ Built with React + TypeScript + Vite

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Authentication**: Auth0
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

2. Set up Auth0:
   - Create an account at [Auth0](https://auth0.com) (free tier available)
   - Create a new Application (Single Page Application)
   - Go to Settings and copy your Domain and Client ID
   - Add `http://localhost:3000` to Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins
   - Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   - Update `.env` with your Auth0 credentials:
   ```
   VITE_AUTH0_DOMAIN=your-domain.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id
   ```

3. Start development server:
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
│   │   ├── AudioPlayer.css
│   │   └── ProtectedRoute.tsx   # Auth-protected route wrapper
│   ├── pages/
│   │   ├── Home.tsx             # Main app page (protected)
│   │   ├── Home.css
│   │   ├── Login.tsx             # Auth0 login page
│   │   ├── Callback.tsx          # Auth0 callback handler
│   │   └── Auth.css              # Auth page styles
│   ├── App.tsx                  # Main app component with routing
│   ├── main.tsx                 # Entry point
│   └── index.css               # Global styles
├── public/                      # Static assets (add audio files here)
├── .env.example                 # Environment variables template
├── Dockerfile                   # Docker build configuration
├── docker-compose.yml           # Docker Compose configuration
├── nginx.conf                   # Nginx server configuration
└── package.json
```

## License

MIT
