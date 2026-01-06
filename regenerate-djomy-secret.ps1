# =====================================================
# SCRIPT URGENT - REGENERATION SECRET DJOMY
# =====================================================
# Date: 2026-01-06
# Criticite: HAUTE - SECRET EXPOSE DANS GIT PUBLIC
# Impact: Detournement de fonds possible
# Temps estime: 10-15 minutes
# =====================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Red
Write-Host "REGENERATION SECRET DJOMY - URGENT" -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Red
Write-Host ""

Write-Host "CONTEXTE:" -ForegroundColor Yellow
Write-Host "   Le secret Djomy a ete expose dans Git public pendant 1 mois."
Write-Host "   Tout attaquant peut acceder a votre systeme de paiement."
Write-Host ""

# Etape 1: Verifier la connexion Supabase
Write-Host "ETAPE 1: Verification de la connexion Supabase..." -ForegroundColor Cyan
$supabaseStatus = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur: Supabase CLI non connecte" -ForegroundColor Red
    Write-Host ""
    Write-Host "Actions requises:" -ForegroundColor Yellow
    Write-Host "   1. Installer Supabase CLI si necessaire: npm install -g supabase"
    Write-Host "   2. Se connecter: supabase login"
    Write-Host "   3. Lier le projet: supabase link --project-ref uakkxaibujzxdiqzpnpr"
    Write-Host ""
    exit 1
}
Write-Host "Supabase CLI connecte" -ForegroundColor Green
Write-Host ""

# Etape 2: Instructions pour regenerer le secret
Write-Host "ETAPE 2: Regeneration du secret Djomy" -ForegroundColor Cyan
Write-Host ""
Write-Host "ACTIONS MANUELLES REQUISES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ouvrir le dashboard Djomy:" -ForegroundColor White
Write-Host "   https://djomy.com/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Se connecter avec vos identifiants PDG" -ForegroundColor White
Write-Host ""
Write-Host "3. Aller dans: Parametres -> API -> Client Secret" -ForegroundColor White
Write-Host ""
Write-Host "4. Cliquer sur 'Regenerer le secret'" -ForegroundColor White
Write-Host ""
Write-Host "5. Copier le NOUVEAU secret genere" -ForegroundColor White
Write-Host ""

# Attendre la confirmation
$confirm = Read-Host "Avez-vous regenere et copie le nouveau secret? (oui/non)"
if ($confirm -ne "oui") {
    Write-Host ""
    Write-Host "Veuillez d'abord regenerer le secret sur Djomy" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

# Etape 3: Saisir le nouveau secret
Write-Host ""
Write-Host "ETAPE 3: Configuration du nouveau secret" -ForegroundColor Cyan
Write-Host ""
$newSecret = Read-Host "Collez le NOUVEAU secret Djomy (invisible)" -AsSecureString
$newSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($newSecret))

if ([string]::IsNullOrWhiteSpace($newSecretPlain)) {
    Write-Host "Le secret ne peut pas etre vide" -ForegroundColor Red
    exit 1
}

# Validation basique
if ($newSecretPlain.Length -lt 20) {
    Write-Host "Attention: Le secret semble trop court (< 20 caracteres)" -ForegroundColor Yellow
    $continueAnyway = Read-Host "Continuer quand meme? (oui/non)"
    if ($continueAnyway -ne "oui") {
        exit 0
    }
}

# Etape 4: Mise a jour dans Supabase
Write-Host ""
Write-Host "ETAPE 4: Mise a jour dans Supabase..." -ForegroundColor Cyan
Write-Host "   Execution: supabase secrets set JOMY_CLIENT_SECRET=..." -ForegroundColor Gray
Write-Host ""

try {
    $output = supabase secrets set "JOMY_CLIENT_SECRET=$newSecretPlain" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Echec de mise a jour du secret: $output"
    }
    Write-Host "Secret mis a jour dans Supabase" -ForegroundColor Green
} catch {
    Write-Host "Erreur lors de la mise a jour: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Correction manuelle:" -ForegroundColor Yellow
    Write-Host "   supabase secrets set JOMY_CLIENT_SECRET=`"VOTRE_NOUVEAU_SECRET`"" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Etape 5: Verification
Write-Host ""
Write-Host "ETAPE 5: Verification de la configuration" -ForegroundColor Cyan
Write-Host ""

# Lister les secrets (sans afficher les valeurs)
Write-Host "Secrets Supabase actuels:" -ForegroundColor White
supabase secrets list | Select-String "JOMY"
Write-Host ""

# Etape 6: Instructions de test
Write-Host "=============================================" -ForegroundColor Green
Write-Host "SECRET REGENERE AVEC SUCCES" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "ETAPES DE VERIFICATION:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Tester une transaction wallet dans l'application" -ForegroundColor White
Write-Host ""
Write-Host "2. Verifier les logs Supabase:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Si vous voyez 'Client secret invalid':" -ForegroundColor White
Write-Host "   C'est NORMAL - cela prouve que l'ancien secret est invalide" -ForegroundColor Green
Write-Host ""
Write-Host "4. La transaction devrait reussir avec le nouveau secret" -ForegroundColor White
Write-Host ""
Write-Host "5. Si erreur 403 Forbidden persiste:" -ForegroundColor White
Write-Host "   - Verifier que le secret copie est complet" -ForegroundColor Gray
Write-Host "   - Reverifier sur le dashboard Djomy" -ForegroundColor Gray
Write-Host "   - Relancer ce script si necessaire" -ForegroundColor Gray
Write-Host ""

Write-Host "=============================================" -ForegroundColor Green
Write-Host "PROCESSUS TERMINE" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaine etape: Deployer les Edge Functions securisees" -ForegroundColor Cyan
Write-Host "Script: .\URGENT-deploy-security-fixes.ps1" -ForegroundColor Gray
Write-Host ""
