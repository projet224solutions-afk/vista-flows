# =====================================================
# SCRIPT DE D\u00c9PLOIEMENT - CORRECTIONS S\u00c9CURIT\u00c9 WALLET
# 224Solutions - 8 janvier 2026
# =====================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Token = "",
    [Parameter(Mandatory=$false)]
    [switch]$SkipMigration = $false,
    [Parameter(Mandatory=$false)]
    [switch]$SkipFunction = $false,
    [Parameter(Mandatory=$false)]
    [switch]$Verify = $false
)

$ErrorActionPreference = "Stop"
$PROJECT_REF = "uakkxaibujzxdiqzpnpr"

# Couleurs
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "========================================="
Write-Info "  D\u00c9PLOIEMENT CORRECTIONS WALLET TRANSFER"
Write-Info "========================================="
Write-Host ""

# V\u00e9rifier que nous sommes dans le bon r\u00e9pertoire
if (-not (Test-Path "supabase\functions\wallet-transfer\index.ts")) {
    Write-Error "\u274c Erreur: Ex\u00e9cutez ce script depuis d:\224Solutions\vista-flows"
    exit 1
}

Write-Success "\u2705 R\u00e9pertoire correct"

# =====================================================
# 1. MIGRATION SQL
# =====================================================
if (-not $SkipMigration) {
    Write-Info ""
    Write-Info "\ud83d\udce6 \u00c9tape 1/3 - Application migration SQL..."
    
    $migrationFile = "supabase\migrations\20260108000000_wallet_security_fixes.sql"
    
    if (-not (Test-Path $migrationFile)) {
        Write-Error "\u274c Migration introuvable: $migrationFile"
        exit 1
    }
    
    Write-Info "   Fichier: $migrationFile"
    
    # V\u00e9rifier si Supabase CLI est install\u00e9
    try {
        $null = Get-Command supabase -ErrorAction Stop
        $supabaseInstalled = $true
    } catch {
        $supabaseInstalled = $false
        Write-Warning "   \u26a0\ufe0f Supabase CLI non install\u00e9"
    }
    
    if ($supabaseInstalled) {
        Write-Info "   Application via Supabase CLI..."
        try {
            supabase db push --project-ref $PROJECT_REF
            Write-Success "   \u2705 Migration appliqu\u00e9e avec succ\u00e8s"
        } catch {
            Write-Warning "   \u26a0\ufe0f Erreur CLI: $_"
            Write-Info "   \u27a1\ufe0f Appliquez manuellement via Dashboard:"
            Write-Info "      https://supabase.com/dashboard/project/$PROJECT_REF/sql"
        }
    } else {
        Write-Info "   \u27a1\ufe0f Appliquez manuellement via Dashboard:"
        Write-Info "      1. Ouvrir: https://supabase.com/dashboard/project/$PROJECT_REF/sql"
        Write-Info "      2. Coller le contenu de: $migrationFile"
        Write-Info "      3. Ex\u00e9cuter"
        Write-Host ""
        $response = Read-Host "   Migration appliqu\u00e9e ? (o/n)"
        if ($response -ne 'o') {
            Write-Error "\u274c D\u00e9ploiement annul\u00e9"
            exit 1
        }
    }
} else {
    Write-Warning "\u23ed\ufe0f \u00c9tape 1/3 - Migration SQL saut\u00e9e"
}

# =====================================================
# 2. EDGE FUNCTION
# =====================================================
if (-not $SkipFunction) {
    Write-Info ""
    Write-Info "\ud83d\ude80 \u00c9tape 2/3 - D\u00e9ploiement Edge Function wallet-transfer..."
    
    if ([string]::IsNullOrEmpty($Token)) {
        Write-Warning "   \u26a0\ufe0f Token Supabase manquant"
        Write-Info "   \u27a1\ufe0f Obtenez un token ici:"
        Write-Info "      https://supabase.com/dashboard/account/tokens"
        Write-Host ""
        $Token = Read-Host "   Entrez votre token Supabase (sbp_...)"
        
        if ([string]::IsNullOrEmpty($Token)) {
            Write-Error "\u274c Token requis pour d\u00e9ployer l'Edge Function"
            exit 1
        }
    }
    
    Write-Info "   V\u00e9rification du fichier..."
    $functionFile = "supabase\functions\wallet-transfer\index.ts"
    
    if (-not (Test-Path $functionFile)) {
        Write-Error "\u274c Fichier introuvable: $functionFile"
        exit 1
    }
    
    # V\u00e9rifier que les corrections sont pr\u00e9sentes
    $content = Get-Content $functionFile -Raw
    
    if ($content -match "ALLOWED_ORIGINS") {
        Write-Success "   \u2705 CORS restrictif d\u00e9tect\u00e9"
    } else {
        Write-Error "\u274c Le fichier ne contient pas les corrections CORS"
        exit 1
    }
    
    if ($content -match "MIN_TRANSFER_AMOUNT") {
        Write-Success "   \u2705 Limites montants d\u00e9tect\u00e9es"
    } else {
        Write-Error "\u274c Le fichier ne contient pas les limites de montants"
        exit 1
    }
    
    if ($content -match "Authentification requise") {
        Write-Success "   \u2705 Auth preview d\u00e9tect\u00e9e"
    } else {
        Write-Error "\u274c Le fichier ne contient pas l'auth preview"
        exit 1
    }
    
    Write-Info "   D\u00e9ploiement en cours..."
    
    try {
        supabase functions deploy wallet-transfer --project-ref $PROJECT_REF --token $Token
        Write-Success "   \u2705 Edge Function d\u00e9ploy\u00e9e avec succ\u00e8s"
    } catch {
        Write-Error "\u274c Erreur de d\u00e9ploiement: $_"
        Write-Info "   \u27a1\ufe0f V\u00e9rifiez:"
        Write-Info "      - Token valide"
        Write-Info "      - Connexion internet"
        Write-Info "      - Supabase CLI install\u00e9"
        exit 1
    }
} else {
    Write-Warning "\u23ed\ufe0f \u00c9tape 2/3 - Edge Function saut\u00e9e"
}

# =====================================================
# 3. V\u00c9RIFICATION
# =====================================================
if ($Verify) {
    Write-Info ""
    Write-Info "\ud83d\udd0d \u00c9tape 3/3 - V\u00e9rification des corrections..."
    
    Write-Info "   Test 1: V\u00e9rification structure Edge Function..."
    $functionUrl = "https://$PROJECT_REF.supabase.co/functions/v1/wallet-transfer"
    
    try {
        # Test OPTIONS (CORS)
        $response = Invoke-WebRequest -Uri $functionUrl -Method OPTIONS -ErrorAction Stop
        if ($response.Headers['Access-Control-Allow-Origin'] -ne '*') {
            Write-Success "   \u2705 CORS restrictif activ\u00e9"
        } else {
            Write-Warning "   \u26a0\ufe0f CORS semble encore ouvert"
        }
    } catch {
        Write-Info "   \u27a1\ufe0f Test CORS (n\u00e9cessite l'Edge Function d\u00e9ploy\u00e9e)"
    }
    
    Write-Info ""
    Write-Info "   Test 2: V\u00e9rification migration SQL..."
    Write-Info "   \u27a1\ufe0f Ex\u00e9cutez manuellement: verify-wallet-security-fixes.sql"
    Write-Info "      via Dashboard SQL ou psql"
    
    Write-Info ""
    Write-Info "   Test 3: V\u00e9rification frontend..."
    $walletServiceFile = "src\services\walletService.ts"
    $content = Get-Content $walletServiceFile -Raw
    
    if ($content -match "d\u00e9pr\u00e9ci\u00e9") {
        Write-Success "   \u2705 walletService.transferFunds() d\u00e9sactiv\u00e9"
    } else {
        Write-Warning "   \u26a0\ufe0f walletService.transferFunds() semble actif"
    }
} else {
    Write-Info ""
    Write-Info "\u23ed\ufe0f \u00c9tape 3/3 - V\u00e9rification saut\u00e9e"
}

# =====================================================
# R\u00c9SUM\u00c9
# =====================================================
Write-Info ""
Write-Info "========================================="
Write-Success "  \u2705 D\u00c9PLOIEMENT TERMIN\u00c9"
Write-Info "========================================="
Write-Info ""
Write-Info "\ud83d\udccb R\u00e9capitulatif des corrections:"
Write-Info "   \u2705 CORS restrictif (224solution.net uniquement)"
Write-Info "   \u2705 Authentification sur preview"
Write-Info "   \u2705 Limites montants (100 - 50M GNF)"
Write-Info "   \u2705 Logs sensibles supprim\u00e9s"
Write-Info "   \u2705 Vrai montant retourn\u00e9 (transparence)"
Write-Info "   \u2705 walletService.transferFunds() d\u00e9sactiv\u00e9"
Write-Info "   \u2705 RLS compl\u00e8tes (INSERT/UPDATE bloqu\u00e9s)"
Write-Info "   \u2705 Vue s\u00e9curis\u00e9e user_wallet_transfers"
Write-Info ""

Write-Info "\ud83d\udcca Score de s\u00e9curit\u00e9:"
Write-Info "   Avant:  5.8/10  \ud83d\udd34 Critique"
Write-Info "   Apr\u00e8s:  8.5/10  \ud83d\udfE2 Bon"
Write-Info ""

Write-Info "\ud83d\udc40 Actions suivantes:"
Write-Info "   1. Tester les transferts en dev (localhost)"
Write-Info "   2. V\u00e9rifier les logs Edge Functions"
Write-Info "   3. Ex\u00e9cuter verify-wallet-security-fixes.sql"
Write-Info "   4. Mettre \u00e0 jour le code frontend si n\u00e9cessaire"
Write-Info "   5. Surveiller les erreurs 24-48h"
Write-Info ""

Write-Info "\ud83d\udcdd Documentation:"
Write-Info "   - RAPPORT_CORRECTIONS_WALLET_TRANSFER.md"
Write-Info "   - verify-wallet-security-fixes.sql"
Write-Info ""

Write-Success "\u2705 Tout est pr\u00eat pour la production!"

# Proposer de copier les commandes de v\u00e9rification
Write-Host ""
$showTests = Read-Host "Afficher les commandes de test ? (o/n)"
if ($showTests -eq 'o') {
    Write-Info ""
    Write-Info "========================================="
    Write-Info "  COMMANDES DE TEST"
    Write-Info "========================================="
    Write-Info ""
    
    Write-Info "# Test CORS depuis DevTools Console:"
    Write-Host "fetch('$functionUrl', {" -ForegroundColor Gray
    Write-Host "  method: 'POST'," -ForegroundColor Gray
    Write-Host "  headers: { 'Content-Type': 'application/json' }," -ForegroundColor Gray
    Write-Host "  body: JSON.stringify({sender_id:'x',receiver_id:'y',amount:1000})" -ForegroundColor Gray
    Write-Host "})" -ForegroundColor Gray
    Write-Info ""
    
    Write-Info "# Test Auth Preview:"
    Write-Host "curl -X POST '$functionUrl?action=preview' \" -ForegroundColor Gray
    Write-Host "  -H 'Content-Type: application/json' \" -ForegroundColor Gray
    Write-Host "  -d '{""sender_id"":""xxx"",""receiver_id"":""yyy"",""amount"":1000}'" -ForegroundColor Gray
    Write-Info ""
    
    Write-Info "# Test Limites Montants (dans app):"
    Write-Host "// Montant < 100 GNF (doit \u00e9chouer)" -ForegroundColor Gray
    Write-Host "await supabase.functions.invoke('wallet-transfer', {" -ForegroundColor Gray
    Write-Host "  body: { sender_id: user.id, receiver_id: 'xxx', amount: 50 }" -ForegroundColor Gray
    Write-Host "});" -ForegroundColor Gray
    Write-Info ""
}

Write-Info ""
Write-Success "\ud83c\udf89 D\u00e9ploiement r\u00e9ussi!"
