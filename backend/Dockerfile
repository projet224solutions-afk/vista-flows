# ==================== STAGE 1: Build ====================
FROM node:18-alpine AS builder

WORKDIR /app

# Copier uniquement les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances
RUN npm ci

# Copier le code source
COPY . .

# ==================== STAGE 2: Production ====================
FROM node:18-alpine

WORKDIR /app

# Variables d'environnement de base
ENV NODE_ENV=production
ENV PORT=3001

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copier les dépendances et le code depuis le builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src

# Installer toutes les dépendances (dev + production)
RUN npm ci && \
    npm cache clean --force

# Créer les dossiers nécessaires avec les bonnes permissions
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs /app

# Changer vers l'utilisateur non-root
USER nodejs

# Exposer le port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Démarrer le serveur
CMD ["node", "src/server.js"]
