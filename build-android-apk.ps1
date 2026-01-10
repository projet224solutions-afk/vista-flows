# ================================================================
# SCRIPT DE BUILD ET GÉNÉRATION APK ANDROID
# ================================================================
# Ce script automatise la création de l'APK 224Solutions
# Usage: .\build-android-apk.ps1
# ================================================================

Write-Host "🚀 GÉNÉRATION APK 224SOLUTIONS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Étape 1: Vérifier les dépendances
Write-Host "📦 Étape 1/6: Vérification des dépendances..." -ForegroundColor Yellow

# Vérifier Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js n'est pas installé" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js: $(node --version)" -ForegroundColor Green

# Vérifier npm
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm n'est pas installé" -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm: $(npm --version)" -ForegroundColor Green

# Vérifier Capacitor CLI
Write-Host "🔍 Vérification Capacitor..." -ForegroundColor Yellow
$capVersion = npm list @capacitor/cli 2>&1 | Select-String "@capacitor/cli@"
if ($capVersion) {
    Write-Host "✅ Capacitor installé" -ForegroundColor Green
} else {
    Write-Host "📥 Installation de Capacitor..." -ForegroundColor Yellow
    npm install @capacitor/core @capacitor/cli @capacitor/android --save
}

Write-Host ""

# Étape 2: Builder le projet React
Write-Host "🏗️  Étape 2/6: Build du projet React..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build React" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build React terminé" -ForegroundColor Green
Write-Host ""

# Étape 3: Initialiser Capacitor Android (si nécessaire)
Write-Host "📱 Étape 3/6: Configuration Capacitor Android..." -ForegroundColor Yellow

if (!(Test-Path "android")) {
    Write-Host "📥 Ajout de la plateforme Android..." -ForegroundColor Yellow
    npx cap add android
    Write-Host "✅ Plateforme Android ajoutée" -ForegroundColor Green
} else {
    Write-Host "✅ Plateforme Android déjà présente" -ForegroundColor Green
}
Write-Host ""

# Étape 4: Synchroniser le code
Write-Host "🔄 Étape 4/6: Synchronisation avec Android..." -ForegroundColor Yellow
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la synchronisation" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Synchronisation terminée" -ForegroundColor Green
Write-Host ""

# Étape 5: Vérifier Gradle
Write-Host "⚙️  Étape 5/6: Vérification Gradle..." -ForegroundColor Yellow

$gradleWrapper = "android\gradlew.bat"
if (!(Test-Path $gradleWrapper)) {
    Write-Host "❌ Gradle wrapper non trouvé" -ForegroundColor Red
    Write-Host "💡 Astuce: Ouvrez le projet dans Android Studio une fois pour initialiser Gradle" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Gradle wrapper trouvé" -ForegroundColor Green
Write-Host ""

# Étape 6: Générer l'APK
Write-Host "🔨 Étape 6/6: Génération de l'APK..." -ForegroundColor Yellow
Write-Host "⏳ Cela peut prendre 5-10 minutes..." -ForegroundColor Yellow
Write-Host ""

Set-Location android

.\gradlew.bat assembleRelease

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ APK GÉNÉRÉ AVEC SUCCÈS!" -ForegroundColor Green
    Write-Host ""
    
    # Localiser l'APK
    $apkPath = "app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apkPath) {
        $apkFullPath = Resolve-Path $apkPath
        $apkSize = (Get-Item $apkFullPath).Length / 1MB
        
        Write-Host "📱 APK généré:" -ForegroundColor Cyan
        Write-Host "   Chemin: $apkFullPath" -ForegroundColor White
        Write-Host "   Taille: $([math]::Round($apkSize, 2)) MB" -ForegroundColor White
        Write-Host ""
        
        # Copier dans public pour accès facile
        $publicApk = "..\public\224Solutions.apk"
        Copy-Item $apkFullPath $publicApk -Force
        Write-Host "✅ APK copié dans: public\224Solutions.apk" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "🎉 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
        Write-Host "1. Tester l'APK sur un appareil Android réel" -ForegroundColor White
        Write-Host "2. Uploader vers Supabase Storage (bucket app-downloads)" -ForegroundColor White
        Write-Host "3. L'application sera automatiquement téléchargeable" -ForegroundColor White
        Write-Host ""
        
        # Ouvrir le dossier
        Write-Host "📂 Ouverture du dossier..." -ForegroundColor Yellow
        Start-Process explorer.exe -ArgumentList "/select,`"$apkFullPath`""
    } else {
        Write-Host "⚠️  APK généré mais non trouvé à l'emplacement attendu" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Erreur lors de la génération de l'APK" -ForegroundColor Red
    Write-Host "💡 Vérifiez les logs ci-dessus pour plus de détails" -ForegroundColor Yellow
}

Set-Location ..

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ SCRIPT TERMINÉ" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
