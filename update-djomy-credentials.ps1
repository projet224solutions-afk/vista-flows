# =====================================================
# SCRIPT RAPIDE: METTRE À JOUR LES CREDENTIALS DJOMY
# =====================================================

Write-Host "🔐 MISE À JOUR CREDENTIALS DJOMY" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que le fichier supabase/.env existe
if (-not (Test-Path "supabase\.env")) {
    Write-Host "❌ Fichier supabase\.env introuvable!" -ForegroundColor Red
    Write-Host "Créez-le d'abord avec configure-djomy-secrets.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Credentials actuels dans supabase\.env:" -ForegroundColor Yellow
Get-Content "supabase\.env" | Select-String "DJOMY_CLIENT"
Write-Host ""

Write-Host "💡 OPTION 1: Modifier manuellement supabase\.env" -ForegroundColor Cyan
Write-Host "   Ouvrez: supabase\.env" -ForegroundColor White
Write-Host "   Remplacez DJOMY_CLIENT_ID et DJOMY_CLIENT_SECRET" -ForegroundColor White
Write-Host ""

Write-Host "💡 OPTION 2: Entrer les nouvelles valeurs maintenant" -ForegroundColor Cyan
$update = Read-Host "Voulez-vous mettre à jour maintenant? (o/n)"

if ($update -eq "o" -or $update -eq "O") {
    Write-Host ""
    $newClientId = Read-Host "Nouveau DJOMY_CLIENT_ID (format: djomy-merchant-XXXXX)"
    
    if ($newClientId -notmatch "^djomy-merchant-") {
        Write-Host "⚠️  ATTENTION: Format invalide! Devrait commencer par 'djomy-merchant-'" -ForegroundColor Yellow
        $confirm = Read-Host "Continuer quand même? (o/n)"
        if ($confirm -ne "o" -and $confirm -ne "O") {
            Write-Host "❌ Annulé" -ForegroundColor Red
            exit 0
        }
    }
    
    $newClientSecret = Read-Host "Nouveau DJOMY_CLIENT_SECRET" -AsSecureString
    $newClientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($newClientSecret)
    )
    
    # Mettre à jour le fichier
    $content = Get-Content "supabase\.env"
    $content = $content -replace "DJOMY_CLIENT_ID=.*", "DJOMY_CLIENT_ID=$newClientId"
    $content = $content -replace "DJOMY_CLIENT_SECRET=.*", "DJOMY_CLIENT_SECRET=$newClientSecretPlain"
    $content | Set-Content "supabase\.env"
    
    Write-Host ""
    Write-Host "✅ Credentials mis à jour dans supabase\.env" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Vérifiez les credentials dans supabase\.env" -ForegroundColor White
Write-Host ""
Write-Host "2. Déployez la fonction (les credentials seront uploadés):" -ForegroundColor White
Write-Host "   supabase functions deploy djomy-init-payment" -ForegroundColor Green
Write-Host ""
Write-Host "3. Testez un paiement de 100 GNF" -ForegroundColor White
Write-Host ""
Write-Host "4. Vérifiez les logs:" -ForegroundColor White
Write-Host "   supabase functions logs djomy-init-payment" -ForegroundColor Green
Write-Host ""
