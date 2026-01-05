# =============================================================================
# SCRIPT DE VÉRIFICATION ET DÉPLOIEMENT STRIPE - 224SOLUTIONS
# =============================================================================
# Ce script automatise les étapes suivantes:
# 1. Vérification de l'accès REST API aux tables Stripe
# 2. Déploiement des Edge Functions
# 3. Configuration des secrets Stripe
# 4. Test du système de paiement
# =============================================================================

param(
    [switch]$CheckTables,
    [switch]$DeployFunctions,
    [switch]$ConfigureSecrets,
    [switch]$Test,
    [switch]$All
)

$ErrorActionPreference = "Continue"
$PROJECT_REF = "uakkxaibujzxdiqzpnpr"
$SUPABASE_URL = "https://$PROJECT_REF.supabase.co"

# =============================================================================
# FONCTIONS UTILITAIRES
# =============================================================================

function Write-Step {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERREUR] $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Get-EnvVariable {
    param([string]$Name)
    
    if (Test-Path ".env.local") {
        $line = Get-Content ".env.local" | Select-String $Name
        if ($line) {
            return $line.ToString().Split('=')[1].Trim()
        }
    }
    return $null
}

# =============================================================================
# ÉTAPE 1: VÉRIFICATION DES TABLES
# =============================================================================

function Test-StripeTables {
    Write-Step "VÉRIFICATION DES TABLES STRIPE"
    
    $anonKey = Get-EnvVariable "VITE_SUPABASE_ANON_KEY"
    if (-not $anonKey) {
        Write-Error "Clé VITE_SUPABASE_ANON_KEY introuvable dans .env.local"
        return $false
    }
    
    $tables = @(
        'stripe_config',
        'stripe_transactions',
        'stripe_wallets',
        'stripe_wallet_transactions',
        'stripe_withdrawals'
    )
    
    $successCount = 0
    
    foreach ($table in $tables) {
        try {
            $url = "$SUPABASE_URL/rest/v1/$table"
            $response = Invoke-RestMethod -Uri $url -Method Head `
                -Headers @{"apikey"=$anonKey; "Range"="0-0"} `
                -ErrorAction Stop
            
            Write-Success "$table - Table accessible"
            $successCount++
        }
        catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            
            if ($statusCode -eq 416) {
                Write-Success "$table - Table existe (vide)"
                $successCount++
            }
            elseif ($statusCode -eq 401) {
                Write-Error "$table - Erreur d'authentification"
            }
            elseif ($statusCode -eq 404) {
                Write-Error "$table - Table non trouvée"
            }
            else {
                Write-Warning "$table - Code HTTP: $statusCode"
            }
        }
    }
    
    Write-Host "`nRésultat: $successCount/$($tables.Count) tables accessibles" -ForegroundColor $(if ($successCount -eq $tables.Count) { "Green" } else { "Yellow" })
    
    return ($successCount -eq $tables.Count)
}

# =============================================================================
# ÉTAPE 2: DÉPLOIEMENT DES EDGE FUNCTIONS
# =============================================================================

function Deploy-EdgeFunctions {
    Write-Step "DÉPLOIEMENT DES EDGE FUNCTIONS"
    
    # Vérifier que Supabase CLI est installé
    try {
        $version = supabase --version 2>&1
        Write-Success "Supabase CLI détecté: $version"
    }
    catch {
        Write-Error "Supabase CLI non trouvé. Installez-le avec: npm install -g supabase"
        return $false
    }
    
    $functions = @(
        'create-payment-intent',
        'stripe-webhook'
    )
    
    $successCount = 0
    
    foreach ($func in $functions) {
        Write-Host "`nDéploiement de $func..." -ForegroundColor Yellow
        
        try {
            $output = supabase functions deploy $func --project-ref $PROJECT_REF 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$func déployée avec succès"
                $successCount++
            }
            else {
                Write-Error "$func - Échec du déploiement"
                Write-Host $output -ForegroundColor Gray
            }
        }
        catch {
            Write-Error "$func - Exception: $_"
        }
    }
    
    Write-Host "`nRésultat: $successCount/$($functions.Count) functions déployées" -ForegroundColor $(if ($successCount -eq $functions.Count) { "Green" } else { "Yellow" })
    
    return ($successCount -eq $functions.Count)
}

# =============================================================================
# ÉTAPE 3: CONFIGURATION DES SECRETS
# =============================================================================

function Set-StripeSecrets {
    Write-Step "CONFIGURATION DES SECRETS STRIPE"
    
    Write-Host "`nPour configurer les secrets Stripe, vous avez 2 options:`n"
    
    Write-Host "OPTION 1: Via la ligne de commande" -ForegroundColor Yellow
    Write-Host @"
supabase secrets set STRIPE_SECRET_KEY=sk_test_... --project-ref $PROJECT_REF
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref $PROJECT_REF
"@
    
    Write-Host "`nOPTION 2: Via le Dashboard Supabase" -ForegroundColor Yellow
    Write-Host "1. Ouvrir: $SUPABASE_URL/settings/functions"
    Write-Host "2. Cliquer sur 'Manage secrets'"
    Write-Host "3. Ajouter:"
    Write-Host "   - STRIPE_SECRET_KEY = sk_test_..."
    Write-Host "   - STRIPE_WEBHOOK_SECRET = whsec_..."
    
    Write-Host "`nObtenir les clés Stripe:" -ForegroundColor Cyan
    Write-Host "1. Secret Key: https://dashboard.stripe.com/test/apikeys"
    Write-Host "2. Webhook Secret: https://dashboard.stripe.com/test/webhooks"
    Write-Host "   - Créer un endpoint: $SUPABASE_URL/functions/v1/stripe-webhook"
    Write-Host "   - Événements: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded"
    
    Write-Host "`nAppuyez sur Entrée une fois les secrets configurés..." -ForegroundColor Yellow
    Read-Host
    
    return $true
}

# =============================================================================
# ÉTAPE 4: TEST DU SYSTÈME
# =============================================================================

function Test-StripePayment {
    Write-Step "TEST DU SYSTÈME DE PAIEMENT"
    
    Write-Host "`n1. Démarrez le serveur de développement:" -ForegroundColor Yellow
    Write-Host "   npm run dev`n"
    
    Write-Host "2. Ouvrez la page de test:" -ForegroundColor Yellow
    Write-Host "   http://localhost:8080/test-stripe-payment`n"
    
    Write-Host "3. Testez avec la carte de test Stripe:" -ForegroundColor Yellow
    Write-Host "   Numéro: 4242 4242 4242 4242"
    Write-Host "   Date: 12/34"
    Write-Host "   CVC: 123"
    Write-Host "   Montant: 50 000 GNF`n"
    
    Write-Host "4. Vérifications attendues:" -ForegroundColor Yellow
    Write-Host "   - Transaction créée dans stripe_transactions"
    Write-Host "   - Wallet créé dans stripe_wallets"
    Write-Host "   - Commission calculée (2.5%)"
    Write-Host "   - Message de succès affiché`n"
    
    Write-Host "Appuyez sur Entrée pour ouvrir la page de test..." -ForegroundColor Yellow
    Read-Host
    
    Start-Process "http://localhost:8080/test-stripe-payment"
    
    return $true
}

# =============================================================================
# MENU PRINCIPAL
# =============================================================================

function Show-Menu {
    Clear-Host
    Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║     DÉPLOIEMENT STRIPE - 224SOLUTIONS                          ║
║     Projet: $PROJECT_REF                           ║
╚════════════════════════════════════════════════════════════════╝

Sélectionnez une option:

[1] Vérifier les tables Stripe (API REST)
[2] Déployer les Edge Functions
[3] Configurer les secrets Stripe
[4] Tester le système de paiement
[5] Tout exécuter (1→2→3→4)
[0] Quitter

"@ -ForegroundColor Cyan
}

function Start-Interactive {
    do {
        Show-Menu
        $choice = Read-Host "Votre choix"
        
        switch ($choice) {
            "1" { Test-StripeTables; Read-Host "`nAppuyez sur Entrée pour continuer" }
            "2" { Deploy-EdgeFunctions; Read-Host "`nAppuyez sur Entrée pour continuer" }
            "3" { Set-StripeSecrets; Read-Host "`nAppuyez sur Entrée pour continuer" }
            "4" { Test-StripePayment; Read-Host "`nAppuyez sur Entrée pour continuer" }
            "5" {
                if (Test-StripeTables) {
                    Read-Host "`nAppuyez sur Entrée pour déployer les fonctions"
                    if (Deploy-EdgeFunctions) {
                        Read-Host "`nAppuyez sur Entrée pour configurer les secrets"
                        if (Set-StripeSecrets) {
                            Read-Host "`nAppuyez sur Entrée pour tester"
                            Test-StripePayment
                        }
                    }
                }
                Read-Host "`nAppuyez sur Entrée pour continuer"
            }
            "0" { return }
            default { Write-Warning "Option invalide" }
        }
    } while ($choice -ne "0")
}

# =============================================================================
# EXÉCUTION
# =============================================================================

if ($CheckTables -or $All) {
    Test-StripeTables
}

if ($DeployFunctions -or $All) {
    Deploy-EdgeFunctions
}

if ($ConfigureSecrets -or $All) {
    Set-StripeSecrets
}

if ($Test -or $All) {
    Test-StripePayment
}

if (-not ($CheckTables -or $DeployFunctions -or $ConfigureSecrets -or $Test -or $All)) {
    Start-Interactive
}

Write-Host "`nScript terminé!" -ForegroundColor Green
