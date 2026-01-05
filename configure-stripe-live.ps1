# =============================================================================
# CONFIGURATION STRIPE LIVE - 224SOLUTIONS
# Methode SQL securisee (pas de bugs PowerShell)
# =============================================================================

Write-Host "`n=== CONFIGURATION STRIPE LIVE - 224SOLUTIONS ===" -ForegroundColor Cyan
Write-Host "`nMethode SQL securisee - Pas de bugs PowerShell!" -ForegroundColor Green

# SQL avec les cles LIVE
$sql = @'
-- Configuration Stripe LIVE - 224Solutions
-- Date: 5 janvier 2026

UPDATE stripe_config 
SET 
  stripe_secret_key = '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',
  stripe_publishable_key = 'pk_live_51RdKJzRxqizQJVjLFseVlmZ7qOJmOIx9PlsGPY600C0CifOqNyNlbfTb2NZAbW1cyVgk8hUt6vGAD3KQqMCIc7NB00F0KjYCqc',
  is_test_mode = false,
  updated_at = now()
WHERE id = 'd57d8310-8e5c-40e5-ac55-ff8de48ee8ba';

-- Verification des cles
SELECT 
  id,
  CASE 
    WHEN stripe_publishable_key LIKE 'pk_live%' THEN 'OK - Cle publique LIVE'
    ELSE 'ERREUR - Cle publique manquante'
  END as cle_publique_status,
  CASE 
    WHEN stripe_secret_key LIKE 'sk_live%' THEN 'OK - Cle secrete LIVE'
    ELSE 'ERREUR - Cle secrete manquante'
  END as cle_secrete_status,
  CASE 
    WHEN is_test_mode = false THEN 'OK - Mode PRODUCTION'
    ELSE 'ATTENTION - Mode TEST actif'
  END as mode_status,
  platform_commission_rate as commission,
  currency as devise,
  updated_at as derniere_modification
FROM stripe_config
WHERE id = 'd57d8310-8e5c-40e5-ac55-ff8de48ee8ba';
'@

# Copier dans le presse-papiers
$sql | Set-Clipboard

Write-Host "`n✅ SQL copie dans le presse-papiers!" -ForegroundColor Green
Write-Host "`n📋 ETAPES A SUIVRE:" -ForegroundColor Yellow
Write-Host "`n1. Ouvrez le SQL Editor Supabase:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new" -ForegroundColor Cyan
Write-Host "`n2. Collez le SQL (Ctrl+V) dans l'editeur" -ForegroundColor White
Write-Host "`n3. Cliquez sur RUN (bouton en bas a droite)" -ForegroundColor White
Write-Host "`n4. Verifiez le resultat:" -ForegroundColor White
Write-Host "   ✅ UPDATE 1" -ForegroundColor Green
Write-Host "   ✅ Une ligne avec tous les statuts 'OK'" -ForegroundColor Green

Write-Host "`n🔒 SECURITE:" -ForegroundColor Yellow
Write-Host "   - Cles Stripe LIVE configurees" -ForegroundColor White
Write-Host "   - Mode PRODUCTION active" -ForegroundColor White
Write-Host "   - Ne partagez JAMAIS ces cles!" -ForegroundColor Red

Write-Host "`nTemps estime: 30 secondes" -ForegroundColor Cyan
Write-Host "Une fois execute, dites verifie pour valider" -ForegroundColor Yellow
Write-Host ""
