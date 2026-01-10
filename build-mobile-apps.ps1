# 🚀 BUILD 224Solutions Mobile Apps - Script Automatique
# Génère les applications Android et iOS prêtes à déployer

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   📱 224Solutions Mobile Build Script  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier Node.js
Write-Host "🔍 Checking dependencies..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green

# Vérifier npm
$npmVersion = npm --version 2>$null
if (-not $npmVersion) {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm: $npmVersion" -ForegroundColor Green

# Vérifier Capacitor CLI
$capVersion = npx cap --version 2>$null
if (-not $capVersion) {
    Write-Host "⚠️  Capacitor CLI not found, installing..." -ForegroundColor Yellow
    npm install -g @capacitor/cli
}
Write-Host "✅ Capacitor: $(npx cap --version)" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Step 1: Build Web Application         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Build le projet web
Write-Host "📦 Building web application (production mode)..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Web build failed! Check errors above." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Web build completed successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Step 2: Sync with Capacitor           " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Sync avec Capacitor
Write-Host "🔄 Synchronizing with Capacitor..." -ForegroundColor Yellow
npx cap sync

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Capacitor sync completed!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Step 3: Choose Platform               " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Menu de choix
Write-Host "📱 Select platform to build:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. 🤖 Android (APK)" -ForegroundColor White
Write-Host "  2. 🍎 iOS (requires macOS + Xcode)" -ForegroundColor White
Write-Host "  3. 🌐 PWA Web Manifest Check" -ForegroundColor White
Write-Host "  4. 📊 Both Android + iOS" -ForegroundColor White
Write-Host "  5. 🔧 Capacitor Doctor (diagnostic)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

Write-Host ""

switch ($choice) {
    "1" {
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "   🤖 Opening Android Studio...         " -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        
        # Vérifier que le projet Android existe
        if (-not (Test-Path "android")) {
            Write-Host "⚠️  Android project not found. Adding Android platform..." -ForegroundColor Yellow
            npx cap add android
        }
        
        Write-Host "🚀 Launching Android Studio..." -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps in Android Studio:" -ForegroundColor Yellow
        Write-Host "  1. Wait for Gradle sync to complete" -ForegroundColor White
        Write-Host "  2. Build → Generate Signed Bundle/APK" -ForegroundColor White
        Write-Host "  3. Select 'APK' or 'Android App Bundle'" -ForegroundColor White
        Write-Host "  4. Create/select your keystore" -ForegroundColor White
        Write-Host "  5. Build and retrieve APK from:" -ForegroundColor White
        Write-Host "     android/app/build/outputs/apk/" -ForegroundColor Cyan
        Write-Host ""
        
        npx cap open android
    }
    
    "2" {
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "   🍎 Opening Xcode...                  " -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        
        # Vérifier que le projet iOS existe
        if (-not (Test-Path "ios")) {
            Write-Host "⚠️  iOS project not found. Adding iOS platform..." -ForegroundColor Yellow
            npx cap add ios
        }
        
        # Vérifier si on est sur macOS
        if ($IsMacOS -or $IsLinux) {
            Write-Host "🚀 Launching Xcode..." -ForegroundColor Green
            Write-Host ""
            Write-Host "Next steps in Xcode:" -ForegroundColor Yellow
            Write-Host "  1. Select your Development Team" -ForegroundColor White
            Write-Host "  2. Product → Archive" -ForegroundColor White
            Write-Host "  3. Distribute App → Ad Hoc or App Store" -ForegroundColor White
            Write-Host "  4. Export IPA file" -ForegroundColor White
            Write-Host ""
            
            npx cap open ios
        } else {
            Write-Host "⚠️  iOS builds require macOS with Xcode installed!" -ForegroundColor Yellow
            Write-Host "   Running on Windows/Linux - cannot build iOS." -ForegroundColor Red
            Write-Host ""
            Write-Host "   iOS project is ready at: ios/" -ForegroundColor Cyan
            Write-Host "   Transfer to macOS and run: npx cap open ios" -ForegroundColor Cyan
        }
    }
    
    "3" {
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "   🌐 PWA Manifest Check                " -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        
        # Vérifier le manifest
        if (Test-Path "public/manifest.json") {
            Write-Host "✅ manifest.json found!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📄 Manifest content:" -ForegroundColor Yellow
            Get-Content "public/manifest.json" | Write-Host
        } else {
            Write-Host "❌ manifest.json not found in public/" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "🌐 PWA Installation URLs:" -ForegroundColor Cyan
        Write-Host "  Production: https://224solution.net" -ForegroundColor White
        Write-Host ""
        Write-Host "📱 To install PWA:" -ForegroundColor Yellow
        Write-Host "  Android Chrome: Menu → Install app" -ForegroundColor White
        Write-Host "  iOS Safari: Share → Add to Home Screen" -ForegroundColor White
        Write-Host "  Desktop: Address bar → Install icon" -ForegroundColor White
        Write-Host ""
    }
    
    "4" {
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "   📱 Opening Both Platforms...         " -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        
        # Android
        if (-not (Test-Path "android")) {
            Write-Host "⚠️  Android project not found. Adding..." -ForegroundColor Yellow
            npx cap add android
        }
        
        Write-Host "🤖 Opening Android Studio..." -ForegroundColor Green
        Start-Process "cmd" -ArgumentList "/c npx cap open android" -NoNewWindow
        
        Start-Sleep -Seconds 2
        
        # iOS
        if (-not (Test-Path "ios")) {
            Write-Host "⚠️  iOS project not found. Adding..." -ForegroundColor Yellow
            npx cap add ios
        }
        
        if ($IsMacOS -or $IsLinux) {
            Write-Host "🍎 Opening Xcode..." -ForegroundColor Green
            npx cap open ios
        } else {
            Write-Host "⚠️  iOS requires macOS. Skipping..." -ForegroundColor Yellow
        }
    }
    
    "5" {
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "   🔧 Running Capacitor Doctor...       " -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        
        npx cap doctor
        
        Write-Host ""
        Write-Host "📊 Fix any issues shown above before building." -ForegroundColor Yellow
    }
    
    default {
        Write-Host "❌ Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ✅ Build Process Complete!           " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Documentation: GUIDE_INSTALLATION_APP_UTILISATEUR.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Next steps:" -ForegroundColor Green
Write-Host "  - Complete build in IDE (Android Studio/Xcode)" -ForegroundColor White
Write-Host "  - Test on physical devices" -ForegroundColor White
Write-Host "  - Submit to Play Store / App Store" -ForegroundColor White
Write-Host ""
