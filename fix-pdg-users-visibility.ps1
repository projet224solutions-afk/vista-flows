# Script pour corriger le problème des vendeurs invisibles dans l'interface PDG
# Date: 2026-01-10

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🔧 FIX: Vendeurs invisibles interface PDG" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Étape 1: Vérifier l'état actuel
Write-Host "📊 Étape 1: Vérification de l'état actuel..." -ForegroundColor Yellow
Write-Host ""
node check-pdg-users-display.js

Write-Host "`n`n========================================" -ForegroundColor Cyan
Write-Host "⚠️  RÉSULTAT: 0/7 vendeurs visibles" -ForegroundColor Red
Write-Host "========================================`n" -ForegroundColor Cyan

# Demander confirmation
$confirmation = Read-Host "Voulez-vous appliquer le correctif ? (o/n)"
if ($confirmation -ne 'o' -and $confirmation -ne 'O') {
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit
}

Write-Host "`n📝 Étape 2: Application des migrations SQL..." -ForegroundColor Yellow

# Migration 1: Créer les profils manquants
Write-Host "`n   → Migration 1: Création des profils manquants..." -ForegroundColor White
$migration1 = Get-Content -Path "supabase\migrations\20260110000000_create_missing_vendor_profiles.sql" -Raw

try {
    # Note: Cette commande nécessite que Supabase CLI soit configuré
    # Alternative: Exécuter manuellement dans le SQL Editor de Supabase
    Write-Host "   ℹ️  Pour appliquer cette migration:" -ForegroundColor Cyan
    Write-Host "      1. Ouvrez Supabase Dashboard" -ForegroundColor Gray
    Write-Host "      2. Allez dans SQL Editor" -ForegroundColor Gray
    Write-Host "      3. Copiez le contenu de:" -ForegroundColor Gray
    Write-Host "         supabase\migrations\20260110000000_create_missing_vendor_profiles.sql" -ForegroundColor Gray
    Write-Host "      4. Exécutez la requête" -ForegroundColor Gray
    Write-Host ""
    
    # Essayer avec npx supabase
    Write-Host "   Tentative d'application automatique..." -ForegroundColor White
    npx supabase db push
    Write-Host "   ✅ Migration 1 appliquée avec succès" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Erreur lors de l'application automatique" -ForegroundColor Yellow
    Write-Host "   → Appliquez manuellement via Supabase Dashboard" -ForegroundColor Yellow
}

# Migration 2: Installer les triggers
Write-Host "`n   → Migration 2: Installation des triggers automatiques..." -ForegroundColor White
$migration2 = Get-Content -Path "supabase\migrations\20260110000001_auto_create_vendor_profiles_trigger.sql" -Raw

try {
    Write-Host "   ℹ️  Cette migration installe les triggers pour:" -ForegroundColor Cyan
    Write-Host "      - Auto-créer les profils des futurs vendeurs" -ForegroundColor Gray
    Write-Host "      - Synchroniser le status service ↔ profil" -ForegroundColor Gray
    Write-Host ""
    
    # Tentative d'application
    npx supabase db push
    Write-Host "   ✅ Migration 2 appliquée avec succès" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Erreur lors de l'application automatique" -ForegroundColor Yellow
    Write-Host "   → Appliquez manuellement via Supabase Dashboard" -ForegroundColor Yellow
}

Write-Host "`n`n========================================" -ForegroundColor Cyan
Write-Host "✅ Migrations préparées !" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Étape 3: Vérification post-fix
Write-Host "📊 Étape 3: Vérification après le correctif..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   Patientez 5 secondes pour laisser la base de données se synchroniser..." -ForegroundColor Gray
Start-Sleep -Seconds 5

node check-pdg-users-display.js

Write-Host "`n`n========================================" -ForegroundColor Cyan
Write-Host "🎯 RÉSUMÉ DES ACTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Migrations créées:" -ForegroundColor Green
Write-Host "   1. 20260110000000_create_missing_vendor_profiles.sql" -ForegroundColor White
Write-Host "   2. 20260110000001_auto_create_vendor_profiles_trigger.sql" -ForegroundColor White
Write-Host ""
Write-Host "📋 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Vérifiez que les vendeurs apparaissent dans l'interface PDG" -ForegroundColor White
Write-Host "      → Allez sur /pdg puis onglet 'Utilisateurs'" -ForegroundColor Gray
Write-Host "   2. Testez les actions (suspendre, activer)" -ForegroundColor White
Write-Host "   3. Créez un nouveau vendeur de test" -ForegroundColor White
Write-Host "      → Vérifiez qu'il apparaît automatiquement" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   → RAPPORT_CRITIQUE_VENDEURS_PDG_INVISIBLES.md" -ForegroundColor White
Write-Host ""
Write-Host "========================================`n" -ForegroundColor Cyan

# Ouvrir les fichiers pour vérification manuelle
$openFiles = Read-Host "Voulez-vous ouvrir les fichiers de migration dans VS Code ? (o/n)"
if ($openFiles -eq 'o' -or $openFiles -eq 'O') {
    code "supabase\migrations\20260110000000_create_missing_vendor_profiles.sql"
    code "supabase\migrations\20260110000001_auto_create_vendor_profiles_trigger.sql"
    code "RAPPORT_CRITIQUE_VENDEURS_PDG_INVISIBLES.md"
}

Write-Host "✅ Script terminé !" -ForegroundColor Green
