# 🔥 Script SIMPLIFIÉ - Ajout secrets Firebase dans Supabase Vault
# Ce script copie automatiquement les commandes dans votre presse-papiers

Write-Host "`n🔥 AJOUT SECRETS FIREBASE - VERSION SIMPLE" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Demander les 7 valeurs
Write-Host "Entrez les 7 valeurs Firebase:" -ForegroundColor Yellow
Write-Host "(Obtenez-les depuis https://console.firebase.google.com/)" -ForegroundColor Gray
Write-Host ""

$api = Read-Host "1. API Key (AIza...)"
$domain = Read-Host "2. Auth Domain (projet.firebaseapp.com)"
$project = Read-Host "3. Project ID"
$bucket = Read-Host "4. Storage Bucket (projet.appspot.com)"
$sender = Read-Host "5. Messaging Sender ID (nombre)"
$app = Read-Host "6. App ID (1:...:web:...)"
$vapid = Read-Host "7. VAPID Key (pour push)"

# Générer les commandes
$commands = @"

═══════════════════════════════════════════════════════
🔥 COMMANDES SUPABASE CLI - COPIER/COLLER
═══════════════════════════════════════════════════════

supabase secrets set FIREBASE_API_KEY="$api"
supabase secrets set FIREBASE_AUTH_DOMAIN="$domain"
supabase secrets set FIREBASE_PROJECT_ID="$project"
supabase secrets set FIREBASE_STORAGE_BUCKET="$bucket"
supabase secrets set FIREBASE_MESSAGING_SENDER_ID="$sender"
supabase secrets set FIREBASE_APP_ID="$app"
supabase secrets set FIREBASE_VAPID_KEY="$vapid"

═══════════════════════════════════════════════════════
✅ VÉRIFICATION:
═══════════════════════════════════════════════════════

supabase secrets list | Select-String "FIREBASE"

═══════════════════════════════════════════════════════
"@

Write-Host $commands
$commands | Out-File -FilePath "firebase-secrets-commands.txt" -Encoding UTF8

Write-Host ""
Write-Host "✅ Commandes sauvegardées dans: firebase-secrets-commands.txt" -ForegroundColor Green
Write-Host ""
Write-Host "📋 INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "1. Installez Supabase CLI si nécessaire:" -ForegroundColor White
Write-Host "   npm install -g supabase" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Connectez-vous à votre projet:" -ForegroundColor White
Write-Host "   supabase link --project-ref uakkxaibujzxdiqzpnpr" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Copiez-collez les 7 commandes ci-dessus (ou depuis le fichier .txt)" -ForegroundColor White
Write-Host ""
Write-Host "4. Vérifiez avec:" -ForegroundColor White
Write-Host "   supabase secrets list" -ForegroundColor Gray
Write-Host ""

# Tenter de copier dans le presse-papiers
try {
    $commands | Set-Clipboard
    Write-Host "✅ Commandes copiées dans le presse-papiers!" -ForegroundColor Green
    Write-Host "   Vous pouvez les coller directement dans votre terminal" -ForegroundColor Gray
}
catch {
    Write-Host "⚠️  Impossible de copier automatiquement" -ForegroundColor Yellow
    Write-Host "   Copiez manuellement depuis: firebase-secrets-commands.txt" -ForegroundColor Gray
}

Write-Host ""
