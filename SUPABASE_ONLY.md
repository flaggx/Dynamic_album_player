# Supabase-only architecture (no Express)

The app now targets **Vercel + Supabase** only: the browser talks to **Supabase Postgres (RLS)** and **Supabase Storage**; **Stripe** uses **Next.js Route Handlers** under `frontend/src/app/api/premium/` (server secrets).

## What you must run

1. **Apply migrations** (includes RLS + storage buckets) from the **repository root** (the directory that contains `supabase/config.toml`):

   ```bash
   cd /path/to/Dynamic_album_player
   npx supabase@latest db push
   ```

   First time only, link the CLI to your hosted project (Dashboard → **Settings** → **General** → **Reference ID**):

   ```bash
   npx supabase@latest link --project-ref YOUR_PROJECT_REF
   ```

2. **Vercel / `.env.local` (frontend)**  
   - Existing: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or anon).  
   - **Add (server-only on Vercel):** `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard **API** → **service_role** (never expose to the client).  
   - **Stripe (optional):** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`.  
   - **Remove:** `NEXT_PUBLIC_API_URL` (no longer used for data).

3. **Stripe webhook URL** in Stripe dashboard:  
   `https://<your-domain>/api/premium/webhook`

## Repo layout

| Area | Location |
|------|-----------|
| RLS + storage policies | `supabase/migrations/20250513140000_rls_and_storage.sql` |
| Data + Storage (client) | `frontend/src/services/api.ts` |
| Stripe webhook + checkout | `frontend/src/app/api/premium/*`, `frontend/src/server/stripePremium.ts` |
| Legacy Express API | `backend/` — **optional** for local experiments; not required for production |

## Storage paths

- **Bucket `covers`:** object key `{auth_user_id}/{albumId}.{ext}` stored in `albums.cover_image`.
- **Bucket `tracks`:** object key `{auth_user_id}/{songId}/{trackId}.{ext}` stored in `tracks.file_path`.

Legacy rows with `/uploads/...` (from the old Express API) resolve in the browser if you set **`NEXT_PUBLIC_LEGACY_UPLOADS_BASE_URL`** to the origin that still serves `/uploads` (no trailing slash). Otherwise those URLs stay relative and may 404 until you re-upload into Supabase Storage.

## Security notes

- RLS enforces ownership, premium songwriting/album rules, and admin deletes where modeled.  
- **Service role** is only used in **server** Route Handlers (Stripe), never in the browser.
