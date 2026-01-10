#!/usr/bin/env pwsh
# Script de v?rification du syst?me wallet apr?s migration

Write-Host "`n?? V?RIFICATION DU SYST?ME WALLET" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Couleurs
$success = "Green"
$warning = "Yellow"
$error = "Red"
$info = "Cyan"

# Compteurs
$checks_passed = 0
$checks_failed = 0
$checks_total = 0

function Test-Check {
    param([string]$Name, [scriptblock]$Test)
    $script:checks_total++
    Write-Host "[$script:checks_total] $Name..." -NoNewline
    try {
        $result = & $Test
        if ($result) {
            Write-Host " ?" -ForegroundColor $success
            $script:checks_passed++
            return $true
        } else {
            Write-Host " ?" -ForegroundColor $error
            $script:checks_failed++
            return $false
        }
    } catch {
        Write-Host " ? ($_)" -ForegroundColor $error
        $script:checks_failed++
        return $false
    }
}

Write-Host "?? V?RIFICATION DES FICHIERS LOCAUX`n" -ForegroundColor $info

# 1. V?rifier fichier migration
Test-Check "Migration file exists" {
    Test-Path "supabase/migrations/20260109000000_fix_wallet_system_complete.sql"
}

# 2. V?rifier taille migration
Test-Check "Migration file size > 10KB" {
    (Get-Item "supabase/migrations/20260109000000_fix_wallet_system_complete.sql").Length -gt 10KB
}

# 3. V?rifier contenu migration
$migration_content = Get-Content "supabase/migrations/20260109000000_fix_wallet_system_complete.sql" -Raw

Test-Check "Migration contains wallets table" {
    $migration_content -match "CREATE TABLE wallets"
}

Test-Check "Migration contains wallet_transactions table" {
    $migration_content -match "CREATE TABLE wallet_transactions"
}

Test-Check "Migration contains update_wallet_balance_atomic" {
    $migration_content -match "CREATE OR REPLACE FUNCTION update_wallet_balance_atomic"
}

Test-Check "Migration contains RLS policies" {
    $migration_content -match "ALTER TABLE wallets ENABLE ROW LEVEL SECURITY"
}

Test-Check "Migration contains idempotency system" {
    $migration_content -match "CREATE TABLE IF NOT EXISTS idempotency_keys"
}

Test-Check "Migration contains trigger" {
    $migration_content -match "CREATE TRIGGER trigger_create_wallet_on_profile"
}

# 4. V?rifier les composants frontend modifi?s
Write-Host "`n?? V?RIFICATION DES COMPOSANTS FRONTEND`n" -ForegroundColor $info

Test-Check "UniversalWalletDashboard uses atomic RPC" {
    $dashboard = Get-Content "src/components/wallet/UniversalWalletDashboard.tsx" -Raw
    ($dashboard -match "update_wallet_balance_atomic") -and 
    ($dashboard -match "p_amount") -and
    ($dashboard -notmatch "wallet\.balance \+")
}

Test-Check "UniversalWalletTransactions uses atomic RPC" {
    $transactions = Get-Content "src/components/wallet/UniversalWalletTransactions.tsx" -Raw
    ($transactions -match "update_wallet_balance_atomic") -and
    ($transactions -notmatch "SET balance = ")
}

# 5. V?rifier documentation
Write-Host "`n?? V?RIFICATION DE LA DOCUMENTATION`n" -ForegroundColor $info

Test-Check "Analysis document exists" {
    Test-Path "ANALYSE_WALLET_SYSTEM_BROKEN.md"
}

Test-Check "Analysis document is comprehensive (> 20KB)" {
    if (Test-Path "ANALYSE_WALLET_SYSTEM_BROKEN.md") {
        (Get-Item "ANALYSE_WALLET_SYSTEM_BROKEN.md").Length -gt 20KB
    } else {
        $false
    }
}

# 6. Rechercher probl?mes potentiels
Write-Host "`n?? RECHERCHE DE PROBL?MES POTENTIELS`n" -ForegroundColor $info

Test-Check "No direct balance updates in wallet components" {
    $files = Get-ChildItem "src/components/wallet" -Filter "*.tsx" -Recurse
    $bad_patterns = @()
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match "UPDATE\s+wallets\s+SET\s+balance" -or 
            $content -match "wallet\.balance\s*[\+\-]=") {
            $bad_patterns += $file.Name
        }
    }
    $bad_patterns.Count -eq 0
}

Test-Check "No deprecated walletService imports" {
    $files = Get-ChildItem "src/components/wallet" -Filter "*.tsx" -Recurse
    $deprecated_imports = @()
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match "from\s+['\`"].*walletService['\`"]") {
            $deprecated_imports += $file.Name
        }
    }
    if ($deprecated_imports.Count -gt 0) {
        Write-Host "`n   ??  Files still importing walletService: $($deprecated_imports -join ', ')" -ForegroundColor $warning
    }
    $deprecated_imports.Count -eq 0
}

# 7. V?rifier Git status
Write-Host "`n?? V?RIFICATION GIT`n" -ForegroundColor $info

Test-Check "Migration committed to git" {
    $gitLog = git log --oneline -20
    $gitLog -match "wallet.*migration|fix.*wallet"
}

Test-Check "All changes pushed to remote" {
    $status = git status --porcelain
    $unpushed = git log origin/main..HEAD --oneline
    ($status.Length -eq 0) -and ($unpushed.Length -eq 0)
}

# R?SUM? FINAL
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "?? R?SUM? DE LA V?RIFICATION" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Total checks: $checks_total" -ForegroundColor White
Write-Host "Passed: $checks_passed ?" -ForegroundColor $success
Write-Host "Failed: $checks_failed ?" -ForegroundColor $(if ($checks_failed -eq 0) { $success } else { $error })
Write-Host "Success rate: $([math]::Round(($checks_passed / $checks_total) * 100, 1))%" -ForegroundColor $(if ($checks_failed -eq 0) { $success } else { $warning })
Write-Host "================================================`n" -ForegroundColor Cyan

if ($checks_failed -eq 0) {
    Write-Host "?? TOUTES LES VERIFICATIONS SONT PASSEES!" -ForegroundColor $success
    Write-Host "`n??  Prochaines etapes:" -ForegroundColor $info
    Write-Host "   1. Verifier dans Supabase Dashboard que la migration s'est appliquee" -ForegroundColor White
    Write-Host "   2. Tester les operations wallet (deposit, withdraw, transfer)" -ForegroundColor White
    Write-Host "   3. Verifier les logs RLS dans Supabase" -ForegroundColor White
    Write-Host "   4. Monitorer les performances des transactions" -ForegroundColor White
} else {
    Write-Host "??  CERTAINES VERIFICATIONS ONT ECHOUE" -ForegroundColor $warning
    Write-Host "`nVeuillez corriger les problemes ci-dessus avant de continuer.`n" -ForegroundColor $warning
}

# Suggestions
Write-Host "`n?? COMMANDES UTILES:" -ForegroundColor $info
Write-Host "   ? Verifier DB: " -NoNewline -ForegroundColor White
Write-Host "psql DATABASE_URL -f verify-wallet-migration.sql" -ForegroundColor Yellow
Write-Host "   ? Voir logs: " -NoNewline -ForegroundColor White
Write-Host "supabase logs --type database" -ForegroundColor Yellow
Write-Host "   ? Tester RPC: " -NoNewline -ForegroundColor White
Write-Host "Test dans Supabase Dashboard SQL Editor" -ForegroundColor Yellow
Write-Host ""
