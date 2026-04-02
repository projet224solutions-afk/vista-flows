param(
  [string]$ProdApiUrl = 'https://api-africa.224solution.net'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '== 224Solutions / Vercel deploy ==' -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host "API de prod attendue: $ProdApiUrl"

Write-Host "`n[1/4] Build frontend..." -ForegroundColor Yellow
npm.cmd run build
if ($LASTEXITCODE -ne 0) {
  throw 'Le build frontend a échoué.'
}

Write-Host "`n[2/4] Vérification Vercel CLI..." -ForegroundColor Yellow
npx.cmd --yes vercel --version
if ($LASTEXITCODE -ne 0) {
  throw 'Impossible d’exécuter Vercel CLI.'
}

Write-Host "`n[3/4] Vérification connexion Vercel..." -ForegroundColor Yellow
npx.cmd --yes vercel whoami
if ($LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'Connecte-toi d’abord puis relance:' -ForegroundColor Red
  Write-Host '  npx.cmd --yes vercel login'
  exit 1
}

if (-not (Test-Path '.vercel\project.json')) {
  Write-Host "`nProjet non lié. Liaison Vercel..." -ForegroundColor Yellow
  npx.cmd --yes vercel link
  if ($LASTEXITCODE -ne 0) {
    throw 'La liaison Vercel a échoué.'
  }
}

Write-Host "`n[4/4] Déploiement production..." -ForegroundColor Yellow
npx.cmd --yes vercel deploy --prod
if ($LASTEXITCODE -ne 0) {
  throw 'Le déploiement Vercel a échoué.'
}

Write-Host ''
Write-Host 'Déploiement terminé.' -ForegroundColor Green
Write-Host 'Tests conseillés :' -ForegroundColor Cyan
Write-Host '  https://www.224solution.net/health'
Write-Host '  https://www.224solution.net/edge-functions/payments/african-fx-query?base=USD&quote=GNF'
Write-Host '  https://www.224solution.net/api/payment-links/process'
