#!/usr/bin/env pwsh
# Script de correction massive des paiements PENDING
# Date: 2026-01-07

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "CORRECTION MASSIVE: Paiements PENDING" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que le fichier SQL existe
if (-not (Test-Path "fix-all-pending-payments.sql")) {
    Write-Host "Fichier fix-all-pending-payments.sql introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "Lecture du script SQL..." -ForegroundColor Yellow
$sqlContent = Get-Content "fix-all-pending-payments.sql" -Raw

# Configuration connexion Supabase via API REST
$SUPABASE_URL = "https://uakkxaibujzxdiqzpnpr.supabase.co"
$SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTQyOTE5MiwiZXhwIjoyMDUxMDA1MTkyfQ.hMXjCR3NU6CZ2O1Ff2pYDlJ5lVEuPFM8fzN8VZYq2OE"

Write-Host "Connexion a Supabase via REST API..." -ForegroundColor Yellow
Write-Host "   URL: $SUPABASE_URL" -ForegroundColor Gray
Write-Host ""

# Exécuter le SQL via l'API REST de Supabase
Write-Host "Execution du script de correction..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/rpc/exec" `
        -Method Post `
        -Headers @{
            "apikey" = $SERVICE_KEY
            "Authorization" = "Bearer $SERVICE_KEY"
            "Content-Type" = "application/json"
        } `
        -Body (@{ query = $sqlContent } | ConvertTo-Json) `
        -ErrorAction Stop
    
    $success = $true
    $result = $response | ConvertTo-Json -Depth 10
}
catch {
    $success = $false
    $result = $_.Exception.Message
}

# Afficher le résultat
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan

if ($success) {
    Write-Host "SCRIPT EXECUTE AVEC SUCCES" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resultats:" -ForegroundColor Cyan
    Write-Host $result
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Prochaines etapes:" -ForegroundColor Yellow
    Write-Host "  1. Verifier les logs ci-dessus" -ForegroundColor White
    Write-Host "  2. Controler les montants dans les wallets" -ForegroundColor White
    Write-Host "  3. Valider les commandes creees" -ForegroundColor White
    Write-Host "  4. Traiter les paiements avec vendeur inexistant" -ForegroundColor White
}
else {
    Write-Host "ERREUR LORS DE L'EXECUTION" -ForegroundColor Red
    Write-Host ""
    Write-Host "Details de l'erreur:" -ForegroundColor Yellow
    Write-Host $result
    Write-Host ""
    Write-Host "Actions recommandees:" -ForegroundColor Cyan
    Write-Host "  - Verifier la connexion Supabase" -ForegroundColor White
    Write-Host "  - Controler les credentials" -ForegroundColor White
    Write-Host "  - Verifier la syntaxe SQL" -ForegroundColor White
    exit 1
}

Write-Host ""
