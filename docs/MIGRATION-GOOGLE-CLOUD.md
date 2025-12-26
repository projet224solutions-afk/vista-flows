# 🚀 Guide de Migration vers Google Cloud

Ce guide explique comment sécuriser vos clés API avec **Google Secret Manager** et migrer vos fichiers lourds vers **Google Cloud Storage**.

---

## 📋 Prérequis

- Un compte Google Cloud avec facturation activée
- `gcloud` CLI installé ([Installation](https://cloud.google.com/sdk/docs/install))
- Votre ID de projet Google Cloud

---

## Phase 1: Configuration Google Cloud Console

### 1.1 Connexion et configuration initiale

```bash
# Se connecter à Google Cloud
gcloud auth login

# Définir votre projet
gcloud config set project VOTRE_PROJECT_ID

# Vérifier la configuration
gcloud config list
```

### 1.2 Activer les APIs nécessaires

```bash
# Activer toutes les APIs requises
gcloud services enable \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  geocoding-backend.googleapis.com \
  directions-backend.googleapis.com \
  maps-backend.googleapis.com \
  pubsub.googleapis.com
```

---

## Phase 2: Configuration de Secret Manager

### 2.1 Créer les secrets

```bash
# Créer le secret pour l'API Google Cloud
echo -n "VOTRE_CLE_API_GOOGLE_CLOUD" | \
  gcloud secrets create google-cloud-api-key \
  --replication-policy="automatic" \
  --data-file=-

# Créer le secret pour Maps
echo -n "VOTRE_CLE_API_MAPS" | \
  gcloud secrets create google-maps-api-key \
  --replication-policy="automatic" \
  --data-file=-
```

### 2.2 Vérifier les secrets créés

```bash
gcloud secrets list
```

### 2.3 Configurer les permissions IAM

```bash
# Remplacez par votre email de compte de service
SERVICE_ACCOUNT="votre-sa@VOTRE_PROJECT_ID.iam.gserviceaccount.com"

# Donner accès aux secrets
gcloud secrets add-iam-policy-binding google-cloud-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding google-maps-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Phase 3: Configuration de Cloud Storage

### 3.1 Créer le bucket

```bash
# Créer le bucket (choisissez une région proche de vos utilisateurs)
gcloud storage buckets create gs://224solutions-media \
  --location=europe-west1 \
  --uniform-bucket-level-access \
  --public-access-prevention
```

### 3.2 Configurer CORS

Créez un fichier `cors.json`:

```json
[
  {
    "origin": [
      "https://votre-domaine.com",
      "https://*.lovable.app",
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    "method": ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "X-Requested-With"
    ],
    "maxAgeSeconds": 3600
  }
]
```

Appliquez la configuration:

```bash
gcloud storage buckets update gs://224solutions-media --cors-file=cors.json
```

### 3.3 Configurer le cycle de vie (optionnel)

Créez un fichier `lifecycle.json`:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 1,
          "matchesPrefix": ["temp/"]
        }
      }
    ]
  }
}
```

Appliquez:

```bash
gcloud storage buckets update gs://224solutions-media --lifecycle-file=lifecycle.json
```

### 3.4 Permissions du compte de service pour Storage

```bash
# Donner accès au bucket
gcloud storage buckets add-iam-policy-binding gs://224solutions-media \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"
```

---

## Phase 4: Restrictions de sécurité des clés API

### 4.1 Créer une clé API restreinte pour Maps (Frontend)

1. Allez dans [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Cliquez sur **Create Credentials** > **API Key**
3. Cliquez sur la nouvelle clé pour la configurer
4. **Restrictions d'application**: 
   - Choisissez **HTTP referrers**
   - Ajoutez vos domaines:
     - `https://votre-domaine.com/*`
     - `https://*.lovable.app/*`
     - `http://localhost:*/*`
5. **Restrictions d'API**:
   - Sélectionnez **Restrict key**
   - Cochez uniquement: **Maps JavaScript API**
6. Sauvegardez

### 4.2 Créer une clé API restreinte pour le Backend

1. Créez une nouvelle clé API
2. **Restrictions d'application**: 
   - Choisissez **IP addresses**
   - Ajoutez les IPs de vos serveurs (ou laissez vide pour les Edge Functions)
3. **Restrictions d'API**:
   - Cochez: **Geocoding API**, **Directions API**, **Places API**
4. Sauvegardez

---

## Phase 5: Mise à jour des secrets Supabase

Après avoir configuré Google Cloud, mettez à jour vos secrets Supabase:

1. Allez dans [Supabase Dashboard > Project Settings > Edge Functions](https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/settings/functions)

2. Ajoutez/mettez à jour ces secrets:

| Secret | Description |
|--------|-------------|
| `GCS_BUCKET_NAME` | `224solutions-media` |
| `GCS_PROJECT_ID` | Votre ID de projet Google Cloud |
| `GOOGLE_CLOUD_SERVICE_ACCOUNT` | Le JSON complet du compte de service |

---

## Phase 6: Tester la configuration

### 6.1 Tester Secret Manager

```bash
# Lire un secret
gcloud secrets versions access latest --secret="google-cloud-api-key"
```

### 6.2 Tester Cloud Storage

```bash
# Upload un fichier test
echo "Test" > test.txt
gcloud storage cp test.txt gs://224solutions-media/temp/test.txt

# Vérifier
gcloud storage ls gs://224solutions-media/temp/

# Nettoyer
gcloud storage rm gs://224solutions-media/temp/test.txt
rm test.txt
```

### 6.3 Tester depuis l'application

Utilisez les Edge Functions créées:

```typescript
// Test de récupération de secret
const { data } = await supabase.functions.invoke('get-google-secret', {
  body: { secretName: 'google-cloud-api-key' }
});

// Test de génération d'URL signée
const { data: uploadUrl } = await supabase.functions.invoke('gcs-signed-url', {
  body: { 
    action: 'upload',
    fileName: 'test.jpg',
    contentType: 'image/jpeg',
    folder: 'temp'
  }
});
```

---

## 🔒 Vérifications de sécurité

### Checklist avant mise en production

- [ ] Les clés API ne sont **jamais** exposées dans le code frontend
- [ ] Les secrets sont stockés dans Secret Manager, pas en dur
- [ ] Les buckets GCS sont **privés** (pas d'accès public)
- [ ] Les clés API Maps pour le frontend sont restreintes par domaine
- [ ] Le compte de service a les permissions **minimales**
- [ ] CORS est configuré uniquement pour vos domaines

### Tester que les clés ne sont pas exposées

1. Ouvrez les DevTools du navigateur (F12)
2. Allez dans l'onglet **Network**
3. Effectuez une action qui utilise Maps/Geocoding
4. Vérifiez qu'aucune requête ne contient de clé API visible

---

## 📊 Architecture finale

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                          │
│  • Appelle Edge Functions pour toutes les opérations              │
│  • Upload direct vers GCS via Signed URLs                         │
│  • N'a JAMAIS accès aux clés sensibles                           │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Supabase Edge Functions                      │
│  • Authentifie les requêtes via JWT                              │
│  • Récupère les secrets depuis Secret Manager                    │
│  • Génère des Signed URLs pour GCS                               │
│  • Appelle les APIs Google (Geocoding, Directions, etc.)         │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
           ┌──────────────┐ ┌─────────┐ ┌──────────┐
           │Secret Manager│ │   GCS   │ │Google APIs│
           │  (Secrets)   │ │(Fichiers)│ │(Maps,etc)│
           └──────────────┘ └─────────┘ └──────────┘
```

---

## 🆘 Dépannage

### Erreur: "Permission denied on secret"

```bash
# Vérifier les permissions
gcloud secrets get-iam-policy google-cloud-api-key

# Ajouter la permission manquante
gcloud secrets add-iam-policy-binding google-cloud-api-key \
  --member="serviceAccount:VOTRE_SA" \
  --role="roles/secretmanager.secretAccessor"
```

### Erreur: "CORS policy blocked"

Vérifiez que votre domaine est bien dans la configuration CORS:

```bash
gcloud storage buckets describe gs://224solutions-media --format="json(cors)"
```

### Erreur: "Invalid signature" sur Signed URL

- Vérifiez que l'horloge de votre serveur est synchronisée
- Vérifiez que le compte de service a les permissions `storage.objectAdmin`

---

## 📚 Ressources

- [Documentation Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Documentation Cloud Storage](https://cloud.google.com/storage/docs)
- [Bonnes pratiques de sécurité GCP](https://cloud.google.com/security/best-practices)
