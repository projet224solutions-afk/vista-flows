# =====================================================
# SCRIPT URGENT - DÉPLOIEMENT CORRECTIONS SÉCURITÉ
# =====================================================
# Date: 2026-01-06
# Criticité: 🟠 HAUTE - Vulnérabilités en production
# Impact: CORS non restrictif, validations manquantes
# Temps estimé: 15-20 minutes
# =====================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Token = ""
)

Write-Host ""
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "🔒 DÉPLOIEMENT CORRECTIONS SÉCURITÉ" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""

# Vérifier si un token est fourni
if ([string]::IsNullOrWhiteSpace($Token)) {
    Write-Host "⚠️  Aucun token Supabase fourni" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options de déploiement:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OPTION 1 - Avec token Supabase (automatisé, recommandé):" -ForegroundColor White
    Write-Host "   1. Obtenir un token sur: https://supabase.com/dashboard/account/tokens" -ForegroundColor Gray
    Write-Host "   2. Créer un nouveau token (nom: Deploy Security Fixes)" -ForegroundColor Gray
    Write-Host "   3. Copier le token (format: sbp_xxxxxxxxxx)" -ForegroundColor Gray
    Write-Host "   4. Relancer: .\URGENT-deploy-security-fixes.ps1 -Token `"sbp_xxx...`"" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OPTION 2 - Manuel via Dashboard (plus lent):" -ForegroundColor White
    Write-Host "   Continuer sans token pour voir les instructions manuelles" -ForegroundColor Gray
    Write-Host ""
    
    $choice = Read-Host "Continuer en mode manuel? (oui/non)"
    if ($choice -ne "oui") {
        exit 0
    }
    $manualMode = $true
} else {
    $manualMode = $false
    Write-Host "✅ Token fourni - Mode automatisé activé" -ForegroundColor Green
    Write-Host ""
}

# Vérifier Supabase CLI
Write-Host "📋 Vérification de Supabase CLI..." -ForegroundColor Cyan
$cliVersion = supabase --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase CLI non installé" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation:" -ForegroundColor Yellow
    Write-Host "   npm install -g supabase" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
Write-Host "✅ Supabase CLI: $cliVersion" -ForegroundColor Green
Write-Host ""

# Vérifier la connexion au projet
Write-Host "📋 Vérification de la connexion au projet..." -ForegroundColor Cyan
$projectRef = "uakkxaibujzxdiqzpnpr"
$status = supabase status 2>&1

if ($status -notmatch $projectRef) {
    Write-Host "⚠️  Projet non lié" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Liaison au projet..." -ForegroundColor Cyan
    supabase link --project-ref $projectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec de liaison au projet" -ForegroundColor Red
        Write-Host ""
        Write-Host "Action manuelle requise:" -ForegroundColor Yellow
        Write-Host "   supabase login" -ForegroundColor Gray
        Write-Host "   supabase link --project-ref $projectRef" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
}
Write-Host "✅ Projet lié: $projectRef" -ForegroundColor Green
Write-Host ""

# Liste des Edge Functions critiques à déployer
$criticalFunctions = @(
    @{
        Name = "create-pdg-agent"
        Description = "Création agent PDG - CORS + validation commission"
        Priority = 1
    },
    @{
        Name = "create-sub-agent"
        Description = "Création sous-agent - CORS restrictif"
        Priority = 1
    },
    @{
        Name = "wallet-operations"
        Description = "Opérations wallet - Secrets HMAC sécurisés"
        Priority = 2
    },
    @{
        Name = "wallet-transfer"
        Description = "Transfert wallet - Secrets HMAC sécurisés"
        Priority = 2
    },
    @{
        Name = "stripe-webhook"
        Description = "Webhook Stripe - Validation signature"
        Priority = 3
    }
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "📦 EDGE FUNCTIONS À DÉPLOYER" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

foreach ($func in $criticalFunctions) {
    $priority = switch ($func.Priority) {
        1 { "🔴 CRITIQUE" }
        2 { "🟠 HAUTE" }
        3 { "🟡 MOYENNE" }
    }
    Write-Host "$priority - $($func.Name)" -ForegroundColor White
    Write-Host "         $($func.Description)" -ForegroundColor Gray
}
Write-Host ""

if ($manualMode) {
    # MODE MANUEL
    Write-Host "=============================================" -ForegroundColor Yellow
    Write-Host "📋 INSTRUCTIONS DE DÉPLOIEMENT MANUEL" -ForegroundColor Yellow
    Write-Host "=============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Ouvrir le Dashboard Supabase:" -ForegroundColor White
    Write-Host "   👉 https://supabase.com/dashboard/project/$projectRef/functions" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Pour chaque fonction ci-dessus:" -ForegroundColor White
    Write-Host "   a) Cliquer sur le nom de la fonction" -ForegroundColor Gray
    Write-Host "   b) Cliquer 'Deploy new version'" -ForegroundColor Gray
    Write-Host "   c) Uploader: supabase\functions\[nom]\index.ts" -ForegroundColor Gray
    Write-Host "   d) Attendre 'Deployed successfully'" -ForegroundColor Gray
    Write-Host "   e) Vérifier la date 'Last deployed' = aujourd'hui" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Ordre de priorité (déployer dans cet ordre):" -ForegroundColor White
    $priority1 = $criticalFunctions | Where-Object { $_.Priority -eq 1 }
    $priority2 = $criticalFunctions | Where-Object { $_.Priority -eq 2 }
    $priority3 = $criticalFunctions | Where-Object { $_.Priority -eq 3 }
    
    Write-Host ""
    Write-Host "   🔴 PRIORITÉ 1 (urgent):" -ForegroundColor Red
    foreach ($f in $priority1) {
        Write-Host "      - $($f.Name)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "   🟠 PRIORITÉ 2 (important):" -ForegroundColor Yellow
    foreach ($f in $priority2) {
        Write-Host "      - $($f.Name)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "   🟡 PRIORITÉ 3 (recommandé):" -ForegroundColor Green
    foreach ($f in $priority3) {
        Write-Host "      - $($f.Name)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "✅ INSTRUCTIONS AFFICHÉES" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Conseil: Pour un déploiement automatisé," -ForegroundColor Cyan
    Write-Host "   relancez avec: .\URGENT-deploy-security-fixes.ps1 -Token `"sbp_xxx...`"" -ForegroundColor Cyan
    Write-Host ""
    
} else {
    # MODE AUTOMATISÉ
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "🚀 DÉPLOIEMENT AUTOMATISÉ" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    
    $deployedCount = 0
    $failedCount = 0
    $failedFunctions = @()
    
    foreach ($func in ($criticalFunctions | Sort-Object Priority)) {
        $funcPath = "supabase\functions\$($func.Name)"
        
        Write-Host "📦 Déploiement: $($func.Name)..." -ForegroundColor Cyan
        Write-Host "   $($func.Description)" -ForegroundColor Gray
        
        # Vérifier que le dossier existe
        if (-not (Test-Path $funcPath)) {
            Write-Host "   ⚠️  Dossier non trouvé: $funcPath" -ForegroundColor Yellow
            $failedCount++
            $failedFunctions += $func.Name
            Write-Host ""
            continue
        }
        
        # Déployer la fonction
        try {
            $env:SUPABASE_ACCESS_TOKEN = $Token
            $deployOutput = supabase functions deploy $($func.Name) --project-ref $projectRef 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Déployé avec succès" -ForegroundColor Green
                $deployedCount++
            } else {
                Write-Host "   ❌ Échec: $deployOutput" -ForegroundColor Red
                $failedCount++
                $failedFunctions += $func.Name
            }
        } catch {
            Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
            $failedCount++
            $failedFunctions += $func.Name
        }
        
        Write-Host ""
        Start-Sleep -Milliseconds 500
    }
    
    # Résumé
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "📊 RÉSUMÉ DU DÉPLOIEMENT" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Déployées: $deployedCount/$($criticalFunctions.Count)" -ForegroundColor Green
    
    if ($failedCount -gt 0) {
        Write-Host "❌ Échecs: $failedCount" -ForegroundColor Red
        Write-Host ""
        Write-Host "Fonctions en échec:" -ForegroundColor Yellow
        foreach ($failed in $failedFunctions) {
            Write-Host "   - $failed" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "💡 Pour ces fonctions, utilisez le déploiement manuel" -ForegroundColor Cyan
    }
    Write-Host ""
}

# Tests de vérification
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🧪 TESTS DE VÉRIFICATION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Vérifier les logs Edge Functions:" -ForegroundColor White
Write-Host "   👉 https://supabase.com/dashboard/project/$projectRef/logs/edge-functions" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Tester CORS (DevTools → Network):" -ForegroundColor White
Write-Host "   - Créer un agent depuis l'interface" -ForegroundColor Gray
Write-Host "   - Vérifier headers Access-Control-Allow-Origin" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Tester validation commission:" -ForegroundColor White
Write-Host "   - Essayer de créer un agent avec commission > 50%" -ForegroundColor Gray
Write-Host "   - ✅ Doit retourner erreur 400" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Tester wallet operations:" -ForegroundColor White
Write-Host "   - Faire une transaction wallet" -ForegroundColor Gray
Write-Host "   - Vérifier que ça fonctionne sans erreur" -ForegroundColor Gray
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "✅ DÉPLOIEMENT TERMINÉ" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaine étape: Déployer la migration Smart Funds Release" -ForegroundColor Cyan
Write-Host "Script: .\URGENT-deploy-smart-funds.ps1" -ForegroundColor Gray
Write-Host ""
