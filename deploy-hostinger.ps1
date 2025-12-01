# 🚀 Script de Déploiement Hostinger - 224Solutions
# Date: 1er décembre 2025

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   224Solutions - Déploiement Hostinger" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build de l'application
Write-Host "📦 Étape 1/5: Build de l'application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build réussi!" -ForegroundColor Green
Write-Host ""

# 2. Création des archives
Write-Host "📦 Étape 2/5: Création des archives..." -ForegroundColor Yellow

# ZIP
Write-Host "   → Création de 224solutions-app.zip..." -ForegroundColor Gray
Compress-Archive -Path dist\* -DestinationPath "224solutions-app.zip" -Force

# TAR.GZ
Write-Host "   → Création de 224solutions-app.tar.gz..." -ForegroundColor Gray
tar -czf "224solutions-app.tar.gz" -C dist .

Write-Host "✅ Archives créées!" -ForegroundColor Green
Write-Host ""

# 3. Copie du fichier .htaccess
Write-Host "📦 Étape 3/5: Préparation .htaccess..." -ForegroundColor Yellow
Copy-Item ".htaccess-hostinger" -Destination "dist\.htaccess" -Force
Write-Host "✅ .htaccess copié!" -ForegroundColor Green
Write-Host ""

# 4. Création archive finale avec .htaccess
Write-Host "📦 Étape 4/5: Création archive finale..." -ForegroundColor Yellow
Compress-Archive -Path dist\* -DestinationPath "224solutions-app-final.zip" -Force
Write-Host "✅ Archive finale créée!" -ForegroundColor Green
Write-Host ""

# 5. Affichage des résultats
Write-Host "📊 Étape 5/5: Résumé..." -ForegroundColor Yellow
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
Write-Host "Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. Connectez-vous à Hostinger (https://hpanel.hostinger.com)" -ForegroundColor White
Write-Host "2. Accédez au File Manager" -ForegroundColor White
Write-Host "3. Uploadez 224solutions-app-final.zip dans public_html" -ForegroundColor White
Write-Host "4. Extrayez l'archive" -ForegroundColor White
Write-Host "5. Visitez votre site!" -ForegroundColor White
Write-Host ""
Write-Host "📖 Documentation complète: HOSTINGER_DEPLOY.md" -ForegroundColor Cyan
Write-Host ""
