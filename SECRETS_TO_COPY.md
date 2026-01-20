# Secrets to Copy from Your Other Machine

## Files to Look For

On your other development machine, check these locations for `.env` files:

### Required Files:
```
/path/to/Dynamic_album_player/frontend/.env
/path/to/Dynamic_album_player/backend/.env
```

**Note:** You'll need to check both files as secrets may be split between them.

## Values You Need to Copy

Check **both** `.env` files (frontend and backend) and copy these values:

### From `frontend/.env`:

### Frontend Build Secrets (Required for Fly.io)

1. **VITE_AUTH0_DOMAIN**
   - Example: `dev-xxxxx.us.auth0.com`
   - Look for: `VITE_AUTH0_DOMAIN=...`

2. **VITE_AUTH0_CLIENT_ID**
   - Example: `abc123xyz...`
   - Look for: `VITE_AUTH0_CLIENT_ID=...`

3. **VITE_AUTH0_AUDIENCE** (Optional but recommended)
   - Example: `https://lostcampstudios-api`
   - Look for: `VITE_AUTH0_AUDIENCE=...`

4. **VITE_AUTH0_REDIRECT_URI** (Usually set automatically)
   - Should be: `https://lost-camp-studios.fly.dev/callback`
   - Look for: `VITE_AUTH0_REDIRECT_URI=...`

5. **VITE_API_URL** (Usually set automatically)
   - Should be: `https://lost-camp-studios.fly.dev`
   - Look for: `VITE_API_URL=...`

### From `backend/.env` (Stripe Secrets - if using premium features):

6. **STRIPE_SECRET_KEY**
   - Example: `sk_live_...` or `sk_test_...`
   - Look for: `STRIPE_SECRET_KEY=...`

7. **STRIPE_PRICE_ID**
   - Example: `price_...`
   - Look for: `STRIPE_PRICE_ID=...`

8. **STRIPE_WEBHOOK_SECRET**
   - Example: `whsec_...`
   - Look for: `STRIPE_WEBHOOK_SECRET=...`

## Quick Copy-Paste Commands

Once you have the values, run these commands (replace the values):

```bash
flyctl secrets set \
  VITE_AUTH0_DOMAIN="paste-your-domain-here" \
  VITE_AUTH0_CLIENT_ID="paste-your-client-id-here" \
  VITE_AUTH0_AUDIENCE="paste-your-audience-here" \
  VITE_AUTH0_REDIRECT_URI="https://lost-camp-studios.fly.dev/callback" \
  VITE_API_URL="https://lost-camp-studios.fly.dev" \
  STRIPE_SECRET_KEY="paste-your-stripe-key-here" \
  STRIPE_PRICE_ID="paste-your-price-id-here" \
  STRIPE_WEBHOOK_SECRET="paste-your-webhook-secret-here"
```

## Or Use the Interactive Script

If you prefer step-by-step:

```bash
./copy-secrets.sh
```

This will prompt you for each value one at a time.

## After Setting Secrets

Redeploy the app:

```bash
flyctl deploy
```
