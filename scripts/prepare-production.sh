#!/bin/bash

###############################################
# 📦 PRÉPARATION POUR PRODUCTION - 224SOLUTIONS
# Ce script prépare tous les fichiers nécessaires
# pour déployer sur Hostinger VPS
###############################################

set -e # Arrêter si erreur

echo "🚀 Préparation de 224Solutions pour production..."
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Nettoyage
echo -e "${BLUE}🧹 Nettoyage des anciens builds...${NC}"
rm -rf dist/
rm -rf deploy/
rm -f *.tar.gz *.zip

# 2. Build du frontend
echo -e "${BLUE}🔨 Build du frontend React...${NC}"
npm run build

if [ ! -d "dist" ]; then
  echo -e "${RED}❌ Erreur: le dossier dist/ n'a pas été créé${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Frontend build réussi${NC}"

# 3. Préparation du dossier de déploiement
echo -e "${BLUE}📁 Création du dossier deploy/...${NC}"
mkdir -p deploy/dist
mkdir -p deploy/backend
mkdir -p deploy/logs
mkdir -p deploy/uploads

# 4. Copie des fichiers
echo -e "${BLUE}📋 Copie des fichiers...${NC}"

# Frontend
cp -r dist/* deploy/dist/

# Backend
cp -r backend/src deploy/backend/
cp backend/package.json deploy/backend/
cp backend/package-lock.json deploy/backend/ 2>/dev/null || true

# Configuration
cp ecosystem.config.js deploy/
cp DEPLOYMENT_HOSTINGER.md deploy/

# Scripts
mkdir -p deploy/scripts
cp scripts/export-database.js deploy/scripts/ 2>/dev/null || true

# Environnement (créer un template)
cat > deploy/.env.template << 'EOF'
# Database
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/solutions224
DB_HOST=localhost
DB_PORT=5432
DB_NAME=solutions224
DB_USER=solutions224_user
DB_PASSWORD=CHANGEZ_MOI

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://votre-domaine.com
API_URL=https://votre-domaine.com/api

# Sécurité
JWT_SECRET=GENERER_UNE_CLE_ALEATOIRE_64_CARACTERES
SESSION_SECRET=GENERER_UNE_AUTRE_CLE_ALEATOIRE_64_CARACTERES
ENCRYPTION_KEY=GENERER_UNE_CLE_32_CARACTERES

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app

# Paiements
STRIPE_SECRET_KEY=sk_live_...
ORANGE_MONEY_API_KEY=...
MTN_MONEY_API_KEY=...
EOF

echo -e "${GREEN}✅ Fichiers copiés${NC}"

# 5. Export de la base de données
echo -e "${BLUE}💾 Export de la base de données...${NC}"
if command -v node &> /dev/null && [ -f "scripts/export-database.js" ]; then
  node scripts/export-database.js
  mv 224solutions-database-export-*.sql deploy/ 2>/dev/null || echo "⚠️  Pas d'export DB (à faire manuellement)"
else
  echo "⚠️  Node.js non trouvé ou script manquant, skip export DB"
fi

# 6. Création des archives
echo -e "${BLUE}📦 Création des archives...${NC}"

cd deploy

# TAR.GZ (recommandé pour Linux)
tar -czf ../224solutions-hostinger.tar.gz .
echo -e "${GREEN}✅ Créé: 224solutions-hostinger.tar.gz${NC}"

# ZIP (alternative)
if command -v zip &> /dev/null; then
  zip -r ../224solutions-hostinger.zip . -q
  echo -e "${GREEN}✅ Créé: 224solutions-hostinger.zip${NC}"
fi

cd ..

# 7. Afficher les informations
echo ""
echo -e "${GREEN}🎉 Préparation terminée !${NC}"
echo ""
echo "📁 Fichiers créés:"
echo "  - 224solutions-hostinger.tar.gz"
[ -f "224solutions-hostinger.zip" ] && echo "  - 224solutions-hostinger.zip"
echo ""
echo "📊 Taille des archives:"
ls -lh 224solutions-hostinger.* | awk '{print "  - " $9 ": " $5}'
echo ""
echo -e "${BLUE}📤 Prochaine étape:${NC}"
echo "1. Transférer l'archive vers votre VPS:"
echo -e "   ${GREEN}scp 224solutions-hostinger.tar.gz root@VOTRE_VPS_IP:/root/${NC}"
echo ""
echo "2. Sur le VPS, extraire et déployer:"
echo -e "   ${GREEN}cd /var/www${NC}"
echo -e "   ${GREEN}tar -xzf /root/224solutions-hostinger.tar.gz${NC}"
echo ""
echo "3. Suivre le guide: DEPLOYMENT_HOSTINGER.md"
echo ""
