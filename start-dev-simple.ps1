#!/usr/bin/env pwsh
# Script simple - Démarrage Frontend uniquement (Mode persistant)

Write-Host "`n🚀 Démarrage 224Solutions..." -ForegroundColor Cyan

# Arrêter les serveurs existants
Write-Host "🛑 Arrêt des anciens serveurs..." -ForegroundColor Yellow
Get-Process node* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Nettoyer le cache
Write-Host "🧹 Nettoyage du cache..." -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue

# Démarrer le serveur
Write-Host "✅ Lancement du serveur sur http://127.0.0.1:8080" -ForegroundColor Green
Write-Host "💡 Le serveur reste actif. Appuyez sur Ctrl+C pour arrêter.`n" -ForegroundColor Yellow
Write-Host "🔍 Si la page est blanche, allez sur:" -ForegroundColor Cyan
Write-Host "   http://127.0.0.1:8080/diagnostic-complet.html`n" -ForegroundColor Magenta

# Lancer en mode non-interactif pour éviter l'arrêt
$env:CI = "true"
npm run dev
