# Copying Secrets from Another Machine

Here are several ways to copy your secrets from your other development machine:

## Method 1: Interactive Script (Easiest)

Run the interactive script and paste values as prompted:

```bash
./copy-secrets.sh
```

This will prompt you for each secret value. Just copy-paste from your other machine.

## Method 2: Transfer .env File via SCP

If you have SSH access to your other machine:

```bash
# Transfer the .env file
scp user@other-machine:/path/to/project/.env ./

# Then use the helper script
./set-fly-secrets.sh .env
```

Replace:
- `user` with your username on the other machine
- `other-machine` with the hostname or IP
- `/path/to/project/.env` with the actual path to your .env file

## Method 3: Transfer .env File via USB/Network Share

1. Copy your `.env` file to this machine (USB drive, network share, etc.)
2. Place it in the project root or any location
3. Run:
```bash
./set-fly-secrets.sh /path/to/your/.env
```

## Method 4: Manual Copy-Paste (One at a Time)

If you prefer to set secrets manually:

```bash
# Set each secret individually
flyctl secrets set VITE_AUTH0_DOMAIN="paste-value-here"
flyctl secrets set VITE_AUTH0_CLIENT_ID="paste-value-here"
flyctl secrets set VITE_AUTH0_AUDIENCE="paste-value-here"
# ... etc
```

## Method 5: Set All at Once

You can set multiple secrets in one command:

```bash
flyctl secrets set \
  VITE_AUTH0_DOMAIN="your-domain" \
  VITE_AUTH0_CLIENT_ID="your-client-id" \
  VITE_AUTH0_AUDIENCE="your-audience" \
  VITE_AUTH0_REDIRECT_URI="https://lost-camp-studios.fly.dev/callback" \
  VITE_API_URL="https://lost-camp-studios.fly.dev" \
  STRIPE_SECRET_KEY="your-stripe-key" \
  STRIPE_PRICE_ID="your-price-id" \
  STRIPE_WEBHOOK_SECRET="your-webhook-secret"
```

## What Secrets Do You Need?

From your `.env` file, you'll need these values:

### Frontend (VITE_*)
- `VITE_AUTH0_DOMAIN` - Your Auth0 domain
- `VITE_AUTH0_CLIENT_ID` - Your Auth0 client ID  
- `VITE_AUTH0_AUDIENCE` - Your Auth0 API audience (optional)
- `VITE_AUTH0_REDIRECT_URI` - Usually `https://lost-camp-studios.fly.dev/callback`
- `VITE_API_URL` - Usually `https://lost-camp-studios.fly.dev`

### Stripe (if using premium features)
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_PRICE_ID` - Your Stripe price ID
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

## After Setting Secrets

After setting secrets, redeploy:

```bash
flyctl deploy
```

## Verify Secrets

To check what secrets are currently set:

```bash
flyctl secrets list
```

Note: Secret values are never displayed for security reasons.
