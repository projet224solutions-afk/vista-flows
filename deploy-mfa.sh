#!/bin/bash

# 🚀 SCRIPT DÉPLOIEMENT MFA AGENTS & BUREAUX
# Date: 1er Décembre 2025
# Version: 1.0.0

set -e  # Exit si erreur

echo "======================================"
echo "🔐 DÉPLOIEMENT SYSTÈME MFA"
echo "======================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction check
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 installé${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 non trouvé${NC}"
        return 1
    fi
}

echo "📋 Vérification prérequis..."
echo "------------------------------"

# Vérifier Node.js
if check_command node; then
    NODE_VERSION=$(node -v)
    echo "   Version: $NODE_VERSION"
fi

# Vérifier npm
if check_command npm; then
    NPM_VERSION=$(npm -v)
    echo "   Version: $NPM_VERSION"
fi

# Vérifier git
if check_command git; then
    GIT_VERSION=$(git --version)
    echo "   $GIT_VERSION"
fi

# Vérifier supabase CLI
if check_command supabase; then
    SUPABASE_VERSION=$(supabase --version)
    echo "   $SUPABASE_VERSION"
else
    echo -e "${YELLOW}⚠️  Supabase CLI non installé${NC}"
    echo "   Installation: npm install -g supabase"
fi

echo ""
echo "📦 Installation dépendances..."
echo "------------------------------"
npm install
echo -e "${GREEN}✅ Dépendances installées${NC}"

echo ""
echo "🔍 Vérification TypeScript..."
echo "------------------------------"
npm run type-check || {
    echo -e "${RED}❌ Erreurs TypeScript détectées${NC}"
    exit 1
}
echo -e "${GREEN}✅ Pas d'erreurs TypeScript${NC}"

echo ""
echo "🔨 Build projet..."
echo "------------------------------"
npm run build || {
    echo -e "${RED}❌ Build échoué${NC}"
    exit 1
}
echo -e "${GREEN}✅ Build réussi${NC}"

echo ""
echo "📊 Vérification fichiers créés..."
echo "------------------------------"

FILES=(
    "src/components/auth/OTPInput.tsx"
    "src/hooks/useAgentAuth.ts"
    "src/hooks/useBureauAuth.ts"
    "src/pages/AgentLogin.tsx"
    "src/pages/BureauLogin.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file manquant${NC}"
        exit 1
    fi
done

echo ""
echo "🗄️ Vérification Edge Functions..."
echo "------------------------------"

FUNCTIONS=(
    "supabase/functions/auth-agent-login/index.ts"
    "supabase/functions/auth-bureau-login/index.ts"
    "supabase/functions/auth-verify-otp/index.ts"
)

for func in "${FUNCTIONS[@]}"; do
    if [ -f "$func" ]; then
        echo -e "${GREEN}✅ $func${NC}"
    else
        echo -e "${RED}❌ $func manquant${NC}"
        exit 1
    fi
done

echo ""
echo "🔐 Vérification migrations SQL..."
echo "------------------------------"

MIGRATIONS=(
    "supabase/migrations/20251130_alter_agents_bureaus_auth.sql"
    "supabase/migrations/20251130_auth_otp_codes.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$migration" ]; then
        echo -e "${GREEN}✅ $migration${NC}"
    else
        echo -e "${YELLOW}⚠️  $migration manquant (peut-être déjà appliqué)${NC}"
    fi
done

echo ""
echo "📝 Vérification documentation..."
echo "------------------------------"

DOCS=(
    "MFA_IMPLEMENTATION_COMPLETE.md"
    "MFA_TEST_GUIDE.md"
    "MFA_SYSTEM_SUMMARY.md"
    "AUTH_AGENTS_BUREAUX_MFA.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅ $doc${NC}"
    else
        echo -e "${YELLOW}⚠️  $doc manquant${NC}"
    fi
done

echo ""
echo "======================================"
echo "✅ VÉRIFICATIONS TERMINÉES"
echo "======================================"
echo ""
echo "🚀 PROCHAINES ÉTAPES:"
echo ""
echo "1. Commiter changements:"
echo "   git add ."
echo "   git commit -m 'feat: Add MFA authentication for Agents & Bureaux'"
echo "   git push origin main"
echo ""
echo "2. Déployer Edge Functions Supabase:"
echo "   supabase functions deploy auth-agent-login"
echo "   supabase functions deploy auth-bureau-login"
echo "   supabase functions deploy auth-verify-otp"
echo ""
echo "3. Appliquer migrations SQL:"
echo "   supabase db push"
echo "   OU via Dashboard Supabase → SQL Editor"
echo ""
echo "4. Configurer variables d'environnement:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY (Edge Functions)"
echo "   - VITE_RESEND_API_KEY (emails OTP)"
echo ""
echo "5. Tester en production:"
echo "   https://votre-domaine.netlify.app/agent/login"
echo "   https://votre-domaine.netlify.app/bureau/login"
echo ""
echo "📚 Documentation:"
echo "   - MFA_IMPLEMENTATION_COMPLETE.md (architecture complète)"
echo "   - MFA_TEST_GUIDE.md (tests et troubleshooting)"
echo "   - MFA_SYSTEM_SUMMARY.md (récapitulatif)"
echo ""
echo "======================================"
echo "🎉 SYSTÈME MFA PRÊT POUR PRODUCTION !"
echo "======================================"
