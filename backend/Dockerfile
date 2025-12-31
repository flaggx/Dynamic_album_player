# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Create uploads and data directories
RUN mkdir -p uploads data

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]

