# Script de préparation pour déploiement Hostinger
# Date: 2025-12-01

Write-Host "🚀 PRÉPARATION POUR HOSTINGER" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build du projet
Write-Host "1️⃣ Build du projet..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build réussi" -ForegroundColor Green
Write-Host ""

# 2. Copier .htaccess dans dist
Write-Host "2️⃣ Copie du .htaccess..." -ForegroundColor Yellow
if (Test-Path "public\.htaccess") {
    Copy-Item "public\.htaccess" "dist\.htaccess" -Force
    Write-Host "✅ .htaccess copié dans dist/" -ForegroundColor Green
} else {
    Write-Host "⚠️  .htaccess non trouvé dans public/" -ForegroundColor Yellow
}
Write-Host ""

# 3. Vérifier les fichiers
Write-Host "3️⃣ Vérification des fichiers..." -ForegroundColor Yellow
$distFiles = Get-ChildItem -Path "dist" -Recurse | Measure-Object
Write-Host "✅ Fichiers générés: $($distFiles.Count)" -ForegroundColor Green
Write-Host ""

# 4. Créer un ZIP pour upload
Write-Host "4️⃣ Création du ZIP..." -ForegroundColor Yellow
$zipPath = "224solutions-hostinger.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path "dist\*" -DestinationPath $zipPath -Force
$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host "✅ ZIP créé: $zipPath ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
Write-Host ""

# 5. Instructions
Write-Host "📋 ÉTAPES SUIVANTES:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ouvrir Hostinger File Manager" -ForegroundColor White
Write-Host "   https://hpanel.hostinger.com" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Aller dans public_html/" -ForegroundColor White
Write-Host ""
Write-Host "3. Supprimer tout le contenu existant" -ForegroundColor White
Write-Host ""
Write-Host "4. Upload le fichier: $zipPath" -ForegroundColor Green
Write-Host ""
Write-Host "5. Extraire le ZIP directement dans public_html/" -ForegroundColor White
Write-Host ""
Write-Host "6. Vérifier que ces fichiers sont présents:" -ForegroundColor White
Write-Host "   - index.html" -ForegroundColor Gray
Write-Host "   - .htaccess" -ForegroundColor Gray
Write-Host "   - assets/" -ForegroundColor Gray
Write-Host ""
Write-Host "7. Ouvrir votre site dans le navigateur" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  SI PAGE BLANCHE PERSISTE:" -ForegroundColor Yellow
Write-Host "   - Ouvrir console navigateur (F12)" -ForegroundColor White
Write-Host "   - Vérifier les erreurs" -ForegroundColor White
Write-Host "   - Problème commun: variables d'environnement manquantes" -ForegroundColor White
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Préparation terminée!" -ForegroundColor Green
Write-Host ""
