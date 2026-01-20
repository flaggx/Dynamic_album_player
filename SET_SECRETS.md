# Setting Fly.io Secrets

If your `.env` file is on another computer, you can set the secrets manually or transfer the file.

## Option 1: Use the Helper Script (if you have the .env file)

If you can copy your `.env` file to this computer:

```bash
# Copy your .env file to the project root, then:
./set-fly-secrets.sh .env

# Or specify a path:
./set-fly-secrets.sh /path/to/your/.env
```

## Option 2: Set Secrets Manually

Set each secret individually:

```bash
# Required frontend secrets
flyctl secrets set VITE_AUTH0_DOMAIN=your-domain.auth0.com
flyctl secrets set VITE_AUTH0_CLIENT_ID=your-client-id
flyctl secrets set VITE_AUTH0_AUDIENCE=your-api-audience
flyctl secrets set VITE_AUTH0_REDIRECT_URI=https://lost-camp-studios.fly.dev/callback
flyctl secrets set VITE_API_URL=https://lost-camp-studios.fly.dev

# Stripe secrets (if using premium features)
flyctl secrets set STRIPE_SECRET_KEY=sk_live_...
flyctl secrets set STRIPE_PRICE_ID=price_...
flyctl secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## Option 3: Set All Secrets at Once

You can set multiple secrets in one command:

```bash
flyctl secrets set \
  VITE_AUTH0_DOMAIN=your-domain.auth0.com \
  VITE_AUTH0_CLIENT_ID=your-client-id \
  VITE_AUTH0_AUDIENCE=your-api-audience \
  VITE_AUTH0_REDIRECT_URI=https://lost-camp-studios.fly.dev/callback \
  VITE_API_URL=https://lost-camp-studios.fly.dev \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_PRICE_ID=price_... \
  STRIPE_WEBHOOK_SECRET=whsec_...
```

## Check Current Secrets

To see what secrets are currently set (values are hidden):

```bash
flyctl secrets list
```

## After Setting Secrets

After setting or updating secrets, you need to redeploy:

```bash
flyctl deploy
```

## Required Secrets

Based on the current codebase, these secrets are needed:

### Frontend Build Secrets (VITE_*)
- `VITE_AUTH0_DOMAIN` - Your Auth0 domain (e.g., `dev-xxxxx.us.auth0.com`)
- `VITE_AUTH0_CLIENT_ID` - Your Auth0 client ID
- `VITE_AUTH0_AUDIENCE` - Your Auth0 API audience (optional but recommended)
- `VITE_AUTH0_REDIRECT_URI` - Callback URL (defaults to `https://lost-camp-studios.fly.dev/callback`)
- `VITE_API_URL` - API URL (defaults to `https://lost-camp-studios.fly.dev`)

### Stripe Secrets (for premium features)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PRICE_ID` - Stripe price ID for subscriptions
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

## Notes

- Secrets are used during the Docker build process for the frontend
- Backend environment variables are set in `fly.toml` under `[env]`
- After setting secrets, the next deployment will use them
- Secret values are never displayed in logs or output
