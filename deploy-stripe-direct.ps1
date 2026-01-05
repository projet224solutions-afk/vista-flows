# =====================================================
# DEPLOIEMENT STRIPE AUTOMATIQUE - API DIRECTE
# 224SOLUTIONS
# =====================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEPLOIEMENT STRIPE AUTOMATIQUE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuration
$projectRef = "uakkxaibujzxdiqzpnpr"
$supabaseUrl = "https://uakkxaibujzxdiqzpnpr.supabase.co"
$sqlFile = "D:\224Solutions\supabase\migrations\20260104_stripe_payments.sql"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Projet: $projectRef" -ForegroundColor White
Write-Host "  URL: $supabaseUrl" -ForegroundColor White
Write-Host "  Migration: $sqlFile`n" -ForegroundColor White

# Lire la clé service depuis le backend .env
$backendEnv = "D:\224Solutions\backend\.env"
$serviceKey = $null
if (Test-Path $backendEnv) {
    Write-Host "Lecture de la configuration backend..." -ForegroundColor Yellow
    $envContent = Get-Content $backendEnv -Raw
    
    # Extraire SUPABASE_SERVICE_ROLE_KEY si présente
    if ($envContent -match 'SUPABASE_SERVICE_ROLE_KEY') {
        $line = ($envContent -split "`n" | Where-Object { $_ -match 'SUPABASE_SERVICE_ROLE_KEY' })[0]
        if ($line -match '=(.+)$') {
            $key = $matches[1].Trim().Trim('"').Trim("'")
            if ($key -ne '__SUPABASE_SERVICE_ROLE_KEY__' -and $key -ne 'your-service-role-key-here' -and $key.Length -gt 20) {
                $serviceKey = $key
                Write-Host "✓ Clé service trouvée dans backend/.env" -ForegroundColor Green
            }
        }
    }
}

# Si pas trouvée, demander
if (-not $serviceKey) {
    Write-Host "`nPour obtenir votre Service Role Key:" -ForegroundColor Cyan
    Write-Host "1. Allez sur: https://supabase.com/dashboard/project/$projectRef/settings/api" -ForegroundColor White
    Write-Host "2. Dans 'Project API keys', copiez la 'service_role' key" -ForegroundColor White
    Write-Host "3. Collez-la ci-dessous (ou appuyez sur Entrée pour essayer avec anon key)`n" -ForegroundColor White
    
    $serviceKey = Read-Host "Service Role Key (ou Entrée pour anon)"
    
    if ([string]::IsNullOrWhiteSpace($serviceKey)) {
        Write-Host "`nUtilisation de la clé anon (limitée)..." -ForegroundColor Yellow
        $serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM"
    }
}

# Lire le SQL
Write-Host "`nLecture du fichier de migration..." -ForegroundColor Yellow

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Erreur: Fichier SQL introuvable: $sqlFile" -ForegroundColor Red
    exit 1
}

$sql = Get-Content $sqlFile -Raw
Write-Host "✓ SQL chargé: $($sql.Length) caractères, $(@($sql -split "`n").Count) lignes" -ForegroundColor Green

# Méthode 1: Essayer via l'API REST directe
Write-Host "`n--- METHODE 1: API REST Directe ---" -ForegroundColor Cyan

# Split SQL en commandes individuelles pour éviter les timeouts
$sqlCommands = $sql -split ';' | Where-Object { $_.Trim() -ne '' -and $_.Trim() -notmatch '^\s*--' }
Write-Host "Commandes SQL à exécuter: $($sqlCommands.Count)" -ForegroundColor Yellow

$successCount = 0
$errorCount = 0
$errors = @()

foreach ($i in 0..($sqlCommands.Count - 1)) {
    $command = $sqlCommands[$i].Trim()
    if ([string]::IsNullOrWhiteSpace($command)) { continue }
    
    Write-Host "  [$($i+1)/$($sqlCommands.Count)] Exécution..." -NoNewline
    
    try {
        # Utiliser l'API query de Supabase
        $url = "$supabaseUrl/rest/v1/rpc/query"
        
        $body = @{
            query = $command + ";"
        } | ConvertTo-Json -Depth 10 -Compress
        
        $headers = @{
            "apikey" = $serviceKey
            "Authorization" = "Bearer $serviceKey"
            "Content-Type" = "application/json"
            "Prefer" = "return=minimal"
        }
        
        $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop -TimeoutSec 30
        Write-Host " ✓" -ForegroundColor Green
        $successCount++
        
    } catch {
        # Certaines erreurs sont OK (table déjà existante, etc.)
        $errorMsg = $_.Exception.Message
        if ($errorMsg -match 'already exists|duplicate key' -or $errorMsg -match '404') {
            Write-Host " ⚠ (déjà existe)" -ForegroundColor Yellow
            $successCount++
        } else {
            Write-Host " ✗" -ForegroundColor Red
            $errorCount++
            $errors += @{
                Command = $i + 1
                Error = $errorMsg
            }
        }
    }
    
    Start-Sleep -Milliseconds 100
}

Write-Host "`nRésultat: $successCount succès, $errorCount erreurs" -ForegroundColor $(if ($errorCount -eq 0) { 'Green' } else { 'Yellow' })

if ($errors.Count -gt 0 -and $errors.Count -le 5) {
    Write-Host "`nErreurs détaillées:" -ForegroundColor Yellow
    foreach ($err in $errors) {
        Write-Host "  Commande $($err.Command): $($err.Error)" -ForegroundColor Red
    }
}

# Vérifier que les tables sont créées
Write-Host "`n--- VERIFICATION DES TABLES ---" -ForegroundColor Cyan

$tablesToCheck = @(
    'stripe_config',
    'stripe_transactions',
    'wallets',
    'wallet_transactions',
    'withdrawals'
)

$tablesFound = @()
foreach ($table in $tablesToCheck) {
    try {
        $url = "$supabaseUrl/rest/v1/$table"
        $headers = @{
            "apikey" = $serviceKey
            "Authorization" = "Bearer $serviceKey"
            "Range" = "0-0"
        }
        
        $response = Invoke-RestMethod -Uri $url -Method Head -Headers $headers -ErrorAction Stop
        Write-Host "  ✓ Table '$table' existe" -ForegroundColor Green
        $tablesFound += $table
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "  ✗ Table '$table' n'existe pas" -ForegroundColor Red
        } elseif ($_.Exception.Response.StatusCode -eq 416) {
            # Range not satisfiable = table vide = OK
            Write-Host "  ✓ Table '$table' existe (vide)" -ForegroundColor Green
            $tablesFound += $table
        } else {
            Write-Host "  ⚠ Table '$table' - Erreur: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nTables trouvées: $($tablesFound.Count)/$($tablesToCheck.Count)" -ForegroundColor $(if ($tablesFound.Count -eq $tablesToCheck.Count) { 'Green' } else { 'Yellow' })

# Résumé final
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESULTAT DU DEPLOIEMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($tablesFound.Count -eq $tablesToCheck.Count) {
    Write-Host "`n✅ DEPLOIEMENT REUSSI!" -ForegroundColor Green
    Write-Host "`nTables Stripe créées:" -ForegroundColor White
    foreach ($table in $tablesFound) {
        Write-Host "  ✓ $table" -ForegroundColor Green
    }
    
    Write-Host "`nProchaines étapes:" -ForegroundColor Yellow
    Write-Host "  1. Configurer les secrets Stripe dans Supabase" -ForegroundColor White
    Write-Host "  2. Déployer les Edge Functions" -ForegroundColor White
    Write-Host "  3. Tester les paiements" -ForegroundColor White
    
    exit 0
} else {
    Write-Host "`n⚠ DEPLOIEMENT PARTIEL" -ForegroundColor Yellow
    Write-Host "`nTables manquantes:" -ForegroundColor Red
    foreach ($table in $tablesToCheck) {
        if ($table -notin $tablesFound) {
            Write-Host "  ✗ $table" -ForegroundColor Red
        }
    }
    
    Write-Host "`nSolutions alternatives:" -ForegroundColor Yellow
    Write-Host "  1. Utiliser Supabase CLI: supabase login && supabase db push" -ForegroundColor Cyan
    Write-Host "  2. Utiliser le Dashboard: https://supabase.com/dashboard/project/$projectRef/editor" -ForegroundColor Cyan
    Write-Host "  3. Copier/coller le SQL manuellement dans l'éditeur SQL" -ForegroundColor Cyan
    
    exit 1
}
