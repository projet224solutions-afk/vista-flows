# =============================================================================
# SCRIPT DE CONFIGURATION STRIPE - 224SOLUTIONS
# Configuration des clés Stripe LIVE via SQL
# =============================================================================

Write-Host "`n=== CONFIGURATION STRIPE - 224SOLUTIONS ===" -ForegroundColor Cyan
Write-Host "`nCe script va vous guider pour configurer vos clés Stripe." -ForegroundColor White

# Instructions
Write-Host "`n📋 ÉTAPES À SUIVRE:" -ForegroundColor Yellow
Write-Host "`n1. Ouvrez le SQL Editor Supabase:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new" -ForegroundColor Cyan

# Générer le SQL
$sql = @'
-- Configuration des clés Stripe LIVE
-- 224SOLUTIONS

UPDATE stripe_config 
SET 
  stripe_secret_key = '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',
  stripe_publishable_key = 'pk_live_51RdKJzRxqizQJVjLFseVlmZ7qOJmOIx9PlsGPY600C0CifOqNyNlbfTb2NZAbW1cyVgk8hUt6vGAD3KQqMCIc7NB00F0KjYCqc',
  is_test_mode = false,
  updated_at = now()
WHERE id = 'd57d8310-8e5c-40e5-ac55-ff8de48ee8ba';

-- Vérification
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
Write-Host "`n✅ SQL copié dans le presse-papiers!" -ForegroundColor Green

Write-Host "`n2. Collez le SQL (Ctrl+V) dans l'éditeur" -ForegroundColor White
Write-Host "`n3. Cliquez sur le bouton RUN (en bas à droite)" -ForegroundColor White
Write-Host "`n4. Vérifiez le résultat:" -ForegroundColor White
Write-Host "   - UPDATE 1" -ForegroundColor Green
Write-Host "   - Puis une ligne avec tous les statuts 'OK'" -ForegroundColor Green

Write-Host "`n💡 Le SQL contient vos clés Stripe LIVE" -ForegroundColor Yellow
Write-Host "   Ne le partagez JAMAIS publiquement!" -ForegroundColor Red

Write-Host "`n⏱️  Temps estimé: 30 secondes" -ForegroundColor Cyan
Write-Host "`nUne fois exécuté, revenez me dire 'verifie'" -ForegroundColor Yellow
Write-Host ""
