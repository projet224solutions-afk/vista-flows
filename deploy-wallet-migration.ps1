#!/usr/bin/env pwsh
# Script de déploiement de la migration wallet

param(
    [string]$DatabaseUrl = $env:DATABASE_URL
)

Write-Host "`n🚀 DÉPLOIEMENT MIGRATION WALLET SYSTEM" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$migrationFile = "supabase/migrations/20260109000000_fix_wallet_system_complete.sql"

# Vérifier que le fichier existe
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Erreur: Fichier de migration introuvable!" -ForegroundColor Red
    Write-Host "   Chemin attendu: $migrationFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Fichier de migration trouvé: $migrationFile" -ForegroundColor Green
$fileSize = [math]::Round((Get-Item $migrationFile).Length / 1KB, 2)
Write-Host "   Taille: $fileSize KB" -ForegroundColor White

# Méthode 1: Via DATABASE_URL si fourni
if ($DatabaseUrl) {
    Write-Host "`n📡 Tentative de connexion à la base de données..." -ForegroundColor Yellow
    
    # Vérifier si psql est disponible
    $psqlAvailable = Get-Command psql -ErrorAction SilentlyContinue
    
    if ($psqlAvailable) {
        Write-Host "✅ psql trouvé, exécution de la migration..." -ForegroundColor Green
        
        try {
            $result = psql $DatabaseUrl -f $migrationFile 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✅ MIGRATION APPLIQUÉE AVEC SUCCÈS!" -ForegroundColor Green
                Write-Host "`n📋 Résultat:" -ForegroundColor Cyan
                Write-Host $result -ForegroundColor White
                exit 0
            } else {
                Write-Host "`n❌ Erreur lors de l'application de la migration" -ForegroundColor Red
                Write-Host $result -ForegroundColor Yellow
                exit 1
            }
        } catch {
            Write-Host "`n❌ Exception: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  psql non trouvé dans le PATH" -ForegroundColor Yellow
    }
}

# Méthode 2: Via Supabase CLI
Write-Host "`n📦 Tentative via Supabase CLI..." -ForegroundColor Yellow

try {
    $supabaseAvailable = Get-Command supabase -ErrorAction SilentlyContinue
    
    if ($supabaseAvailable) {
        Write-Host "✅ Supabase CLI trouvé" -ForegroundColor Green
        
        # Vérifier si link est configuré
        $linkStatus = supabase status 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Projet Supabase lié, application de la migration..." -ForegroundColor Green
            
            $pushResult = supabase db push 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✅ MIGRATION APPLIQUÉE VIA SUPABASE CLI!" -ForegroundColor Green
                Write-Host $pushResult -ForegroundColor White
                exit 0
            } else {
                Write-Host "`n⚠️  Erreur Supabase CLI:" -ForegroundColor Yellow
                Write-Host $pushResult -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️  Projet Supabase non lié" -ForegroundColor Yellow
            Write-Host "   Exécutez: supabase link --project-ref <your-project-ref>" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  Supabase CLI non installé" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Impossible d'utiliser Supabase CLI: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Méthode 3: Instructions manuelles
Write-Host "`n" -NoNewline
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  DÉPLOIEMENT MANUEL VIA SUPABASE DASHBOARD               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n📋 Suivez ces étapes:" -ForegroundColor Yellow

Write-Host "`n1️⃣  Ouvrez votre navigateur:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard" -ForegroundColor Cyan

Write-Host "`n2️⃣  Sélectionnez votre projet" -ForegroundColor White

Write-Host "`n3️⃣  Allez dans SQL Editor:" -ForegroundColor White
Write-Host "   Dashboard > SQL Editor > New Query" -ForegroundColor Gray

Write-Host "`n4️⃣  Copiez le contenu de la migration:" -ForegroundColor White
Write-Host "   Fichier: $migrationFile" -ForegroundColor Gray
Write-Host "   Commande: Get-Content `"$migrationFile`" | Set-Clipboard" -ForegroundColor Cyan

Write-Host "`n5️⃣  Collez dans SQL Editor et cliquez RUN" -ForegroundColor White

Write-Host "`n6️⃣  Vérifiez les messages de succès:" -ForegroundColor White
Write-Host "   ✅ Tables créées: wallets, wallet_transactions, idempotency_keys" -ForegroundColor Gray
Write-Host "   ✅ Fonctions créées: update_wallet_balance_atomic, create_wallet_for_user" -ForegroundColor Gray
Write-Host "   ✅ RLS policies activées" -ForegroundColor Gray
Write-Host "   ✅ Trigger créé: trigger_create_wallet_on_profile" -ForegroundColor Gray

Write-Host "`n" -NoNewline
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  COMMANDES UTILES                                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n📋 Copier la migration dans le presse-papiers:" -ForegroundColor Yellow
Write-Host "   Get-Content `"$migrationFile`" | Set-Clipboard" -ForegroundColor Cyan

Write-Host "`n📋 Ouvrir le fichier dans l'éditeur:" -ForegroundColor Yellow
Write-Host "   code `"$migrationFile`"" -ForegroundColor Cyan

Write-Host "`n📋 Afficher le contenu:" -ForegroundColor Yellow
Write-Host "   Get-Content `"$migrationFile`"" -ForegroundColor Cyan

Write-Host "`n📋 Vérifier après déploiement:" -ForegroundColor Yellow
Write-Host "   psql `$DATABASE_URL -c `"SELECT COUNT(*) FROM wallets;`"" -ForegroundColor Cyan

Write-Host "`n" -NoNewline
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║  TESTS POST-DÉPLOIEMENT                                   ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

Write-Host "`nAprès déploiement, exécutez dans SQL Editor:" -ForegroundColor Yellow

Write-Host "`n-- Vérifier tables créées" -ForegroundColor Gray
Write-Host "SELECT table_name FROM information_schema.tables" -ForegroundColor Cyan
Write-Host "WHERE table_schema = 'public'" -ForegroundColor Cyan
Write-Host "AND table_name IN ('wallets', 'wallet_transactions', 'idempotency_keys');" -ForegroundColor Cyan

Write-Host "`n-- Vérifier fonction atomique" -ForegroundColor Gray
Write-Host "SELECT routine_name FROM information_schema.routines" -ForegroundColor Cyan
Write-Host "WHERE routine_name = 'update_wallet_balance_atomic';" -ForegroundColor Cyan

Write-Host "`n-- Compter wallets" -ForegroundColor Gray
Write-Host "SELECT COUNT(*) as total_wallets FROM wallets;" -ForegroundColor Cyan

Write-Host "`n-- Test fonction" -ForegroundColor Gray
Write-Host "SELECT * FROM update_wallet_balance_atomic(" -ForegroundColor Cyan
Write-Host "  (SELECT id FROM wallets LIMIT 1)," -ForegroundColor Cyan
Write-Host "  100.00," -ForegroundColor Cyan
Write-Host "  'TEST-' || NOW()::text," -ForegroundColor Cyan
Write-Host "  'Test deployment'" -ForegroundColor Cyan
Write-Host ");" -ForegroundColor Cyan

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "📞 Besoin d'aide? Consultez:" -ForegroundColor Yellow
Write-Host "   - WALLET_VERIFICATION_REPORT.md" -ForegroundColor White
Write-Host "   - ANALYSE_WALLET_SYSTEM_BROKEN.md" -ForegroundColor White
Write-Host "================================================`n" -ForegroundColor Cyan
