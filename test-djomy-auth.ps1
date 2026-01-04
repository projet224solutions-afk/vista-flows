# Script de test de l'authentification Djomy
# Test des credentials et génération de token

Write-Host "🔐 TEST D'AUTHENTIFICATION DJOMY" -ForegroundColor Cyan
Write-Host "=" * 60
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
    Write-Host "    Cela causera une erreur 403 Forbidden!" -ForegroundColor Red
    Write-Host ""
    $continue = Read-Host "Continuer quand même? (o/N)"
    if ($continue -ne 'o') {
        exit 1
    }
}

# Choix de l'environnement
Write-Host "🌍 Choisir l'environnement:" -ForegroundColor Cyan
Write-Host "  1. Production (api.djomy.africa)"
Write-Host "  2. Sandbox (sandbox-api.djomy.africa)"
Write-Host ""
$envChoice = Read-Host "Votre choix (1 ou 2)"

$baseUrl = if ($envChoice -eq "2") {
    "https://sandbox-api.djomy.africa"
} else {
    "https://api.djomy.africa"
}

Write-Host "🔗 URL de base: $baseUrl" -ForegroundColor Green
Write-Host ""

# Étape 1: Génération de la signature HMAC-SHA256
Write-Host "🔑 ÉTAPE 1: Génération signature HMAC-SHA256" -ForegroundColor Cyan
Write-Host "-" * 60

try {
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($clientSecret)
    $signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($clientId))
    $signature = [BitConverter]::ToString($signatureBytes).Replace('-', '').ToLower()
    
    Write-Host "✅ Signature générée: $($signature.Substring(0, 20))..." -ForegroundColor Green
    Write-Host "   Longueur: $($signature.Length) caractères" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur lors de la génération de la signature: $_" -ForegroundColor Red
    exit 1
}

$xApiKey = "$clientId`:$signature"
Write-Host "✅ X-API-KEY: $($xApiKey.Substring(0, 40))..." -ForegroundColor Green
Write-Host ""

# Étape 2: Obtention du Bearer Token
Write-Host "🎫 ÉTAPE 2: Obtention du Bearer Token" -ForegroundColor Cyan
Write-Host "-" * 60

$authUrl = "$baseUrl/v1/auth"
Write-Host "📡 POST $authUrl" -ForegroundColor Yellow

$headers = @{
    "Content-Type" = "application/json"
    "Accept" = "application/json"
    "X-API-KEY" = $xApiKey
    "User-Agent" = "224Solutions/2.0 PowerShell-Test"
}

Write-Host "📋 Headers envoyés:" -ForegroundColor Gray
$headers.Keys | ForEach-Object {
    $value = $headers[$_]
    if ($_ -eq "X-API-KEY") {
        Write-Host "   $_: $($value.Substring(0, 40))..." -ForegroundColor Gray
    } else {
        Write-Host "   $_: $value" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "⏳ Envoi de la requête..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $authUrl -Method POST -Headers $headers -Body "{}" -ContentType "application/json" -UseBasicParsing
    
    Write-Host "✅ Réponse reçue: HTTP $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
    Write-Host ""
    
    $responseData = $response.Content | ConvertFrom-Json
    
    if ($responseData.access_token) {
        Write-Host "✅ Bearer Token obtenu avec succès!" -ForegroundColor Green
        Write-Host "   Token: $($responseData.access_token.Substring(0, 50))..." -ForegroundColor Gray
        Write-Host "   Type: $($responseData.token_type)" -ForegroundColor Gray
        Write-Host "   Expire dans: $($responseData.expires_in) secondes ($([Math]::Round($responseData.expires_in / 60)) minutes)" -ForegroundColor Gray
        Write-Host ""
        
        # Étape 3: Test d'un appel API avec le token
        Write-Host "🚀 ÉTAPE 3: Test d'appel API (optionnel)" -ForegroundColor Cyan
        Write-Host "-" * 60
        
        $testApi = Read-Host "Voulez-vous tester un appel API? (o/N)"
        
        if ($testApi -eq 'o') {
            Write-Host "📡 GET $baseUrl/v1/links?page=0&size=5" -ForegroundColor Yellow
            
            $apiHeaders = @{
                "Accept" = "application/json"
                "Authorization" = "Bearer $($responseData.access_token)"
                "X-API-KEY" = $xApiKey
                "User-Agent" = "224Solutions/2.0 PowerShell-Test"
            }
            
            try {
                $apiResponse = Invoke-WebRequest -Uri "$baseUrl/v1/links?page=0&size=5" -Method GET -Headers $apiHeaders -UseBasicParsing
                Write-Host "✅ Appel API réussi: HTTP $($apiResponse.StatusCode)" -ForegroundColor Green
                Write-Host ""
                Write-Host "📋 Réponse:" -ForegroundColor Gray
                Write-Host ($apiResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
            } catch {
                Write-Host "⚠️  Erreur lors de l'appel API: $($_.Exception.Message)" -ForegroundColor Yellow
                if ($_.Exception.Response) {
                    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                    $responseBody = $reader.ReadToEnd()
                    Write-Host "   Détails: $responseBody" -ForegroundColor Gray
                }
            }
        }
        
        Write-Host ""
        Write-Host "=" * 60
        Write-Host "✅ AUTHENTIFICATION RÉUSSIE!" -ForegroundColor Green
        Write-Host "=" * 60
        Write-Host ""
        Write-Host "Vous pouvez maintenant:" -ForegroundColor Cyan
        Write-Host "  1. Utiliser ce token pour vos appels API (valide 1h)"
        Write-Host "  2. Déployer l'edge function: supabase functions deploy djomy-init-payment"
        Write-Host "  3. Tester un paiement via l'interface POS"
        Write-Host ""
        
    } else {
        Write-Host "⚠️  Token non trouvé dans la réponse" -ForegroundColor Yellow
        Write-Host "Réponse complète:" -ForegroundColor Gray
        Write-Host $response.Content
    }
    
} catch {
    Write-Host "❌ ERREUR LORS DE L'AUTHENTIFICATION" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__) - $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Réponse du serveur:" -ForegroundColor Yellow
            Write-Host $responseBody -ForegroundColor Gray
        } catch {
            Write-Host "Impossible de lire la réponse du serveur" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "🔍 DIAGNOSTIC:" -ForegroundColor Cyan
    
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "  ❌ 403 Forbidden - Vérifiez:" -ForegroundColor Red
        Write-Host "     1. Format du Client ID: doit commencer par 'djomy-merchant-'" -ForegroundColor Yellow
        Write-Host "        Actuel: $clientId" -ForegroundColor Yellow
        Write-Host "     2. Validité du Client Secret" -ForegroundColor Yellow
        Write-Host "     3. Activation de votre compte marchand" -ForegroundColor Yellow
    }
    elseif ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "  ❌ 401 Unauthorized - Vérifiez:" -ForegroundColor Red
        Write-Host "     1. Client ID correct" -ForegroundColor Yellow
        Write-Host "     2. Client Secret correct" -ForegroundColor Yellow
        Write-Host "     3. Signature HMAC calculée correctement" -ForegroundColor Yellow
    }
    else {
        Write-Host "  ⚠️  Erreur inattendue. Contactez le support Djomy." -ForegroundColor Yellow
        Write-Host "     Email: support@djomy.africa" -ForegroundColor Gray
    }
    
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "📚 Documentation: https://developers.djomy.africa" -ForegroundColor Cyan
Write-Host "🔗 Espace marchand: https://merchant.djomy.africa" -ForegroundColor Cyan
Write-Host "📧 Support: support@djomy.africa" -ForegroundColor Cyan
Write-Host ""
