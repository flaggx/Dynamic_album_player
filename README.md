# Dynamic Album Player

A web application that allows creators to release an album where users can select and deselect individual tracks (like drums, vocals, bass, etc.) to customize their listening experience.

## Features

- Multi-track audio playback with Web Audio API
- Real-time track toggling (enable/disable individual tracks)
- Authentication with Supabase
- Modern, responsive UI
- Built with Next.js (App Router) + React + TypeScript

## Tech Stack

- **Frontend**: Next.js 15 + React 18 + TypeScript (typical deploy: [Vercel](https://vercel.com))
- **Backend**: Node.js + Express + TypeScript (run on any Node host)
- **Database**: PostgreSQL on [Supabase](https://supabase.com)
- **Authentication**: Supabase Auth (JWT verified by the API)
- **Audio**: Web Audio API

## Project Structure

```
Dynamic_album_player/
├── frontend/          # Next.js (App Router) + TypeScript
├── backend/           # Express API
├── supabase/          # Supabase CLI: config.toml + migrations/ (see SUPABASE_SETUP.md §2b)
└── README.md
```

## Development

### Prerequisites

- Node.js 20+ and npm
- A Supabase project — follow **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** once, then use `backend/.env.example` and `frontend/.env.example`

### Frontend Setup

1. `cd frontend`
2. `npm install`
3. `cp .env.example .env.local` and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`), and `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`)
4. `npm run dev` — **http://localhost:3000**

### Backend Setup

1. `cd backend`
2. `npm install`
3. `cp .env.example .env` and set Postgres and Supabase JWT variables
4. `npm run dev` — API at `http://localhost:3001`

Set `CORS_ORIGIN` to your frontend origin (e.g. `http://localhost:3000`).

### Running both

Use two terminals: backend first, then frontend.

## Production build

```bash
cd frontend && npm run build   # Next.js output: frontend/.next/
cd backend && npm run build     # output: backend/dist/
```

**Frontend hosting (Vercel):** set the Vercel project **Root Directory** to **`frontend`** and configure env vars as in **[frontend/README.md](./frontend/README.md)** (Deploy on Vercel).

## License

MIT
