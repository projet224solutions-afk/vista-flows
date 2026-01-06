# =====================================================
# SCRIPT URGENT - RÉGÉNÉRATION SECRET DJOMY
# =====================================================
# Date: 2026-01-06
# Criticité: 🔴 HAUTE - SECRET EXPOSÉ DANS GIT PUBLIC
# Impact: Détournement de fonds possible
# Temps estimé: 10-15 minutes
# =====================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Red
Write-Host "🚨 RÉGÉNÉRATION SECRET DJOMY - URGENT 🚨" -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Red
Write-Host ""

Write-Host "⚠️  CONTEXTE:" -ForegroundColor Yellow
Write-Host "   Le secret Djomy a été exposé dans Git public pendant 1 mois."
Write-Host "   Tout attaquant peut accéder à votre système de paiement."
Write-Host ""

# Étape 1: Vérifier la connexion Supabase
Write-Host "📋 ÉTAPE 1: Vérification de la connexion Supabase..." -ForegroundColor Cyan
$supabaseStatus = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur: Supabase CLI non connecté" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Actions requises:" -ForegroundColor Yellow
    Write-Host "   1. Installer Supabase CLI si nécessaire: npm install -g supabase"
    Write-Host "   2. Se connecter: supabase login"
    Write-Host "   3. Lier le projet: supabase link --project-ref uakkxaibujzxdiqzpnpr"
    Write-Host ""
    exit 1
}
Write-Host "✅ Supabase CLI connecté" -ForegroundColor Green
Write-Host ""

# Étape 2: Instructions pour régénérer le secret
Write-Host "📋 ÉTAPE 2: Régénération du secret Djomy" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  ACTIONS MANUELLES REQUISES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ouvrir le dashboard Djomy:" -ForegroundColor White
Write-Host "   👉 https://djomy.com/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Se connecter avec vos identifiants PDG" -ForegroundColor White
Write-Host ""
Write-Host "3. Aller dans: Paramètres → API → Client Secret" -ForegroundColor White
Write-Host ""
Write-Host "4. Cliquer sur 'Régénérer le secret'" -ForegroundColor White
Write-Host ""
Write-Host "5. Copier le NOUVEAU secret généré" -ForegroundColor White
Write-Host ""

# Attendre la confirmation
$confirm = Read-Host "Avez-vous régénéré et copié le nouveau secret? (oui/non)"
if ($confirm -ne "oui") {
    Write-Host ""
    Write-Host "⚠️  Veuillez d'abord régénérer le secret sur Djomy" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

# Étape 3: Saisir le nouveau secret
Write-Host ""
Write-Host "📋 ÉTAPE 3: Configuration du nouveau secret" -ForegroundColor Cyan
Write-Host ""
$newSecret = Read-Host "Collez le NOUVEAU secret Djomy (invisible)" -AsSecureString
$newSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($newSecret))

if ([string]::IsNullOrWhiteSpace($newSecretPlain)) {
    Write-Host "❌ Le secret ne peut pas être vide" -ForegroundColor Red
    exit 1
}

# Validation basique
if ($newSecretPlain.Length -lt 20) {
    Write-Host "⚠️  Attention: Le secret semble trop court (< 20 caractères)" -ForegroundColor Yellow
    $continueAnyway = Read-Host "Continuer quand même? (oui/non)"
    if ($continueAnyway -ne "oui") {
        exit 0
    }
}

# Étape 4: Mise à jour dans Supabase
Write-Host ""
Write-Host "📋 ÉTAPE 4: Mise à jour dans Supabase..." -ForegroundColor Cyan
Write-Host "   Exécution: supabase secrets set JOMY_CLIENT_SECRET=..." -ForegroundColor Gray
Write-Host ""

try {
    $output = supabase secrets set "JOMY_CLIENT_SECRET=$newSecretPlain" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Échec de mise à jour du secret: $output"
    }
    Write-Host "✅ Secret mis à jour dans Supabase" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la mise à jour: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Correction manuelle:" -ForegroundColor Yellow
    Write-Host "   supabase secrets set JOMY_CLIENT_SECRET=`"VOTRE_NOUVEAU_SECRET`"" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Étape 5: Vérification
Write-Host ""
Write-Host "📋 ÉTAPE 5: Vérification de la configuration" -ForegroundColor Cyan
Write-Host ""

# Lister les secrets (sans afficher les valeurs)
Write-Host "Secrets Supabase actuels:" -ForegroundColor White
supabase secrets list | Select-String "JOMY"
Write-Host ""

# Étape 6: Instructions de test
Write-Host "=============================================" -ForegroundColor Green
Write-Host "✅ SECRET RÉGÉNÉRÉ AVEC SUCCÈS" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 ÉTAPES DE VÉRIFICATION:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Tester une transaction wallet dans l'application" -ForegroundColor White
Write-Host ""
Write-Host "2. Vérifier les logs Supabase:" -ForegroundColor White
Write-Host "   👉 https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Si vous voyez 'Client secret invalid':" -ForegroundColor White
Write-Host "   ✅ C'est NORMAL - cela prouve que l'ancien secret est invalidé" -ForegroundColor Green
Write-Host ""
Write-Host "4. La transaction devrait réussir avec le nouveau secret" -ForegroundColor White
Write-Host ""
Write-Host "5. Si erreur 403 Forbidden persiste:" -ForegroundColor White
Write-Host "   - Vérifier que le secret copié est complet" -ForegroundColor Gray
Write-Host "   - Revérifier sur le dashboard Djomy" -ForegroundColor Gray
Write-Host "   - Relancer ce script si nécessaire" -ForegroundColor Gray
Write-Host ""

# Étape 7: Invalider l'ancien secret Git
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "⚠️  IMPORTANT - SÉCURITÉ ADDITIONNELLE" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "L'ancien secret est toujours dans l'historique Git." -ForegroundColor Yellow
Write-Host ""
Write-Host "Actions recommandees:" -ForegroundColor White
Write-Host "1. Secret regenere (fait ci-dessus)" -ForegroundColor Green
Write-Host "2. Faire un commit pour documenter le changement" -ForegroundColor Cyan
Write-Host "3. Ajouter l ancien secret a .gitignore si pas deja fait" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: L historique Git contient toujours l ancien secret," -ForegroundColor Gray
Write-Host "      mais il est maintenant INVALIDE sur Djomy." -ForegroundColor Gray
Write-Host ""

Write-Host "=============================================" -ForegroundColor Green
Write-Host "PROCESSUS TERMINE" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
