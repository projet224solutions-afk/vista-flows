# Script de déploiement du système d'abonnement unifié
# Date: 2025-12-01

Write-Host "🚀 DÉPLOIEMENT DU SYSTÈME D'ABONNEMENT UNIFIÉ" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Supabase CLI est installé
Write-Host "1️⃣ Vérification de Supabase CLI..." -ForegroundColor Yellow
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "⚠️  Supabase CLI n'est pas installé." -ForegroundColor Red
    Write-Host "   Veuillez exécuter la migration manuellement via Supabase Dashboard" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 ÉTAPES MANUELLES:" -ForegroundColor Cyan
    Write-Host "   1. Ouvrir https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "   2. Sélectionner votre projet" -ForegroundColor White
    Write-Host "   3. Aller dans SQL Editor" -ForegroundColor White
    Write-Host "   4. Copier le contenu de:" -ForegroundColor White
    Write-Host "      supabase/migrations/20251201_unified_subscription_system.sql" -ForegroundColor Green
    Write-Host "   5. Coller et exécuter" -ForegroundColor White
    Write-Host ""
    pause
    exit 0
}

Write-Host "✅ Supabase CLI trouvé" -ForegroundColor Green
Write-Host ""

# Vérifier le statut de Supabase
Write-Host "2️⃣ Vérification du statut Supabase..." -ForegroundColor Yellow
$status = supabase status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Supabase n'est pas lié au projet" -ForegroundColor Red
    Write-Host "   Veuillez lier votre projet avec:" -ForegroundColor Yellow
    Write-Host "   supabase link --project-ref <votre-project-ref>" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Ou exécutez la migration manuellement (voir ci-dessus)" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "✅ Supabase est lié au projet" -ForegroundColor Green
Write-Host ""

# Confirmer l'exécution
Write-Host "3️⃣ Prêt à déployer la migration" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  ATTENTION: Cette migration va:" -ForegroundColor Yellow
Write-Host "   - Ajouter des colonnes à la table 'plans'" -ForegroundColor White
Write-Host "   - Créer 2 nouveaux plans (Taxi & Livreur)" -ForegroundColor White
Write-Host "   - Migrer les données de 'driver_subscriptions' vers 'subscriptions'" -ForegroundColor White
Write-Host "   - Créer des fonctions SQL unifiées" -ForegroundColor White
Write-Host "   - Créer une vue de compatibilité" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Voulez-vous continuer? (oui/non)"

if ($confirm -ne "oui") {
    Write-Host "❌ Déploiement annulé" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "4️⃣ Exécution de la migration..." -ForegroundColor Yellow
Write-Host ""

# Exécuter la migration
supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ MIGRATION RÉUSSIE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "   1. Vérifier les nouveaux plans dans Supabase Dashboard" -ForegroundColor White
    Write-Host "   2. Tester l'abonnement avec un utilisateur test" -ForegroundColor White
    Write-Host "   3. Consulter UNIFIED_SUBSCRIPTION_SYSTEM_GUIDE.md pour plus d'infos" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Le système d'abonnement unifié est maintenant actif!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ ERREUR lors de la migration" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Solutions possibles:" -ForegroundColor Yellow
    Write-Host "   1. Vérifier la connexion à Supabase" -ForegroundColor White
    Write-Host "   2. Vérifier les permissions de votre compte" -ForegroundColor White
    Write-Host "   3. Exécuter manuellement via Supabase Dashboard" -ForegroundColor White
    Write-Host "   4. Consulter les logs avec: supabase db push --debug" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
pause
