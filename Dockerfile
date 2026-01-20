# Multi-stage Dockerfile for frontend + backend
# Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Accept build arguments for Auth0 and API URL
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ARG VITE_AUTH0_REDIRECT_URI
ARG VITE_API_URL

# Copy frontend package files
COPY frontend/package*.json ./
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ .

# Create .env file from build arguments for Vite to read during build
# This ensures the values are available at build time
RUN echo "VITE_AUTH0_DOMAIN=${VITE_AUTH0_DOMAIN}" > .env && \
    echo "VITE_AUTH0_CLIENT_ID=${VITE_AUTH0_CLIENT_ID}" >> .env && \
    echo "VITE_AUTH0_AUDIENCE=${VITE_AUTH0_AUDIENCE}" >> .env && \
    echo "VITE_AUTH0_REDIRECT_URI=${VITE_AUTH0_REDIRECT_URI:-https://lostcampstudios.com/callback}" >> .env && \
    echo "VITE_API_URL=${VITE_API_URL:-https://lostcampstudios.com}" >> .env && \
    cat .env

# Set as environment variables for Vite build (Vite reads from .env and process.env)
ENV VITE_AUTH0_DOMAIN=${VITE_AUTH0_DOMAIN}
ENV VITE_AUTH0_CLIENT_ID=${VITE_AUTH0_CLIENT_ID}
ENV VITE_AUTH0_AUDIENCE=${VITE_AUTH0_AUDIENCE}
ENV VITE_AUTH0_REDIRECT_URI=${VITE_AUTH0_REDIRECT_URI:-https://lostcampstudios.com/callback}
ENV VITE_API_URL=${VITE_API_URL:-https://lostcampstudios.com}

# Build frontend
RUN npm run build

# Build backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Install dependencies (this layer will be cached if package.json doesn't change)
RUN npm ci --prefer-offline --no-audit

# Copy backend source code
COPY backend/src ./src

# Build backend
RUN npm run build

# Production stage - combine both
FROM node:20-alpine

# Install nginx and gettext for envsubst
RUN apk add --no-cache nginx gettext

# Create directories
RUN mkdir -p /app/backend /app/frontend/dist /etc/nginx/templates /etc/nginx/http.d /var/log/nginx /var/cache/nginx /run/nginx

# Copy backend files
COPY --from=backend-builder /app/backend/package*.json /app/backend/
COPY --from=backend-builder /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-builder /app/backend/dist /app/backend/dist

# Copy frontend built files
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx server configuration template (default nginx.conf includes /etc/nginx/http.d/*.conf)
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Create storage directory structure for backend
RUN mkdir -p /app/backend/storage/data /app/backend/storage/uploads

# Set working directory to backend
WORKDIR /app/backend

# Expose ports
EXPOSE 80 3001

# Start both services
CMD ["/start.sh"]
