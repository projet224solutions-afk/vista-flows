#!/bin/bash

echo "============================================"
echo "🔍 DIAGNOSTIC 224SOLUTIONS - SERVEUR"
echo "============================================"
echo ""

# 1. Vérifier le dossier public_html
echo "📂 1. Contenu de public_html :"
ls -lah /home/clp/public_html/ | head -20
echo ""

# 2. Vérifier index.html
echo "📄 2. Vérification index.html :"
if [ -f "/home/clp/public_html/index.html" ]; then
    echo "✅ index.html existe"
    echo "Taille: $(du -h /home/clp/public_html/index.html | cut -f1)"
    echo "Nombre de lignes: $(wc -l < /home/clp/public_html/index.html)"
    echo ""
    echo "--- Premières 10 lignes ---"
    head -10 /home/clp/public_html/index.html
    echo ""
    echo "--- Dernières 5 lignes ---"
    tail -5 /home/clp/public_html/index.html
else
    echo "❌ index.html MANQUANT !"
fi
echo ""

# 3. Vérifier .htaccess
echo "⚙️  3. Vérification .htaccess :"
if [ -f "/home/clp/public_html/.htaccess" ]; then
    echo "✅ .htaccess existe"
    cat /home/clp/public_html/.htaccess
else
    echo "❌ .htaccess MANQUANT !"
fi
echo ""

# 4. Vérifier le dossier assets
echo "📦 4. Dossier assets :"
if [ -d "/home/clp/public_html/assets" ]; then
    echo "✅ Dossier assets existe"
    echo "Nombre de fichiers: $(ls -1 /home/clp/public_html/assets/ | wc -l)"
    ls -lh /home/clp/public_html/assets/ | head -10
else
    echo "❌ Dossier assets MANQUANT !"
fi
echo ""

# 5. Vérifier les permissions
echo "🔐 5. Permissions :"
ls -ld /home/clp/public_html/
ls -l /home/clp/public_html/index.html 2>/dev/null || echo "index.html n'existe pas"
ls -ld /home/clp/public_html/assets/ 2>/dev/null || echo "assets/ n'existe pas"
echo ""

# 6. Vérifier Apache
echo "🌐 6. Apache :"
systemctl status apache2 --no-pager -l 2>/dev/null || systemctl status httpd --no-pager -l 2>/dev/null || echo "Impossible de vérifier Apache"
echo ""

# 7. Vérifier les logs Apache récents
echo "📋 7. Logs Apache récents (10 dernières lignes) :"
tail -10 /var/log/apache2/error.log 2>/dev/null || tail -10 /var/log/httpd/error_log 2>/dev/null || echo "Logs non accessibles"
echo ""

# 8. Test curl local
echo "🔄 8. Test curl local :"
curl -s -I http://localhost | head -10
echo ""

echo "============================================"
echo "✅ DIAGNOSTIC TERMINÉ"
echo "============================================"
