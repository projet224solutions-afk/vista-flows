# Script de déploiement des Edge Functions
# Usage: .\deploy-edge-function.ps1 [nom-de-la-fonction]

param(
    [string]$FunctionName = "create-sub-agent"
)

Write-Host "🚀 Déploiement de la fonction Edge: $FunctionName" -ForegroundColor Cyan

# Vérifier si supabase CLI est installé
$supabaseCLI = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCLI) {
    Write-Host "❌ Supabase CLI n'est pas installé" -ForegroundColor Red
    Write-Host "Installation: npm install -g supabase" -ForegroundColor Yellow
    Write-Host "" 
    Write-Host "ℹ️  Ou déployez manuellement depuis le dashboard Supabase:" -ForegroundColor Blue
    Write-Host "   1. Allez sur https://supabase.com/dashboard" -ForegroundColor Gray
    Write-Host "   2. Sélectionnez votre projet" -ForegroundColor Gray
    Write-Host "   3. Allez dans 'Edge Functions'" -ForegroundColor Gray
    Write-Host "   4. Créez/Modifiez la fonction '$FunctionName'" -ForegroundColor Gray
    Write-Host "   5. Copiez le contenu de supabase/functions/$FunctionName/index.ts" -ForegroundColor Gray
    exit 1
}

# Vérifier si le dossier de la fonction existe
$functionPath = ".\supabase\functions\$FunctionName"
if (-not (Test-Path $functionPath)) {
    Write-Host "❌ Le dossier de la fonction n'existe pas: $functionPath" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Fonction trouvée: $functionPath" -ForegroundColor Green

# Déployer la fonction
Write-Host "⏳ Déploiement en cours..." -ForegroundColor Yellow
try {
    supabase functions deploy $FunctionName --project-ref your-project-ref
    Write-Host "✅ Fonction déployée avec succès!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du déploiement: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Assurez-vous d'être connecté: supabase login" -ForegroundColor Yellow
    Write-Host "💡 Et d'avoir lié votre projet: supabase link --project-ref your-project-ref" -ForegroundColor Yellow
}
