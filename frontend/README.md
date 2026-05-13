# Frontend

Next.js 15 (App Router) + React 18 + TypeScript.

## Development

```bash
npm install
npm run dev
```

App runs at **http://localhost:3000** by default (`next dev -p 3000`).

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_*`, **`SUPABASE_SERVICE_ROLE_KEY`** (server-only), and Stripe variables for `/api/premium/*`. Data and uploads use Supabase Postgres and Storage (see repo `SUPABASE_ONLY.md`).

## Build

```bash
npm run build
npm start
```

## Deploy on Vercel

This folder is a **Next.js App Router** app. Deploy **`frontend/`** as the Vercel root; production uses **Supabase** for data and **Next API routes** for Stripe. The `backend/` folder is optional for local experiments only.

If Vercel reports **“No Next.js version detected”**, the project **Root Directory** is wrong. In the dashboard set it to **`frontend`**, or from the CLI (requires a [token](https://vercel.com/account/tokens)):

```bash
cd frontend
VERCEL_TOKEN=… npm run vercel:set-root
```

### Option A — Vercel CLI (from `frontend/`)

1. `npm install`
2. One-time login: `npx vercel login` (or rely on an existing login on this machine).
3. One-time link: `npx vercel link --yes` — creates or links **`frontend/.vercel/`** (gitignored). Do not commit that folder.
4. Deploy:
   - **Preview:** `npm run vercel:deploy` (or `npx vercel deploy`)
   - **Production:** `npm run vercel:prod` (or `npx vercel deploy --prod`)

**Git auto-deploy:** from the monorepo root, run `npx vercel git connect <your-repo-git-url> --cwd frontend`. If that fails (common for private repos until the [Vercel GitHub integration](https://vercel.com/docs/deployments/git/vercel-for-github) is installed), open the project on [vercel.com](https://vercel.com) → **Settings** → **Git** and connect the repository there; set **Root Directory** to **`frontend`**.

### Option B — Vercel dashboard

1. [Vercel](https://vercel.com) → **Add New…** → **Project** → import this Git repository.
2. Under **Root Directory**, set **`frontend`** (required).
3. **Framework Preset** should detect **Next.js**. Leave default **Build** (`npm run build`); Vercel handles output automatically.
4. **Node.js**: **`.nvmrc`** pins **20**; otherwise set **20.x** under Project → Settings → General.

### Environment variables

In the project → **Settings** → **Environment Variables**, add (at least for **Production**; repeat for **Preview** if you use previews):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable or legacy anon key (same as local) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | _Optional_ — only if you use this name instead of publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only; never `NEXT_PUBLIC_*`) |
| `STRIPE_SECRET_KEY` | Stripe secret |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from Stripe Dashboard → Webhooks |
| `STRIPE_PRICE_ID` | Price ID for premium checkout |
| `NEXT_PUBLIC_LEGACY_UPLOADS_BASE_URL` | _Optional_ — origin for old `/uploads/…` DB paths (e.g. legacy API) |

Preview deployments can use Stripe test keys and a separate Supabase project, or the same keys as production—your choice.

CLI: after variables exist in the dashboard, run `npx vercel env pull .env.local` in **`frontend/`** to sync them locally (optional).

To **upload** vars from local `frontend/.env.local` to Vercel (production + preview), link the project once (`npx vercel link`), then run **`npm run vercel:push-env`** from **`frontend/`**. Values are passed on stdin to the Vercel CLI so they stay off your shell history; see `scripts/push-env-to-vercel.mjs`.

### Supabase

- **Authentication** → **URL Configuration**: add your Vercel production URL and **`https://<your-project>.vercel.app/callback`**. For preview branches, use a [wildcard redirect pattern](https://supabase.com/docs/guides/auth/redirect-urls#vercel-preview-urls) if you need OAuth on previews.
- Apply SQL migrations from `supabase/migrations/` (see `SUPABASE_ONLY.md`).

### Ship

With Git connected, merges to the tracked branch deploy automatically. Otherwise use **`npm run vercel:prod`** from `frontend/`. Custom domains: Vercel project → **Domains**.

