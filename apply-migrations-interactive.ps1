# Script pour ouvrir les migrations et le dashboard Supabase
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🚀 CORRECTION: Vendeurs invisibles PDG" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Afficher l'état actuel
Write-Host "📊 État actuel:" -ForegroundColor Yellow
node check-pdg-users-display.js 2>&1 | Select-String -Pattern "Profils trouvés|Profils manquants|Taux d'affichage" | ForEach-Object {
    if ($_ -match "0/") {
        Write-Host $_ -ForegroundColor Red
    } else {
        Write-Host $_
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📝 MIGRATIONS À APPLIQUER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Les fichiers suivants vont être ouverts:" -ForegroundColor White
Write-Host "1. ✅ Migration 1: Créer les profils manquants" -ForegroundColor Green
Write-Host "2. ✅ Migration 2: Installer les triggers" -ForegroundColor Green
Write-Host "3. 📊 Dashboard Supabase SQL Editor`n" -ForegroundColor Blue

$confirmation = Read-Host "Voulez-vous continuer ? (o/n)"
if ($confirmation -ne 'o' -and $confirmation -ne 'O') {
    Write-Host "`n❌ Opération annulée" -ForegroundColor Red
    exit
}

Write-Host "`n🔧 Ouverture des fichiers..." -ForegroundColor Yellow

# Ouvrir les fichiers de migration dans VS Code
Write-Host "   → Ouverture de la Migration 1..." -ForegroundColor Gray
code "supabase\migrations\20260110000000_create_missing_vendor_profiles.sql"
Start-Sleep -Milliseconds 500

Write-Host "   → Ouverture de la Migration 2..." -ForegroundColor Gray
code "supabase\migrations\20260110000001_auto_create_vendor_profiles_trigger.sql"
Start-Sleep -Milliseconds 500

Write-Host "   → Ouverture du rapport..." -ForegroundColor Gray
code "RAPPORT_CRITIQUE_VENDEURS_PDG_INVISIBLES.md"

# Ouvrir le dashboard Supabase
Write-Host "`n🌐 Ouverture du Supabase Dashboard..." -ForegroundColor Yellow
$supabaseUrl = "https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql"
Start-Process $supabaseUrl

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📋 INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Dans le SQL Editor de Supabase:`n" -ForegroundColor White

Write-Host "ÉTAPE 1: Migration 1 (Créer les profils)" -ForegroundColor Yellow
Write-Host "   1. Copiez TOUT le contenu de:" -ForegroundColor White
Write-Host "      20260110000000_create_missing_vendor_profiles.sql" -ForegroundColor Gray
Write-Host "   2. Collez dans le SQL Editor" -ForegroundColor White
Write-Host "   3. Cliquez sur 'RUN' ou Ctrl+Enter" -ForegroundColor White
Write-Host "   4. Attendez le message: '✅ X profil(s) créé(s)'`n" -ForegroundColor Green

Write-Host "ÉTAPE 2: Migration 2 (Installer les triggers)" -ForegroundColor Yellow
Write-Host "   1. Copiez TOUT le contenu de:" -ForegroundColor White
Write-Host "      20260110000001_auto_create_vendor_profiles_trigger.sql" -ForegroundColor Gray
Write-Host "   2. Collez dans le SQL Editor" -ForegroundColor White
Write-Host "   3. Cliquez sur 'RUN' ou Ctrl+Enter" -ForegroundColor White
Write-Host "   4. Attendez le message: '✅ Triggers installés'`n" -ForegroundColor Green

Write-Host "ÉTAPE 3: Vérification" -ForegroundColor Yellow
Write-Host "   1. Revenez dans PowerShell" -ForegroundColor White
Write-Host "   2. Exécutez: " -NoNewline -ForegroundColor White
Write-Host "node check-pdg-users-display.js" -ForegroundColor Cyan
Write-Host "   3. Vérifiez: " -NoNewline -ForegroundColor White
Write-Host "7/7 utilisateurs trouvés (100%)" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "⏳ EN ATTENTE..." -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Appuyez sur ENTRÉE une fois les migrations appliquées..." -ForegroundColor White
Read-Host

# Vérification
Write-Host "`n📊 Vérification de l'application..." -ForegroundColor Yellow
node check-pdg-users-display.js

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ TERMINÉ" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "🎯 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Ouvrez l'interface PDG: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:5173/pdg" -ForegroundColor Cyan
Write-Host "   2. Allez dans l'onglet 'Utilisateurs'" -ForegroundColor White
Write-Host "   3. Vérifiez que les 7 vendeurs apparaissent" -ForegroundColor White
Write-Host "   4. Testez le bouton 'Services' pour voir les détails" -ForegroundColor White
Write-Host "   5. Testez suspendre/activer un vendeur`n" -ForegroundColor White

Write-Host "📚 Documentation complète:" -ForegroundColor Yellow
Write-Host "   → RAPPORT_CRITIQUE_VENDEURS_PDG_INVISIBLES.md" -ForegroundColor White
Write-Host ""
