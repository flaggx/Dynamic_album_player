#!/bin/sh
set -e

# Default backend URL (localhost since both run in same container)
export BACKEND_URL=${BACKEND_URL:-http://localhost:3001}

# Ensure nginx http.d directory exists (where server blocks go)
mkdir -p /etc/nginx/http.d

# Substitute environment variables in nginx config
envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/http.d/default.conf

# Test nginx configuration
nginx -t

# Start nginx in background (non-blocking)
nginx -g "daemon off;" &

# Start backend server as main process (so container stays alive)
cd /app/backend
exec node dist/index.js

