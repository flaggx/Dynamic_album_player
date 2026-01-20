#!/bin/bash

# Script to help copy secrets from another machine
# This script will prompt you to paste secret values

echo "=========================================="
echo "Fly.io Secrets Setup"
echo "=========================================="
echo ""
echo "You can either:"
echo "1. Paste values directly (this script will prompt you)"
echo "2. Use the set-fly-secrets.sh script with a .env file"
echo ""
read -p "Do you want to paste values now? (y/n): " answer

if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo ""
    echo "To use a .env file instead, run:"
    echo "  ./set-fly-secrets.sh /path/to/.env"
    echo ""
    echo "Or transfer your .env file first:"
    echo "  scp user@other-machine:/path/to/.env ."
    echo "  ./set-fly-secrets.sh .env"
    exit 0
fi

echo ""
echo "Enter your secret values (press Enter after each):"
echo ""

# Frontend secrets
read -p "VITE_AUTH0_DOMAIN: " VITE_AUTH0_DOMAIN
if [ -n "$VITE_AUTH0_DOMAIN" ]; then
    flyctl secrets set VITE_AUTH0_DOMAIN="$VITE_AUTH0_DOMAIN"
fi

read -p "VITE_AUTH0_CLIENT_ID: " VITE_AUTH0_CLIENT_ID
if [ -n "$VITE_AUTH0_CLIENT_ID" ]; then
    flyctl secrets set VITE_AUTH0_CLIENT_ID="$VITE_AUTH0_CLIENT_ID"
fi

read -p "VITE_AUTH0_AUDIENCE (optional, press Enter to skip): " VITE_AUTH0_AUDIENCE
if [ -n "$VITE_AUTH0_AUDIENCE" ]; then
    flyctl secrets set VITE_AUTH0_AUDIENCE="$VITE_AUTH0_AUDIENCE"
fi

read -p "VITE_AUTH0_REDIRECT_URI (default: https://lost-camp-studios.fly.dev/callback, press Enter to use default): " VITE_AUTH0_REDIRECT_URI
if [ -z "$VITE_AUTH0_REDIRECT_URI" ]; then
    VITE_AUTH0_REDIRECT_URI="https://lost-camp-studios.fly.dev/callback"
fi
flyctl secrets set VITE_AUTH0_REDIRECT_URI="$VITE_AUTH0_REDIRECT_URI"

read -p "VITE_API_URL (default: https://lost-camp-studios.fly.dev, press Enter to use default): " VITE_API_URL
if [ -z "$VITE_API_URL" ]; then
    VITE_API_URL="https://lost-camp-studios.fly.dev"
fi
flyctl secrets set VITE_API_URL="$VITE_API_URL"

echo ""
read -p "Do you want to set Stripe secrets? (y/n): " set_stripe
if [ "$set_stripe" = "y" ] || [ "$set_stripe" = "Y" ]; then
    read -p "STRIPE_SECRET_KEY: " STRIPE_SECRET_KEY
    if [ -n "$STRIPE_SECRET_KEY" ]; then
        flyctl secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
    fi
    
    read -p "STRIPE_PRICE_ID: " STRIPE_PRICE_ID
    if [ -n "$STRIPE_PRICE_ID" ]; then
        flyctl secrets set STRIPE_PRICE_ID="$STRIPE_PRICE_ID"
    fi
    
    read -p "STRIPE_WEBHOOK_SECRET: " STRIPE_WEBHOOK_SECRET
    if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
        flyctl secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
    fi
fi

echo ""
echo "=========================================="
echo "✓ Secrets set successfully!"
echo "=========================================="
echo ""
echo "Current secrets:"
flyctl secrets list
echo ""
echo "Next step: Deploy the app"
echo "  flyctl deploy"
