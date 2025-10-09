#!/bin/bash
# Script pour nettoyer rapidement tous les NavigationFooter

# Pages à nettoyer
pages=(
  "src/pages/Index.tsx"
  "src/pages/LivreurDashboard.tsx" 
  "src/pages/Marketplace.tsx"
  "src/pages/NotFound.tsx"
  "src/pages/PDGDashboard.tsx"
  "src/pages/Profil.tsx"
  "src/pages/SyndicatDashboard.tsx"
  "src/pages/TaxiDashboard.tsx"
  "src/pages/Tracking.tsx"
  "src/pages/TransitaireDashboard.tsx"
)

echo "Nettoyage des NavigationFooter en cours..."

# Pour chaque page, supprimer l'import et l'usage de NavigationFooter
for page in "${pages[@]}"; do
  if [ -f "$page" ]; then
    echo "Nettoyage de $page"
    # Supprimer l'import
    sed -i '/NavigationFooter.*@\/components\/NavigationFooter/d' "$page"
    # Supprimer l'usage JSX
    sed -i '/<NavigationFooter \/>/d' "$page"
  fi
done

echo "Nettoyage terminé!"