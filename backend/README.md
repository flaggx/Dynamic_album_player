# Backend API

REST API backend for Dynamic Album Player built with Node.js, Express, and SQLite.

## Features

- 🎵 Album and song management
- 🎛️ Track upload and storage
- 👥 User management
- ❤️ Likes and favorites
- 🔔 Subscriptions
- 📁 File upload handling for audio tracks
- 🗄️ SQLite database

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Database**: SQLite
- **Language**: TypeScript
- **File Upload**: Multer

## Development

### Prerequisites

- Node.js 20+ and npm

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
DATABASE_PATH=./data/database.sqlite
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:3000
```

4. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Albums
- `GET /api/albums` - Get all albums
- `GET /api/albums/:id` - Get album by ID
- `GET /api/albums/artist/:artistId` - Get albums by artist
- `POST /api/albums` - Create album
- `PUT /api/albums/:id` - Update album
- `DELETE /api/albums/:id` - Delete album

### Songs
- `GET /api/songs` - Get all songs
- `GET /api/songs/:id` - Get song by ID (with tracks)
- `GET /api/songs/album/:albumId` - Get songs by album
- `POST /api/songs` - Create song with tracks (multipart/form-data)
- `PUT /api/songs/:id` - Update song
- `DELETE /api/songs/:id` - Delete song

### Users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create or update user

### Subscriptions
- `GET /api/subscriptions/user/:userId` - Get user subscriptions
- `GET /api/subscriptions/check/:userId/:artistId` - Check subscription
- `POST /api/subscriptions` - Subscribe to artist
- `DELETE /api/subscriptions/:userId/:artistId` - Unsubscribe

### Likes
- `GET /api/likes/song/:songId/count` - Get like count
- `GET /api/likes/check/:userId/:songId` - Check if liked
- `POST /api/likes/toggle` - Toggle like

### Favorites
- `GET /api/favorites/user/:userId` - Get user favorites
- `GET /api/favorites/song/:songId/count` - Get favorite count
- `GET /api/favorites/check/:userId/:songId` - Check if favorited
- `POST /api/favorites/toggle` - Toggle favorite

## Production Build

Build for production:
```bash
npm run build
npm start
```

## Project Structure

```
backend/
├── src/
│   ├── database/
│   │   └── init.ts          # Database initialization
│   ├── routes/
│   │   ├── albums.ts        # Album routes
│   │   ├── songs.ts         # Song routes
│   │   ├── users.ts         # User routes
│   │   ├── subscriptions.ts # Subscription routes
│   │   ├── likes.ts         # Like routes
│   │   └── favorites.ts     # Favorite routes
│   └── index.ts             # Express server
├── data/                     # SQLite database (created automatically)
├── uploads/                  # Uploaded audio files (created automatically)
├── package.json
└── tsconfig.json
```

## License

MIT
