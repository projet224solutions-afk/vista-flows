# Deployment script for payment functions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPLOIEMENT SYSTEME PAIEMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "ETAPE 1: Obtenir votre token Supabase" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ouvrez: https://supabase.com/dashboard/account/tokens" -ForegroundColor White
Write-Host "2. Connectez-vous" -ForegroundColor White
Write-Host "3. Cliquez sur 'Generate new token'" -ForegroundColor White
Write-Host "4. Nom: 224Solutions Deploy" -ForegroundColor White
Write-Host "5. Copiez le token (commence par sbp_)" -ForegroundColor White
Write-Host ""

$token = Read-Host "Collez votre token ici"

if (-not $token -or $token.Length -lt 10) {
    Write-Host ""
    Write-Host "Token invalide!" -ForegroundColor Red
    exit 1
}

$env:SUPABASE_ACCESS_TOKEN = $token
Write-Host ""
Write-Host "Token configure!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ETAPE 2: Deploiement" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT = "uakkxaibujzxdiqzpnpr"
$functions = @("delivery-payment", "freight-payment")
$success = 0
$fail = 0

foreach ($func in $functions) {
    Write-Host "Deploiement: $func..." -ForegroundColor Yellow
    
    $result = supabase functions deploy $func --project-ref $PROJECT --no-verify-jwt 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: $func deploye!" -ForegroundColor Green
        $success++
    } else {
        Write-Host "  ERREUR: $func" -ForegroundColor Red
        Write-Host "  $result" -ForegroundColor Gray
        $fail++
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESULTAT" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Succes: $success" -ForegroundColor Green
Write-Host "Erreurs: $fail" -ForegroundColor Red
Write-Host ""

if ($success -eq $functions.Count) {
    Write-Host "SUCCES! Toutes les fonctions sont deployees!" -ForegroundColor Green
    Write-Host ""
    Write-Host "PROCHAINE ETAPE CRITIQUE:" -ForegroundColor Yellow
    Write-Host "Configurer le webhook Stripe sur:" -ForegroundColor White
    Write-Host "https://dashboard.stripe.com/test/webhooks" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "Certaines fonctions ont echoue" -ForegroundColor Yellow
}
