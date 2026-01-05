# =============================================================================
# TEST RAPIDE - PAIEMENT PERSONNALISÉ 224SOLUTIONS
# Vérifie que tous les composants sont en place
# =============================================================================

Write-Host "`n=== TEST RAPIDE PAIEMENT PERSONNALISÉ 224SOLUTIONS ===" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# 1. Vérifier les composants
Write-Host "1. Vérification des composants..." -ForegroundColor Yellow

$components = @(
    "src\components\payment\Custom224PaymentForm.tsx",
    "src\components\payment\Custom224PaymentWrapper.tsx",
    "src\pages\demos\Custom224PaymentDemo.tsx"
)

foreach ($file in $components) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file MANQUANT!" -ForegroundColor Red
        $allGood = $false
    }
}

# 2. Vérifier la route dans App.tsx
Write-Host "`n2. Vérification de la route..." -ForegroundColor Yellow

$appContent = Get-Content "src\App.tsx" -Raw
if ($appContent -match "Custom224PaymentDemo" -and $appContent -match "/demos/custom-payment") {
    Write-Host "   ✅ Route configurée dans App.tsx" -ForegroundColor Green
} else {
    Write-Host "   ❌ Route manquante dans App.tsx" -ForegroundColor Red
    $allGood = $false
}

# 3. Vérifier Edge Function
Write-Host "`n3. Vérification Edge Function..." -ForegroundColor Yellow

if (Test-Path "supabase\functions\create-payment-intent\index.ts") {
    Write-Host "   ✅ Edge Function create-payment-intent existe" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Edge Function manquante (peut-être pas encore déployée)" -ForegroundColor Yellow
}

# 4. Vérifier la documentation
Write-Host "`n4. Vérification documentation..." -ForegroundColor Yellow

$docs = @(
    "PAIEMENT_PERSONNALISE_224SOLUTIONS.md",
    "PAIEMENT_PERSONNALISE_RESUME.md",
    "PAIEMENT_PERSONNALISE_TUTORIEL_VISUEL.md"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-Host "   ✅ $doc" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $doc manquant" -ForegroundColor Yellow
    }
}

# 5. Vérifier les dépendances Stripe
Write-Host "`n5. Vérification des dépendances..." -ForegroundColor Yellow

if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    
    $stripeJs = $packageJson.dependencies.'@stripe/stripe-js'
    $stripeReact = $packageJson.dependencies.'@stripe/react-stripe-js'
    
    if ($stripeJs -and $stripeReact) {
        Write-Host "   ✅ @stripe/stripe-js: $stripeJs" -ForegroundColor Green
        Write-Host "   ✅ @stripe/react-stripe-js: $stripeReact" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Dépendances Stripe manquantes!" -ForegroundColor Red
        Write-Host "   Installez avec: npm install @stripe/stripe-js @stripe/react-stripe-js" -ForegroundColor Yellow
        $allGood = $false
    }
}

# Résumé final
Write-Host "`n========================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "✅ TOUT EST PRÊT!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor White
    Write-Host "1. Lancez l'app: npm run dev" -ForegroundColor Cyan
    Write-Host "2. Ouvrez: http://localhost:5173/demos/custom-payment" -ForegroundColor Cyan
    Write-Host "3. Testez avec la carte: 4242 4242 4242 4242" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Documentation:" -ForegroundColor White
    Write-Host "- PAIEMENT_PERSONNALISE_224SOLUTIONS.md (guide complet)" -ForegroundColor Gray
    Write-Host "- PAIEMENT_PERSONNALISE_RESUME.md (résumé rapide)" -ForegroundColor Gray
    Write-Host "- PAIEMENT_PERSONNALISE_TUTORIEL_VISUEL.md (design)" -ForegroundColor Gray
} else {
    Write-Host "⚠️  CONFIGURATION INCOMPLÈTE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez les erreurs ci-dessus et corrigez-les." -ForegroundColor Yellow
    Write-Host "Consultez PAIEMENT_PERSONNALISE_224SOLUTIONS.md pour plus d'aide." -ForegroundColor Yellow
}

Write-Host ""
