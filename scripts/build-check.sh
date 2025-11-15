#!/bin/bash

# 🔍 Script de vérification avant build Netlify
# Détecte les problèmes courants qui causent des pages blanches

echo "🔍 Vérification pré-build pour Netlify..."
echo "=========================================="

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

# 1. Vérifier que node_modules existe
echo -e "\n📦 Vérification des dépendances..."
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ node_modules manquant${NC}"
    echo "   Exécutez: npm install"
    ((errors++))
else
    echo -e "${GREEN}✅ node_modules présent${NC}"
fi

# 2. Vérifier les fichiers critiques
echo -e "\n📄 Vérification des fichiers critiques..."
critical_files=(
    "index.html"
    "src/main.tsx"
    "src/App.tsx"
    "vite.config.ts"
    "netlify.toml"
    "public/_redirects"
)

for file in "${critical_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ $file manquant${NC}"
        ((errors++))
    else
        echo -e "${GREEN}✅ $file présent${NC}"
    fi
done

# 3. Vérifier les variables d'environnement critiques
echo -e "\n🔑 Vérification des variables d'environnement..."
required_vars=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "VITE_ENCRYPTION_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ $var non définie${NC}"
        ((errors++))
    else
        # Afficher juste les premiers caractères pour la sécurité
        value="${!var}"
        masked="${value:0:10}...${value: -4}"
        echo -e "${GREEN}✅ $var: $masked${NC}"
    fi
done

# 4. Vérifier la configuration package.json
echo -e "\n📋 Vérification de package.json..."
if ! grep -q '"build":' package.json; then
    echo -e "${RED}❌ Script 'build' manquant dans package.json${NC}"
    ((errors++))
else
    echo -e "${GREEN}✅ Script 'build' présent${NC}"
fi

# 5. Vérifier le fichier netlify.toml
echo -e "\n⚙️  Vérification de netlify.toml..."
if [ -f "netlify.toml" ]; then
    if grep -q 'publish = "dist"' netlify.toml; then
        echo -e "${GREEN}✅ Publish directory correctement configuré (dist)${NC}"
    else
        echo -e "${RED}❌ Publish directory incorrect dans netlify.toml${NC}"
        ((errors++))
    fi
else
    echo -e "${YELLOW}⚠️  netlify.toml manquant (optionnel mais recommandé)${NC}"
    ((warnings++))
fi

# 6. Vérifier le fichier _redirects
echo -e "\n🔀 Vérification des redirections SPA..."
if [ -f "public/_redirects" ]; then
    if grep -q '/\* /index.html 200' public/_redirects; then
        echo -e "${GREEN}✅ Redirection SPA configurée${NC}"
    else
        echo -e "${RED}❌ Redirection SPA manquante dans public/_redirects${NC}"
        ((errors++))
    fi
else
    echo -e "${RED}❌ Fichier public/_redirects manquant${NC}"
    ((errors++))
fi

# 7. Test de build (optionnel, commenté car peut être long)
# echo -e "\n🏗️  Test de build..."
# if npm run build > /dev/null 2>&1; then
#     echo -e "${GREEN}✅ Build test réussi${NC}"
# else
#     echo -e "${RED}❌ Build test échoué${NC}"
#     ((errors++))
# fi

# Résumé
echo -e "\n=========================================="
echo -e "📊 Résumé de la vérification:"
echo -e "   Erreurs: $errors"
echo -e "   Avertissements: $warnings"

if [ $errors -gt 0 ]; then
    echo -e "\n${RED}❌ Échec: $errors erreur(s) détectée(s)${NC}"
    echo -e "   Corrigez les erreurs avant de déployer sur Netlify."
    exit 1
elif [ $warnings -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️  $warnings avertissement(s) détecté(s)${NC}"
    echo -e "   Le build devrait fonctionner mais vérifiez les avertissements."
    exit 0
else
    echo -e "\n${GREEN}✅ Toutes les vérifications sont passées!${NC}"
    echo -e "   Votre projet est prêt pour Netlify."
    exit 0
fi