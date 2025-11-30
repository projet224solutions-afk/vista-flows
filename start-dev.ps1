#!/usr/bin/env pwsh
# Script de démarrage complet - Frontend + Backend
# 224Solutions Development Server Launcher

Write-Host "`n╔═══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                   ║" -ForegroundColor Cyan
Write-Host "║        🚀 224SOLUTIONS - DEV SERVER LAUNCHER      ║" -ForegroundColor Cyan
Write-Host "║                                                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Fonction pour arrêter les processus existants
function Stop-ExistingServers {
    Write-Host "🛑 Arrêt des serveurs existants..." -ForegroundColor Yellow
    Get-Process node* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "✅ Serveurs arrêtés`n" -ForegroundColor Green
}

# Fonction pour vérifier les dépendances
function Test-Dependencies {
    Write-Host "📦 Vérification des dépendances..." -ForegroundColor Cyan
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "⚠️  node_modules introuvable. Installation..." -ForegroundColor Yellow
        npm install
    }
    
    if (Test-Path "backend") {
        Set-Location backend
        if (-not (Test-Path "node_modules")) {
            Write-Host "⚠️  Backend node_modules introuvable. Installation..." -ForegroundColor Yellow
            npm install
        }
        Set-Location ..
    }
    
    Write-Host "✅ Dépendances OK`n" -ForegroundColor Green
}

# Fonction pour nettoyer le cache
function Clear-DevCache {
    Write-Host "🧹 Nettoyage du cache..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
    Write-Host "✅ Cache nettoyé`n" -ForegroundColor Green
}

# Fonction pour démarrer le backend
function Start-Backend {
    if (Test-Path "backend/src/server.js") {
        Write-Host "🔧 Démarrage du Backend (Node.js)..." -ForegroundColor Magenta
        Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
`$host.UI.RawUI.WindowTitle = '224Solutions - Backend Server'
Set-Location '$PWD\backend'
Write-Host '`n╔═══════════════════════════════════╗' -ForegroundColor Magenta
Write-Host '║   BACKEND SERVER - PORT 3000      ║' -ForegroundColor Magenta
Write-Host '╚═══════════════════════════════════╝`n' -ForegroundColor Magenta
node src/server.js
"@
        Write-Host "✅ Backend lancé dans un terminal séparé" -ForegroundColor Green
        Start-Sleep -Seconds 3
    } else {
        Write-Host "⚠️  Backend non trouvé, skip..." -ForegroundColor Yellow
    }
}

# Fonction pour démarrer le frontend
function Start-Frontend {
    Write-Host "`n🎨 Démarrage du Frontend (Vite + React)..." -ForegroundColor Blue
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
        $host.UI.RawUI.WindowTitle = '224Solutions - Frontend Server'
        Set-Location '$PWD'
        Write-Host '`n╔═══════════════════════════════════╗' -ForegroundColor Blue
        Write-Host '║   FRONTEND SERVER - PORT 8080     ║' -ForegroundColor Blue
        Write-Host '╚═══════════════════════════════════╝`n' -ForegroundColor Blue
        npm run dev
"@
    Write-Host "✅ Frontend lancé dans un terminal séparé" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

# Fonction principale
function Start-Development {
    try {
        # Arrêter les serveurs existants
        Stop-ExistingServers
        
        # Vérifier les dépendances
        Test-Dependencies
        
        # Nettoyer le cache
        Clear-DevCache
        
        # Démarrer le backend
        Start-Backend
        
        # Démarrer le frontend
        Start-Frontend
        
        Write-Host "`n╔═══════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║                                                   ║" -ForegroundColor Green
        Write-Host "║            ✅ SERVEURS DÉMARRÉS !                 ║" -ForegroundColor Green
        Write-Host "║                                                   ║" -ForegroundColor Green
        Write-Host "╚═══════════════════════════════════════════════════╝`n" -ForegroundColor Green
        
        Write-Host "📍 URLs disponibles:" -ForegroundColor Cyan
        Write-Host "   Frontend:  http://127.0.0.1:8080" -ForegroundColor White
        Write-Host "   Backend:   http://localhost:3000" -ForegroundColor White
        Write-Host "`n💡 Astuce: Les serveurs tournent dans des terminaux séparés" -ForegroundColor Yellow
        Write-Host "   Pour les arrêter: Fermez les terminaux ou Ctrl+C dans chacun`n" -ForegroundColor Yellow
        
        Write-Host "🌐 Ouverture du navigateur dans 3 secondes..." -ForegroundColor Magenta
        Start-Sleep -Seconds 3
        Start-Process "http://127.0.0.1:8080"
        
    } catch {
        Write-Host "`n❌ ERREUR: $_" -ForegroundColor Red
        Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Gray
        exit 1
    }
}

# Lancer le script
Start-Development

Write-Host "`n✨ Script terminé. Les serveurs continuent de tourner." -ForegroundColor Green
Write-Host "Pour les arrêter, fermez les terminaux backend/frontend.`n" -ForegroundColor Gray
