#!/bin/bash

# Script pour remplacer tous les FCFA par GNF dans les fichiers du projet

echo "🔄 Remplacement de FCFA par GNF dans tous les fichiers..."

# Trouver tous les fichiers .tsx et .ts dans src/
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/FCFA/GNF/g' {} +

echo "✅ Remplacement terminé !"
echo "📊 Vérification..."

# Compter les occurrences restantes de FCFA
remaining=$(grep -r "FCFA" src --include="*.tsx" --include="*.ts" | wc -l)

if [ $remaining -eq 0 ]; then
    echo "✅ Tous les FCFA ont été remplacés par GNF"
else
    echo "⚠️  Il reste $remaining occurrences de FCFA"
fi
