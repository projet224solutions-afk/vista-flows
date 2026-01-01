# 🚀 GUIDE D'ACTIVATION FIREBASE & GOOGLE CLOUD

**Date:** 1er Janvier 2026  
**Objectif:** Activer Firebase (Option 2) et Google Cloud Platform (Option 3)

---

## 📋 PRÉ-REQUIS

- [ ] Compte Google/Gmail actif
- [ ] Carte bancaire (pour Google Cloud - essai gratuit $300)
- [ ] Accès à Firebase Console
- [ ] Accès à Google Cloud Console
- [ ] Terminal/PowerShell avec droits admin

---

## 🔥 OPTION 2 : ACTIVER FIREBASE

### **Étape 1 : Créer le projet Firebase**

1. **Aller sur Firebase Console**
   ```
   https://console.firebase.google.com/
   ```

2. **Créer un nouveau projet**
   - Cliquez "Ajouter un projet"
   - Nom du projet: `224Solutions-Production`
   - Activer Google Analytics: **Oui** (recommandé)
   - Compte Analytics: Créer nouveau ou utiliser existant

3. **Attendre la création** (30-60 secondes)

### **Étape 2 : Configurer Firestore Database**

1. **Dans la console Firebase, aller à**
   ```
   Build > Firestore Database
   ```

2. **Créer la base de données**
   - Mode: **Production** (règles de sécurité activées)
   - Région: **eur3 (Europe)** ou la plus proche
   - Cliquez "Créer"

3. **Configurer les règles de sécurité**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Les utilisateurs authentifiés peuvent lire/écrire leurs données
       match /sales/{saleId} {
         allow read, write: if request.auth != null;
       }
       
       match /registered_motos/{motoId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       
       match /security_alerts/{alertId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

### **Étape 3 : Obtenir les clés Firebase**

1. **Aller dans Paramètres du projet**
   ```
   Roue dentée ⚙️ > Paramètres du projet
   ```

2. **Ajouter une application Web**
   - Cliquez sur l'icône Web `</>`
   - Nom de l'app: `224Solutions Web`
   - Firebase Hosting: **Non** (Supabase déjà utilisé)
   - Cliquez "Enregistrer l'application"

3. **Copier la configuration**
   Vous verrez un objet comme :
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "224solutions-production.firebaseapp.com",
     projectId: "224solutions-production",
     storageBucket: "224solutions-production.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456",
     measurementId: "G-XXXXXXXXXX"
   };
   ```

### **Étape 4 : Configurer les secrets dans Supabase**

1. **Aller dans Supabase Vault**
   ```
   https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/settings/vault
   ```

2. **Créer les 7 secrets Firebase**

   | Nom du Secret | Valeur (copiée depuis Firebase) |
   |---------------|--------------------------------|
   | `FIREBASE_API_KEY` | Votre `apiKey` |
   | `FIREBASE_AUTH_DOMAIN` | Votre `authDomain` |
   | `FIREBASE_PROJECT_ID` | Votre `projectId` |
   | `FIREBASE_STORAGE_BUCKET` | Votre `storageBucket` |
   | `FIREBASE_MESSAGING_SENDER_ID` | Votre `messagingSenderId` |
   | `FIREBASE_APP_ID` | Votre `appId` |
   | `FIREBASE_VAPID_KEY` | (voir étape 5) |

3. **Pour chaque secret:**
   - Cliquez "New secret"
   - Name: nom exact du tableau ci-dessus
   - Value: valeur copiée depuis Firebase
   - Save

### **Étape 5 : Activer Firebase Cloud Messaging (Notifications Push)**

1. **Dans Firebase Console**
   ```
   Build > Cloud Messaging
   ```

2. **Générer une paire de clés Web**
   - Onglet "Web configuration"
   - "Générer une paire de clés"
   - Copier la **clé VAPID**

3. **Ajouter le secret dans Supabase**
   - Secret name: `FIREBASE_VAPID_KEY`
   - Value: La clé VAPID copiée

### **Étape 6 : Mettre à jour le fichier .env local**

```bash
# Ouvrir .env et remplacer les valeurs FIREBASE
code .env
```

Remplacez:
```env
VITE_FIREBASE_API_KEY="VOTRE_VALEUR_ICI"
VITE_FIREBASE_AUTH_DOMAIN="224solutions-production.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="224solutions-production"
VITE_FIREBASE_STORAGE_BUCKET="224solutions-production.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_FIREBASE_APP_ID="1:123456789012:web:abcdef123456"
VITE_FIREBASE_VAPID_KEY="VOTRE_CLE_VAPID"
```

### **Étape 7 : Tester Firebase**

```powershell
# Restart le serveur dev
npm run dev
```

Dans la console navigateur:
```javascript
// Test Firebase
import { getFirestoreInstance } from '@/lib/firebaseClient';
const db = await getFirestoreInstance();
console.log('Firestore connecté:', db ? '✅' : '❌');
```

---

## ☁️ OPTION 3 : ACTIVER GOOGLE CLOUD PLATFORM

### **Étape 1 : Créer un projet Google Cloud**

1. **Aller sur Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **Créer un nouveau projet** (ou utiliser celui de Firebase)
   - Nom: `224Solutions`
   - Organisation: Aucune (ou votre organisation)
   - Cliquez "Créer"
   - Note le **Project ID** (ex: `solutions-ai-app-a8d57`)

### **Étape 2 : Activer l'essai gratuit $300**

1. **Dans la console GCP**
   - Cliquez sur "Activer l'essai gratuit"
   - Remplir les informations (carte bancaire requise)
   - **Vous ne serez PAS débité** pendant 90 jours ou $300 de crédit

### **Étape 3 : Créer un Service Account**

1. **Aller dans IAM & Admin**
   ```
   Navigation menu > IAM & Admin > Service Accounts
   ```

2. **Créer un compte de service**
   - Cliquez "+ CREATE SERVICE ACCOUNT"
   - Nom: `224Solutions Service`
   - ID: `solutions224service` (auto-généré)
   - Description: `Service account pour 224Solutions backend`
   - Cliquez "CREATE AND CONTINUE"

3. **Attribuer les rôles** (Étape 2)
   Ajouter ces rôles:
   - ✅ `Cloud Storage Admin` (pour uploads)
   - ✅ `Firestore Admin` (pour database)
   - ✅ `Firebase Admin SDK Administrator` (pour Firebase)
   - ✅ `Service Account User`
   - Cliquez "CONTINUE"

4. **Skip étape 3** (Grant users access)
   - Cliquez "DONE"

### **Étape 4 : Générer la clé JSON**

1. **Dans la liste des Service Accounts**
   - Trouvez `solutions224service@...`
   - Cliquez sur les 3 points "⋮"
   - "Manage keys"

2. **Créer une nouvelle clé**
   - "ADD KEY" > "Create new key"
   - Type: **JSON**
   - Cliquez "CREATE"
   - Le fichier `solutions-ai-app-a8d57-xxxxx.json` se télécharge

3. **Sécuriser la clé**
   ```powershell
   # Renommer et déplacer la clé
   Move-Item "$env:USERPROFILE\Downloads\solutions-ai-app-*.json" "D:\224Solutions\.gcp\service-account-key.json"
   
   # Vérifier
   Test-Path "D:\224Solutions\.gcp\service-account-key.json"
   # Doit retourner: True
   ```

### **Étape 5 : Activer les APIs nécessaires**

```powershell
# Installer gcloud CLI (si pas déjà fait)
# https://cloud.google.com/sdk/docs/install

# Se connecter
gcloud auth login

# Définir le projet
gcloud config set project solutions-ai-app-a8d57

# Activer les APIs
gcloud services enable firestore.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable maps-backend.googleapis.com
gcloud services enable geocoding-backend.googleapis.com
gcloud services enable places-backend.googleapis.com
gcloud services enable generativelanguage.googleapis.com
```

Ou manuellement dans la console:
```
APIs & Services > Library > Rechercher et activer:
- Cloud Firestore API
- Cloud Storage API
- Maps JavaScript API
- Geocoding API
- Places API
- Generative Language API (pour Gemini)
```

### **Étape 6 : Créer les API Keys**

1. **Aller dans Credentials**
   ```
   APIs & Services > Credentials
   ```

2. **Créer API Key pour Google Maps**
   - "+ CREATE CREDENTIALS" > "API key"
   - Nom: `224Solutions Maps Key`
   - Copier la clé: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
   - "RESTRICT KEY":
     - Application restrictions: **HTTP referrers**
     - Website restrictions: `*.224solution.net/*`, `localhost/*`
     - API restrictions: **Restrict key**
     - Select APIs:
       - Maps JavaScript API ✅
       - Geocoding API ✅
       - Places API ✅
   - Save

3. **Créer API Key pour Google AI (Gemini)**
   - "+ CREATE CREDENTIALS" > "API key"
   - Nom: `224Solutions AI Key`
   - Copier la clé
   - "RESTRICT KEY":
     - API restrictions: Generative Language API ✅
   - Save

### **Étape 7 : Mettre à jour .env**

```env
# Dans .env, remplacer:
GCP_PROJECT_ID="solutions-ai-app-a8d57"  # Votre vrai Project ID
VITE_GOOGLE_MAPS_API_KEY="AIzaSyXXXXXXXXXXXXX"  # Clé Maps créée
GOOGLE_AI_API_KEY="AIzaSyYYYYYYYYYYYYYY"  # Clé AI créée
```

### **Étape 8 : Installer les packages Google Cloud**

```powershell
npm install --save @google-cloud/storage @google-cloud/firestore @googlemaps/react-wrapper @google/generative-ai
```

### **Étape 9 : Tester Google Cloud**

**Test 1: Vérifier le Service Account**
```powershell
# Dans PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS = ".\.gcp\service-account-key.json"
node -e "const {Storage} = require('@google-cloud/storage'); const storage = new Storage(); console.log('✅ GCP Storage OK');"
```

**Test 2: Test via Edge Function**
```javascript
// Dans la console navigateur après npm run dev
fetch('https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/test-google-cloud-api', {
  headers: {
    'Authorization': 'Bearer VOTRE_ANON_KEY'
  }
}).then(r => r.json()).then(console.log);
```

---

## ✅ VÉRIFICATION FINALE

### Checklist Firebase (Option 2)

- [ ] Projet Firebase créé
- [ ] Firestore Database activé (mode Production)
- [ ] Application Web enregistrée
- [ ] 7 secrets configurés dans Supabase Vault:
  - [ ] FIREBASE_API_KEY
  - [ ] FIREBASE_AUTH_DOMAIN
  - [ ] FIREBASE_PROJECT_ID
  - [ ] FIREBASE_STORAGE_BUCKET
  - [ ] FIREBASE_MESSAGING_SENDER_ID
  - [ ] FIREBASE_APP_ID
  - [ ] FIREBASE_VAPID_KEY
- [ ] Fichier .env mis à jour avec VITE_FIREBASE_*
- [ ] Cloud Messaging activé (notifications push)
- [ ] Test connexion Firestore réussi

### Checklist Google Cloud (Option 3)

- [ ] Projet Google Cloud créé
- [ ] Essai gratuit $300 activé
- [ ] Service Account créé avec rôles:
  - [ ] Cloud Storage Admin
  - [ ] Firestore Admin
  - [ ] Firebase Admin SDK Administrator
- [ ] Clé JSON téléchargée et placée dans `.gcp/`
- [ ] APIs activées:
  - [ ] Firestore API
  - [ ] Storage API
  - [ ] Maps JavaScript API
  - [ ] Geocoding API
  - [ ] Places API
  - [ ] Generative Language API (Gemini)
- [ ] 2 API Keys créées (Maps + AI)
- [ ] Fichier .env mis à jour avec GCP_* et GOOGLE_*
- [ ] Packages NPM installés (@google-cloud/*)
- [ ] Test service account réussi

---

## 🎯 COMMANDES RAPIDES

### Restart complet du système

```powershell
# 1. Arrêter les serveurs
npm run stop

# 2. Clear cache
rm -rf node_modules/.vite

# 3. Restart
npm run dev
```

### Tester Firebase depuis le code

```typescript
// src/pages/TestFirebase.tsx
import { useEffect } from 'react';
import { getFirestoreInstance } from '@/lib/firebaseClient';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export default function TestFirebase() {
  useEffect(() => {
    const test = async () => {
      const db = await getFirestoreInstance();
      if (!db) {
        console.error('❌ Firestore non connecté');
        return;
      }
      
      // Test write
      const docRef = await addDoc(collection(db, 'test'), {
        message: 'Hello Firebase!',
        timestamp: new Date()
      });
      console.log('✅ Document créé:', docRef.id);
      
      // Test read
      const snapshot = await getDocs(collection(db, 'test'));
      console.log('✅ Documents lus:', snapshot.size);
    };
    
    test();
  }, []);
  
  return <div>Vérifiez la console navigateur</div>;
}
```

### Tester Google Maps

```typescript
// src/components/TestGoogleMaps.tsx
import { useEffect } from 'react';

export default function TestGoogleMaps() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => {
      console.log('✅ Google Maps chargé');
      // Créer une carte test
      const map = new google.maps.Map(document.getElementById('map')!, {
        center: { lat: 9.509167, lng: -13.712222 }, // Conakry
        zoom: 12
      });
    };
    document.head.appendChild(script);
  }, []);
  
  return <div id="map" style={{ width: '100%', height: '400px' }} />;
}
```

---

## 🆘 DÉPANNAGE

### Problème: Firebase ne se connecte pas

**Solution:**
```powershell
# 1. Vérifier les secrets Supabase
# Aller sur https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/settings/vault
# Vérifier que les 7 secrets FIREBASE_* existent

# 2. Redémarrer les Edge Functions
# Dans Supabase Dashboard > Edge Functions > Restart All

# 3. Clear cache navigateur
# F12 > Application > Clear storage > Clear site data
```

### Problème: Google Cloud "Permission Denied"

**Solution:**
```powershell
# Vérifier le fichier de clé
Get-Content .\.gcp\service-account-key.json | ConvertFrom-Json | Select-Object project_id, client_email

# Doit afficher:
# project_id: solutions-ai-app-a8d57
# client_email: solutions224service@...

# Vérifier les permissions du Service Account
# Console GCP > IAM & Admin > IAM
# Trouvez solutions224service@... et vérifiez qu'il a les rôles nécessaires
```

### Problème: Google Maps "RefererNotAllowedMapError"

**Solution:**
```
1. Console GCP > APIs & Services > Credentials
2. Cliquez sur votre API Key Maps
3. Application restrictions > HTTP referrers
4. Ajouter: localhost:8080/*, localhost:5173/*
5. Save
```

---

## 💰 COÛTS ESTIMÉS

### Firebase (Option 2)

```yaml
Plan Spark (Gratuit):
  - Firestore: 1GB storage gratuit
  - Cloud Functions: 125K invocations/mois
  - Cloud Messaging: Illimité

Plan Blaze (Pay-as-you-go):
  - Après limites gratuites:
  - Firestore: $0.18/GB/mois
  - Functions: $0.40/million invocations
  - Storage: $0.026/GB
  
Estimation 224Solutions: $0-25/mois
```

### Google Cloud Platform (Option 3)

```yaml
Essai gratuit:
  - $300 de crédit valable 90 jours
  - Aucune facturation automatique après

Always Free tier:
  - Google Maps: 28,500 chargements/mois gratuits
  - Cloud Storage: 5GB gratuit
  - Firestore: 1GB gratuit

Après essai gratuit:
  - Maps API: $7/1000 requêtes (après free tier)
  - Gemini AI: $0.001/1000 chars (très peu cher)
  - Storage: $0.026/GB/mois
  
Estimation 224Solutions: $50-200/mois selon usage
```

---

## 📚 RESSOURCES

- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Gemini AI Documentation](https://ai.google.dev/docs)

---

**🎉 Félicitations !** Une fois ces étapes complétées, vous aurez :
- ✅ Firebase activé avec Firestore + Cloud Messaging
- ✅ Google Cloud Platform avec Maps + AI + Storage
- ✅ Architecture hybride Supabase + Firebase
- ✅ Notifications push mobiles
- ✅ Synchronisation dual database
- ✅ Google Maps pour livraisons
- ✅ Google AI (Gemini) pour Copilot PDG amélioré

**⏱️ Temps estimé:** 1-2 heures pour tout configurer
