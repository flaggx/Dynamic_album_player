# Supabase setup (this project)

Your app uses **Supabase Auth** (frontend): identities live in **`auth.users`**. The app also syncs a profile row to **`public.users`** with the same `id` as **`auth.users.id`** (via `/api/users` after Google OAuth, email sign-in, or email sign-up).

Official references (bookmark these—they change more often than this file):

- [Connect to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Email / password](https://supabase.com/docs/guides/auth/passwords)
- [API keys](https://supabase.com/docs/guides/api/api-keys)
- [JWTs](https://supabase.com/docs/guides/auth/jwts) · [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys)

---

## 1. Create a project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a region, set a database password, and wait until the project is healthy.

---

## 2. Database connection (`DATABASE_URL`)

Use the dashboard **Connect** button (top of the project) to copy the right string:  
[Dashboard deep link](https://supabase.com/dashboard/project/_?showConnect=true)

Per [Supabase’s connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres):

| Method | When to use |
|--------|----------------|
| **Direct** (`db.<project-ref>.supabase.co`, port **5432**) | Long‑running backend (VM, container, your laptop). Best for migrations and DDL. **IPv6 by default**; if your network has no IPv6, use session pooler or the [IPv4 add-on](https://supabase.com/docs/guides/platform/ipv4-address). |
| **Shared pooler — session mode** (`*.pooler.supabase.com`, port **5432**, user often `postgres.<project-ref>`) | Same as above when you need **IPv4** without the add-on. |
| **Shared pooler — transaction mode** (often port **6543**) | **Serverless / short‑lived** clients. **Does not support prepared statements**; not ideal for arbitrary ORMs unless you disable prepares. Less suitable for this Express + `pg` app unless you know what you’re doing. |

Example **direct** URI shape (password from project creation):

```text
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

Put the final URI in **`backend/.env`** as `DATABASE_URL`.

**Also in the project:** **Project Settings → Database** still lists connection info and SSL certs if you need them.

---

## 2b. Supabase CLI (link + apply migrations)

Use this when you want the hosted database schema managed from git (`supabase/migrations/`) instead of only relying on the Express `initDatabase()` bootstrap.

1. **Install the CLI** (pick one): [Install Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) — e.g. `brew install supabase/tap/supabase`, or run without global install: `npx supabase@latest <command>` from the **repository root** (`Dynamic_album_player/`).

2. **Log in** (opens the browser once):

   ```bash
   npx supabase@latest login
   ```

3. **Link** this repo to your **cloud** project (`<project-ref>` is the subdomain in `https://<project-ref>.supabase.co`):

   ```bash
   cd /path/to/Dynamic_album_player
   npx supabase@latest link --project-ref <project-ref>
   ```

   The CLI will prompt for the **database password** (the one you set when creating the project). Linking writes local metadata under **`supabase/`** (ignored by git where appropriate); do not commit secrets.

4. **Align Postgres major version** (optional but avoids surprises): in the dashboard **Settings → Database** note the Postgres version, then set **`major_version`** in **`supabase/config.toml`** `[db]` to match (e.g. `15` or `17`).

5. **Push migrations** to the linked remote:

   ```bash
   npx supabase@latest db push
   ```

   This applies `supabase/migrations/*.sql` to the remote `public` schema. The first migration matches **`supabase/schema.sql`** (keep them in sync when you change tables).

**CI / headless:** create a [personal access token](https://supabase.com/dashboard/account/tokens) and set **`SUPABASE_ACCESS_TOKEN`**, then use `link` / `db push` with non-interactive flags as in the [CLI CI docs](https://supabase.com/docs/guides/cli/managing-environments).

**Local stack (optional):** `npx supabase@latest start` runs Postgres + Auth in Docker; only needed if you develop against local Supabase instead of the cloud project.

---

## 3. API URL and keys (frontend + backend)

### Where to copy values

- **Connect** dialog: often the fastest place for URL + keys.  
- **Project Settings → API Keys** ([docs](https://supabase.com/docs/guides/api/api-keys)): **publishable** (`sb_publishable_…`) and **secret** keys; **legacy** `anon` / `service_role` JWT keys live in a tab there if your project still exposes them.

### This repo today

| Variable | Source | Notes |
|----------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` | Project URL, e.g. `https://xxxxx.supabase.co` | No trailing slash. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Legacy anon** JWT *or* **publishable** key | `@supabase/supabase-js` `createClient(url, key)` — use what the dashboard labels for browser / public clients. |
| `SUPABASE_JWT_SECRET` | Optional — legacy **HS256** JWT secret | If your project signs access tokens with **ES256/RS256** (JWKS), **leave this empty** and ensure **`SUPABASE_URL`** is set; the API verifies using `…/auth/v1/.well-known/jwks.json`. |

**Backend `backend/.env`:** `SUPABASE_URL`, `DATABASE_URL`, and **`SUPABASE_JWT_SECRET` only if** your project still uses symmetric **HS256** signing. For **JWKS** (e.g. **ES256**), omit the secret and keep `SUPABASE_URL` correct.

**Frontend `frontend/.env.local` (or `.env`):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`), and `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`).

### JWT signing (important)

Supabase may use **[JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys)** and **JWKS** (`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`). **This backend:** if `SUPABASE_JWT_SECRET` is set, it verifies **HS256**; if it is **unset** and `SUPABASE_URL` is set, it verifies with **JWKS** (e.g. **ES256**). See [Verifying a JWT](https://supabase.com/docs/guides/auth/jwts).

- If the API returns **401**, confirm **`SUPABASE_URL`** matches your project, check the token **`alg`** at [jwt.io](https://jwt.io), and match **HS256 + secret** vs **JWKS + no secret** as in the table above.

---

## 4. Auth URL configuration

**Authentication → [URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration)**

- **Site URL**: e.g. `http://localhost:3000` (Next.js dev) or your production site.
- **Redirect URLs** (allow list): include the URLs you pass as `redirectTo` from the client. For this app, add at least:
  - `http://localhost:3000`
  - `http://localhost:3000/callback`  
  (Add production + `https://your-domain/callback` when you deploy.)

Wildcards for **Vercel previews** are documented here: [Redirect URLs → Vercel](https://supabase.com/docs/guides/auth/redirect-urls#vercel-preview-urls) (e.g. `https://*-.vercel.app/**`).

---

## 5. Google sign-in

**Authentication → [Providers → Google](https://supabase.com/dashboard/project/_/auth/providers?provider=Google)**

1. In **Google Cloud Console**, create an OAuth **Web** client.
2. **Authorized JavaScript origins**: your app origin (e.g. `http://localhost:3000`). See [Google provider docs](https://supabase.com/docs/guides/auth/social-login/auth-google).
3. **Authorized redirect URIs**: use the exact **Supabase Auth callback URL** shown on the **Google provider** page in the Supabase dashboard. For a **hosted** project it looks like:

   `https://<project-ref>.supabase.co/auth/v1/callback`

   Do **not** confuse this with **Supabase CLI local** docs, which use `http://127.0.0.1:54321/auth/v1/callback` — that is only for local Supabase, not the cloud project.

4. Paste **Client ID** and **Client Secret** into the Supabase Google provider form and save.

### Email / password (built-in `auth.users`)

The login page supports **Sign in** and **Create account** with email and password (Supabase’s default Auth users). In the dashboard go to **Authentication → Providers → Email** and ensure **Email** is enabled.

- If **Confirm email** is required, add **`http://localhost:3000/callback`** (and your production callback URL) under **Authentication → URL Configuration → Redirect URLs**, so after the user clicks the link in email they return to the app and `public.users` can sync.

---

## 6. Database tables

Either:

- **A)** **Supabase CLI:** `npx supabase@latest link` then `npx supabase@latest db push` (see **§2b**), **or**
- **B)** Start the API: `cd backend && npm run dev` — `initDatabase()` creates `public.*` tables, **or**
- **C)** **SQL Editor** → run `supabase/schema.sql` (idempotent; same content as the initial migration).

There is no FK from `public.users` to `auth.users`; your app keeps `users.id` aligned with the JWT `sub`.

---

## 7. CORS

In **`backend/.env`**:

```env
CORS_ORIGIN=http://localhost:3000
```

Use your real frontend origin in production.

---

## 8. Smoke test

1. `cd backend && npm run dev` — should log that PostgreSQL schema is ready.
2. `cd frontend && npm run dev` — sign in with Google.
3. After `/callback` → home, check **`public.users`** in **Table Editor**.

---

## 9. Optional: first admin

After at least one login:

```sql
UPDATE public.users SET is_admin = true WHERE id = 'YOUR_USER_UUID';
```

JWT `app_metadata` admin roles are also supported by the API; see code comments in `backend/src/middleware/auth.ts`.

---

## 10. Troubleshooting

| Issue | What to check |
|--------|----------------|
| Cannot reach DB on direct URL | **IPv6**: direct host is IPv6-first. Use **session pooler** (port 5432 on `*.pooler.supabase.com`) or [IPv4 add-on](https://supabase.com/docs/guides/platform/ipv4-address). |
| Pooler / prepared statement errors | **Transaction** pooler (6543) and prepared statements: see [transaction mode](https://supabase.com/docs/guides/database/connecting-to-postgres#pooler-transaction-mode). Prefer **direct** or **session** for this Express API. |
| `DATABASE_URL` must be set | Backend exits on boot without it. |
| 401 from API | Wrong `SUPABASE_JWT_SECRET` / `SUPABASE_URL`, or token not sent; issuer should be `https://<ref>.supabase.co/auth/v1`. Check JWT `alg` vs HS256 (see §3). |
| OAuth redirect mismatch | Google **redirect URI** must match Supabase’s `…/auth/v1/callback` for **hosted** projects. |

---

## 11. `service_role` / secret keys

Do **not** put the **service_role** or **secret** (`sb_secret_…`) key in the frontend. This Express API uses the user’s **Bearer** access token from the browser; it does not need the service role for normal operation.
