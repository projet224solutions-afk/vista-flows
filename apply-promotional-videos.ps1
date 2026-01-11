# Script d'application migration vidéos publicitaires
# Date: 2026-01-10
# Description: Ajoute support vidéos publicitaires produits (Premium)

Write-Host "🎬 APPLICATION MIGRATION VIDÉOS PUBLICITAIRES" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que nous sommes dans le bon répertoire
if (-Not (Test-Path "supabase\migrations\20260110000000_add_promotional_videos.sql")) {
    Write-Host "❌ Erreur: Migration introuvable" -ForegroundColor Red
    Write-Host "Assurez-vous d'être dans le répertoire racine du projet" -ForegroundColor Yellow
    exit 1
}

# Charger les variables d'environnement
if (Test-Path ".env.local") {
    Write-Host "📄 Chargement .env.local..." -ForegroundColor Yellow
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^VITE_SUPABASE_URL=(.*)$') {
            $env:SUPABASE_URL = $matches[1]
        }
        if ($_ -match '^VITE_SUPABASE_ANON_KEY=(.*)$') {
            $env:SUPABASE_KEY = $matches[1]
        }
        if ($_ -match '^SUPABASE_SERVICE_ROLE_KEY=(.*)$') {
            $env:SUPABASE_SERVICE_KEY = $matches[1]
        }
    }
}

if (-Not $env:SUPABASE_URL -or -Not $env:SUPABASE_SERVICE_KEY) {
    Write-Host "❌ Variables d'environnement manquantes" -ForegroundColor Red
    Write-Host "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Configuration chargée" -ForegroundColor Green
Write-Host "   URL: $env:SUPABASE_URL" -ForegroundColor Gray
Write-Host ""

# Lire le fichier SQL
$migrationFile = "supabase\migrations\20260110000000_add_promotional_videos.sql"
$sqlContent = Get-Content $migrationFile -Raw

Write-Host "📋 Migration à appliquer:" -ForegroundColor Cyan
Write-Host "   - Colonne promotional_video" -ForegroundColor White
Write-Host "   - Bucket product-videos (50MB max)" -ForegroundColor White
Write-Host "   - Policies storage (upload/view/delete)" -ForegroundColor White
Write-Host "   - Index et triggers de nettoyage" -ForegroundColor White
Write-Host ""

# Confirmer
$confirmation = Read-Host "Appliquer la migration ? (o/n)"
if ($confirmation -ne 'o') {
    Write-Host "❌ Migration annulée" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🚀 Application de la migration..." -ForegroundColor Cyan

try {
    # Appeler l'API Supabase pour exécuter le SQL
    $headers = @{
        'Content-Type' = 'application/json'
        'Authorization' = "Bearer $env:SUPABASE_SERVICE_KEY"
        'apikey' = $env:SUPABASE_SERVICE_KEY
    }

    $body = @{
        query = $sqlContent
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$env:SUPABASE_URL/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body -ErrorAction Stop

    Write-Host ""
    Write-Host "✅ MIGRATION APPLIQUÉE AVEC SUCCÈS" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Résumé des changements:" -ForegroundColor Cyan
    Write-Host "   ✅ Colonne promotional_video ajoutée" -ForegroundColor Green
    Write-Host "   ✅ Bucket product-videos créé" -ForegroundColor Green
    Write-Host "   ✅ Policies configurées" -ForegroundColor Green
    Write-Host "   ✅ Index créé" -ForegroundColor Green
    Write-Host "   ✅ Triggers configurés" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎬 Fonctionnalité vidéo publicitaire activée!" -ForegroundColor Magenta
    Write-Host "   - Max 10 secondes" -ForegroundColor White
    Write-Host "   - Max 50 MB" -ForegroundColor White
    Write-Host "   - Premium uniquement" -ForegroundColor Yellow
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ ERREUR lors de l'application" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solutions possibles:" -ForegroundColor Yellow
    Write-Host "   1. Vérifier que SUPABASE_SERVICE_ROLE_KEY est correct" -ForegroundColor White
    Write-Host "   2. Appliquer manuellement via Supabase Dashboard > SQL Editor" -ForegroundColor White
    Write-Host "   3. Vérifier que la fonction exec_sql existe" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "🎉 Migration terminée!" -ForegroundColor Green
Write-Host ""
