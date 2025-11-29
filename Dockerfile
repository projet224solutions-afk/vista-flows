FROM node:18-slim

WORKDIR /app

# Installer uniquement les dépendances de production
COPY package.json package-lock.json* ./
RUN npm install --production --silent || npm install --production --no-audit --silent

# Copier le script de migration
COPY apply-wallet-fix.js ./
COPY supabase ./supabase
COPY scripts ./scripts

ENV NODE_ENV=production

CMD ["node", "apply-wallet-fix.js"]
# ==================== STAGE 1: Build ====================
FROM node:18-alpine AS builder

WORKDIR /app

# Copier uniquement les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances
RUN npm install

# Copier le code source
COPY . .

# ==================== STAGE 2: Production ====================
# Stage 2
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copier tout le build du stage 1
COPY --from=builder /app /app

RUN npm install --omit=dev && npm cache clean --force

RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3001

CMD ["node", "src/server.js"]
# Copier le fichier .env
COPY .env ./
