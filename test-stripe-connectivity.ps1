# 🧪 TEST RAPIDE CONNECTIVITÉ STRIPE
# Vérifie si Stripe est réellement connecté au système

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   TEST CONNECTIVITÉ STRIPE" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

function Test-EnvironmentVariable {
    param($Name, $DisplayName)
    
    $envFile = Get-Content .env.local -ErrorAction SilentlyContinue
    $value = $envFile | Select-String $Name | ForEach-Object { $_.Line.Split('=')[1] }
    
    if ($value) {
        Write-Host "✅ $DisplayName : " -ForegroundColor Green -NoNewline
        Write-Host $value.Substring(0, [Math]::Min(30, $value.Length)) -ForegroundColor Gray -NoNewline
        if ($value.Length -gt 30) { Write-Host "..." -ForegroundColor Gray }
        else { Write-Host "" }
        return $true
    } else {
        Write-Host "❌ $DisplayName : NON TROUVÉE" -ForegroundColor Red
        return $false
    }
}

function Test-FileExists {
    param($Path, $DisplayName)
    
    if (Test-Path $Path) {
        Write-Host "✅ $DisplayName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $DisplayName : NON TROUVÉ" -ForegroundColor Red
        return $false
    }
}

function Test-NpmPackage {
    param($Package, $DisplayName)
    
    if (Test-Path "node_modules/$Package") {
        Write-Host "✅ $DisplayName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $DisplayName : NON INSTALLÉ" -ForegroundColor Red
        return $false
    }
}

# Compteur de tests
$totalTests = 0
$passedTests = 0

Write-Host "1. CONFIGURATION ENVIRONNEMENT" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$totalTests += 4
if (Test-EnvironmentVariable "VITE_STRIPE_PUBLISHABLE_KEY" "Clé Stripe Publique") { $passedTests++ }
if (Test-EnvironmentVariable "VITE_SUPABASE_URL" "Supabase URL") { $passedTests++ }
if (Test-EnvironmentVariable "VITE_SUPABASE_ANON_KEY" "Supabase Anon Key") { $passedTests++ }
if (Test-FileExists ".env.local" "Fichier .env.local") { $passedTests++ }
Write-Host ""

Write-Host "2. DÉPENDANCES NPM" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$totalTests += 2
if (Test-NpmPackage "@stripe/stripe-js" "@stripe/stripe-js") { $passedTests++ }
if (Test-NpmPackage "@stripe/react-stripe-js" "@stripe/react-stripe-js") { $passedTests++ }
Write-Host ""

Write-Host "3. COMPOSANTS STRIPE" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$totalTests += 4
if (Test-FileExists "src/components/payment/StripePaymentForm.tsx" "StripePaymentForm.tsx") { $passedTests++ }
if (Test-FileExists "src/components/payment/StripePaymentWrapper.tsx" "StripePaymentWrapper.tsx") { $passedTests++ }
if (Test-FileExists "src/pages/StripePaymentTest.tsx" "StripePaymentTest.tsx") { $passedTests++ }
if (Test-FileExists "src/pages/StripeDiagnostic.tsx" "StripeDiagnostic.tsx") { $passedTests++ }
Write-Host ""

Write-Host "4. BACKEND SUPABASE" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$totalTests += 3
if (Test-FileExists "supabase/migrations/stripe_payment_system.sql" "Migration SQL") { $passedTests++ }
if (Test-FileExists "supabase/functions/create-payment-intent/index.ts" "Edge Function: create-payment-intent") { $passedTests++ }
if (Test-FileExists "supabase/functions/stripe-webhook/index.ts" "Edge Function: stripe-webhook") { $passedTests++ }
Write-Host ""

Write-Host "5. TEST SUPABASE CLI" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$totalTests += 1
try {
    $version = supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Supabase CLI installé : $version" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "❌ Supabase CLI non installé" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Supabase CLI non installé" -ForegroundColor Red
}
Write-Host ""

Write-Host "6. TEST CONNEXION SUPABASE" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$totalTests += 1
try {
    $projects = supabase projects list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connecté à Supabase" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "❌ Non connecté à Supabase" -ForegroundColor Red
        Write-Host "   Exécutez: supabase login" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Non connecté à Supabase" -ForegroundColor Red
}
Write-Host ""

# Calcul du score
$percentage = [math]::Round(($passedTests / $totalTests) * 100)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   RÉSULTAT" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Tests réussis : " -NoNewline
if ($percentage -ge 80) {
    Write-Host "$passedTests/$totalTests ($percentage%)" -ForegroundColor Green
} elseif ($percentage -ge 50) {
    Write-Host "$passedTests/$totalTests ($percentage%)" -ForegroundColor Yellow
} else {
    Write-Host "$passedTests/$totalTests ($percentage%)" -ForegroundColor Red
}
Write-Host ""

if ($percentage -eq 100) {
    Write-Host "🎉 EXCELLENT ! Tous les tests sont passés" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes :" -ForegroundColor Yellow
    Write-Host "1. Déployez le backend : " -NoNewline
    Write-Host ".\deploy-stripe-backend.ps1" -ForegroundColor Cyan
    Write-Host "2. Testez la connexion : " -NoNewline
    Write-Host "http://localhost:8080/stripe-diagnostic" -ForegroundColor Cyan
    Write-Host "3. Testez un paiement : " -NoNewline
    Write-Host "http://localhost:8080/test-stripe-payment" -ForegroundColor Cyan
} elseif ($percentage -ge 80) {
    Write-Host "✅ BIEN ! La plupart des tests sont passés" -ForegroundColor Green
    Write-Host ""
    Write-Host "Quelques éléments manquent. Vérifiez les ❌ ci-dessus" -ForegroundColor Yellow
} elseif ($percentage -ge 50) {
    Write-Host "⚠️  MOYEN. Plusieurs éléments manquent" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Vérifiez la configuration et réessayez" -ForegroundColor Yellow
} else {
    Write-Host "❌ CRITIQUE. La plupart des tests ont échoué" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez l'installation et la configuration de base" -ForegroundColor Red
}

Write-Host ""
Write-Host "Pour un diagnostic complet :" -ForegroundColor Cyan
Write-Host "  Ouvrez : " -NoNewline
Write-Host "http://localhost:8080/stripe-diagnostic" -ForegroundColor Yellow
Write-Host ""
