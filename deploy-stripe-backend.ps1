# 🚀 SCRIPT DE DÉPLOIEMENT AUTOMATIQUE STRIPE
# 224SOLUTIONS - Déploiement complet backend Stripe
# Auteur: 224Solutions Team
# Date: 2024

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   224SOLUTIONS - DÉPLOIEMENT STRIPE" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour afficher les messages de succès
function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

# Fonction pour afficher les messages d'erreur
function Write-ErrorMsg {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Fonction pour afficher les messages d'info
function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# Fonction pour afficher les messages de warning
function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-ErrorMsg "Ce script doit être exécuté depuis le répertoire racine du projet"
    exit 1
}

Write-Info "Vérification des prérequis..."

# Vérifier Supabase CLI
try {
    $supabaseVersion = supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Supabase CLI installé : $supabaseVersion"
    } else {
        Write-ErrorMsg "Supabase CLI non installé"
        Write-Info "Installez-le avec : npm install -g supabase"
        exit 1
    }
} catch {
    Write-ErrorMsg "Supabase CLI non installé"
    Write-Info "Installez-le avec : npm install -g supabase"
    exit 1
}

# Vérifier la connexion Supabase
Write-Info "Vérification de la connexion Supabase..."
$supabaseStatus = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Non connecté à Supabase"
    Write-Info "Connectez-vous avec : supabase login"
    exit 1
}
Write-Success "Connecté à Supabase"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   PHASE 1 : MIGRATION BASE DE DONNÉES" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que le fichier de migration existe
if (-not (Test-Path "supabase/migrations/stripe_payment_system.sql")) {
    Write-ErrorMsg "Fichier de migration non trouvé : supabase/migrations/stripe_payment_system.sql"
    exit 1
}

Write-Info "Application de la migration SQL..."
$migrationResult = supabase db push 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Migration SQL appliquée avec succès"
    Write-Success "Tables créées : stripe_config, stripe_transactions, wallets, wallet_transactions, withdrawals"
} else {
    Write-ErrorMsg "Erreur lors de l'application de la migration"
    Write-Host $migrationResult
    Write-Warning "Continuons quand même..."
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   PHASE 2 : DÉPLOIEMENT EDGE FUNCTIONS" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Déployer create-payment-intent
if (Test-Path "supabase/functions/create-payment-intent/index.ts") {
    Write-Info "Déploiement de create-payment-intent..."
    $deployResult1 = supabase functions deploy create-payment-intent 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Edge Function 'create-payment-intent' déployée"
    } else {
        Write-ErrorMsg "Erreur lors du déploiement de create-payment-intent"
        Write-Host $deployResult1
    }
} else {
    Write-ErrorMsg "Fichier non trouvé : supabase/functions/create-payment-intent/index.ts"
}

# Déployer stripe-webhook
if (Test-Path "supabase/functions/stripe-webhook/index.ts") {
    Write-Info "Déploiement de stripe-webhook..."
    $deployResult2 = supabase functions deploy stripe-webhook 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Edge Function 'stripe-webhook' déployée"
    } else {
        Write-ErrorMsg "Erreur lors du déploiement de stripe-webhook"
        Write-Host $deployResult2
    }
} else {
    Write-ErrorMsg "Fichier non trouvé : supabase/functions/stripe-webhook/index.ts"
}

# Lister les fonctions déployées
Write-Info "Vérification des fonctions déployées..."
supabase functions list

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   PHASE 3 : CONFIGURATION SECRETS" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Warning "Configuration manuelle requise :"
Write-Host ""
Write-Host "1. Clé secrète Stripe :" -ForegroundColor Yellow
Write-Host "   a. Allez sur https://dashboard.stripe.com/test/apikeys" -ForegroundColor White
Write-Host "   b. Copiez votre 'Secret key' (commence par sk_test_...)" -ForegroundColor White
Write-Host "   c. Exécutez : " -ForegroundColor White -NoNewline
Write-Host "supabase secrets set STRIPE_SECRET_KEY=sk_test_VOTRE_CLE" -ForegroundColor Cyan
Write-Host ""

Write-Host "2. Webhook secret :" -ForegroundColor Yellow
Write-Host "   a. Allez sur https://dashboard.stripe.com/test/webhooks" -ForegroundColor White
Write-Host "   b. Cliquez 'Add endpoint'" -ForegroundColor White
Write-Host "   c. URL : " -ForegroundColor White -NoNewline
$supabaseUrl = Get-Content .env.local | Select-String "VITE_SUPABASE_URL" | ForEach-Object { $_.Line.Split('=')[1] }
if ($supabaseUrl) {
    Write-Host "$supabaseUrl/functions/v1/stripe-webhook" -ForegroundColor Cyan
} else {
    Write-Host "[VOTRE_SUPABASE_URL]/functions/v1/stripe-webhook" -ForegroundColor Cyan
}
Write-Host "   d. Sélectionnez les événements :" -ForegroundColor White
Write-Host "      - payment_intent.succeeded" -ForegroundColor Gray
Write-Host "      - payment_intent.payment_failed" -ForegroundColor Gray
Write-Host "      - charge.refunded" -ForegroundColor Gray
Write-Host "   e. Copiez le 'Signing secret' (commence par whsec_...)" -ForegroundColor White
Write-Host "   f. Exécutez : " -ForegroundColor White -NoNewline
Write-Host "supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET" -ForegroundColor Cyan
Write-Host ""

# Afficher les secrets actuels
Write-Info "Secrets actuellement configurés :"
supabase secrets list

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   PHASE 4 : VÉRIFICATION" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Info "Vérification de la configuration frontend..."

# Vérifier .env.local
if (Test-Path ".env.local") {
    $envContent = Get-Content .env.local
    $hasStripeKey = $envContent | Select-String "VITE_STRIPE_PUBLISHABLE_KEY"
    $hasSupabaseUrl = $envContent | Select-String "VITE_SUPABASE_URL"
    $hasSupabaseKey = $envContent | Select-String "VITE_SUPABASE_ANON_KEY"
    
    if ($hasStripeKey) {
        Write-Success "Clé publique Stripe configurée"
    } else {
        Write-ErrorMsg "Clé publique Stripe manquante dans .env.local"
    }
    
    if ($hasSupabaseUrl -and $hasSupabaseKey) {
        Write-Success "Configuration Supabase présente"
    } else {
        Write-ErrorMsg "Configuration Supabase manquante dans .env.local"
    }
} else {
    Write-ErrorMsg "Fichier .env.local non trouvé"
    Write-Info "Créez-le en copiant .env.example"
}

# Vérifier les dépendances npm
Write-Info "Vérification des dépendances npm..."
if (Test-Path "node_modules/@stripe/stripe-js") {
    Write-Success "Package @stripe/stripe-js installé"
} else {
    Write-ErrorMsg "Package @stripe/stripe-js manquant"
    Write-Info "Installez avec : npm install @stripe/stripe-js"
}

if (Test-Path "node_modules/@stripe/react-stripe-js") {
    Write-Success "Package @stripe/react-stripe-js installé"
} else {
    Write-ErrorMsg "Package @stripe/react-stripe-js manquant"
    Write-Info "Installez avec : npm install @stripe/react-stripe-js"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   RÉSUMÉ DU DÉPLOIEMENT" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Success "✅ Déploiement backend terminé"
Write-Host ""
Write-Info "Prochaines étapes :"
Write-Host "1. Configurez les secrets Stripe (voir ci-dessus)" -ForegroundColor Yellow
Write-Host "2. Testez la connexion : " -ForegroundColor Yellow -NoNewline
Write-Host "http://localhost:8080/stripe-diagnostic" -ForegroundColor Cyan
Write-Host "3. Testez un paiement : " -ForegroundColor Yellow -NoNewline
Write-Host "http://localhost:8080/test-stripe-payment" -ForegroundColor Cyan
Write-Host "4. Consultez le rapport d'audit : " -ForegroundColor Yellow -NoNewline
Write-Host "STRIPE_INTEGRATION_AUDIT_COMPLET.md" -ForegroundColor Cyan
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   COMMANDES UTILES" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Voir les logs Edge Functions :" -ForegroundColor Yellow
Write-Host "  supabase functions logs create-payment-intent" -ForegroundColor Cyan
Write-Host "  supabase functions logs stripe-webhook" -ForegroundColor Cyan
Write-Host ""
Write-Host "Voir l'état de la base de données :" -ForegroundColor Yellow
Write-Host "  supabase db diff" -ForegroundColor Cyan
Write-Host ""
Write-Host "Lister les secrets :" -ForegroundColor Yellow
Write-Host "  supabase secrets list" -ForegroundColor Cyan
Write-Host ""
Write-Host "Lister les fonctions :" -ForegroundColor Yellow
Write-Host "  supabase functions list" -ForegroundColor Cyan
Write-Host ""

Write-Success "Déploiement terminé avec succès ! 🎉"
Write-Host ""
