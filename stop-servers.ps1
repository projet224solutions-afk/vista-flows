#!/usr/bin/env pwsh
# Script pour arrêter tous les serveurs

Write-Host "`n🛑 Arrêt de tous les serveurs Node.js..." -ForegroundColor Yellow

Get-Process node* -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "   Arrêt du processus: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force
}

Start-Sleep -Seconds 2

Write-Host "✅ Tous les serveurs sont arrêtés`n" -ForegroundColor Green
