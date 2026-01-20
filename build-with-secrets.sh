#!/bin/bash
# Build script that passes Fly.io secrets as build arguments

export FLYCTL_INSTALL="/home/baldur/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

# Get secrets from Fly.io and pass as build args
echo "Fetching secrets from Fly.io..."

# Read secrets (we'll need to get them from the .env files since flyctl doesn't show values)
DOMAIN=$(grep "VITE_AUTH0_DOMAIN=" frontend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
CLIENT_ID=$(grep "VITE_AUTH0_CLIENT_ID=" frontend/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
# Get audience from .env if set, otherwise use the one from fly.toml
AUDIENCE=$(grep "VITE_AUTH0_AUDIENCE=" frontend/.env | grep -v "^#" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
if [ -z "$AUDIENCE" ]; then
  # Use the audience from fly.toml (backend API audience)
  AUDIENCE="https://lostcampstudios-api"
fi
REDIRECT_URI="https://lostcampstudios.com/callback"
API_URL="https://lostcampstudios.com"

echo "Deploying with build arguments..."
flyctl deploy --build-arg VITE_AUTH0_DOMAIN="$DOMAIN" \
              --build-arg VITE_AUTH0_CLIENT_ID="$CLIENT_ID" \
              --build-arg VITE_AUTH0_AUDIENCE="$AUDIENCE" \
              --build-arg VITE_AUTH0_REDIRECT_URI="$REDIRECT_URI" \
              --build-arg VITE_API_URL="$API_URL"
