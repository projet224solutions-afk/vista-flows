#!/usr/bin/env pwsh
# Script to apply wallet system migration

Write-Host "🚀 Application de la migration wallet system..." -ForegroundColor Cyan

# Vérifier si npx supabase est disponible
Write-Host "`n📦 Installation de Supabase CLI si nécessaire..." -ForegroundColor Yellow
try {
    npx supabase db push --db-url $env:DATABASE_URL
    Write-Host "`n✅ Migration appliquée avec succès!" -ForegroundColor Green
}
catch {
    Write-Host "`n❌ Erreur lors de l'application de la migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host "`n💡 Alternative: Appliquez la migration manuellement via Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "   1. Ouvrez https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "   2. Allez dans SQL Editor" -ForegroundColor White
    Write-Host "   3. Copiez le contenu de supabase/migrations/20260109000000_fix_wallet_system_complete.sql" -ForegroundColor White
    Write-Host "   4. Exécutez le SQL" -ForegroundColor White
}
