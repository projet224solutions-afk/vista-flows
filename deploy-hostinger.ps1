# 🚀 Script de Déploiement Automatique Hostinger - 224Solutions
# Date: 2 décembre 2025
# Usage: .\deploy-hostinger.ps1

param(
    [switch]$SkipBuild = $false,
    [switch]$SkipSSH = $false
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   224Solutions - Déploiement Hostinger" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration SSH
$SSH_HOST = "root@72.61.110.182"
$SSH_PORT = "65002"
$REMOTE_SCRIPT = "/home/clp/htdocs/224solutionapp.com/deploy-server.sh"

$SSH_HOST = "root@72.61.110.182"
$SSH_PORT = "65002"
$REMOTE_SCRIPT = "/home/clp/htdocs/224solutionapp.com/deploy-server.sh"

# Étape 1: Git Push
Write-Host "📤 Étape 1/3: Push vers GitHub..." -ForegroundColor Yellow
Write-Host ""

git add -A
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Aucun changement à commiter" -ForegroundColor Yellow
} else {
    $commitMessage = Read-Host "Message de commit (ou Entrée pour 'Update deployment')"
    if ([string]::IsNullOrWhiteSpace($commitMessage)) {
        $commitMessage = "Update deployment $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }
    
    git commit -m $commitMessage
    git push origin main
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors du push vers GitHub!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Code poussé vers GitHub" -ForegroundColor Green
}
Write-Host ""

# Étape 2: Uploader le script de déploiement sur le serveur
Write-Host "📦 Étape 2/3: Upload du script de déploiement..." -ForegroundColor Yellow

# Convertir le script en format Unix (LF au lieu de CRLF)
$scriptContent = Get-Content "deploy-server.sh" -Raw
$scriptContent = $scriptContent -replace "`r`n", "`n"
Set-Content "deploy-server.sh" -Value $scriptContent -NoNewline

# Upload via SCP
Write-Host "Uploading deploy-server.sh..." -ForegroundColor Gray
& scp -P $SSH_PORT deploy-server.sh "${SSH_HOST}:${REMOTE_SCRIPT}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'upload du script!" -ForegroundColor Red
    Write-Host "💡 Assurez-vous d'être connecté au serveur SSH" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Script uploadé sur le serveur" -ForegroundColor Green
Write-Host ""

# Étape 3: Exécuter le déploiement sur le serveur
Write-Host "🚀 Étape 3/3: Exécution du déploiement sur le serveur..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Connexion au serveur et exécution du script..." -ForegroundColor Gray
Write-Host "Cela peut prendre quelques minutes..." -ForegroundColor Gray
Write-Host ""

# Rendre le script exécutable et l'exécuter
& ssh -p $SSH_PORT $SSH_HOST "chmod +x $REMOTE_SCRIPT && $REMOTE_SCRIPT"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erreur lors du déploiement sur le serveur!" -ForegroundColor Red
    Write-Host "💡 Vérifiez les logs ci-dessus pour plus de détails" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "✅ DÉPLOIEMENT RÉUSSI!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Votre site est en ligne: http://224solutionapp.com" -ForegroundColor Cyan
Write-Host "📅 Déployé le: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Prochaine mise à jour: Lancez simplement .\deploy-hostinger.ps1" -ForegroundColor Yellow
Write-Host ""

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
Write-Host "IMPORTANT:" -ForegroundColor Red
Write-Host "   - Verifiez que .htaccess est bien visible (activez 'Show Hidden Files')" -ForegroundColor Yellow
Write-Host "   - Si page blanche: F12 > Console pour voir les erreurs" -ForegroundColor Yellow
Write-Host "   - Permissions: dossiers 755, fichiers 644" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Documentation: HOSTINGER_FIX_PAGE_BLANCHE.md" -ForegroundColor Cyan
Write-Host ""
