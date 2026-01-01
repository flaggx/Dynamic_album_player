#!/bin/sh
set -e

# Default backend URL (localhost since both run in same container)
export BACKEND_URL=${BACKEND_URL:-http://localhost:3001}

# Substitute environment variables in nginx config
envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx in background (non-blocking)
nginx

# Start backend server as main process (so container stays alive)
cd /app/backend
exec node dist/index.js

