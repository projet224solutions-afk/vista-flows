# Script pour appliquer directement les migrations SQL
# Date: 2025-01-02

Write-Host "Application directe des migrations d'abonnement" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$migration1 = "d:\224Solutions\supabase\migrations\20260102_fix_driver_subscription.sql"
$migration2 = "d:\224Solutions\supabase\migrations\20260102_fix_rls_driver_subscriptions.sql"

# Verification des fichiers
if (-not (Test-Path $migration1)) {
    Write-Host "ERREUR: Migration 1 non trouvee!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $migration2)) {
    Write-Host "ERREUR: Migration 2 non trouvee!" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Les 2 fichiers de migration sont presents" -ForegroundColor Green
Write-Host ""

# Ouvrir le SQL Editor de Supabase
$supabaseUrl = "https://supabase.com/dashboard/project/_/sql/new"
Write-Host "ETAPE 1: Ouverture du SQL Editor Supabase..." -ForegroundColor Yellow
Start-Process $supabaseUrl

Write-Host ""
Write-Host "INSTRUCTIONS D'APPLICATION:" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Migration 1 - Corrections de contraintes et fonctions" -ForegroundColor White
Write-Host "   Fichier: $migration1" -ForegroundColor Gray
Write-Host "   Action: Copier tout le contenu et coller dans SQL Editor" -ForegroundColor Gray
Write-Host "   Puis cliquer sur RUN" -ForegroundColor Gray
Write-Host ""

# Ouvrir migration 1 dans l'editeur
Write-Host "   Ouverture du fichier migration 1..." -ForegroundColor Yellow
Start-Process "code" -ArgumentList $migration1

Write-Host ""
Write-Host "2. Migration 2 - Correction RLS policies (CRITIQUE)" -ForegroundColor White
Write-Host "   Fichier: $migration2" -ForegroundColor Gray
Write-Host "   Action: Copier tout le contenu et coller dans SQL Editor" -ForegroundColor Gray
Write-Host "   Puis cliquer sur RUN" -ForegroundColor Gray
Write-Host ""

# Ouvrir migration 2 dans l'editeur
Write-Host "   Ouverture du fichier migration 2..." -ForegroundColor Yellow
Start-Process "code" -ArgumentList $migration2

Write-Host ""
Write-Host "3. Verification du systeme" -ForegroundColor White
Write-Host "   Executer dans SQL Editor:" -ForegroundColor Gray
Write-Host "   SELECT * FROM test_pdg_subscription_permissions();" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Resultat attendu:" -ForegroundColor Gray
Write-Host "   - can_insert: true" -ForegroundColor Green
Write-Host "   - can_read: true" -ForegroundColor Green
Write-Host "   - Pas d'erreur" -ForegroundColor Green
Write-Host ""

Write-Host "4. Test de sante du systeme" -ForegroundColor White
Write-Host "   Executer dans SQL Editor:" -ForegroundColor Gray
Write-Host "   SELECT * FROM check_subscription_system_health();" -ForegroundColor Yellow
Write-Host ""

Write-Host "NOTES IMPORTANTES:" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "- Appliquer dans l'ordre: Migration 1 puis Migration 2" -ForegroundColor Yellow
Write-Host "- La Migration 2 est CRITIQUE pour l'offre PDG" -ForegroundColor Red
Write-Host "- Verifier avec les fonctions de test apres application" -ForegroundColor Yellow
Write-Host ""

Write-Host "Presse ENTREE pour continuer..." -ForegroundColor Cyan
Read-Host
