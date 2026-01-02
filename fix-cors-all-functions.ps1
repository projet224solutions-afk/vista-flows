# Script PowerShell pour appliquer CORS restrictif à toutes les Edge Functions
# Remplace 'Access-Control-Allow-Origin': '*' par une whitelist sécurisée

Write-Host "🔧 Application CORS restrictif sur toutes les Edge Functions..." -ForegroundColor Cyan

$ALLOWED_ORIGINS = @(
    'https://224solution.net',
    'https://www.224solution.net',
    'http://localhost:8080',
    'http://localhost:5173'
)

$CORS_SNIPPET = @"
// CORS sécurisé - Whitelist
const ALLOWED_ORIGINS = [
  'https://224solution.net',
  'https://www.224solution.net',
  'http://localhost:8080',
  'http://localhost:5173'
];

const origin = req.headers.get('origin') || '';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true'
};
"@

# Trouver toutes les Edge Functions avec CORS wildcard
$functionsPath = "supabase\functions"
$files = Get-ChildItem -Path $functionsPath -Filter "index.ts" -Recurse

$totalFiles = 0
$modifiedFiles = 0
$errorFiles = @()

foreach ($file in $files) {
    $totalFiles++
    $content = Get-Content $file.FullName -Raw
    
    # Vérifier si le fichier contient CORS wildcard
    if ($content -match "Access-Control-Allow-Origin['""]?\s*:\s*['""]?\*['""]?") {
        Write-Host "  📝 Modification: $($file.Directory.Name)..." -ForegroundColor Yellow
        
        try {
            # Pattern simple: remplacer juste la ligne CORS
            $newContent = $content -replace "(['""])Access-Control-Allow-Origin\1\s*:\s*\1\*\1", "'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : 'https://224solution.net'"
            
            # Ajouter la whitelist au début de la fonction serve si pas déjà présente
            if ($newContent -notmatch "ALLOWED_ORIGINS\s*=") {
                $newContent = $newContent -replace "(Deno\.serve\(async\s*\(\s*req\s*\)\s*=>|\(req:\s*Request\)\s*=>)\s*\{", "`$1 {`n`n  const ALLOWED_ORIGINS = ['https://224solution.net', 'https://www.224solution.net', 'http://localhost:8080', 'http://localhost:5173'];`n  const origin = req.headers.get('origin') || '';"
            }
            
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            $modifiedFiles++
            Write-Host "    ✅ OK" -ForegroundColor Green
        }
        catch {
            Write-Host "    ❌ Erreur: $_" -ForegroundColor Red
            $errorFiles += $file.FullName
        }
    }
}

Write-Host "`n📊 RÉSUMÉ:" -ForegroundColor Cyan
Write-Host "  Total fichiers scannés: $totalFiles" -ForegroundColor White
Write-Host "  Fichiers modifiés: $modifiedFiles" -ForegroundColor Green
Write-Host "  Erreurs: $($errorFiles.Count)" -ForegroundColor $(if ($errorFiles.Count -gt 0) { "Red" } else { "Green" })

if ($errorFiles.Count -gt 0) {
    Write-Host "`n❌ Fichiers avec erreurs:" -ForegroundColor Red
    $errorFiles | ForEach-Object { Write-Host "  - $_" }
}

Write-Host "`n✅ Script terminé!" -ForegroundColor Green
Write-Host "⚠️  IMPORTANT: Tester les fonctions modifiées avant déploiement!" -ForegroundColor Yellow
