# Script de test serveur
Write-Host "`n=== TEST SERVEUR 224SOLUTIONS ===`n" -ForegroundColor Cyan

# Arreter anciens serveurs
Write-Host "Arret des anciens serveurs..." -ForegroundColor Yellow
Get-Process node* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Nettoyer cache
Write-Host "Nettoyage du cache..." -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue

# Demarrer serveur
Write-Host "Demarrage du serveur...`n" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

# Attendre
Write-Host "Attente du serveur (10 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Tester
Write-Host "`nTest de connexion..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8080/" -UseBasicParsing -TimeoutSec 5
    Write-Host "SUCCESS! Serveur repond avec status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor White
    Write-Host "Taille: $($response.Content.Length) bytes`n" -ForegroundColor White
    
    # Ouvrir navigateur
    Write-Host "Ouverture du navigateur..." -ForegroundColor Magenta
    Start-Process "http://127.0.0.1:8080"
    
} catch {
    Write-Host "ERREUR: Le serveur ne repond pas" -ForegroundColor Red
    Write-Host "Details: $_" -ForegroundColor Gray
}

Write-Host "`nPour le diagnostic: http://127.0.0.1:8080/diagnostic-complet.html" -ForegroundColor Magenta
