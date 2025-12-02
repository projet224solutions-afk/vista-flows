#!/bin/bash

# 🚀 SCRIPT DE DÉPLOIEMENT HOSTINGER - 224SOLUTIONS
# Ce script prépare l'application pour le déploiement sur Hostinger

set -e  # Arrêter en cas d'erreur

echo "🚀 Début du déploiement Hostinger..."
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Nettoyage
echo "🧹 Nettoyage des fichiers de build précédents..."
rm -rf dist/
rm -rf hostinger-deploy/

# 2. Build de production
echo ""
echo "📦 Build de l'application en mode production..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Erreur: Le dossier dist/ n'a pas été créé${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build terminé avec succès${NC}"

# 3. Créer le dossier de déploiement
echo ""
echo "📁 Préparation des fichiers pour Hostinger..."
mkdir -p hostinger-deploy

# 4. Copier le contenu de dist
cp -r dist/* hostinger-deploy/

# 5. Créer le fichier .htaccess
echo ""
echo "🔧 Création du fichier .htaccess..."
cat > hostinger-deploy/.htaccess << 'EOF'
# 224Solutions - Hostinger Configuration

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Force HTTPS (recommandé)
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # Redirect all requests to index.html except existing files
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  
  # CORS Headers (si nécessaire)
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json application/xml
</IfModule>

# Cache Control
<IfModule mod_expires.c>
  ExpiresActive On
  
  # Images
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/x-icon "access plus 1 year"
  
  # CSS et JavaScript
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
  
  # Fonts
  ExpiresByType font/woff "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType application/font-woff "access plus 1 year"
  ExpiresByType application/font-woff2 "access plus 1 year"
  
  # HTML (ne pas cacher)
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# Protect sensitive files
<FilesMatch "\.(env|sql|md|json|lock)$">
  Order allow,deny
  Deny from all
</FilesMatch>

# Disable directory browsing
Options -Indexes

# Error documents (optionnel)
# ErrorDocument 404 /index.html
# ErrorDocument 500 /index.html
EOF

echo -e "${GREEN}✅ Fichier .htaccess créé${NC}"

# 6. Créer un fichier README pour le déploiement
cat > hostinger-deploy/README_DEPLOY.txt << 'EOF'
📦 INSTRUCTIONS DE DÉPLOIEMENT HOSTINGER

1. CONNEXION À HOSTINGER
   - Aller sur hpanel.hostinger.com
   - Se connecter avec vos identifiants
   - Sélectionner votre hébergement

2. OUVRIR FILE MANAGER
   - Cliquer sur "File Manager" dans le menu
   - Naviguer vers le dossier "public_html"

3. NETTOYER L'ANCIEN CONTENU
   ⚠️ IMPORTANT: Supprimer TOUS les fichiers dans public_html
   - Sélectionner tous les fichiers (Ctrl+A)
   - Cliquer sur "Delete"
   - Confirmer la suppression

4. UPLOADER LES NOUVEAUX FICHIERS
   - Cliquer sur "Upload"
   - Sélectionner TOUS les fichiers de ce dossier (hostinger-deploy)
   - Attendre la fin de l'upload (barre de progression)
   
   OU utiliser un client FTP:
   - Host: ftp.votredomaine.com
   - Port: 21
   - Uploader tout le contenu vers public_html/

5. VÉRIFIER LES PERMISSIONS
   - Dossiers: 755
   - Fichiers: 644
   - .htaccess: 644

6. TESTER L'APPLICATION
   - Vider le cache du navigateur (Ctrl+Shift+Delete)
   - Ouvrir votre site en navigation privée
   - Ouvrir DevTools (F12) pour vérifier les erreurs
   - Tester la navigation entre les pages

7. EN CAS DE PROBLÈME
   - Consulter HOSTINGER_TROUBLESHOOTING.md
   - Vérifier les logs d'erreur dans hPanel
   - Contacter le support Hostinger si nécessaire

✅ CHECKLIST
□ Ancien contenu supprimé de public_html
□ Tous les fichiers uploadés
□ Permissions correctes
□ Cache navigateur vidé
□ Site accessible
□ Pas d'erreurs 404
□ Navigation fonctionne

📞 Support: support@hostinger.com
EOF

# 7. Créer l'archive ZIP
echo ""
echo "📦 Création de l'archive ZIP..."
cd hostinger-deploy
zip -r ../224solutions-hostinger.zip . -x "*.DS_Store" "*.git*"
cd ..

echo -e "${GREEN}✅ Archive créée: 224solutions-hostinger.zip${NC}"

# 8. Afficher les statistiques
echo ""
echo "📊 Statistiques du déploiement:"
echo "   Taille de l'archive: $(du -h 224solutions-hostinger.zip | cut -f1)"
echo "   Nombre de fichiers: $(find hostinger-deploy -type f | wc -l)"
echo ""

# 9. Instructions finales
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ PRÉPARATION TERMINÉE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📂 Fichiers prêts pour le déploiement:"
echo "   1. Dossier: hostinger-deploy/"
echo "   2. Archive: 224solutions-hostinger.zip"
echo ""
echo "📋 PROCHAINES ÉTAPES:"
echo ""
echo "   Option A - Upload Manuel (Recommandé pour première fois):"
echo "   1. Aller sur hpanel.hostinger.com"
echo "   2. File Manager → public_html"
echo "   3. Supprimer TOUT le contenu existant"
echo "   4. Uploader tout le contenu de 'hostinger-deploy/'"
echo ""
echo "   Option B - Upload FTP:"
echo "   1. Utiliser FileZilla ou similaire"
echo "   2. Se connecter à ftp.votredomaine.com"
echo "   3. Aller dans /public_html/"
echo "   4. Uploader tout le contenu de 'hostinger-deploy/'"
echo ""
echo "   Option C - Upload ZIP (Le plus rapide):"
echo "   1. Uploader 224solutions-hostinger.zip sur Hostinger"
echo "   2. File Manager → public_html"
echo "   3. Clic droit sur le ZIP → Extract"
echo "   4. Supprimer le fichier ZIP après extraction"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Vider le cache du navigateur après le déploiement"
echo "   - Tester en navigation privée"
echo "   - Consulter HOSTINGER_TROUBLESHOOTING.md si problème"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 10. Ouvrir le dossier (optionnel, selon l'OS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open hostinger-deploy
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open hostinger-deploy 2>/dev/null || echo "Dossier: hostinger-deploy/"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    explorer hostinger-deploy
fi
