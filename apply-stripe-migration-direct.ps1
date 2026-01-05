# =====================================================
# APPLICATION MIGRATION STRIPE - METHODE DIRECTE
# 224SOLUTIONS
# =====================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  APPLICATION MIGRATION STRIPE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuration
$projectRef = "uakkxaibujzxdiqzpnpr"
$supabaseUrl = "https://uakkxaibujzxdiqzpnpr.supabase.co"

Write-Host "Projet Supabase: $projectRef" -ForegroundColor Yellow
Write-Host "URL: $supabaseUrl`n" -ForegroundColor Yellow

# Demander la clé service
Write-Host "Pour obtenir votre Service Role Key:" -ForegroundColor Cyan
Write-Host "1. Allez sur: https://supabase.com/dashboard/project/$projectRef/settings/api" -ForegroundColor White
Write-Host "2. Copiez la 'service_role' key (section 'Project API keys')" -ForegroundColor White
Write-Host "3. Collez-la ci-dessous`n" -ForegroundColor White

$serviceKey = Read-Host "Entrez votre SUPABASE SERVICE ROLE KEY"

if ([string]::IsNullOrWhiteSpace($serviceKey)) {
    Write-Host "`nErreur: Clé service requise" -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ Clé service configurée" -ForegroundColor Green

# Lire le fichier SQL
Write-Host "`nLecture du fichier de migration..." -ForegroundColor Yellow
$sqlFile = "D:\224Solutions\supabase\migrations\20260104_stripe_payments.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "Erreur: Fichier SQL introuvable: $sqlFile" -ForegroundColor Red
    exit 1
}

$sql = Get-Content $sqlFile -Raw
Write-Host "✓ Fichier SQL chargé ($($sql.Length) caractères)" -ForegroundColor Green

# Exécuter la migration
Write-Host "`nExécution de la migration..." -ForegroundColor Yellow

$url = "$supabaseUrl/rest/v1/rpc/exec_sql"

# Préparer la requête
$body = @{
    sql_query = $sql
} | ConvertTo-Json

# Headers
$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
}

try {
    # Méthode alternative: utiliser directement PostgreSQL via REST API
    Write-Host "Tentative d'exécution via API REST..." -ForegroundColor Cyan
    
    # Essayer avec l'API de management
    $mgmtUrl = "https://api.supabase.com/v1/projects/$projectRef/database/query"
    
    # Vérifier si on a un token d'accès
    $accessToken = $env:SUPABASE_ACCESS_TOKEN
    
    if ([string]::IsNullOrWhiteSpace($accessToken)) {
        Write-Host "`nPour utiliser l'API de management, vous devez définir SUPABASE_ACCESS_TOKEN" -ForegroundColor Yellow
        Write-Host "1. Allez sur: https://supabase.com/dashboard/account/tokens" -ForegroundColor Cyan
        Write-Host "2. Créez un token ou copiez-en un existant" -ForegroundColor Cyan
        Write-Host "3. Exécutez: `$env:SUPABASE_ACCESS_TOKEN = 'VOTRE_TOKEN'" -ForegroundColor Cyan
        Write-Host "4. Relancez ce script`n" -ForegroundColor Cyan
        
        Write-Host "Alternative: Utilisez Supabase CLI" -ForegroundColor Yellow
        Write-Host "1. supabase login" -ForegroundColor Cyan
        Write-Host "2. supabase link --project-ref $projectRef" -ForegroundColor Cyan
        Write-Host "3. supabase db push" -ForegroundColor Cyan
        exit 1
    }
    
    $mgmtHeaders = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    }
    
    $mgmtBody = @{
        query = $sql
    } | ConvertTo-Json -Depth 10
    
    Write-Host "Envoi de la requête..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri $mgmtUrl -Method Post -Headers $mgmtHeaders -Body $mgmtBody -ErrorAction Stop
    
    Write-Host "`n✅ MIGRATION APPLIQUÉE AVEC SUCCÈS!" -ForegroundColor Green
    Write-Host "`nTables Stripe créées:" -ForegroundColor Cyan
    Write-Host "  ✓ stripe_config" -ForegroundColor White
    Write-Host "  ✓ stripe_transactions" -ForegroundColor White
    Write-Host "  ✓ wallets" -ForegroundColor White
    Write-Host "  ✓ wallet_transactions" -ForegroundColor White
    Write-Host "  ✓ withdrawals" -ForegroundColor White
    
    Write-Host "`nRésultat de l'API:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5 | Write-Host
    
} catch {
    Write-Host "`n❌ ERREUR lors de l'application de la migration" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host "`nDétails:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails -ForegroundColor Red
    }
    
    Write-Host "`nSolution alternative:" -ForegroundColor Yellow
    Write-Host "Utilisez Supabase CLI pour appliquer la migration:" -ForegroundColor Cyan
    Write-Host "1. supabase login" -ForegroundColor White
    Write-Host "2. supabase link --project-ref $projectRef" -ForegroundColor White
    Write-Host "3. supabase db push" -ForegroundColor White
    
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  MIGRATION TERMINÉE" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
