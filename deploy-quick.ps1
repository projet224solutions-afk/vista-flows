# 🚀 DÉPLOIEMENT RAPIDE - CORRECTIONS WALLET TRANSFER
# Exécutez ces commandes dans l'ordre

Write-Host "🔐 CORRECTIONS SÉCURITÉ WALLET TRANSFER" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier l'emplacement
if (-not (Test-Path "supabase\functions\wallet-transfer\index.ts")) {
    Write-Host "❌ Erreur: Exécutez depuis d:\224Solutions\vista-flows" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Répertoire correct" -ForegroundColor Green
Write-Host ""

# Demander le token
Write-Host "🔑 Obtenez votre token Supabase:" -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/account/tokens" -ForegroundColor Gray
Write-Host ""
$token = Read-Host "Entrez votre token (sbp_...)"

if ([string]::IsNullOrEmpty($token)) {
    Write-Host "❌ Token requis" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Démarrage du déploiement..." -ForegroundColor Cyan
Write-Host ""

# Exécuter le script principal
.\deploy-wallet-security-fixes.ps1 -Token $token -Verify

Write-Host ""
Write-Host "✅ DÉPLOIEMENT TERMINÉ" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Tester dans l'app (localhost)" -ForegroundColor Gray
Write-Host "   2. Vérifier logs Edge Functions" -ForegroundColor Gray
Write-Host "   3. Surveiller erreurs 24-48h" -ForegroundColor Gray
Write-Host ""
Write-Host "📄 Documentation complète:" -ForegroundColor Cyan
Write-Host "   - RAPPORT_CORRECTIONS_WALLET_TRANSFER.md" -ForegroundColor Gray
Write-Host "   - RECAPITULATIF_CORRECTIONS_WALLET.md" -ForegroundColor Gray
Write-Host ""
