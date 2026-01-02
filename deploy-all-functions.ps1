# Script de déploiement automatisé pour toutes les Edge Functions modifiées
# Nécessite SUPABASE_ACCESS_TOKEN dans les variables d'environnement

param(
    [switch]$DryRun,
    [string]$Token
)

Write-Host "🚀 Déploiement Edge Functions - 224Solutions" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Vérifier token
if ($Token) {
    $env:SUPABASE_ACCESS_TOKEN = $Token
    Write-Host "✅ Token fourni via paramètre" -ForegroundColor Green
}
elseif ($env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "✅ Token trouvé dans variables d'environnement" -ForegroundColor Green
}
else {
    Write-Host "❌ ERREUR: Token Supabase requis!" -ForegroundColor Red
    Write-Host "`nPour obtenir un token:" -ForegroundColor Yellow
    Write-Host "  1. https://supabase.com/dashboard/account/tokens"
    Write-Host "  2. Créer un Access Token"
    Write-Host "  3. Exécuter: .\deploy-all-functions.ps1 -Token 'VOTRE_TOKEN'"
    Write-Host "`nOu définir: `$env:SUPABASE_ACCESS_TOKEN='VOTRE_TOKEN'" -ForegroundColor Yellow
    exit 1
}

# Fonctions critiques à déployer en priorité (Phase 0 + Phase 1 + Phase 2)
$priorityFunctions = @(
    'create-pdg-agent',
    'create-sub-agent',
    'wallet-operations',
    'wallet-transfer'
)

# Fonctions avec CORS à déployer
$corsFunctions = @(
    'send-otp-email',
    'communication-handler',
    'waap-protect',
    'verify-bureau-token',
    'vendor-ai-assistant',
    'vendor-agent-get-products',
    'upload-bureau-stamp',
    'update-vendor-agent-email',
    'update-member-email',
    'update-bureau-email',
    'test-gemini-api',
    'test-google-cloud-api',
    'taxi-refuse-ride',
    'universal-login',
    'taxi-payment-process',
    'taxi-payment',
    'taxi-accept-ride',
    'stripe-create-payment-intent',
    'sign-contract',
    'send-sms',
    'send-delivery-notification',
    'send-security-alert',
    'smart-notifications',
    'send-communication-notification',
    'security-incident-response',
    'send-agent-invitation',
    'security-forensics',
    'security-block-ip',
    'secure-payment-validate'
)

$deployed = 0
$failed = @()

Write-Host "`n🔴 PHASE 1: Fonctions critiques (sécurité haute priorité)" -ForegroundColor Red
Write-Host "-" * 60 -ForegroundColor Gray

foreach ($func in $priorityFunctions) {
    Write-Host "`n  📦 Déploiement: $func..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "    [DRY RUN] supabase functions deploy $func" -ForegroundColor Cyan
        $deployed++
        continue
    }
    
    try {
        $output = supabase functions deploy $func 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ Succès" -ForegroundColor Green
            $deployed++
        }
        else {
            Write-Host "    ❌ Échec (code $LASTEXITCODE)" -ForegroundColor Red
            $failed += $func
            Write-Host "    Détails: $output" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "    ❌ Erreur: $_" -ForegroundColor Red
        $failed += $func
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`n🟡 PHASE 2: Fonctions CORS (30 premières)" -ForegroundColor Yellow
Write-Host "-" * 60 -ForegroundColor Gray
Write-Host "⚠️  Déploiement de 30 fonctions CORS (cela peut prendre 5-10 minutes)..." -ForegroundColor Cyan

$corsDeployed = 0
$maxCors = 30

foreach ($func in $corsFunctions) {
    if ($corsDeployed -ge $maxCors) {
        Write-Host "`n⏸️  Limite de 30 fonctions atteinte. Restant: $($corsFunctions.Count - $corsDeployed)" -ForegroundColor Yellow
        break
    }
    
    Write-Host "`n  📦 Déploiement: $func..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "    [DRY RUN] supabase functions deploy $func" -ForegroundColor Cyan
        $corsDeployed++
        continue
    }
    
    try {
        $output = supabase functions deploy $func 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ Succès" -ForegroundColor Green
            $corsDeployed++
        }
        else {
            Write-Host "    ❌ Échec" -ForegroundColor Red
            $failed += $func
        }
    }
    catch {
        Write-Host "    ❌ Erreur: $_" -ForegroundColor Red
        $failed += $func
    }
    
    Start-Sleep -Milliseconds 300
}

# RÉSUMÉ
Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "📊 RÉSUMÉ DU DÉPLOIEMENT" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Gray

Write-Host "`n✅ Fonctions critiques déployées: $deployed / $($priorityFunctions.Count)" -ForegroundColor Green
Write-Host "✅ Fonctions CORS déployées: $corsDeployed / $maxCors" -ForegroundColor Green
Write-Host "❌ Échecs: $($failed.Count)" -ForegroundColor $(if ($failed.Count -gt 0) { "Red" } else { "Green" })

if ($failed.Count -gt 0) {
    Write-Host "`n❌ Fonctions échouées:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  - $_" }
    Write-Host "`nPour redéployer les fonctions échouées:" -ForegroundColor Yellow
    $failed | ForEach-Object { Write-Host "  supabase functions deploy $_" }
}

Write-Host "`n🎯 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
Write-Host "  1. Tester les fonctions déployées"
Write-Host "  2. Vérifier logs: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs"
Write-Host "  3. Tester CORS depuis navigateur (DevTools)"
Write-Host "  4. Déployer les fonctions CORS restantes: $($corsFunctions.Count - $corsDeployed)"

if ($DryRun) {
    Write-Host "`n⚠️  MODE DRY RUN - Aucune fonction n'a été réellement déployée" -ForegroundColor Yellow
    Write-Host "Pour déployer réellement, relancez sans -DryRun" -ForegroundColor Yellow
}

Write-Host "`n✅ Script terminé!" -ForegroundColor Green
