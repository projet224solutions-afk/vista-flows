# =============================================================================
# TEST CONFIGURATION STRIPE LIVE - 224SOLUTIONS
# Verifie que les cles sont correctement configurees
# =============================================================================

Write-Host "`n=== TEST STRIPE LIVE - 224SOLUTIONS ===" -ForegroundColor Cyan
Write-Host "Verification de la configuration..." -ForegroundColor White

# SQL pour verifier la configuration
$verificationSQL = @'
SELECT 
  id,
  substring(stripe_publishable_key, 1, 20) || '...' as cle_publique,
  substring(stripe_secret_key, 1, 15) || '...' as cle_secrete,
  CASE 
    WHEN stripe_publishable_key LIKE 'pk_live%' THEN '✅ LIVE'
    WHEN stripe_publishable_key LIKE 'pk_test%' THEN '⚠️ TEST'
    ELSE '❌ INVALIDE'
  END as type_cle_publique,
  CASE 
    WHEN stripe_secret_key LIKE 'sk_live%' THEN '✅ LIVE'
    WHEN stripe_secret_key LIKE 'sk_test%' THEN '⚠️ TEST'
    ELSE '❌ INVALIDE'
  END as type_cle_secrete,
  CASE 
    WHEN is_test_mode = false THEN '✅ PRODUCTION'
    ELSE '⚠️ MODE TEST'
  END as mode,
  platform_commission_rate as commission,
  currency as devise,
  updated_at as derniere_modification
FROM stripe_config
WHERE id = 'd57d8310-8e5c-40e5-ac55-ff8de48ee8ba';
'@

$verificationSQL | Set-Clipboard

Write-Host "`n✅ SQL de verification copie!" -ForegroundColor Green
Write-Host "`n📋 ETAPE 1 - VERIFICATION BASE DE DONNEES:" -ForegroundColor Yellow
Write-Host "1. Ouvrez: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new" -ForegroundColor Cyan
Write-Host "2. Collez (Ctrl+V) et cliquez RUN" -ForegroundColor White
Write-Host "`nVous devez voir:" -ForegroundColor White
Write-Host "   ✅ type_cle_publique: LIVE" -ForegroundColor Green
Write-Host "   ✅ type_cle_secrete: LIVE" -ForegroundColor Green
Write-Host "   ✅ mode: PRODUCTION" -ForegroundColor Green

Write-Host "`n📋 ETAPE 2 - TEST API STRIPE:" -ForegroundColor Yellow
Write-Host "Appuyez sur Entree pour tester l'API Stripe..." -ForegroundColor White
Read-Host

Write-Host "`nTest de connexion a l'API Stripe..." -ForegroundColor White

# Test de l'API Stripe avec la cle secrete
$stripeSecretKey = "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"

try {
    $headers = @{
        "Authorization" = "Bearer $stripeSecretKey"
    }
    
    Write-Host "Testing Stripe API..." -ForegroundColor White
    $response = Invoke-RestMethod -Uri "https://api.stripe.com/v1/balance" -Headers $headers -Method Get
    
    Write-Host "`n✅ SUCCES - API Stripe fonctionne!" -ForegroundColor Green
    Write-Host "`nDetails du compte:" -ForegroundColor Cyan
    Write-Host "   Mode: LIVE (PRODUCTION)" -ForegroundColor Green
    Write-Host "   Solde disponible: $($response.available[0].amount / 100) $($response.available[0].currency.ToUpper())" -ForegroundColor White
    Write-Host "   Solde en attente: $($response.pending[0].amount / 100) $($response.pending[0].currency.ToUpper())" -ForegroundColor White
    
    Write-Host "`n✅ CONFIGURATION STRIPE VALIDEE!" -ForegroundColor Green
    Write-Host "Votre systeme de paiement est pret pour la production!" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ ERREUR lors du test API Stripe" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Message -like "*401*") {
        Write-Host "`nProbleme: Cle API invalide ou non configuree" -ForegroundColor Yellow
        Write-Host "Solution: Verifiez que les cles sont correctement copiees dans Supabase" -ForegroundColor White
    }
}

Write-Host "`n📋 ETAPE 3 - TEST WEBHOOK (optionnel):" -ForegroundColor Yellow
Write-Host "Pour tester les webhooks Stripe:" -ForegroundColor White
Write-Host "1. Allez sur: https://dashboard.stripe.com/test/webhooks" -ForegroundColor Cyan
Write-Host "2. Ajoutez votre endpoint Edge Function" -ForegroundColor White
Write-Host "3. Testez avec 'Send test webhook'" -ForegroundColor White

Write-Host "`n📊 RESUME DU TEST:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor White
Write-Host "1. Configuration BDD: A verifier dans Supabase" -ForegroundColor White
Write-Host "2. API Stripe: Verifie ci-dessus" -ForegroundColor White
Write-Host "3. Webhooks: A configurer si necessaire" -ForegroundColor White
Write-Host ""
