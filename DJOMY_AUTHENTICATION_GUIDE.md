# 🔐 GUIDE D'AUTHENTIFICATION DJOMY

**Documentation officielle** : https://developers.djomy.africa

---

## 📖 SYSTÈME D'AUTHENTIFICATION

Djomy utilise une authentification en 2 étapes basée sur HMAC-SHA256 et Bearer Token.

### 🔑 Étape 1: Génération de la signature HMAC

Pour chaque appel API, vous devez générer une signature HMAC-SHA256 :

```
signature = HMAC-SHA256(clientId, clientSecret)
```

**Format de l'en-tête X-API-KEY :**
```
X-API-KEY: clientId:signature
```

**Exemple :**
```
X-API-KEY: djomy-merchant-001:ab56b4d92b40713acc5af89985d4b786
```

### 🎫 Étape 2: Obtention du Bearer Token

Une fois la signature générée, obtenez un token d'accès :

**Endpoint :** `POST /v1/auth`

**Headers requis :**
```http
Content-Type: application/json
Accept: application/json
X-API-KEY: clientId:signature
```

**Body :**
```json
{}
```

**Réponse :**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 🚀 Étape 3: Utilisation pour tous les appels

Pour tous les appels API (paiements, liens, statuts), utilisez :

```http
Authorization: Bearer <access_token>
X-API-KEY: clientId:signature
```

---

## 💻 EXEMPLES DE CODE

### JavaScript/TypeScript (Deno - Edge Functions)

```typescript
// Génération signature HMAC-SHA256
async function generateHmacSignature(clientId: string, clientSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(clientSecret);
  const messageData = encoder.encode(clientId);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

// Obtenir Bearer token
async function getDjomyToken(clientId: string, clientSecret: string): Promise<string> {
  const hmacSignature = await generateHmacSignature(clientId, clientSecret);
  const xApiKey = `${clientId}:${hmacSignature}`;
  
  const response = await fetch('https://api.djomy.africa/v1/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-KEY': xApiKey,
    },
    body: JSON.stringify({}),
  });
  
  const data = await response.json();
  return data.access_token;
}

// Utilisation pour initier un paiement
async function initiatePayment(accessToken: string, clientId: string, clientSecret: string) {
  const hmacSignature = await generateHmacSignature(clientId, clientSecret);
  const xApiKey = `${clientId}:${hmacSignature}`;
  
  const response = await fetch('https://api.djomy.africa/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-API-KEY': xApiKey,
    },
    body: JSON.stringify({
      paymentMethod: 'OM',
      payerIdentifier: '00224623707722',
      amount: 10000,
      countryCode: 'GN',
      merchantPaymentReference: 'ORDER-12345',
      description: 'Paiement test'
    }),
  });
  
  return await response.json();
}
```

### PHP/Laravel

```php
function generateHmac($stringToSign, $clientSecret) {
    $hmacSignature = hash_hmac('sha256', $stringToSign, $clientSecret);
    return $hmacSignature;
}

function getDjomyToken($clientId, $clientSecret) {
    $signature = generateHmac($clientId, $clientSecret);
    $xApiKey = "$clientId:$signature";
    
    $response = Http::withHeaders([
        'X-API-KEY' => $xApiKey,
    ])->post('https://api.djomy.africa/v1/auth', []);
    
    return $response->json()['access_token'];
}
```

### Java

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

public class DjomyAuth {
    
    public static String generateHmac(String clientId, String clientSecret) throws Exception {
        Mac sha256Hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(
            clientSecret.getBytes(StandardCharsets.UTF_8), 
            "HmacSHA256"
        );
        sha256Hmac.init(secretKey);
        
        byte[] hashBytes = sha256Hmac.doFinal(clientId.getBytes(StandardCharsets.UTF_8));
        return bytesToHex(hashBytes);
    }
    
    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
```

---

## 🔒 SÉCURITÉ

### ⚠️ Points critiques

1. **Ne jamais exposer `clientSecret` côté client (frontend)**
   - Toujours appeler depuis votre backend/edge functions
   - Ne jamais inclure dans le code JavaScript du navigateur

2. **Cache du token**
   - Les tokens expirent après 1 heure
   - Implémentez un cache pour éviter des appels inutiles
   - Régénérez 5 minutes avant expiration

3. **Format des identifiants**
   - ✅ `djomy-merchant-XXXXX` (valide)
   - ❌ `djomy-client-XXXXX` (invalide - retourne 403)

4. **Vérification webhook**
   - Les webhooks sont signés avec le même mécanisme HMAC
   - Vérifiez toujours `X-Webhook-Signature` : `v1:signature`

---

## 🧪 ENVIRONNEMENTS

### Production
```
Base URL: https://api.djomy.africa
```

### Sandbox
```
Base URL: https://sandbox-api.djomy.africa
```

**Note :** Utilisez le même système d'authentification pour les deux environnements.

---

## 📊 ERREURS COURANTES

### 401 Unauthorized
```json
{
  "error": "Identifiants invalides"
}
```
**Cause :** ClientId ou ClientSecret incorrect, ou signature HMAC mal calculée.

### 403 Forbidden
```html
<html>
<head><title>403 Forbidden</title></head>
<body>
<center><h1>403 Forbidden</h1></center>
</body>
</html>
```
**Cause :** Identifiants avec format `djomy-client-*` au lieu de `djomy-merchant-*`.

### 429 Too Many Requests
```json
{
  "error": "Limite de taux dépassée"
}
```
**Cause :** Trop d'appels API. Implémentez un rate limiting côté client.

---

## 📚 ENDPOINTS DISPONIBLES

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/v1/auth` | POST | Obtenir Bearer token |
| `/v1/payments` | POST | Initier paiement (sans redirection) |
| `/v1/payments/gateway` | POST | Initier paiement (avec redirection) |
| `/v1/payments/{id}/status` | GET | Statut d'un paiement |
| `/v1/links` | POST | Créer lien de paiement |
| `/v1/links` | GET | Liste des liens |
| `/v1/links/{ref}` | GET | Détails d'un lien |

**Tous nécessitent :**
```http
Authorization: Bearer <token>
X-API-KEY: clientId:signature
```

---

## 🎯 IMPLÉMENTATION 224SOLUTIONS

Notre système utilise cette authentification dans :

1. **Edge Function** : `djomy-init-payment`
   - Génère signature HMAC
   - Obtient token Bearer (avec cache 1h)
   - Appelle `/v1/payments` avec les deux headers

2. **Cache automatique**
   - Token stocké en mémoire
   - Régénération 5 min avant expiration
   - Clé de cache : `{env}_{clientId}`

3. **Configuration**
   - Variables dans `supabase/.env`
   - Déploiement avec `supabase functions deploy`

---

## 🔗 RESSOURCES

- **Documentation** : https://developers.djomy.africa
- **Espace marchand** : https://merchant.djomy.africa
- **Support** : support@djomy.africa
- **Status API** : https://status.djomy.africa (si disponible)

---

## ✅ CHECKLIST INTÉGRATION

- [ ] Compte marchand créé sur merchant.djomy.africa
- [ ] KYC validé
- [ ] Credentials obtenus (djomy-merchant-*)
- [ ] Credentials configurés dans supabase/.env
- [ ] Edge function déployée
- [ ] Test sur sandbox réussi
- [ ] Test paiement 100 GNF production
- [ ] Webhook configuré et testé
- [ ] Signature webhook vérifiée
- [ ] Gestion erreurs implémentée
- [ ] Logs API activés

---

**Dernière mise à jour** : 4 janvier 2026 (après lecture de la doc officielle)
