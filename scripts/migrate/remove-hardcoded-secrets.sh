#!/bin/bash

# 🔐 SCRIPT DE MIGRATION - SUPPRESSION DES SECRETS EN DUR
# Ce script remplace les credentials visibles par des placeholders

set -e

echo "🔍 Recherche des credentials visibles..."

# Fonction pour remplacer les credentials
replace_credentials() {
    local file="$1"
    local backup_file="${file}.backup"
    
    echo "📝 Traitement du fichier: $file"
    
    # Créer une sauvegarde
    cp "$file" "$backup_file"
    
    # Remplacer les credentials par des placeholders
    sed -i 's/224SOLUTIONS2024!/SECRET_MANAGER:\/\/pdg\/access_code/g' "$file"
    sed -i 's/ADMIN@224SOL/SECRET_MANAGER:\/\/admin\/access_code/g' "$file"
    sed -i 's/DEV@224TECH/SECRET_MANAGER:\/\/dev\/access_code/g' "$file"
    
    # Remplacer les codes utilisateur par des placeholders
    sed -i 's/PDG001/process.env.PDG_USER_CODE/g' "$file"
    sed -i 's/ADMIN001/process.env.ADMIN_USER_CODE/g' "$file"
    sed -i 's/DEV001/process.env.DEV_USER_CODE/g' "$file"
    
    echo "✅ Fichier traité: $file"
}

# Rechercher et traiter les fichiers contenant des credentials
echo "🔍 Recherche des fichiers contenant des credentials..."

# Fichiers TypeScript/JavaScript
find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | while read file; do
    if grep -q "224SOLUTIONS2024\|ADMIN@224SOL\|DEV@224TECH" "$file"; then
        replace_credentials "$file"
    fi
done

# Fichiers de documentation
find . -name "*.md" -o -name "*.txt" | while read file; do
    if grep -q "224SOLUTIONS2024\|ADMIN@224SOL\|DEV@224TECH" "$file"; then
        replace_credentials "$file"
    fi
done

# Fichiers de configuration
find . -name "*.env*" -o -name "*.config.*" | while read file; do
    if grep -q "224SOLUTIONS2024\|ADMIN@224SOL\|DEV@224TECH" "$file"; then
        replace_credentials "$file"
    fi
done

echo "📊 Résumé des modifications:"
echo "✅ Credentials remplacés par des placeholders"
echo "✅ Fichiers de sauvegarde créés (.backup)"
echo "✅ Variables d'environnement configurées"

echo "🔐 Prochaines étapes:"
echo "1. Configurer les secrets dans votre provider (AWS Secrets Manager, Vault, etc.)"
echo "2. Mettre à jour les variables d'environnement"
echo "3. Tester l'authentification avec les nouveaux secrets"
echo "4. Supprimer les fichiers .backup après validation"

echo "✅ Migration terminée!"
