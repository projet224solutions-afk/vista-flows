# Script de verification du systeme d'abonnement
# Date: 2025-01-02

Write-Host "Verification du systeme d'abonnement" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier les fichiers de migration
Write-Host "Verification des fichiers..." -ForegroundColor Yellow

$migration1 = "d:\224Solutions\supabase\migrations\20260102_fix_driver_subscription.sql"
$migration2 = "d:\224Solutions\supabase\migrations\20260102_fix_rls_driver_subscriptions.sql"

if (Test-Path $migration1) {
    $size1 = (Get-Item $migration1).Length
    Write-Host "✅ Migration 1 trouvée ($size1 bytes)" -ForegroundColor Green
} else {
    Write-Host "❌ Migration 1 manquante!" -ForegroundColor Red
}

if (Test-Path $migration2) {
    $size2 = (Get-Item $migration2).Length
    Write-Host "✅ Migration 2 trouvée ($size2 bytes)" -ForegroundColor Green
} else {
    Write-Host "❌ Migration 2 manquante!" -ForegroundColor Red
}

Write-Host ""

# Vérifier les fichiers TypeScript/React
Write-Host "📁 Vérification du code frontend..." -ForegroundColor Yellow

$pdgComponent = "d:\224Solutions\src\components\pdg\DriverSubscriptionManagement.tsx"
$userIdDisplay = "d:\224Solutions\src\components\UserIdDisplay.tsx"
$driverHeader = "d:\224Solutions\src\components\taxi-moto\driver\DriverHeader.tsx"

if (Test-Path $pdgComponent) {
    $content = Get-Content $pdgComponent -Raw
    if ($content -match "pdg_offer_subscription") {
        Write-Host "✅ PDG component - Appel RPC pdg_offer_subscription présent" -ForegroundColor Green
    } else {
        Write-Host "⚠️  PDG component - Appel RPC manquant" -ForegroundColor Yellow
    }
    
    if ($content -match "console.log.*PDG.*Offre abonnement") {
        Write-Host "✅ PDG component - Logs de debug présents" -ForegroundColor Green
    } else {
        Write-Host "⚠️  PDG component - Logs de debug manquants" -ForegroundColor Yellow
    }
}

if (Test-Path $userIdDisplay) {
    $content = Get-Content $userIdDisplay -Raw
    if ($content -match "user_ids.*custom_id") {
        Write-Host "✅ UserIdDisplay - Recherche custom_id présente" -ForegroundColor Green
    } else {
        Write-Host "⚠️  UserIdDisplay - Recherche custom_id manquante" -ForegroundColor Yellow
    }
}

if (Test-Path $driverHeader) {
    $content = Get-Content $driverHeader -Raw
    if ($content -match "UserIdDisplay.*showBadge.*true") {
        Write-Host "✅ DriverHeader - Badge ID affiché" -ForegroundColor Green
    } else {
        Write-Host "⚠️  DriverHeader - Badge ID non affiché" -ForegroundColor Yellow
    }
}

Write-Host ""

# Vérifier les hooks
Write-Host "📁 Vérification des hooks..." -ForegroundColor Yellow

$driverProfileHook = "d:\224Solutions\src\hooks\useTaxiDriverProfile.ts"
$subscriptionHook = "d:\224Solutions\src\hooks\useDriverSubscription.tsx"

if (Test-Path $driverProfileHook) {
    $content = Get-Content $driverProfileHook -Raw
    if ($content -match "profiles.*is_active") {
        Write-Host "✅ useTaxiDriverProfile - Vérification suspension présente" -ForegroundColor Green
    } else {
        Write-Host "❌ useTaxiDriverProfile - Vérification suspension manquante!" -ForegroundColor Red
    }
}

if (Test-Path $subscriptionHook) {
    $content = Get-Content $subscriptionHook -Raw
    if ($content -match "subscribe_driver") {
        Write-Host "✅ useDriverSubscription - Appel subscribe_driver présent" -ForegroundColor Green
    } else {
        Write-Host "⚠️  useDriverSubscription - Vérifier appel subscribe_driver" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Résumé de la vérification" -ForegroundColor Cyan
Write-Host ""

# Compter les problèmes
$issues = 0
$warnings = 0

Write-Host "Pour appliquer les corrections:" -ForegroundColor Yellow
Write-Host "1. Exécutez: .\apply-subscription-fixes.ps1" -ForegroundColor White
Write-Host "2. Ou suivez: APPLICATION_URGENTE_FIX_RLS.md" -ForegroundColor White
Write-Host ""

Write-Host "✅ Vérification terminée" -ForegroundColor Green
