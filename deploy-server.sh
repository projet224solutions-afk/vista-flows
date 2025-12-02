#!/bin/bash

###############################################################################
# Script de déploiement automatique - 224Solutions
# Usage: ./deploy-server.sh
###############################################################################

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement 224Solutions - Démarrage..."
echo "=========================================="

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/clp/htdocs/224solutionapp.com"
PUBLIC_DIR="/home/clp/public_html"

echo -e "${YELLOW}📂 Répertoire du projet: $PROJECT_DIR${NC}"
echo -e "${YELLOW}📂 Répertoire public: $PUBLIC_DIR${NC}"
echo ""

# Étape 1: Aller dans le répertoire du projet
echo "1️⃣  Navigation vers le répertoire du projet..."
cd $PROJECT_DIR || exit 1
echo -e "${GREEN}✅ Dans le répertoire: $(pwd)${NC}"
echo ""

# Étape 2: Récupérer les dernières modifications depuis GitHub
echo "2️⃣  Récupération des dernières modifications depuis GitHub..."
git fetch origin
git reset --hard origin/main
echo -e "${GREEN}✅ Code mis à jour depuis GitHub${NC}"
echo ""

# Étape 3: Installer/Mettre à jour les dépendances
echo "3️⃣  Installation des dépendances npm..."
npm install --production=false
echo -e "${GREEN}✅ Dépendances installées${NC}"
echo ""

# Étape 4: Vérifier que le fichier .env existe
echo "4️⃣  Vérification du fichier .env..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Fichier .env manquant, création...${NC}"
    cat > .env << 'EOF'
VITE_SUPABASE_URL=https://cjomojytxdjxbnstpfsg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqb21vanl0eGRqeGJuc3RwZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NTE0NzcsImV4cCI6MjA0ODEyNzQ3N30.VEiPI04CrIx0FTNQOLwZNp37a5Bhy4XZ4vJh1_gkuNI
EOF
    echo -e "${GREEN}✅ Fichier .env créé${NC}"
else
    echo -e "${GREEN}✅ Fichier .env existe${NC}"
fi
echo ""

# Étape 5: Builder l'application
echo "5️⃣  Build de l'application..."
npm run build
echo -e "${GREEN}✅ Application buildée avec succès${NC}"
echo ""

# Étape 6: Sauvegarder l'ancien déploiement
echo "6️⃣  Sauvegarde de l'ancien déploiement..."
if [ -d "$PUBLIC_DIR" ] && [ "$(ls -A $PUBLIC_DIR)" ]; then
    BACKUP_DIR="/home/clp/backups/deploy_$(date +%Y%m%d_%H%M%S)"
    mkdir -p /home/clp/backups
    cp -r $PUBLIC_DIR $BACKUP_DIR
    echo -e "${GREEN}✅ Sauvegarde créée: $BACKUP_DIR${NC}"
else
    echo -e "${YELLOW}⚠️  Pas de déploiement précédent à sauvegarder${NC}"
fi
echo ""

# Étape 7: Copier les fichiers buildés vers le répertoire public
echo "7️⃣  Déploiement des fichiers..."
rm -rf $PUBLIC_DIR/*
cp -r dist/* $PUBLIC_DIR/
echo -e "${GREEN}✅ Fichiers déployés vers $PUBLIC_DIR${NC}"
echo ""

# Étape 8: Copier le .htaccess s'il n'existe pas
echo "8️⃣  Vérification du fichier .htaccess..."
if [ ! -f "$PUBLIC_DIR/.htaccess" ]; then
    echo -e "${YELLOW}⚠️  .htaccess manquant, création...${NC}"
    cat > $PUBLIC_DIR/.htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

Options -Indexes
EOF
    echo -e "${GREEN}✅ .htaccess créé${NC}"
else
    echo -e "${GREEN}✅ .htaccess existe${NC}"
fi
echo ""

# Étape 9: Ajuster les permissions
echo "9️⃣  Ajustement des permissions..."
chown -R clp:clp $PUBLIC_DIR
chmod -R 755 $PUBLIC_DIR
echo -e "${GREEN}✅ Permissions ajustées${NC}"
echo ""

# Étape 10: Vérifier le déploiement
echo "🔍 Vérification du déploiement..."
if [ -f "$PUBLIC_DIR/index.html" ]; then
    echo -e "${GREEN}✅ index.html présent${NC}"
else
    echo -e "${RED}❌ index.html manquant!${NC}"
    exit 1
fi

if [ -d "$PUBLIC_DIR/assets" ]; then
    ASSETS_COUNT=$(ls -1 $PUBLIC_DIR/assets | wc -l)
    echo -e "${GREEN}✅ Dossier assets présent ($ASSETS_COUNT fichiers)${NC}"
else
    echo -e "${RED}❌ Dossier assets manquant!${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!${NC}"
echo "=========================================="
echo ""
echo "🌐 Votre site est accessible à: http://224solutionapp.com"
echo "📊 Version déployée: $(git rev-parse --short HEAD)"
echo "📅 Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "💡 Pour voir les logs:"
echo "   tail -f /home/clp/logs/access.log"
echo "   tail -f /home/clp/logs/error.log"
echo ""
