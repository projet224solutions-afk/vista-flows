#!/usr/bin/env pwsh
# CORRECTION IMMEDIATE - Commande manquante
# Payment: pi_3SmnjrRxqizQJVjL1CthXpIa

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "CORRECTION COMMANDE MANQUANTE" -ForegroundColor Red  
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Payment Intent: pi_3SmnjrRxqizQJVjL1CthXpIa" -ForegroundColor Yellow
Write-Host "Montant: 51.25 FCFA" -ForegroundColor Yellow
Write-Host "Probleme: Commande manquante" -ForegroundColor Red
Write-Host ""

# Le SQL à exécuter
$sql = @"
-- CORRECTION IMMEDIATE: Créer la commande manquante
DO `$`$
DECLARE
  v_transaction_id UUID;
  v_order_result JSONB;
BEGIN
  -- Récupérer l'ID de la transaction
  SELECT id INTO v_transaction_id
  FROM stripe_transactions
  WHERE stripe_payment_intent_id = 'pi_3SmnjrRxqizQJVjL1CthXpIa';
  
  -- Créer la commande
  RAISE NOTICE 'Creation commande pour transaction: %', v_transaction_id;
  SELECT create_order_from_payment(v_transaction_id) INTO v_order_result;
  RAISE NOTICE 'Resultat: %', v_order_result;
  
  RAISE NOTICE 'SUCCES: Commande creee!';
END `$`$;

-- Vérifier le résultat
SELECT 
  stripe_payment_intent_id,
  amount / 100.0 as montant_fcfa,
  CASE WHEN EXISTS(SELECT 1 FROM orders o WHERE o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id) 
       THEN 'OUI' ELSE 'NON' END as commande_existe,
  CASE WHEN EXISTS(SELECT 1 FROM wallet_transactions wt WHERE wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id) 
       THEN 'OUI' ELSE 'NON' END as wallet_existe
FROM stripe_transactions st
WHERE stripe_payment_intent_id = 'pi_3SmnjrRxqizQJVjL1CthXpIa';
"@

Set-Clipboard -Value $sql

Write-Host "ETAPE 1:" -ForegroundColor Cyan
Write-Host "  SQL copie dans le presse-papiers!" -ForegroundColor Green
Write-Host ""

Write-Host "ETAPE 2:" -ForegroundColor Cyan
Write-Host "  Ouverture de Supabase SQL Editor..." -ForegroundColor Yellow
Write-Host ""

Start-Process "https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new"

Write-Host "ETAPE 3:" -ForegroundColor Cyan
Write-Host "  1. Coller le SQL (Ctrl+V)" -ForegroundColor White
Write-Host "  2. Cliquer sur RUN" -ForegroundColor White
Write-Host "  3. Verifier que 'SUCCES: Commande creee!' apparait" -ForegroundColor White
Write-Host ""

Write-Host "RESULTAT ATTENDU:" -ForegroundColor Green
Write-Host "  - commande_existe: OUI" -ForegroundColor White
Write-Host "  - wallet_existe: OUI" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
