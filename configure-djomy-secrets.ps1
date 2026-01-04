# =====================================================
# SCRIPT DE CONFIGURATION DJOMY POUR SUPABASE
# Configure les secrets nécessaires pour les paiements
# =====================================================

Write-Host "🔐 CONFIGURATION DES SECRETS DJOMY POUR SUPABASE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Supabase CLI est installé
try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "✅ Supabase CLI détecté: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI non installé!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation requise:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host "  ou" -ForegroundColor White
    Write-Host "  brew install supabase/tap/supabase (macOS)" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "📋 ÉTAPES:" -ForegroundColor Yellow
Write-Host "1. Obtenez vos credentials depuis https://merchant.djomy.africa" -ForegroundColor White
Write-Host "2. Entrez-les ci-dessous" -ForegroundColor White
Write-Host "3. Le script les configurera dans Supabase" -ForegroundColor White
Write-Host ""

# Demander les credentials
Write-Host "🔑 CREDENTIALS DJOMY PRODUCTION:" -ForegroundColor Cyan
Write-Host ""

# Client ID
do {
    $clientId = Read-Host "Client ID (format: djomy-merchant-XXXXX)"
    
    if ($clientId -notmatch "^djomy-merchant-") {
        Write-Host "❌ Format invalide! Le Client ID doit commencer par 'djomy-merchant-'" -ForegroundColor Red
        Write-Host ""
    }
} while ($clientId -notmatch "^djomy-merchant-")

Write-Host "✅ Client ID valide" -ForegroundColor Green
Write-Host ""

# Client Secret
do {
    $clientSecret = Read-Host "Client Secret" -AsSecureString
    $clientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
    )
    
    if ($clientSecretPlain.Length -lt 10) {
        Write-Host "❌ Le secret semble trop court (minimum 10 caractères)" -ForegroundColor Red
        Write-Host ""
    }
} while ($clientSecretPlain.Length -lt 10)

Write-Host "✅ Client Secret accepté" -ForegroundColor Green
Write-Host ""

# Credentials Sandbox (optionnel)
Write-Host "🧪 CREDENTIALS SANDBOX (optionnel - Entrée pour ignorer):" -ForegroundColor Cyan
Write-Host ""

$clientIdSandbox = Read-Host "Client ID Sandbox (optionnel)"
if ($clientIdSandbox) {
    $clientSecretSandbox = Read-Host "Client Secret Sandbox" -AsSecureString
    $clientSecretSandboxPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecretSandbox)
    )
}

Write-Host ""
Write-Host "📤 CONFIGURATION DES SECRETS DANS SUPABASE..." -ForegroundColor Cyan
Write-Host ""

# Vérifier si on est connecté à Supabase
$linked = supabase status 2>&1
if ($linked -match "not linked") {
    Write-Host "⚠️  Projet Supabase non lié" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Liez votre projet avec:" -ForegroundColor White
    Write-Host "  supabase link --project-ref VOTRE_PROJECT_ID" -ForegroundColor Cyan
    Write-Host ""
    
    $projectRef = Read-Host "Entrez votre Project ID Supabase (depuis dashboard)"
    
    Write-Host "Linking project..." -ForegroundColor Yellow
    supabase link --project-ref $projectRef
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec du linking" -ForegroundColor Red
        exit 1
    }
}

# Configurer les secrets
Write-Host "Setting DJOMY_CLIENT_ID..." -ForegroundColor Yellow
supabase secrets set DJOMY_CLIENT_ID=$clientId

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ DJOMY_CLIENT_ID configuré" -ForegroundColor Green
} else {
    Write-Host "❌ Échec configuration DJOMY_CLIENT_ID" -ForegroundColor Red
    exit 1
}

Write-Host "Setting DJOMY_CLIENT_SECRET..." -ForegroundColor Yellow
supabase secrets set DJOMY_CLIENT_SECRET=$clientSecretPlain

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ DJOMY_CLIENT_SECRET configuré" -ForegroundColor Green
} else {
    Write-Host "❌ Échec configuration DJOMY_CLIENT_SECRET" -ForegroundColor Red
    exit 1
}

# Sandbox (si fourni)
if ($clientIdSandbox) {
    Write-Host "Setting DJOMY_CLIENT_ID_SANDBOX..." -ForegroundColor Yellow
    supabase secrets set DJOMY_CLIENT_ID_SANDBOX=$clientIdSandbox
    
    Write-Host "Setting DJOMY_CLIENT_SECRET_SANDBOX..." -ForegroundColor Yellow
    supabase secrets set DJOMY_CLIENT_SECRET_SANDBOX=$clientSecretSandboxPlain
    
    Write-Host "✅ Credentials Sandbox configurés" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 CONFIGURATION TERMINÉE!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Redéployez vos Edge Functions:" -ForegroundColor White
Write-Host "   supabase functions deploy djomy-init-payment" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Testez un paiement de 100 GNF depuis:" -ForegroundColor White
Write-Host "   - Interface POS Vendeur" -ForegroundColor Cyan
Write-Host "   - Recharge Wallet" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Vérifiez les logs:" -ForegroundColor White
Write-Host "   supabase functions logs djomy-init-payment" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Consultez les transactions dans la DB:" -ForegroundColor White
Write-Host "   SELECT * FROM djomy_transactions ORDER BY created_at DESC LIMIT 5;" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Système prêt pour la production!" -ForegroundColor Green
Write-Host ""
