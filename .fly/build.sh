#!/bin/sh
set -e

# This script is used by fly.io to build the Docker image
# It passes secrets as build arguments to Docker

docker build \
  --build-arg VITE_AUTH0_DOMAIN="${VITE_AUTH0_DOMAIN}" \
  --build-arg VITE_AUTH0_CLIENT_ID="${VITE_AUTH0_CLIENT_ID}" \
  --build-arg VITE_AUTH0_AUDIENCE="${VITE_AUTH0_AUDIENCE}" \
  --build-arg VITE_AUTH0_REDIRECT_URI="${VITE_AUTH0_REDIRECT_URI}" \
  --build-arg VITE_API_URL="${VITE_API_URL}" \
  -t flyio/lost-camp-studios:latest .

