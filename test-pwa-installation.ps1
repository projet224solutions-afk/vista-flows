# 🧪 TEST PWA - 224Solutions
# Script pour tester l'installation PWA localement

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   🧪 Test PWA Installation - 224Solutions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build production
Write-Host "📦 Building production bundle..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed!" -ForegroundColor Green
Write-Host ""

# 2. Vérifier les fichiers PWA
Write-Host "🔍 Checking PWA files..." -ForegroundColor Yellow

$files = @(
    "dist/manifest.json",
    "dist/service-worker.js",
    "dist/icon-192.png",
    "dist/icon-512.png"
)

$allGood = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Host "  ✅ $file ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MISSING!" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

if (-not $allGood) {
    Write-Host "⚠️  Some PWA files are missing!" -ForegroundColor Yellow
    Write-Host "   Make sure manifest.json and service-worker.js are in public/" -ForegroundColor Yellow
    Write-Host ""
}

# 3. Analyser le manifest
Write-Host "📄 Manifest.json content:" -ForegroundColor Yellow
if (Test-Path "dist/manifest.json") {
    $manifest = Get-Content "dist/manifest.json" | ConvertFrom-Json
    Write-Host "  Name: $($manifest.name)" -ForegroundColor Cyan
    Write-Host "  Short Name: $($manifest.short_name)" -ForegroundColor Cyan
    Write-Host "  Start URL: $($manifest.start_url)" -ForegroundColor Cyan
    Write-Host "  Display: $($manifest.display)" -ForegroundColor Cyan
    Write-Host "  Theme Color: $($manifest.theme_color)" -ForegroundColor Cyan
    Write-Host "  Icons: $($manifest.icons.Count) configured" -ForegroundColor Cyan
    Write-Host "  Shortcuts: $($manifest.shortcuts.Count) configured" -ForegroundColor Cyan
} else {
    Write-Host "  ⚠️  manifest.json not found in dist/" -ForegroundColor Yellow
}

Write-Host ""

# 4. Démarrer serveur local
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   🌐 Starting Local Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🚀 Starting preview server..." -ForegroundColor Green
Write-Host ""
Write-Host "📱 Test PWA Installation:" -ForegroundColor Yellow
Write-Host "  1. Open browser at http://localhost:4173" -ForegroundColor White
Write-Host "  2. Open DevTools (F12)" -ForegroundColor White
Write-Host "  3. Go to Application tab" -ForegroundColor White
Write-Host "  4. Check 'Manifest' section" -ForegroundColor White
Write-Host "  5. Check 'Service Workers' section" -ForegroundColor White
Write-Host ""
Write-Host "🔧 To install PWA:" -ForegroundColor Yellow
Write-Host "  Chrome: Address bar → Install icon (⊕)" -ForegroundColor White
Write-Host "  Or: Menu → Install 224Solutions" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Lighthouse PWA Test:" -ForegroundColor Yellow
Write-Host "  DevTools → Lighthouse → Generate report" -ForegroundColor White
Write-Host "  Check 'Progressive Web App' category" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop server" -ForegroundColor Gray
Write-Host ""

npm run preview
