# Test des flux de paiement 224Solutions
# Usage: .\test-payment-flows.ps1

param(
    [string]$TestUserId = "",
    [string]$TestDriverId = "",
    [string]$TestAgentId = ""
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧪 TESTS SYSTÈME PAIEMENT 224SOLUTIONS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$PROJECT_REF = "uakkxaibujzxdiqzpnpr"
$SUPABASE_URL = "https://$PROJECT_REF.supabase.co"

# Récupérer l'anon key depuis les variables d'environnement
$ANON_KEY = $env:SUPABASE_ANON_KEY

if (-not $ANON_KEY) {
    Write-Host "⚠️ Variable SUPABASE_ANON_KEY non définie" -ForegroundColor Yellow
    Write-Host "Récupération depuis Supabase Dashboard..." -ForegroundColor Gray
    Write-Host "https://supabase.com/dashboard/project/$PROJECT_REF/settings/api`n" -ForegroundColor Cyan
    
    $ANON_KEY = Read-Host "Entrez votre SUPABASE_ANON_KEY"
    
    if (-not $ANON_KEY) {
        Write-Host "❌ Anon Key requise pour les tests" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Anon Key configurée`n" -ForegroundColor Green

# Fonction helper pour appeler les edge functions
function Invoke-EdgeFunction {
    param(
        [string]$FunctionName,
        [hashtable]$Payload
    )
    
    try {
        $jsonPayload = $Payload | ConvertTo-Json -Depth 5
        
        Write-Host "📤 Requête:" -ForegroundColor Gray
        Write-Host $jsonPayload -ForegroundColor DarkGray
        
        $response = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/functions/v1/$FunctionName" `
            -Method POST `
            -Headers @{
                "Authorization" = "Bearer $ANON_KEY"
                "Content-Type" = "application/json"
                "apikey" = $ANON_KEY
            } `
            -Body $jsonPayload `
            -ErrorAction Stop
        
        return $response
    }
    catch {
        Write-Host "❌ Erreur HTTP: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "Détails: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        return $null
    }
}

# Test 1: Delivery Payment (Wallet)
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📦 TEST 1: DELIVERY PAYMENT (WALLET)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

$deliveryId = "test-delivery-$(Get-Date -Format 'yyyyMMddHHmmss')"
$customerId = if ($TestUserId) { $TestUserId } else { "00000000-0000-0000-0000-000000000001" }
$driverId = if ($TestDriverId) { $TestDriverId } else { "00000000-0000-0000-0000-000000000002" }

Write-Host "`n📋 Paramètres:" -ForegroundColor Gray
Write-Host "  • Delivery ID: $deliveryId" -ForegroundColor Gray
Write-Host "  • Customer ID: $customerId" -ForegroundColor Gray
Write-Host "  • Driver ID: $driverId" -ForegroundColor Gray
Write-Host "  • Amount: 5,000 GNF" -ForegroundColor Gray
Write-Host "  • Method: wallet`n" -ForegroundColor Gray

$deliveryPayload = @{
    delivery_id = $deliveryId
    customer_id = $customerId
    driver_id = $driverId
    amount = 5000
    payment_method = "wallet"
}

Write-Host "🔄 Appel de l'edge function..." -ForegroundColor Yellow
$response = Invoke-EdgeFunction -FunctionName "delivery-payment" -Payload $deliveryPayload

if ($response) {
    Write-Host "`n📥 Réponse:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Cyan
    
    if ($response.success) {
        Write-Host "`n✅ TEST 1 RÉUSSI - Escrow créé: $($response.escrow_id)" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ TEST 1 ÉCHOUÉ - $($response.error)" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n❌ TEST 1 ÉCHOUÉ - Pas de réponse" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Test 2: Delivery Payment (Cash)
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "💵 TEST 2: DELIVERY PAYMENT (CASH)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

$deliveryId2 = "test-delivery-cash-$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "`n📋 Paramètres:" -ForegroundColor Gray
Write-Host "  • Delivery ID: $deliveryId2" -ForegroundColor Gray
Write-Host "  • Customer ID: $customerId" -ForegroundColor Gray
Write-Host "  • Driver ID: $driverId" -ForegroundColor Gray
Write-Host "  • Amount: 3,000 GNF" -ForegroundColor Gray
Write-Host "  • Method: cash`n" -ForegroundColor Gray

$deliveryPayload2 = @{
    delivery_id = $deliveryId2
    customer_id = $customerId
    driver_id = $driverId
    amount = 3000
    payment_method = "cash"
}

Write-Host "🔄 Appel de l'edge function..." -ForegroundColor Yellow
$response2 = Invoke-EdgeFunction -FunctionName "delivery-payment" -Payload $deliveryPayload2

if ($response2) {
    Write-Host "`n📥 Réponse:" -ForegroundColor Green
    $response2 | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Cyan
    
    if ($response2.success) {
        Write-Host "`n✅ TEST 2 RÉUSSI - Escrow cash créé: $($response2.escrow_id)" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ TEST 2 ÉCHOUÉ - $($response2.error)" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n❌ TEST 2 ÉCHOUÉ - Pas de réponse" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Test 3: Freight Payment (Wallet)
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🚢 TEST 3: FREIGHT PAYMENT (WALLET)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

$freightOrderId = "test-freight-$(Get-Date -Format 'yyyyMMddHHmmss')"
$clientId = if ($TestUserId) { $TestUserId } else { "00000000-0000-0000-0000-000000000001" }
$agentId = if ($TestAgentId) { $TestAgentId } else { "00000000-0000-0000-0000-000000000003" }

Write-Host "`n📋 Paramètres:" -ForegroundColor Gray
Write-Host "  • Freight Order ID: $freightOrderId" -ForegroundColor Gray
Write-Host "  • Client ID: $clientId" -ForegroundColor Gray
Write-Host "  • Agent ID: $agentId" -ForegroundColor Gray
Write-Host "  • Amount: 500,000 GNF" -ForegroundColor Gray
Write-Host "  • Method: wallet`n" -ForegroundColor Gray

$freightPayload = @{
    freight_order_id = $freightOrderId
    client_id = $clientId
    freight_agent_id = $agentId
    amount = 500000
    payment_method = "wallet"
}

Write-Host "🔄 Appel de l'edge function..." -ForegroundColor Yellow
$response3 = Invoke-EdgeFunction -FunctionName "freight-payment" -Payload $freightPayload

if ($response3) {
    Write-Host "`n📥 Réponse:" -ForegroundColor Green
    $response3 | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Cyan
    
    if ($response3.success) {
        Write-Host "`n✅ TEST 3 RÉUSSI - Escrow créé: $($response3.escrow_id)" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ TEST 3 ÉCHOUÉ - $($response3.error)" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n❌ TEST 3 ÉCHOUÉ - Pas de réponse" -ForegroundColor Red
}

# Résumé final
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$testsResults = @(
    @{ Name = "Delivery Payment (Wallet)"; Success = ($response -and $response.success) },
    @{ Name = "Delivery Payment (Cash)"; Success = ($response2 -and $response2.success) },
    @{ Name = "Freight Payment (Wallet)"; Success = ($response3 -and $response3.success) }
)

$successCount = ($testsResults | Where-Object { $_.Success }).Count
$totalCount = $testsResults.Count

foreach ($test in $testsResults) {
    $icon = if ($test.Success) { "✅" } else { "❌" }
    $color = if ($test.Success) { "Green" } else { "Red" }
    Write-Host "$icon $($test.Name)" -ForegroundColor $color
}

Write-Host "`n📈 Score: $successCount/$totalCount tests réussis" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

# Instructions vérification database
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🔍 VÉRIFICATION DATABASE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Pour vérifier les escrows créés, exécutez:" -ForegroundColor Yellow
Write-Host @"
SELECT 
  id, 
  transaction_type, 
  amount, 
  commission_percent, 
  status,
  created_at
FROM escrow_transactions
WHERE order_id IN (
  '$deliveryId',
  '$deliveryId2',
  '$freightOrderId'
)
ORDER BY created_at DESC;
"@ -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📚 RESSOURCES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "📖 Guide complet: GUIDE_DEPLOIEMENT_PAIEMENTS.md" -ForegroundColor Gray
Write-Host "🏗️ Architecture: SYSTEME_PAIEMENT_COMPLET.md" -ForegroundColor Gray
Write-Host "🌐 Supabase Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF`n" -ForegroundColor Gray

if ($successCount -eq $totalCount) {
    Write-Host "🎉 TOUS LES TESTS RÉUSSIS!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️ CERTAINS TESTS ONT ÉCHOUÉ" -ForegroundColor Yellow
    Write-Host "Vérifiez:" -ForegroundColor Yellow
    Write-Host "  1. Les edge functions sont bien déployées" -ForegroundColor Gray
    Write-Host "  2. Les users/drivers/agents existent en database" -ForegroundColor Gray
    Write-Host "  3. Les wallets ont suffisamment de fonds" -ForegroundColor Gray
    Write-Host "  4. Les tables deliveries/freight_orders existent`n" -ForegroundColor Gray
    exit 1
}
