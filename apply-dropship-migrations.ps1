# =============================================
# SCRIPT D'APPLICATION DES MIGRATIONS DROPSHIPPING
# Date: 2026-01-12
# =============================================

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   APPLICATION DES MIGRATIONS DROPSHIPPING" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

$projectId = "uakkxaibujzxdiqzpnpr"
$migrationV2 = "d:\224Solutions\vista-flows\supabase\migrations\20260112_dropship_base_tables_v2.sql"
$migrationChina = "d:\224Solutions\vista-flows\supabase\migrations\20260112_china_dropshipping_module.sql"

# Verification des fichiers
Write-Host "Verification des fichiers de migration..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path $migrationV2) {
    Write-Host "[OK] Migration V2 (Base tables): $migrationV2" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Migration V2 non trouvee!" -ForegroundColor Red
    exit 1
}

if (Test-Path $migrationChina) {
    Write-Host "[OK] Migration China Module: $migrationChina" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Migration China non trouvee!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Yellow
Write-Host "   ORDRE D'APPLICATION (IMPORTANT!)" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ETAPE 1: Base Tables V2" -ForegroundColor White
Write-Host "   - Cree les 3 tables de base (dropship_suppliers, dropship_products, dropship_activity_logs)"
Write-Host "   - Ajoute toutes les colonnes manquantes"
Write-Host "   - Idempotent - peut etre re-execute sans erreur"
Write-Host ""
Write-Host "2. ETAPE 2: China Module" -ForegroundColor White
Write-Host "   - Cree les 10 tables china_* (extension modulaire)"
Write-Host "   - Idempotent egalement"
Write-Host ""

# Ouvrir SQL Editor
Write-Host "Ouverture du SQL Editor Supabase..." -ForegroundColor Yellow
$sqlUrl = "https://supabase.com/dashboard/project/$projectId/sql"
Start-Process $sqlUrl

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dans le SQL Editor Supabase qui vient de s'ouvrir:" -ForegroundColor White
Write-Host ""
Write-Host "ETAPE 1: Appliquer la migration V2 (Base Tables)" -ForegroundColor Yellow
Write-Host "   a) Cliquez sur 'New Query'" -ForegroundColor Gray
Write-Host "   b) Copiez le contenu du fichier qui va s'ouvrir" -ForegroundColor Gray
Write-Host "   c) Collez dans l'editeur SQL" -ForegroundColor Gray
Write-Host "   d) Cliquez sur 'Run'" -ForegroundColor Gray
Write-Host ""

# Ouvrir le premier fichier
Write-Host "Ouverture de la migration V2..." -ForegroundColor Yellow
code $migrationV2

Start-Sleep -Seconds 1

Write-Host ""
Write-Host "ETAPE 2: Appliquer la migration China (apres ETAPE 1)" -ForegroundColor Yellow
Write-Host "   a) Cliquez sur 'New Query'" -ForegroundColor Gray
Write-Host "   b) Copiez le contenu du deuxieme fichier" -ForegroundColor Gray
Write-Host "   c) Collez dans l'editeur SQL" -ForegroundColor Gray
Write-Host "   d) Cliquez sur 'Run'" -ForegroundColor Gray
Write-Host ""

# Ouvrir le deuxieme fichier
Write-Host "Ouverture de la migration China..." -ForegroundColor Yellow
code $migrationChina

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "   PRET!" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Les 2 fichiers sont ouverts dans VS Code." -ForegroundColor White
Write-Host "Suivez les instructions ci-dessus pour les appliquer." -ForegroundColor White
Write-Host ""
Write-Host "Apres l'application, regenerez les types Supabase avec:" -ForegroundColor Cyan
Write-Host "   npx supabase gen types typescript --project-id $projectId > src/integrations/supabase/types.ts" -ForegroundColor Gray
Write-Host ""
