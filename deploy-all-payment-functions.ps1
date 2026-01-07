# Déploiement complet des edge functions de paiement
# Usage: .\deploy-all-payment-functions.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🚀 DÉPLOIEMENT SYSTÈME PAIEMENT 224SOLUTIONS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$PROJECT_REF = "uakkxaibujzxdiqzpnpr"
$FUNCTIONS = @("delivery-payment", "freight-payment")

# Vérifier que Supabase CLI est installé
Write-Host "🔍 Vérification Supabase CLI..." -ForegroundColor Yellow
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCli) {
    Write-Host "❌ Supabase CLI n'est pas installé" -ForegroundColor Red
    Write-Host "Installation: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI trouvé`n" -ForegroundColor Green

# Déployer chaque edge function
$successCount = 0
$failCount = 0

foreach ($func in $FUNCTIONS) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "📦 Déploiement: $func" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    
    try {
        # Vérifier que le dossier existe
        $funcPath = "supabase\functions\$func"
        if (-not (Test-Path $funcPath)) {
            Write-Host "❌ Dossier $funcPath introuvable" -ForegroundColor Red
            $failCount++
            continue
        }
        
        Write-Host "📂 Dossier trouvé: $funcPath" -ForegroundColor Gray
        
        # Déployer
        Write-Host "🚀 Déploiement en cours..." -ForegroundColor Yellow
        supabase functions deploy $func --project-ref $PROJECT_REF --no-verify-jwt 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $func déployé avec succès!`n" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "❌ Échec du déploiement de $func`n" -ForegroundColor Red
            $failCount++
        }
    }
    catch {
        Write-Host "❌ Erreur lors du déploiement de $func : $_`n" -ForegroundColor Red
        $failCount++
    }
}

# Résumé
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ DU DÉPLOIEMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Succès: $successCount/$($FUNCTIONS.Count)" -ForegroundColor Green
Write-Host "❌ Échecs: $failCount/$($FUNCTIONS.Count)" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Gray" })

# Lister toutes les edge functions
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📋 TOUTES LES EDGE FUNCTIONS DÉPLOYÉES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {
    supabase functions list --project-ref $PROJECT_REF
}
catch {
    Write-Host "⚠️ Impossible de lister les functions: $_" -ForegroundColor Yellow
}

# Vérifier les secrets Stripe
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🔐 VÉRIFICATION SECRETS STRIPE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$requiredSecrets = @(
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET"
)

Write-Host "Secrets requis pour Stripe:" -ForegroundColor Yellow
foreach ($secret in $requiredSecrets) {
    Write-Host "  • $secret" -ForegroundColor Gray
}

Write-Host "`n⚠️ Assurez-vous que tous ces secrets sont configurés via:" -ForegroundColor Yellow
Write-Host "supabase secrets set STRIPE_SECRET_KEY='sk_...' --project-ref $PROJECT_REF`n" -ForegroundColor Gray

# Instructions webhook Stripe
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🌐 CONFIGURATION WEBHOOK STRIPE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "1. Aller sur: https://dashboard.stripe.com/test/webhooks" -ForegroundColor Yellow
Write-Host "2. Cliquer 'Add endpoint'" -ForegroundColor Yellow
Write-Host "3. URL du webhook:" -ForegroundColor Yellow
Write-Host "   https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook`n" -ForegroundColor Cyan

Write-Host "4. Événements à écouter:" -ForegroundColor Yellow
Write-Host "   • payment_intent.succeeded" -ForegroundColor Gray
Write-Host "   • payment_intent.payment_failed" -ForegroundColor Gray
Write-Host "   • payment_intent.canceled" -ForegroundColor Gray
Write-Host "   • charge.refunded`n" -ForegroundColor Gray

Write-Host "5. Copier le Signing Secret (whsec_...) et exécuter:" -ForegroundColor Yellow
Write-Host "   supabase secrets set STRIPE_WEBHOOK_SECRET='whsec_...' --project-ref $PROJECT_REF`n" -ForegroundColor Cyan

# Prochaines étapes
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📝 PROCHAINES ÉTAPES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "1. ✅ Configurer webhook Stripe (voir ci-dessus)" -ForegroundColor Yellow
Write-Host "2. ✅ Tester les edge functions:" -ForegroundColor Yellow
Write-Host "   .\test-payment-flows.ps1`n" -ForegroundColor Cyan
Write-Host "3. ✅ Vérifier les escrows:" -ForegroundColor Yellow
Write-Host "   SELECT * FROM escrow_transactions LIMIT 10;`n" -ForegroundColor Cyan
Write-Host "4. ✅ Consulter GUIDE_DEPLOIEMENT_PAIEMENTS.md" -ForegroundColor Yellow

if ($failCount -eq 0) {
    Write-Host "`n🎉 DÉPLOIEMENT RÉUSSI!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️ DÉPLOIEMENT PARTIEL - Vérifier les erreurs ci-dessus" -ForegroundColor Yellow
    exit 1
}
