# ==================== FRONTEND BUILD STAGE ====================
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# ==================== BACKEND BUILD STAGE ====================
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# ==================== PRODUCTION STAGE ====================
FROM node:18-alpine

# Install nginx for serving frontend
RUN apk add --no-cache nginx

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Setup nginx
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx nginx-default.conf /etc/nginx/conf.d/default.conf

# Copy frontend build
COPY --from=frontend-builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copy backend
COPY --from=backend-builder --chown=nodejs:nodejs /app /app

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app/logs /app/uploads

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Switch to nodejs user for backend
USER nodejs

EXPOSE 80 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node --version || exit 1

# Start both services
CMD ["sh", "-c", "nginx && node /app/src/server.js"]
