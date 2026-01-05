# =============================================================================
# CONFIGURATION DES SECRETS STRIPE - 224SOLUTIONS
# Guide complet pour configurer Stripe en production
# =============================================================================

Write-Host @"

╔════════════════════════════════════════════════════════════╗
║    CONFIGURATION STRIPE - GUIDE COMPLET                    ║
║    224SOLUTIONS - Mode Production                          ║
╚════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

Write-Host "ETAPE 1 : OBTENIR UN TOKEN D'ACCES SUPABASE" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ouvrez ce lien dans votre navigateur :" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/account/tokens" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Cliquez sur 'Generate new token'" -ForegroundColor White
Write-Host "3. Nom du token : 'Stripe Configuration'" -ForegroundColor White
Write-Host "4. Copiez le token genere (commence par sbp_...)" -ForegroundColor White
Write-Host ""
Write-Host "ATTENTION: Vous ne verrez ce token qu'une seule fois!" -ForegroundColor Red
Write-Host ""
$token = Read-Host "Collez votre token Supabase ici"

if ($token -notlike "sbp_*") {
    Write-Host "`nERREUR: Le token doit commencer par 'sbp_'" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Token valide!" -ForegroundColor Green

# Connexion à Supabase
Write-Host "`nETAPE 2 : CONNEXION A SUPABASE" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Connexion en cours..." -ForegroundColor White

try {
    supabase login --token $token 2>&1 | Out-Null
    Write-Host "✅ Connecte a Supabase!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur de connexion" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    exit 1
}

# Lier le projet
Write-Host "`nETAPE 3 : LIAISON DU PROJET" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Liaison du projet en cours..." -ForegroundColor White

try {
    supabase link --project-ref uakkxaibujzxdiqzpnpr 2>&1 | Out-Null
    Write-Host "✅ Projet lie!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Le projet est peut-etre deja lie" -ForegroundColor Yellow
}

# Configuration des secrets
Write-Host "`nETAPE 4 : CONFIGURATION DES SECRETS STRIPE" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Yellow
Write-Host ""

$stripeSecretKey = "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"

Write-Host "Configuration de STRIPE_SECRET_KEY..." -ForegroundColor White
try {
    supabase secrets set STRIPE_SECRET_KEY=$stripeSecretKey --project-ref uakkxaibujzxdiqzpnpr
    Write-Host "✅ STRIPE_SECRET_KEY configure!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la configuration" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Write-Host "`nNOTE: Le webhook secret sera configure apres le deploiement" -ForegroundColor Cyan

# Vérification
Write-Host "`nETAPE 5 : VERIFICATION" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow
Write-Host ""

try {
    $secrets = supabase secrets list --project-ref uakkxaibujzxdiqzpnpr 2>&1
    Write-Host "Secrets configures :" -ForegroundColor White
    Write-Host $secrets -ForegroundColor Green
} catch {
    Write-Host "⚠️  Impossible de lister les secrets" -ForegroundColor Yellow
}

# Prochaines étapes
Write-Host @"

╔════════════════════════════════════════════════════════════╗
║    ✅ CONFIGURATION TERMINEE !                             ║
╚════════════════════════════════════════════════════════════╝

PROCHAINES ETAPES :
==================

1. Deployer les Edge Functions :
   supabase functions deploy create-payment-intent
   supabase functions deploy stripe-webhook

2. Configurer le webhook dans Stripe Dashboard :
   URL: https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook
   Evenements: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded

3. Ajouter le webhook secret :
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

4. Tester un paiement !

"@ -ForegroundColor Green

Write-Host "Appuyez sur Entree pour continuer avec le deploiement..." -ForegroundColor Yellow
Read-Host

# Déploiement des Edge Functions
Write-Host "`nETAPE 6 : DEPLOIEMENT DES EDGE FUNCTIONS" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "Deploiement de create-payment-intent..." -ForegroundColor White
try {
    supabase functions deploy create-payment-intent --project-ref uakkxaibujzxdiqzpnpr
    Write-Host "✅ create-payment-intent deploye!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du deploiement" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Write-Host "`nDeploiement de stripe-webhook..." -ForegroundColor White
try {
    supabase functions deploy stripe-webhook --project-ref uakkxaibujzxdiqzpnpr
    Write-Host "✅ stripe-webhook deploye!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du deploiement" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Write-Host @"

╔════════════════════════════════════════════════════════════╗
║    🎉 STRIPE EST PRET POUR LA PRODUCTION !                 ║
╚════════════════════════════════════════════════════════════╝

Configuration completee a 90% !
Il ne reste plus qu'a configurer le webhook dans Stripe Dashboard.

"@ -ForegroundColor Green
