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

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite
- **Authentication**: Auth0
- **Audio**: Web Audio API
- **Deployment**: Docker + Nginx

## Project Structure

```
Dynamic_album_player/
├── frontend/          # React + TypeScript frontend
├── backend/           # Backend API (coming soon)
├── docker-compose.yml # Docker Compose configuration
└── Dockerfile         # Frontend Docker configuration
```

## Development

### Prerequisites

- Node.js 20+ and npm

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up Auth0:
   - Create an account at [Auth0](https://auth0.com) (free tier available)
   - Create a new Application (Single Page Application)
   - Go to Settings and copy your Domain and Client ID
   - Add `http://localhost:3000` to Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins
   - Create a `.env` file in the frontend directory:
   ```bash
   cp .env.example .env
   ```
   - Update `.env` with your Auth0 credentials:
   ```
   VITE_AUTH0_DOMAIN=your-domain.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id
   VITE_API_URL=http://localhost:3001
   ```

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration (defaults should work for development):
```
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

5. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Running Both

In separate terminals:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Adding Audio Tracks

1. Create a `frontend/public/audio/` directory
2. Add your audio files (e.g., `vocals.mp3`, `drums.mp3`, etc.)
3. Upload tracks through the Create Album page in the app

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

Build frontend for production:
```bash
cd frontend
npm run build
```

The production build will be in the `frontend/dist/` directory.

## Project Structure

```
Dynamic_album_player/
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── contexts/            # React contexts
│   │   ├── services/            # Frontend services
│   │   ├── types/               # TypeScript types
│   │   ├── App.tsx              # Main app component
│   │   └── main.tsx             # Entry point
│   ├── public/                  # Static assets
│   ├── package.json             # Frontend dependencies
│   ├── vite.config.ts           # Vite configuration
│   ├── tsconfig.json            # TypeScript configuration
│   └── nginx.conf               # Nginx configuration
├── backend/                     # Backend API (coming soon)
├── Dockerfile                   # Frontend Docker build
├── docker-compose.yml           # Docker Compose configuration
└── README.md                    # This file
```

## License

MIT
