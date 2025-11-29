# Script de demarrage Frontend - 224Solutions
Write-Host "`n=== Demarrage 224Solutions ===`n" -ForegroundColor Cyan

# Arreter anciens serveurs
Write-Host "Arret des anciens serveurs..." -ForegroundColor Yellow
Get-Process node* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Nettoyer cache
Write-Host "Nettoyage du cache..." -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue

# Demarrer serveur
Write-Host "Lancement du serveur sur http://127.0.0.1:8080" -ForegroundColor Green
Write-Host "Le serveur reste actif. Appuyez sur Ctrl+C pour arreter.`n" -ForegroundColor Yellow
Write-Host "Si page blanche: http://127.0.0.1:8080/diagnostic-complet.html`n" -ForegroundColor Magenta

npm run dev
