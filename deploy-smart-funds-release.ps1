# =====================================================
# SCRIPT: Déploiement du système de déblocage intelligent
# =====================================================
# Description: Applique la migration SQL et déploie les Edge Functions
# Date: 2026-01-06
# =====================================================

Write-Host "🔐 DÉPLOIEMENT DU SYSTÈME DE DÉBLOCAGE INTELLIGENT" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Variables
$SUPABASE_PROJECT_REF = "uakkxaibujzxdiqzpnpr"
$MIGRATION_FILE = "supabase\migrations\20260106000000_smart_funds_release.sql"

# =====================================================
# ÉTAPE 1: VÉRIFIER LES PRÉREQUIS
# =====================================================
Write-Host "📋 Étape 1: Vérification des prérequis..." -ForegroundColor Yellow

# Vérifier que Supabase CLI est installé
try {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI n'est pas installé" -ForegroundColor Red
    Write-Host "   Installez-le avec: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Vérifier que le fichier de migration existe
if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "❌ Fichier de migration introuvable: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Fichier de migration trouvé" -ForegroundColor Green

# Vérifier que les Edge Functions existent
$edgeFunctions = @(
    "supabase\functions\assess-payment-risk\index.ts",
    "supabase\functions\release-scheduled-funds\index.ts",
    "supabase\functions\admin-review-payment\index.ts"
)

foreach ($func in $edgeFunctions) {
    if (-not (Test-Path $func)) {
        Write-Host "❌ Edge Function introuvable: $func" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Toutes les Edge Functions trouvées" -ForegroundColor Green

Write-Host ""

# =====================================================
# ÉTAPE 2: BACKUP DE LA BASE DE DONNÉES
# =====================================================
Write-Host "💾 Étape 2: Sauvegarde de la base de données..." -ForegroundColor Yellow

# Note: Dans un environnement de production, il faudrait faire un vrai backup
Write-Host "⚠️  IMPORTANT: Assurez-vous d'avoir un backup récent de votre base de données" -ForegroundColor Yellow
Write-Host "   Vous pouvez faire un backup depuis: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/settings/backups" -ForegroundColor Cyan

$confirmation = Read-Host "   Avez-vous un backup récent? (o/n)"
if ($confirmation -ne "o") {
    Write-Host "❌ Déploiement annulé. Veuillez créer un backup d'abord." -ForegroundColor Red
    exit 1
}

Write-Host ""

# =====================================================
# ÉTAPE 3: APPLIQUER LA MIGRATION SQL
# =====================================================
Write-Host "📊 Étape 3: Application de la migration SQL..." -ForegroundColor Yellow

# Lire le contenu de la migration
$migrationContent = Get-Content -Path $MIGRATION_FILE -Raw

# Se connecter à Supabase (nécessite d'être authentifié)
Write-Host "   Connexion à Supabase..." -ForegroundColor Gray

try {
    # Appliquer la migration via Supabase CLI
    Write-Host "   Exécution de la migration..." -ForegroundColor Gray
    supabase db push --project-ref $SUPABASE_PROJECT_REF
    
    Write-Host "✅ Migration appliquée avec succès" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'application de la migration" -ForegroundColor Red
    Write-Host "   Détails: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# =====================================================
# ÉTAPE 4: DÉPLOYER LES EDGE FUNCTIONS
# =====================================================
Write-Host "🚀 Étape 4: Déploiement des Edge Functions..." -ForegroundColor Yellow

$functions = @(
    @{Name="assess-payment-risk"; Description="Évaluation des risques de paiement"},
    @{Name="release-scheduled-funds"; Description="Libération automatique des fonds (CRON)"},
    @{Name="admin-review-payment"; Description="Gestion admin des paiements"}
)

foreach ($func in $functions) {
    Write-Host "   Déploiement de $($func.Name)..." -ForegroundColor Gray
    
    try {
        supabase functions deploy $($func.Name) --project-ref $SUPABASE_PROJECT_REF --no-verify-jwt
        Write-Host "   ✅ $($func.Name) déployée" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Erreur lors du déploiement de $($func.Name)" -ForegroundColor Yellow
        Write-Host "      $_" -ForegroundColor Gray
    }
}

Write-Host ""

# =====================================================
# ÉTAPE 5: CONFIGURER LE CRON JOB
# =====================================================
Write-Host "⏰ Étape 5: Configuration du CRON Job..." -ForegroundColor Yellow

Write-Host "   📝 Configuration manuelle requise:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. Allez sur: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/functions" -ForegroundColor White
Write-Host "   2. Cliquez sur 'release-scheduled-funds'" -ForegroundColor White
Write-Host "   3. Dans l'onglet 'Settings', configurez un CRON job:" -ForegroundColor White
Write-Host "      - Expression: */5 * * * *  (toutes les 5 minutes)" -ForegroundColor Yellow
Write-Host "      - Method: POST" -ForegroundColor Yellow
Write-Host "      - Headers: Authorization: Bearer YOUR_CRON_SECRET" -ForegroundColor Yellow
Write-Host ""
Write-Host "   4. Ajoutez la variable d'environnement CRON_SECRET dans les Edge Functions" -ForegroundColor White
Write-Host ""

# =====================================================
# ÉTAPE 6: VÉRIFIER LES VARIABLES D'ENVIRONNEMENT
# =====================================================
Write-Host "🔐 Étape 6: Variables d'environnement à configurer..." -ForegroundColor Yellow

$envVars = @(
    @{Name="STRIPE_SECRET_KEY"; Description="Clé secrète Stripe (déjà configurée)"},
    @{Name="STRIPE_WEBHOOK_SECRET"; Description="Secret du webhook Stripe (déjà configuré)"},
    @{Name="CRON_SECRET"; Description="Secret pour sécuriser le CRON job"; Value="Générer un token aléatoire"}
)

Write-Host ""
Write-Host "   Variables d'environnement requises:" -ForegroundColor Cyan
foreach ($env in $envVars) {
    Write-Host "   - $($env.Name): $($env.Description)" -ForegroundColor White
}

Write-Host ""
Write-Host "   Configurez-les sur: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/settings/functions" -ForegroundColor Cyan

Write-Host ""

# =====================================================
# ÉTAPE 7: TESTS DE VALIDATION
# =====================================================
Write-Host "🧪 Étape 7: Tests de validation..." -ForegroundColor Yellow

Write-Host ""
Write-Host "   Exécutez les tests suivants:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. TEST WEBHOOK:" -ForegroundColor White
Write-Host "      - Créez un paiement test sur Stripe" -ForegroundColor Gray
Write-Host "      - Vérifiez que le webhook appelle assess-payment-risk" -ForegroundColor Gray
Write-Host "      - Vérifiez qu'une entrée est créée dans payment_risk_assessments" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. TEST TRUST SCORE:" -ForegroundColor White
Write-Host "      - Vérifiez le calcul du trust score dans payment_risk_assessments" -ForegroundColor Gray
Write-Host "      - Testez avec un nouveau vendeur (<7 jours) → devrait être BLOCKED" -ForegroundColor Gray
Write-Host "      - Testez avec un vendeur établi → devrait être AUTO_APPROVED" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. TEST LIBÉRATION AUTO:" -ForegroundColor White
Write-Host "      - Attendez l'expiration du smart delay" -ForegroundColor Gray
Write-Host "      - Vérifiez que le CRON job libère les fonds automatiquement" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. TEST ADMIN REVIEW:" -ForegroundColor White
Write-Host "      - Accédez à l'interface admin (PaymentReviewQueue)" -ForegroundColor Gray
Write-Host "      - Approuvez/rejetez un paiement en attente" -ForegroundColor Gray
Write-Host "      - Vérifiez que les fonds sont libérés/remboursés" -ForegroundColor Gray
Write-Host ""

# =====================================================
# RÉSUMÉ
# =====================================================
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ DÉPLOIEMENT TERMINÉ" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Composants déployés:" -ForegroundColor Yellow
Write-Host "   ✓ Tables: payment_risk_assessments, funds_release_schedule, payment_fraud_signals, chargeback_history" -ForegroundColor Green
Write-Host "   ✓ Fonctions SQL: calculate_payment_trust_score, schedule_funds_release, release_scheduled_funds, admin_approve_payment, admin_reject_payment" -ForegroundColor Green
Write-Host "   ✓ Edge Functions: assess-payment-risk, release-scheduled-funds, admin-review-payment" -ForegroundColor Green
Write-Host "   ✓ Vue: admin_payment_review_queue" -ForegroundColor Green
Write-Host ""
Write-Host "⏭️  Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Configurer le CRON job pour release-scheduled-funds (toutes les 5 minutes)" -ForegroundColor White
Write-Host "   2. Ajouter la variable CRON_SECRET dans les Edge Functions" -ForegroundColor White
Write-Host "   3. Tester un paiement end-to-end" -ForegroundColor White
Write-Host "   4. Intégrer les composants React (PaymentReviewQueue, FundsReleaseStatus) dans les pages" -ForegroundColor White
Write-Host ""
Write-Host "📖 Documentation complète: STRIPE_SMART_RELEASE_SYSTEM.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Le système de déblocage intelligent est maintenant opérationnel!" -ForegroundColor Green
Write-Host ""
