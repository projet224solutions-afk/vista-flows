Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   DIAGNOSTIC SYSTEME D'APPELS AGORA" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# 1. Vérifier fichiers essentiels
Write-Host "1. FICHIERS ESSENTIELS:" -ForegroundColor Yellow
$files = @(
    "src/services/agoraService.ts",
    "src/hooks/useAgora.ts",
    "src/components/communication/AgoraVideoCall.tsx",
    "src/components/communication/AgoraAudioCall.tsx",
    "supabase/functions/agora-token/index.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [X] $file MANQUANT" -ForegroundColor Red
    }
}

# 2. Vérifier dépendances
Write-Host "`n2. DEPENDANCES NPM:" -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$agoraRtc = $packageJson.dependencies.'agora-rtc-sdk-ng'
$agoraRtm = $packageJson.dependencies.'agora-rtm'

if ($agoraRtc) {
    Write-Host "  [OK] agora-rtc-sdk-ng: $agoraRtc" -ForegroundColor Green
} else {
    Write-Host "  [X] agora-rtc-sdk-ng MANQUANT" -ForegroundColor Red
}

if ($agoraRtm) {
    Write-Host "  [OK] agora-rtm: $agoraRtm" -ForegroundColor Green
} else {
    Write-Host "  [X] agora-rtm MANQUANT" -ForegroundColor Red
}

# 3. Vérifier fichier .env
Write-Host "`n3. CONFIGURATION .env:" -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -match "VITE_AGORA_APP_ID") {
        Write-Host "  [OK] VITE_AGORA_APP_ID trouvé" -ForegroundColor Green
    } else {
        Write-Host "  [!] VITE_AGORA_APP_ID manquant dans .env" -ForegroundColor Red
        Write-Host "      Ajoutez: VITE_AGORA_APP_ID=votre_app_id" -ForegroundColor Gray
    }
} else {
    Write-Host "  [X] Fichier .env introuvable" -ForegroundColor Red
    Write-Host "      Créez un fichier .env basé sur .env.example" -ForegroundColor Gray
}

# 4. Vérifier .env.example
Write-Host "`n4. TEMPLATE .env.example:" -ForegroundColor Yellow
if (Test-Path ".env.example") {
    $exampleContent = Get-Content ".env.example" -Raw
    if ($exampleContent -match "AGORA") {
        Write-Host "  [OK] Configuration Agora documentée" -ForegroundColor Green
    } else {
        Write-Host "  [!] Configuration Agora non documentée" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [X] .env.example introuvable" -ForegroundColor Red
}

# 5. Flux d'appel
Write-Host "`n5. FLUX D'APPEL:" -ForegroundColor Yellow
Write-Host "  1. User clicks call button" -ForegroundColor White
Write-Host "  2. useAgora.startCall() is called" -ForegroundColor White
Write-Host "  3. Fetch credentials from agora-token Edge Function" -ForegroundColor White
Write-Host "  4. Edge Function requires AGORA_APP_ID + AGORA_APP_CERTIFICATE" -ForegroundColor White
Write-Host "  5. Edge Function returns { appId, token, channel, uid }" -ForegroundColor White
Write-Host "  6. agoraService.joinChannel() with token" -ForegroundColor White
Write-Host "  7. publishLocalTracks() - Audio/Video streams" -ForegroundColor White

# 6. Points critiques
Write-Host "`n6. POINTS CRITIQUES:" -ForegroundColor Red
Write-Host "  - AGORA_APP_ID doit être dans Supabase Vault" -ForegroundColor White
Write-Host "  - AGORA_APP_CERTIFICATE doit être dans Supabase Vault" -ForegroundColor White
Write-Host "  - Sans ces secrets, les appels échoueront" -ForegroundColor White

# 7. Actions requises
Write-Host "`n7. ACTIONS REQUISES:" -ForegroundColor Magenta
Write-Host "  1. Créer un projet Agora sur console.agora.io" -ForegroundColor White
Write-Host "  2. Récupérer App ID + App Certificate" -ForegroundColor White
Write-Host "  3. Ajouter dans Supabase Vault:" -ForegroundColor White
Write-Host "     - AGORA_APP_ID" -ForegroundColor Gray
Write-Host "     - AGORA_APP_CERTIFICATE" -ForegroundColor Gray
Write-Host "  4. Tester un appel entre deux utilisateurs" -ForegroundColor White

Write-Host "`n============================================`n" -ForegroundColor Cyan
