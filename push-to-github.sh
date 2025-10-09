#!/bin/bash

echo "🚀 SCRIPT AUTOMATIQUE - PUSH VERS GITHUB"
echo "========================================"
echo ""

# Vérifier si git est configuré
if ! git config user.email > /dev/null 2>&1; then
    echo "⚙️  Configuration Git nécessaire..."
    echo ""
    read -p "Votre email GitHub: " email
    read -p "Votre nom: " name
    git config --global user.email "$email"
    git config --global user.name "$name"
    echo "✅ Git configuré!"
    echo ""
fi

# Récupérer les changements distants d'abord
echo "📥 Récupération des changements GitHub..."
git fetch origin
git pull --rebase origin main

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du pull. Résolvez les conflits et relancez le script."
    exit 1
fi

echo "✅ Pull réussi!"
echo ""

# Ajouter tous les fichiers
echo "📦 Ajout des fichiers modifiés..."
git add .

# Commit
echo "💾 Création du commit..."
git commit -m "Persistence layer complete - delivery/escrow/notifications tables + security fixes

✅ 3 nouvelles tables DB (52 colonnes)
✅ 12 méthodes DbStorage  
✅ 11 routes sécurisées
✅ Corrections sécurité
✅ Documentation mise à jour"

if [ $? -eq 0 ]; then
    echo "✅ Commit créé!"
else
    echo "ℹ️  Pas de changements à commiter (peut-être déjà fait)"
fi

echo ""

# Push vers GitHub
echo "🚀 Push vers GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ========================================="
    echo "✅  SUCCÈS ! Modifications poussées sur GitHub"
    echo "✅ ========================================="
    echo ""
    echo "Vous pouvez maintenant faire 'git pull' sur Windows!"
else
    echo ""
    echo "❌ Erreur lors du push."
    echo "Vérifiez vos permissions GitHub ou contactez le support."
    exit 1
fi
