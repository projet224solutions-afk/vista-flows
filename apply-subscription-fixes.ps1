# Script d'application automatique des migrations d'abonnement
# Date: 2025-01-02

Write-Host "Application des corrections d'abonnement taxi-moto" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Supabase CLI est installé
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "⚠️  Supabase CLI non installé" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Application MANUELLE requise:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Ouvrir https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "2. Sélectionner projet 224Solutions" -ForegroundColor White
    Write-Host "3. Menu gauche → SQL Editor" -ForegroundColor White
    Write-Host "4. Cliquer 'New query'" -ForegroundColor White
    Write-Host ""
    Write-Host "5. MIGRATION 1: Copier le contenu de:" -ForegroundColor White
    Write-Host "   supabase/migrations/20260102_fix_driver_subscription.sql" -ForegroundColor Cyan
    Write-Host "   et l'exécuter (CTRL+Enter)" -ForegroundColor White
    Write-Host ""
    Write-Host "6. MIGRATION 2: Copier le contenu de:" -ForegroundColor White
    Write-Host "   supabase/migrations/20260102_fix_rls_driver_subscriptions.sql" -ForegroundColor Cyan
    Write-Host "   et l'exécuter (CTRL+Enter)" -ForegroundColor White
    Write-Host ""
    Write-Host "7. Vérifier avec:" -ForegroundColor White
    Write-Host "   SELECT * FROM test_pdg_subscription_permissions();" -ForegroundColor Cyan
    Write-Host ""
    
    # Ouvrir les fichiers dans l'éditeur par défaut
    $migration1 = "d:\224Solutions\supabase\migrations\20260102_fix_driver_subscription.sql"
    $migration2 = "d:\224Solutions\supabase\migrations\20260102_fix_rls_driver_subscriptions.sql"
    
    if (Test-Path $migration1) {
        Write-Host "📂 Ouverture Migration 1..." -ForegroundColor Green
        Start-Process $migration1
    }
    
    Start-Sleep -Seconds 2
    
    if (Test-Path $migration2) {
        Write-Host "📂 Ouverture Migration 2..." -ForegroundColor Green
        Start-Process $migration2
    }
    
    Write-Host ""
    Write-Host "✅ Fichiers ouverts dans votre éditeur" -ForegroundColor Green
    Write-Host "   Copiez et collez dans Supabase SQL Editor" -ForegroundColor Yellow
    
} else {
    Write-Host "✅ Supabase CLI détecté" -ForegroundColor Green
    Write-Host ""
    
    # Vérifier la connexion au projet
    Write-Host "🔗 Vérification connexion Supabase..." -ForegroundColor Cyan
    
    try {
        $projectStatus = supabase status 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Connecté au projet" -ForegroundColor Green
            Write-Host ""
            
            # Appliquer les migrations
            Write-Host "📝 Application Migration 1: fix_driver_subscription..." -ForegroundColor Cyan
            supabase db push --include-all
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Migrations appliquées avec succès!" -ForegroundColor Green
                Write-Host ""
                
                # Exécuter les tests
                Write-Host "🧪 Exécution des tests..." -ForegroundColor Cyan
                $testQuery = "SELECT * FROM test_pdg_subscription_permissions();"
                
                Write-Host ""
                Write-Host "Exécutez dans Supabase SQL Editor:" -ForegroundColor Yellow
                Write-Host $testQuery -ForegroundColor Cyan
                
            } else {
                Write-Host "❌ Erreur lors de l'application des migrations" -ForegroundColor Red
                Write-Host "   Essayez l'application manuelle (voir instructions ci-dessus)" -ForegroundColor Yellow
            }
            
        } else {
            Write-Host "⚠️  Non connecté au projet Supabase" -ForegroundColor Yellow
            Write-Host "   Utilisez: supabase link" -ForegroundColor White
        }
        
    } catch {
        Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "📚 Documentation disponible:" -ForegroundColor Cyan
Write-Host "   - APPLICATION_URGENTE_FIX_RLS.md" -ForegroundColor White
Write-Host "   - ANALYSE_PROFONDE_OFFRE_ABONNEMENT.md" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Après application, testez:" -ForegroundColor Cyan
Write-Host "   Interface PDG → Abonnements → Offrir abonnement" -ForegroundColor White
Write-Host ""
