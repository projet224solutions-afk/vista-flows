#!/usr/bin/env pwsh
# Application migration commission agent Stripe
# Date: 2026-01-05

Write-Host "🚀 Application migration commission agent..." -ForegroundColor Cyan

$migrationPath = "supabase\migrations\20260105020000_agent_commission_stripe_integration.sql"
$sqlContent = Get-Content $migrationPath -Raw

# Connexion Supabase
$dbUrl = "postgresql://postgres.tlkawjrmphsnbdjwlqif:Jacqu312$$$$@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

Write-Host "📦 Exécution SQL..." -ForegroundColor Yellow

# Utiliser psql directement
$env:PGPASSWORD = "Jacqu312$$$$"
$result = echo $sqlContent | psql -h "aws-0-eu-central-1.pooler.supabase.com" -p 6543 -U "postgres.tlkawjrmphsnbdjwlqif" -d "postgres" 2>&1

Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration appliquée avec succès!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Fonction modifiée:" -ForegroundColor Cyan
    Write-Host "  - process_successful_payment() inclut maintenant calcul commission agent" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 Tests à effectuer:" -ForegroundColor Yellow
    Write-Host "  1. Créer agent test" -ForegroundColor White
    Write-Host "  2. Agent crée client utilisateur" -ForegroundColor White
    Write-Host "  3. Client effectue achat Stripe" -ForegroundColor White
    Write-Host "  4. Vérifier commission agent créditée dans wallet" -ForegroundColor White
    Write-Host "  5. Vérifier entrée dans agent_commissions" -ForegroundColor White
} else {
    Write-Host "❌ Erreur lors de l'application:" -ForegroundColor Red
    Write-Host $result
    exit 1
}
