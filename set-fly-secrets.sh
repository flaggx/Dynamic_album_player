#!/bin/bash

# Script to set Fly.io secrets from a .env file
# Usage: ./set-fly-secrets.sh [path-to-.env-file]

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    echo "Usage: ./set-fly-secrets.sh [path-to-.env-file]"
    exit 1
fi

echo "Reading secrets from $ENV_FILE..."
echo ""

# Source the .env file
set -a
source "$ENV_FILE"
set +a

# Set Fly.io secrets for frontend build
echo "Setting Fly.io secrets..."

# Frontend build secrets (VITE_*)
if [ -n "$VITE_AUTH0_DOMAIN" ]; then
    echo "Setting VITE_AUTH0_DOMAIN..."
    flyctl secrets set VITE_AUTH0_DOMAIN="$VITE_AUTH0_DOMAIN"
fi

if [ -n "$VITE_AUTH0_CLIENT_ID" ]; then
    echo "Setting VITE_AUTH0_CLIENT_ID..."
    flyctl secrets set VITE_AUTH0_CLIENT_ID="$VITE_AUTH0_CLIENT_ID"
fi

if [ -n "$VITE_AUTH0_AUDIENCE" ]; then
    echo "Setting VITE_AUTH0_AUDIENCE..."
    flyctl secrets set VITE_AUTH0_AUDIENCE="$VITE_AUTH0_AUDIENCE"
fi

if [ -n "$VITE_AUTH0_REDIRECT_URI" ]; then
    echo "Setting VITE_AUTH0_REDIRECT_URI..."
    flyctl secrets set VITE_AUTH0_REDIRECT_URI="$VITE_AUTH0_REDIRECT_URI"
else
    # Default to production URL if not set
    echo "Setting VITE_AUTH0_REDIRECT_URI to default..."
    flyctl secrets set VITE_AUTH0_REDIRECT_URI="https://lost-camp-studios.fly.dev/callback"
fi

if [ -n "$VITE_API_URL" ]; then
    echo "Setting VITE_API_URL..."
    flyctl secrets set VITE_API_URL="$VITE_API_URL"
else
    # Default to production URL if not set
    echo "Setting VITE_API_URL to default..."
    flyctl secrets set VITE_API_URL="https://lost-camp-studios.fly.dev"
fi

# Stripe secrets (if present)
if [ -n "$STRIPE_SECRET_KEY" ]; then
    echo "Setting STRIPE_SECRET_KEY..."
    flyctl secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
fi

if [ -n "$STRIPE_PRICE_ID" ]; then
    echo "Setting STRIPE_PRICE_ID..."
    flyctl secrets set STRIPE_PRICE_ID="$STRIPE_PRICE_ID"
fi

if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "Setting STRIPE_WEBHOOK_SECRET..."
    flyctl secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
fi

echo ""
echo "✓ Secrets set successfully!"
echo ""
echo "Current secrets:"
flyctl secrets list
echo ""
echo "Note: You may need to redeploy after setting secrets:"
echo "  flyctl deploy"
