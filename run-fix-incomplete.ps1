#!/usr/bin/env pwsh
# Guide de correction pour paiements incomplets
# Date: 2026-01-07

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "CORRECTION: Paiements Incomplets" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PROBLEME DETECTE:" -ForegroundColor Red
Write-Host "  Utilisateur: comptedevideoai224gn@gmail.com" -ForegroundColor White
Write-Host "  4 paiements / 3 commandes / 1 wallet" -ForegroundColor Yellow
Write-Host "  Statut: Incomplet" -ForegroundColor Red
Write-Host ""

Write-Host "SOLUTION PREPAREE:" -ForegroundColor Green
Write-Host "  Fichier: fix-incomplete-user-payments.sql" -ForegroundColor White
Write-Host ""

Write-Host "COPIE DU SCRIPT DANS LE PRESSE-PAPIERS..." -ForegroundColor Yellow

# Copier le fichier SQL dans le presse-papiers
$sqlContent = Get-Content "fix-incomplete-user-payments.sql" -Raw
Set-Clipboard -Value $sqlContent

Write-Host "SUCCES! Script copie." -ForegroundColor Green
Write-Host ""

Write-Host "PROCHAINES ETAPES:" -ForegroundColor Cyan
Write-Host "  1. Supabase SQL Editor va s'ouvrir" -ForegroundColor White
Write-Host "  2. Coller le SQL (Ctrl+V)" -ForegroundColor White
Write-Host "  3. Executer (Run ou F5)" -ForegroundColor White
Write-Host ""

Write-Host "CE QUE FAIT LE SCRIPT:" -ForegroundColor Yellow
Write-Host "  ETAPE 1: Liste tous les paiements de l'utilisateur" -ForegroundColor White
Write-Host "  ETAPE 2: Cree les commandes manquantes" -ForegroundColor White
Write-Host "  ETAPE 3: Credite les wallets manquants" -ForegroundColor White
Write-Host "  ETAPE 4: Affiche le resultat final (doit etre 100% OK)" -ForegroundColor White
Write-Host ""

Write-Host "Appuyez sur Entree pour ouvrir Supabase SQL Editor..." -ForegroundColor Cyan
Read-Host

Start-Process "https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new"

Write-Host ""
Write-Host "Navigateur ouvert! Collez et executez maintenant." -ForegroundColor Green
Write-Host ""
