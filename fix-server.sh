#!/bin/bash

echo "============================================"
echo "🔧 CORRECTION AUTOMATIQUE - 224SOLUTIONS"
echo "============================================"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -d "/home/clp/htdocs/224solutionapp.com" ]; then
    echo "❌ Erreur: Répertoire du projet introuvable"
    exit 1
fi

cd /home/clp/htdocs/224solutionapp.com

echo "1️⃣  Récupération du code depuis GitHub..."
git fetch origin
git reset --hard origin/main
echo "✅ Code mis à jour"
echo ""

echo "2️⃣  Installation des dépendances..."
npm install --production=false
echo "✅ Dépendances installées"
echo ""

echo "3️⃣  Build de l'application..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build réussi"
else
    echo "❌ Build échoué - vérifiez les logs ci-dessus"
    exit 1
fi
echo ""

echo "4️⃣  Nettoyage du dossier public_html..."
rm -rf /home/clp/public_html/*
echo "✅ Dossier nettoyé"
echo ""

echo "5️⃣  Copie des fichiers buildés..."
cp -r dist/* /home/clp/public_html/
echo "✅ Fichiers copiés"
echo ""

echo "6️⃣  Création du fichier .htaccess..."
cat > /home/clp/public_html/.htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Ne pas rediriger les fichiers qui existent
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  
  # Rediriger tout vers index.html
  RewriteRule . /index.html [L]
</IfModule>

# Sécurité
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache pour les fichiers statiques
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/pdf "access plus 1 month"
  ExpiresByType image/x-icon "access plus 1 year"
</IfModule>
EOF
echo "✅ .htaccess créé"
echo ""

echo "7️⃣  Configuration des permissions..."
chmod 755 /home/clp/public_html
find /home/clp/public_html -type d -exec chmod 755 {} \;
find /home/clp/public_html -type f -exec chmod 644 {} \;
chown -R clp:clp /home/clp/public_html
echo "✅ Permissions configurées"
echo ""

echo "8️⃣  Vérification finale..."
if [ -f "/home/clp/public_html/index.html" ]; then
    echo "✅ index.html présent"
    echo "   Taille: $(du -h /home/clp/public_html/index.html | cut -f1)"
    echo "   Lignes: $(wc -l < /home/clp/public_html/index.html)"
else
    echo "❌ index.html MANQUANT après déploiement !"
    exit 1
fi

if [ -f "/home/clp/public_html/.htaccess" ]; then
    echo "✅ .htaccess présent"
else
    echo "❌ .htaccess MANQUANT !"
fi

if [ -d "/home/clp/public_html/assets" ]; then
    echo "✅ Dossier assets présent ($(ls -1 /home/clp/public_html/assets/ | wc -l) fichiers)"
else
    echo "❌ Dossier assets MANQUANT !"
fi
echo ""

echo "============================================"
echo "✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
echo "============================================"
echo ""
echo "🌐 Testez votre site : http://224solutionapp.com"
echo "💡 En cas de page blanche, videz le cache (Ctrl+Shift+R)"
echo ""
