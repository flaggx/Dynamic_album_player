# Backend API (optional / legacy)

**Production** uses the **Next.js** app in `frontend/` with **Supabase** (Postgres, RLS, Storage) and **Stripe** on Vercel API routes—see `SUPABASE_ONLY.md`. This Express server is **not required** for that path; keep it only if you want a standalone API for local tools or migration.

---

REST API for Dynamic Album Player: Node.js, Express, PostgreSQL (e.g. Supabase), Supabase JWT auth.

## Features

- Album and song management
- Track upload and storage (local `UPLOAD_DIR` by default)
- Users, likes, favorites, subscriptions
- Stripe hooks for premium (optional)

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express
- **Database**: PostgreSQL (`DATABASE_URL`)
- **Auth**: Supabase-issued JWTs (`SUPABASE_URL`; optional `SUPABASE_JWT_SECRET` for HS256, else JWKS)
- **Language**: TypeScript

## Development

1. `npm install`
2. `cp .env.example .env` and fill in `DATABASE_URL`, `SUPABASE_URL`, and either `SUPABASE_JWT_SECRET` (HS256) or leave it blank to use JWKS (ES256/RS256), etc.
3. `npm run dev` — default `http://localhost:3001`

## API Endpoints (summary)

- **Albums** — `GET/POST /api/albums`, `GET/PUT/DELETE /api/albums/:id`, `GET /api/albums/artist/:artistId`
- **Songs** — `GET/POST /api/songs`, `GET/PUT/DELETE /api/songs/:id`, `GET /api/songs/album/:albumId`
- **Users** — `GET /api/users/:id`, `POST /api/users`
- **Subscriptions, likes, favorites** — under `/api/subscriptions`, `/api/likes`, `/api/favorites`
- **Premium / admin / songwriting** — `/api/premium`, `/api/admin`, `/api/songwriting`

## Production

```bash
npm run build
npm start
```

Serve behind HTTPS in production; set `CORS_ORIGIN` to your real frontend origin.
