# ============================================================================
# DÉPLOIEMENT SIMPLIFIÉ DES FONCTIONS DE PAIEMENT
# ============================================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🚀 DÉPLOIEMENT SYSTÈME PAIEMENT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Étape 1: Obtenir le token
Write-Host "📝 ÉTAPE 1: Obtenir votre token d'accès Supabase`n" -ForegroundColor Yellow
Write-Host "1. Ouvrez ce lien dans votre navigateur:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/account/tokens" -ForegroundColor Cyan
Write-Host "`n2. Connectez-vous si nécessaire" -ForegroundColor White
Write-Host "`n3. Cliquez sur 'Generate new token'" -ForegroundColor White
Write-Host "`n4. Nom du token: 224Solutions Deploy" -ForegroundColor White
Write-Host "`n5. Copiez le token (commence par sbp_)`n" -ForegroundColor White

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

# Demander le token
$token = Read-Host "Collez votre token ici (sbp_...)"

if (-not $token -or $token.Length -lt 10) {
    Write-Host "`n❌ Token invalide. Le token doit commencer par 'sbp_'" -ForegroundColor Red
    exit 1
}

# Configurer le token
$env:SUPABASE_ACCESS_TOKEN = $token
Write-Host "`n✅ Token configuré!`n" -ForegroundColor Green

# Étape 2: Déployer les fonctions
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📦 ÉTAPE 2: Déploiement des fonctions" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$PROJECT_REF = "uakkxaibujzxdiqzpnpr"
$functions = @("delivery-payment", "freight-payment")
$successCount = 0
$failCount = 0

foreach ($func in $functions) {
    Write-Host "🚀 Déploiement: $func..." -ForegroundColor Yellow
    
    try {
        $output = supabase functions deploy $func --project-ref $PROJECT_REF --no-verify-jwt 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $func déployé avec succès!" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "   ❌ Erreur lors du déploiement de $func" -ForegroundColor Red
            Write-Host "   $output" -ForegroundColor Gray
            $failCount++
        }
    } catch {
        Write-Host "   ❌ Exception: $_" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

# Étape 3: Vérification
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ ÉTAPE 3: Vérification" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "📊 Résultat:" -ForegroundColor White
Write-Host "   ✅ Déployées: $successCount" -ForegroundColor Green
Write-Host "   ❌ Erreurs: $failCount" -ForegroundColor Red

if ($successCount -eq $functions.Count) {
    Write-Host "`n🎉 SUCCÈS! Toutes les fonctions sont déployées!" -ForegroundColor Green
    
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📋 PROCHAINES ÉTAPES" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
    
    Write-Host "1. Configurer le webhook Stripe (CRITIQUE):" -ForegroundColor White
    Write-Host "   - URL: https://dashboard.stripe.com/test/webhooks" -ForegroundColor Cyan
    Write-Host "   - Ajouter: https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook" -ForegroundColor Cyan
    Write-Host "   - Événements: payment_intent.succeeded, payment_intent.payment_failed" -ForegroundColor Gray
    
    Write-Host "`n2. Tester les paiements:" -ForegroundColor White
    Write-Host "   - Livraison (delivery)" -ForegroundColor Cyan
    Write-Host "   - Transport (freight)" -ForegroundColor Cyan
    
    Write-Host "`n3. Créer l'interface FreightPaymentModal.tsx" -ForegroundColor White
    
} else {
    Write-Host "`nCertaines fonctions n'ont pas ete deployees" -ForegroundColor Yellow
    Write-Host "Verifiez les erreurs ci-dessus" -ForegroundColor Gray
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
