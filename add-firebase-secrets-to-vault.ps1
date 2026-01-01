# 🔥 Script d'ajout automatique des secrets Firebase dans Supabase Vault
# 224Solutions - 1er Janvier 2026

Write-Host "`n🔥 AJOUT AUTOMATIQUE DES SECRETS FIREBASE" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Configuration Supabase
$SUPABASE_PROJECT_REF = "uakkxaibujzxdiqzpnpr"
$SUPABASE_PROJECT_URL = "https://uakkxaibujzxdiqzpnpr.supabase.co"

# Demander le Service Role Key (nécessaire pour l'API Vault)
Write-Host "📋 Étape 1: Authentification" -ForegroundColor Yellow
Write-Host "Pour ajouter des secrets, nous avons besoin de votre Service Role Key" -ForegroundColor Gray
Write-Host "Trouvez-la ici: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/settings/api" -ForegroundColor Gray
Write-Host ""
$SUPABASE_SERVICE_KEY = Read-Host "Entrez votre Service Role Key (commence par 'eyJ...')"

if (-not $SUPABASE_SERVICE_KEY -or $SUPABASE_SERVICE_KEY.Length -lt 50) {
    Write-Host "❌ Service Role Key invalide ou vide" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Service Role Key validée" -ForegroundColor Green
Write-Host ""

# Demander les 7 secrets Firebase
Write-Host "📋 Étape 2: Secrets Firebase" -ForegroundColor Yellow
Write-Host "Obtenez ces valeurs depuis Firebase Console:" -ForegroundColor Gray
Write-Host "  → https://console.firebase.google.com/" -ForegroundColor Gray
Write-Host "  → Paramètres du projet > Applications Web" -ForegroundColor Gray
Write-Host ""

# 1. Firebase API Key
Write-Host "1️⃣  FIREBASE_API_KEY" -ForegroundColor Cyan
Write-Host "    (ex: AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX)" -ForegroundColor Gray
$FIREBASE_API_KEY = Read-Host "    Valeur"
Write-Host ""

# 2. Firebase Auth Domain
Write-Host "2️⃣  FIREBASE_AUTH_DOMAIN" -ForegroundColor Cyan
Write-Host "    (ex: votre-projet.firebaseapp.com)" -ForegroundColor Gray
$FIREBASE_AUTH_DOMAIN = Read-Host "    Valeur"
Write-Host ""

# 3. Firebase Project ID
Write-Host "3️⃣  FIREBASE_PROJECT_ID" -ForegroundColor Cyan
Write-Host "    (ex: votre-projet-id)" -ForegroundColor Gray
$FIREBASE_PROJECT_ID = Read-Host "    Valeur"
Write-Host ""

# 4. Firebase Storage Bucket
Write-Host "4️⃣  FIREBASE_STORAGE_BUCKET" -ForegroundColor Cyan
Write-Host "    (ex: votre-projet.appspot.com)" -ForegroundColor Gray
$FIREBASE_STORAGE_BUCKET = Read-Host "    Valeur"
Write-Host ""

# 5. Firebase Messaging Sender ID
Write-Host "5️⃣  FIREBASE_MESSAGING_SENDER_ID" -ForegroundColor Cyan
Write-Host "    (ex: 123456789012)" -ForegroundColor Gray
$FIREBASE_MESSAGING_SENDER_ID = Read-Host "    Valeur"
Write-Host ""

# 6. Firebase App ID
Write-Host "6️⃣  FIREBASE_APP_ID" -ForegroundColor Cyan
Write-Host "    (ex: 1:123456789012:web:abcdef123456)" -ForegroundColor Gray
$FIREBASE_APP_ID = Read-Host "    Valeur"
Write-Host ""

# 7. Firebase VAPID Key (pour push notifications)
Write-Host "7️⃣  FIREBASE_VAPID_KEY" -ForegroundColor Cyan
Write-Host "    (Web Push certificates - Cloud Messaging settings)" -ForegroundColor Gray
Write-Host "    Génération: Firebase Console > Cloud Messaging > Web Push certificates" -ForegroundColor Gray
$FIREBASE_VAPID_KEY = Read-Host "    Valeur"
Write-Host ""

# Validation des secrets
Write-Host "📋 Étape 3: Validation" -ForegroundColor Yellow
$secrets_valid = $true

if (-not $FIREBASE_API_KEY) { Write-Host "❌ FIREBASE_API_KEY manquant" -ForegroundColor Red; $secrets_valid = $false }
if (-not $FIREBASE_AUTH_DOMAIN) { Write-Host "❌ FIREBASE_AUTH_DOMAIN manquant" -ForegroundColor Red; $secrets_valid = $false }
if (-not $FIREBASE_PROJECT_ID) { Write-Host "❌ FIREBASE_PROJECT_ID manquant" -ForegroundColor Red; $secrets_valid = $false }
if (-not $FIREBASE_STORAGE_BUCKET) { Write-Host "❌ FIREBASE_STORAGE_BUCKET manquant" -ForegroundColor Red; $secrets_valid = $false }
if (-not $FIREBASE_MESSAGING_SENDER_ID) { Write-Host "❌ FIREBASE_MESSAGING_SENDER_ID manquant" -ForegroundColor Red; $secrets_valid = $false }
if (-not $FIREBASE_APP_ID) { Write-Host "❌ FIREBASE_APP_ID manquant" -ForegroundColor Red; $secrets_valid = $false }

if (-not $secrets_valid) {
    Write-Host ""
    Write-Host "❌ Certains secrets sont manquants. Veuillez réessayer." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Tous les secrets sont remplis" -ForegroundColor Green
Write-Host ""

# Confirmation avant ajout
Write-Host "📋 Étape 4: Confirmation" -ForegroundColor Yellow
Write-Host "Les 7 secrets suivants seront ajoutés dans Supabase Vault:" -ForegroundColor White
Write-Host "  1. FIREBASE_API_KEY" -ForegroundColor Gray
Write-Host "  2. FIREBASE_AUTH_DOMAIN" -ForegroundColor Gray
Write-Host "  3. FIREBASE_PROJECT_ID" -ForegroundColor Gray
Write-Host "  4. FIREBASE_STORAGE_BUCKET" -ForegroundColor Gray
Write-Host "  5. FIREBASE_MESSAGING_SENDER_ID" -ForegroundColor Gray
Write-Host "  6. FIREBASE_APP_ID" -ForegroundColor Gray
Write-Host "  7. FIREBASE_VAPID_KEY" -ForegroundColor Gray
Write-Host ""
$confirmation = Read-Host "Continuer? (oui/non)"

if ($confirmation -ne "oui") {
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "📋 Étape 5: Ajout dans Supabase Vault" -ForegroundColor Yellow

# Headers pour l'API Supabase
$headers = @{
    "Authorization" = "Bearer $SUPABASE_SERVICE_KEY"
    "apikey" = $SUPABASE_SERVICE_KEY
    "Content-Type" = "application/json"
}

# URL de l'API Vault (Management API)
$vaultApiUrl = "$SUPABASE_PROJECT_URL/rest/v1/vault"

# Fonction pour ajouter un secret
function Add-SupabaseSecret {
    param (
        [string]$Name,
        [string]$Value,
        [int]$Number
    )
    
    Write-Host "  $Number/7 Ajout de $Name..." -NoNewline -ForegroundColor Cyan
    
    try {
        # Note: L'API Vault Supabase nécessite la CLI ou le Dashboard
        # Cette approche utilise une edge function personnalisée si disponible
        # Sinon, afficher les instructions manuelles
        
        Write-Host " ⚠️  Ajout manuel requis" -ForegroundColor Yellow
        return $false
    }
    catch {
        Write-Host " ❌ Erreur: $_" -ForegroundColor Red
        return $false
    }
}

# Tentative d'ajout automatique
Write-Host ""
Write-Host "⚠️  NOTE IMPORTANTE:" -ForegroundColor Yellow
Write-Host "L'API Supabase Vault n'est pas accessible directement via REST API." -ForegroundColor Gray
Write-Host "Nous allons créer un fichier SQL que vous pourrez exécuter dans le SQL Editor." -ForegroundColor Gray
Write-Host ""

# Créer un fichier SQL pour l'insertion
$sqlContent = @"
-- 🔥 Secrets Firebase pour Supabase Vault
-- Généré automatiquement le $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- Projet: $SUPABASE_PROJECT_REF

-- Supprimer les anciens secrets s'ils existent (optionnel)
-- DELETE FROM vault.secrets WHERE name LIKE 'FIREBASE_%';

-- Insérer les 7 secrets Firebase
INSERT INTO vault.secrets (name, secret)
VALUES
  ('FIREBASE_API_KEY', '$FIREBASE_API_KEY'),
  ('FIREBASE_AUTH_DOMAIN', '$FIREBASE_AUTH_DOMAIN'),
  ('FIREBASE_PROJECT_ID', '$FIREBASE_PROJECT_ID'),
  ('FIREBASE_STORAGE_BUCKET', '$FIREBASE_STORAGE_BUCKET'),
  ('FIREBASE_MESSAGING_SENDER_ID', '$FIREBASE_MESSAGING_SENDER_ID'),
  ('FIREBASE_APP_ID', '$FIREBASE_APP_ID'),
  ('FIREBASE_VAPID_KEY', '$FIREBASE_VAPID_KEY')
ON CONFLICT (name) 
DO UPDATE SET 
  secret = EXCLUDED.secret,
  updated_at = NOW();

-- Vérification
SELECT name, created_at, updated_at 
FROM vault.secrets 
WHERE name LIKE 'FIREBASE_%'
ORDER BY name;
"@

$sqlFile = "firebase-secrets-vault.sql"
$sqlContent | Out-File -FilePath $sqlFile -Encoding UTF8

Write-Host "✅ Fichier SQL créé: $sqlFile" -ForegroundColor Green
Write-Host ""

# Instructions finales
Write-Host "📋 Étape 6: Exécution manuelle" -ForegroundColor Yellow
Write-Host ""
Write-Host "Méthode 1: Via Supabase Dashboard (RECOMMANDÉ)" -ForegroundColor Cyan
Write-Host "────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "1. Ouvrez: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/settings/vault" -ForegroundColor White
Write-Host "2. Pour chaque secret, cliquez 'New secret':" -ForegroundColor White
Write-Host ""
Write-Host "   Secret 1:" -ForegroundColor Gray
Write-Host "   Name:  FIREBASE_API_KEY" -ForegroundColor White
Write-Host "   Value: $FIREBASE_API_KEY" -ForegroundColor White
Write-Host ""
Write-Host "   Secret 2:" -ForegroundColor Gray
Write-Host "   Name:  FIREBASE_AUTH_DOMAIN" -ForegroundColor White
Write-Host "   Value: $FIREBASE_AUTH_DOMAIN" -ForegroundColor White
Write-Host ""
Write-Host "   Secret 3:" -ForegroundColor Gray
Write-Host "   Name:  FIREBASE_PROJECT_ID" -ForegroundColor White
Write-Host "   Value: $FIREBASE_PROJECT_ID" -ForegroundColor White
Write-Host ""
Write-Host "   Secret 4:" -ForegroundColor Gray
Write-Host "   Name:  FIREBASE_STORAGE_BUCKET" -ForegroundColor White
Write-Host "   Value: $FIREBASE_STORAGE_BUCKET" -ForegroundColor White
Write-Host ""
Write-Host "   Secret 5:" -ForegroundColor Gray
Write-Host "   Name:  FIREBASE_MESSAGING_SENDER_ID" -ForegroundColor White
Write-Host "   Value: $FIREBASE_MESSAGING_SENDER_ID" -ForegroundColor White
Write-Host ""
Write-Host "   Secret 6:" -ForegroundColor Gray
Write-Host "   Name:  FIREBASE_APP_ID" -ForegroundColor White
Write-Host "   Value: $FIREBASE_APP_ID" -ForegroundColor White
Write-Host ""
Write-Host "   Secret 7:" -ForegroundColor Gray
Write-Host "   Name:  FIREBASE_VAPID_KEY" -ForegroundColor White
Write-Host "   Value: $FIREBASE_VAPID_KEY" -ForegroundColor White
Write-Host ""
Write-Host ""

Write-Host "Méthode 2: Via Supabase CLI" -ForegroundColor Cyan
Write-Host "────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "supabase secrets set FIREBASE_API_KEY='$FIREBASE_API_KEY'" -ForegroundColor White
Write-Host "supabase secrets set FIREBASE_AUTH_DOMAIN='$FIREBASE_AUTH_DOMAIN'" -ForegroundColor White
Write-Host "supabase secrets set FIREBASE_PROJECT_ID='$FIREBASE_PROJECT_ID'" -ForegroundColor White
Write-Host "supabase secrets set FIREBASE_STORAGE_BUCKET='$FIREBASE_STORAGE_BUCKET'" -ForegroundColor White
Write-Host "supabase secrets set FIREBASE_MESSAGING_SENDER_ID='$FIREBASE_MESSAGING_SENDER_ID'" -ForegroundColor White
Write-Host "supabase secrets set FIREBASE_APP_ID='$FIREBASE_APP_ID'" -ForegroundColor White
Write-Host "supabase secrets set FIREBASE_VAPID_KEY='$FIREBASE_VAPID_KEY'" -ForegroundColor White
Write-Host ""

Write-Host "📝 Les commandes ont été sauvegardées dans:" -ForegroundColor Green
Write-Host "   → $sqlFile (fichier SQL)" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Script terminé!" -ForegroundColor Green
Write-Host "   Après ajout des secrets, redémarrez les Edge Functions:" -ForegroundColor Gray
Write-Host "   Dashboard > Edge Functions > Restart All" -ForegroundColor Gray
Write-Host ""
