# 🚀 Script de Déploiement Hostinger - 224Solutions
# Date: 2 décembre 2025

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   224Solutions - Déploiement Hostinger" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 0. Vérifier que .env.production existe
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ ERREUR: Fichier .env.production introuvable!" -ForegroundColor Red
    Write-Host "Ce fichier est nécessaire pour que l'app fonctionne sur Hostinger" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Fichier .env.production trouvé" -ForegroundColor Green
Write-Host ""

# 1. Nettoyage
Write-Host "🧹 Nettoyage des anciens builds..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force dist }
if (Test-Path "224solutions-app.zip") { Remove-Item -Force 224solutions-app.zip }
if (Test-Path "224solutions-app.tar.gz") { Remove-Item -Force 224solutions-app.tar.gz }
if (Test-Path "224solutions-app-final.zip") { Remove-Item -Force 224solutions-app-final.zip }

# 2. Build de l'application
Write-Host "📦 Étape 1/5: Build de l'application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build réussi!" -ForegroundColor Green
Write-Host ""

# 3. Vérifier que dist existe et contient index.html
if (-not (Test-Path "dist/index.html")) {
    Write-Host "❌ ERREUR: dist/index.html introuvable!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Fichier index.html trouvé dans dist/" -ForegroundColor Green
Write-Host ""

# 4. Copie du fichier .htaccess
Write-Host "📦 Étape 2/5: Préparation .htaccess..." -ForegroundColor Yellow
Copy-Item "public/.htaccess" -Destination "dist/.htaccess" -Force
Write-Host "✅ .htaccess copié dans dist/" -ForegroundColor Green
Write-Host ""

# 5. Création des archives
Write-Host "📦 Étape 3/5: Création des archives..." -ForegroundColor Yellow

# ZIP
Write-Host "   → Création de 224solutions-app.zip..." -ForegroundColor Gray
Compress-Archive -Path dist\* -DestinationPath "224solutions-app.zip" -Force

# TAR.GZ
Write-Host "   → Création de 224solutions-app.tar.gz..." -ForegroundColor Gray
tar -czf "224solutions-app.tar.gz" -C dist .

Write-Host "✅ Archives créées!" -ForegroundColor Green
Write-Host ""

# 6. Affichage des résultats
Write-Host "📊 Étape 4/5: Résumé..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Fichiers créés:" -ForegroundColor Cyan
Get-ChildItem -Filter "224solutions-app*.zip", "224solutions-app*.tar.gz" | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "   ✓ $($_.Name) - $size MB" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   🎉 Déploiement prêt!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 PROCHAINES ÉTAPES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Connectez-vous à Hostinger (https://hpanel.hostinger.com)" -ForegroundColor White
Write-Host "2. Accédez au File Manager" -ForegroundColor White
Write-Host "3. Allez dans public_html/" -ForegroundColor White
Write-Host "4. SUPPRIMEZ TOUT le contenu existant dans public_html/" -ForegroundColor Red
Write-Host "5. Uploadez 224solutions-app.zip" -ForegroundColor White
Write-Host "6. Clic droit sur le ZIP → Extract" -ForegroundColor White
Write-Host "7. Vérifiez que index.html et .htaccess sont dans public_html/" -ForegroundColor White
Write-Host "8. Supprimez le fichier ZIP après extraction" -ForegroundColor White
Write-Host "9. Ouvrez votre site en navigation privée (Ctrl+Shift+N)" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Red
Write-Host "   - Vérifiez que .htaccess est bien visible (activez 'Show Hidden Files')" -ForegroundColor Yellow
Write-Host "   - Si page blanche: F12 → Console pour voir les erreurs" -ForegroundColor Yellow
Write-Host "   - Permissions: dossiers 755, fichiers 644" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Documentation: HOSTINGER_FIX_PAGE_BLANCHE.md" -ForegroundColor Cyan
Write-Host ""
