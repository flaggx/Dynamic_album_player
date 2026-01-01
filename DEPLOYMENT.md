# Deployment Guide for Lost Camp Studios

## Prerequisites

1. Install flyctl: https://fly.io/docs/getting-started/installing-flyctl/
2. Login to fly.io: `flyctl auth login`
3. Create an Auth0 application for production

## Step 1: Create Auth0 Application Setup

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Create a new Application (Single Page Application)
3. Add your production URLs:
   - **Allowed Callback URLs**: `https://lost-camp-studios.fly.dev/callback`
   - **Allowed Logout URLs**: `https://lost-camp-studios.fly.dev`
   - **Allowed Web Origins**: `https://lost-camp-studios.fly.dev`
4. Copy your Domain and Client ID

## Step 2: Set Build Secrets (Auth0 Configuration)

Set the Auth0 environment variables as build secrets. These are used during the Docker build process:

```bash
flyctl secrets set \
  VITE_AUTH0_DOMAIN=your-domain.auth0.com \
  VITE_AUTH0_CLIENT_ID=your-client-id \
  VITE_AUTH0_AUDIENCE=your-api-audience \
  VITE_AUTH0_REDIRECT_URI=https://lost-camp-studios.fly.dev/callback \
  VITE_API_URL=https://lost-camp-studios.fly.dev
```

**Note**: Replace the values with your actual Auth0 credentials.

## Step 3: Create Persistent Storage Volumes

Create volumes for database and uploads:

```bash
flyctl volumes create lost-camp-studios-data --size 1 --region iad
flyctl volumes create lost-camp-studios-uploads --size 10 --region iad
```

Adjust the size as needed (uploads volume should be larger for audio files).

## Step 4: Deploy

Deploy your application:

```bash
flyctl deploy
```

## Step 5: Verify Deployment

1. Visit `https://lost-camp-studios.fly.dev`
2. Test authentication (login/logout)
3. Verify API endpoints are working

## Updating Secrets

To update Auth0 configuration or other secrets:

```bash
flyctl secrets set VITE_AUTH0_DOMAIN=new-domain.auth0.com
```

After updating secrets, redeploy:

```bash
flyctl deploy
```

## Viewing Secrets

To view current secrets (values are hidden):

```bash
flyctl secrets list
```

## Troubleshooting

### Build fails with "Auth0 not configured"
- Make sure you've set all required secrets: `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID`
- Verify secrets are set: `flyctl secrets list`

### Login redirects fail
- Check Auth0 Dashboard → Applications → Your App → Settings
- Verify Callback URLs include: `https://lost-camp-studios.fly.dev/callback`
- Verify Allowed Web Origins includes: `https://lost-camp-studios.fly.dev`

### API calls fail
- Check that `VITE_API_URL` is set correctly (should be your fly.io app URL)
- Verify backend is running: `flyctl logs`

