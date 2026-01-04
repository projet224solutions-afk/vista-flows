# Script de test de l'authentification Djomy
# Test des credentials et génération de token

Write-Host "`n🔐 TEST D'AUTHENTIFICATION DJOMY" -ForegroundColor Cyan
Write-Host ("=" * 60)
Write-Host ""

# Charger les credentials depuis supabase/.env
$envPath = ".\supabase\.env"

if (-Not (Test-Path $envPath)) {
    Write-Host "❌ Fichier supabase/.env introuvable!" -ForegroundColor Red
    Write-Host "Créez le fichier avec vos credentials Djomy." -ForegroundColor Yellow
    exit 1
}

Write-Host "📄 Chargement des credentials depuis $envPath..." -ForegroundColor Yellow

$clientId = $null
$clientSecret = $null

Get-Content $envPath | ForEach-Object {
    if ($_ -match '^DJOMY_CLIENT_ID=(.+)$') {
        $clientId = $matches[1].Trim('"')
    }
    if ($_ -match '^DJOMY_CLIENT_SECRET=(.+)$') {
        $clientSecret = $matches[1].Trim('"')
    }
}

if (-Not $clientId -or -Not $clientSecret) {
    Write-Host "❌ Credentials Djomy non trouvés dans $envPath" -ForegroundColor Red
    Write-Host "Vérifiez que DJOMY_CLIENT_ID et DJOMY_CLIENT_SECRET sont définis." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Client ID: $clientId" -ForegroundColor Green
Write-Host "✅ Client Secret: $($clientSecret.Substring(0, 10))..." -ForegroundColor Green
Write-Host ""

# Vérifier le format du Client ID
if ($clientId -notmatch '^djomy-merchant-') {
    Write-Host "⚠️  ATTENTION: Le Client ID ne commence pas par 'djomy-merchant-'" -ForegroundColor Yellow
    Write-Host "    Format actuel: $clientId" -ForegroundColor Yellow
    Write-Host "    Format attendu: djomy-merchant-XXXXX" -ForegroundColor Yellow
    Write-Host "    Cela causera probablement une erreur 403 Forbidden!" -ForegroundColor Red
    Write-Host ""
}

# Choix de l'environnement
Write-Host "🌍 Environnement:" -ForegroundColor Cyan
Write-Host "  Utilisation de Production (api.djomy.africa)"
Write-Host ""

$baseUrl = "https://api.djomy.africa"
Write-Host "🔗 URL de base: $baseUrl" -ForegroundColor Green
Write-Host ""

# Étape 1: Génération de la signature HMAC-SHA256
Write-Host "🔑 ÉTAPE 1: Génération signature HMAC-SHA256" -ForegroundColor Cyan
Write-Host ("-" * 60)

try {
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($clientSecret)
    $signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($clientId))
    $signature = [BitConverter]::ToString($signatureBytes).Replace('-', '').ToLower()
    
    Write-Host "✅ Signature générée: $($signature.Substring(0, 20))..." -ForegroundColor Green
    Write-Host "   Longueur: $($signature.Length) caractères" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Erreur lors de la génération de la signature: $_" -ForegroundColor Red
    exit 1
}

$xApiKey = "${clientId}:${signature}"
Write-Host "✅ X-API-KEY: $($xApiKey.Substring(0, 40))..." -ForegroundColor Green
Write-Host ""

# Étape 2: Obtention du Bearer Token
Write-Host "🎫 ÉTAPE 2: Obtention du Bearer Token" -ForegroundColor Cyan
Write-Host ("-" * 60)

$authUrl = "$baseUrl/v1/auth"
Write-Host "📡 POST $authUrl" -ForegroundColor Yellow

$headers = @{
    "Content-Type"  = "application/json"
    "Accept"        = "application/json"
    "X-API-KEY"     = $xApiKey
    "User-Agent"    = "224Solutions/2.0 PowerShell-Test"
}

Write-Host "📋 Headers envoyés:" -ForegroundColor Gray
foreach ($key in $headers.Keys) {
    $value = $headers[$key]
    if ($key -eq "X-API-KEY") {
        Write-Host "   ${key}: $($value.Substring(0, 40))..." -ForegroundColor Gray
    }
    else {
        Write-Host "   ${key}: $value" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "⏳ Envoi de la requête..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $authUrl -Method POST -Headers $headers -Body "{}" -ContentType "application/json" -UseBasicParsing
    
    Write-Host "✅ Réponse reçue: HTTP $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
    Write-Host ""
    
    $responseData = $response.Content | ConvertFrom-Json
    
    if ($responseData.access_token) {
        Write-Host "✅ BEARER TOKEN OBTENU AVEC SUCCÈS!" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Token: $($responseData.access_token.Substring(0, 50))..." -ForegroundColor Gray
        if ($responseData.token_type) {
            Write-Host "   Type: $($responseData.token_type)" -ForegroundColor Gray
        }
        if ($responseData.expires_in) {
            $minutes = [Math]::Round($responseData.expires_in / 60)
            Write-Host "   Expire dans: $($responseData.expires_in) secondes ($minutes minutes)" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host ("=" * 60)
        Write-Host "✅ AUTHENTIFICATION RÉUSSIE!" -ForegroundColor Green
        Write-Host ("=" * 60)
        Write-Host ""
        Write-Host "Prochaines étapes:" -ForegroundColor Cyan
        Write-Host "  1. Les credentials sont valides ✓" -ForegroundColor Green
        Write-Host "  2. Déployer l'edge function: supabase functions deploy djomy-init-payment" -ForegroundColor Yellow
        Write-Host "  3. Tester un paiement via l'interface POS" -ForegroundColor Yellow
        Write-Host ""
    }
    else {
        Write-Host "⚠️  Token non trouvé dans la réponse" -ForegroundColor Yellow
        Write-Host "Réponse complète:" -ForegroundColor Gray
        Write-Host $response.Content
    }
}
catch {
    Write-Host "❌ ERREUR LORS DE L'AUTHENTIFICATION" -ForegroundColor Red
    Write-Host ""
    
    $statusCode = 0
    $statusDesc = "N/A"
    
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $statusDesc = $_.Exception.Response.StatusDescription
        
        Write-Host "Status HTTP: $statusCode - $statusDesc" -ForegroundColor Red
    }
    
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Réponse du serveur:" -ForegroundColor Yellow
            Write-Host $responseBody -ForegroundColor Gray
            Write-Host ""
        }
        catch {
            Write-Host "Impossible de lire la réponse du serveur" -ForegroundColor Gray
            Write-Host ""
        }
    }
    
    Write-Host "🔍 DIAGNOSTIC:" -ForegroundColor Cyan
    Write-Host ""
    
    if ($statusCode -eq 403) {
        Write-Host "  ❌ 403 Forbidden - Causes possibles:" -ForegroundColor Red
        Write-Host "     1. Format du Client ID incorrect" -ForegroundColor Yellow
        Write-Host "        Requis: djomy-merchant-XXXXX" -ForegroundColor Yellow
        Write-Host "        Actuel: $clientId" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "     2. Client Secret invalide ou expiré" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "     3. Compte marchand non activé ou suspendu" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  📧 Contactez le support Djomy:" -ForegroundColor Cyan
        Write-Host "     Email: support@djomy.africa" -ForegroundColor Gray
        Write-Host "     Objet: Activation compte marchand 224Solutions" -ForegroundColor Gray
    }
    elseif ($statusCode -eq 401) {
        Write-Host "  ❌ 401 Unauthorized - Vérifiez:" -ForegroundColor Red
        Write-Host "     1. Client ID correct" -ForegroundColor Yellow
        Write-Host "     2. Client Secret correct" -ForegroundColor Yellow
        Write-Host "     3. Signature HMAC calculée correctement" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Signature générée: $($signature.Substring(0, 20))..." -ForegroundColor Gray
        Write-Host "  X-API-KEY: $($xApiKey.Substring(0, 40))..." -ForegroundColor Gray
    }
    else {
        Write-Host "  ⚠️  Erreur $statusCode inattendue" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Vérifiez:" -ForegroundColor Cyan
        Write-Host "     - Connexion internet active" -ForegroundColor Gray
        Write-Host "     - URL accessible: $baseUrl" -ForegroundColor Gray
        Write-Host "     - Pas de firewall/proxy bloquant" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Contactez le support si le problème persiste:" -ForegroundColor Yellow
        Write-Host "     Email: support@djomy.africa" -ForegroundColor Gray
    }
    
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "📚 Ressources:" -ForegroundColor Cyan
Write-Host "   Documentation: https://developers.djomy.africa" -ForegroundColor Gray
Write-Host "   Espace marchand: https://merchant.djomy.africa" -ForegroundColor Gray
Write-Host "   Support: support@djomy.africa" -ForegroundColor Gray
Write-Host ""
