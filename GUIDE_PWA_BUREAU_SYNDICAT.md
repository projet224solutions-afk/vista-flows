# 📱 Guide PWA Bureau Syndicat - 224SOLUTIONS

## 🎯 Vue d'ensemble

Le système Bureau Syndicat est maintenant une **Progressive Web App (PWA)** complète avec :

- ✅ **Installation sécurisée** via lien JWT unique
- ✅ **Mode hors ligne complet** avec IndexedDB
- ✅ **Synchronisation automatique** Firestore + Supabase
- ✅ **Cryptage AES-256** des données locales
- ✅ **Service Worker** pour le cache intelligent
- ✅ **Fonctionnement mobile et desktop**

---

## 🔧 Installation et Configuration

### 1. Configuration Firebase (Firestore)

Éditez `src/lib/firebaseClient.ts` avec vos clés Firebase :

```typescript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "solutions224-project.firebaseapp.com",
  projectId: "solutions224-project",
  storageBucket: "solutions224-project.appspot.com",
  messagingSenderId: "VOTRE_ID",
  appId: "VOTRE_APP_ID",
  measurementId: "VOTRE_MEASUREMENT_ID"
};
```

### 2. Variables d'environnement Supabase

Les variables suivantes sont déjà configurées dans les edge functions :
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (pour signer les tokens PWA)

---

## 🔗 Génération de liens d'installation

### Via le composant React

```typescript
import GenerateBureauInstallLink from '@/components/admin/GenerateBureauInstallLink';

// Dans votre page admin
<GenerateBureauInstallLink 
  bureauId="uuid-du-bureau"
  bureauName="Préfecture - Commune"
/>
```

### Via API directe

```typescript
const { data, error } = await supabase.functions.invoke('generate-bureau-token', {
  body: {
    bureau_id: 'uuid-du-bureau',
    president_email: 'president@example.com', // Optionnel
    expires_in_hours: 24
  }
});

console.log('Lien d\'installation:', data.install_url);
```

**Le lien généré ressemble à :**
```
https://your-app.com/install?token=eyJhbGciOiJ...
```

---

## 🚀 Processus d'installation

### 1. Le président reçoit le lien

- Par email automatique (si configuré)
- Ou via message/WhatsApp

### 2. Validation du token

Le lien `/install?token=xxx` :
1. Valide le JWT (expiration, signature)
2. Récupère les données du bureau
3. Vérifie que le bureau existe

### 3. Installation automatique

Sur un navigateur compatible (Chrome, Edge, Safari) :
- Une popup d'installation apparaît automatiquement après 2 secondes
- L'utilisateur clique sur "Installer"
- L'application est ajoutée à l'écran d'accueil

### 4. Synchronisation initiale

- Activation de la sync Firestore ↔ Supabase
- Téléchargement des données essentielles
- Activation du mode hors ligne

---

## 🔌 Mode Hors Ligne

### Données stockées localement

**IndexedDB (via localForage) :**
- Enregistrements de motos
- Informations des membres
- Alertes de sécurité
- Historique des transactions

**Cache Storage (Service Worker) :**
- Bundle JavaScript/CSS
- Images et assets
- Fonts Google
- Requêtes API récentes

### Capacités hors ligne

✅ Enregistrer une nouvelle moto
✅ Modifier un membre
✅ Signaler une moto volée
✅ Consulter l'historique local
✅ Générer des rapports
✅ Scanner des QR codes

❌ Validation finale (nécessite Internet)
❌ Photos en haute résolution (limitées au cache)

---

## 🔄 Synchronisation Automatique

### Déclencheurs de synchronisation

1. **Retour en ligne** : `navigator.onLine` = true
2. **Timer périodique** : Toutes les 2 minutes
3. **Manuel** : Bouton "Forcer la sync"

### Flux de synchronisation

```
┌──────────────┐
│ Données      │
│ locales      │ → Cryptage AES-256
│ (IndexedDB)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│   Supabase   │ ←→ │  Firestore   │
│ (Principal)  │     │ (Réplique)   │
└──────────────┘     └──────────────┘
```

### Gestion des conflits

- **Timestamp** : La modification la plus récente gagne
- **Flag synced_from_X** : Évite les boucles infinies
- **Validation admin** : Le PDG peut forcer une version

---

## 🔐 Sécurité

### 1. Token JWT

```javascript
{
  "bureau_id": "uuid",
  "exp": timestamp,  // Expiration (24h par défaut)
  "iat": timestamp,  // Issued at
  "type": "pwa_install"
}
```

**Signature HMAC-SHA256** avec clé secrète

### 2. Cryptage local

```typescript
import { encryptData, decryptData } from '@/lib/encryption';

// Avant stockage
const encrypted = encryptData(sensitiveData);

// Après récupération
const decrypted = decryptData(encrypted);
```

**Algorithme:** AES-256-CBC

### 3. Logs d'accès

Chaque utilisation du lien est loggée dans `bureau_access_logs` :
- Bureau ID
- Token utilisé
- IP address
- User agent
- Timestamp

### 4. Validation côté serveur

```typescript
// Edge function verify-bureau-token
- Vérifie l'expiration
- Vérifie la signature JWT
- Vérifie que le bureau existe
- Empêche la réutilisation (optionnel)
```

---

## 📊 Monitoring et Administration

### Dashboard Admin

```typescript
import DualSyncDashboard from '@/components/admin/DualSyncDashboard';

// Affiche :
// - Statut Firestore/Supabase
// - Sync en temps réel (ON/OFF)
// - Statistiques de synchronisation
// - Erreurs de sync
```

### Commandes de débogage

```typescript
// Vérifier la connexion Firestore
const { checkFirestoreConnection } = useDualSync();
const isConnected = await checkFirestoreConnection();

// Synchroniser manuellement
const { syncAll } = useDualSync();
await syncAll('supabase-to-firestore');

// Obtenir les stats
const { status } = useDualSync();
console.log(status.stats);
```

### Logs Supabase

Vérifiez les logs des edge functions :
- `verify-bureau-token` : Validation des accès
- `generate-bureau-token` : Génération de liens

---

## 🧪 Tests

### Test complet du flux

1. **Générer un lien** (via composant ou API)
2. **Ouvrir le lien** dans un navigateur
3. **Valider le token** (check console)
4. **Installer la PWA**
5. **Tester hors ligne** :
   - Couper le WiFi/4G
   - Enregistrer une moto
   - Vérifier IndexedDB
6. **Reconnecter** :
   - Allumer le WiFi/4G
   - Attendre la sync (2-5 sec)
   - Vérifier Supabase + Firestore

### Vérification IndexedDB

**Chrome DevTools :**
1. F12 → Application
2. Storage → IndexedDB
3. `224Solutions` → `bureau_offline_data`
4. Voir les entrées cryptées

### Vérification Service Worker

**Chrome DevTools :**
1. F12 → Application
2. Service Workers
3. Vérifier le statut "activated"
4. Cache Storage → Voir les fichiers cachés

---

## 📱 Installation manuelle (si navigateur incompatible)

### iOS Safari

1. Ouvrir le lien dans Safari
2. Appuyer sur le bouton Partager (⬆️)
3. Faire défiler et appuyer sur "Sur l'écran d'accueil"
4. Appuyer sur "Ajouter"

### Android Chrome

1. Ouvrir le lien dans Chrome
2. Appuyer sur le menu (⋮)
3. Sélectionner "Installer l'application"
4. Confirmer l'installation

### Desktop Chrome/Edge

1. Ouvrir le lien dans Chrome ou Edge
2. Cliquer sur l'icône ⊕ dans la barre d'adresse
3. Cliquer sur "Installer"

---

## ⚙️ Configuration avancée

### Personnaliser le manifest PWA

Éditez `vite.config.ts` :

```typescript
manifest: {
  name: '224Solutions - Nom Bureau',
  short_name: 'Bureau',
  description: 'Description personnalisée',
  theme_color: '#1e40af',
  background_color: '#ffffff',
  // ... autres options
}
```

### Ajouter des routes offline

Éditez `vite.config.ts` :

```typescript
workbox: {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/votre-api\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'custom-api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 7 jours
        }
      }
    }
  ]
}
```

### Modifier la durée de validité des tokens

Par défaut: 24 heures

Pour changer :

```typescript
// Dans l'appel API
await supabase.functions.invoke('generate-bureau-token', {
  body: {
    bureau_id: 'uuid',
    expires_in_hours: 48  // ← Modifier ici
  }
});
```

---

## 🐛 Dépannage

### Problème: Le lien d'installation ne fonctionne pas

**Solutions:**
1. Vérifier que le token n'a pas expiré
2. Vérifier les logs de `verify-bureau-token`
3. Tester le token manuellement :
```bash
curl -X POST https://your-supabase.functions.supabase.co/verify-bureau-token \
  -H "Content-Type: application/json" \
  -d '{"token":"VOTRE_TOKEN"}'
```

### Problème: L'installation PWA n'apparaît pas

**Solutions:**
1. Vérifier que le navigateur supporte les PWA
2. Ouvrir en mode navigation privée (pour test)
3. Vérifier que le site est en HTTPS
4. Vérifier que le manifest est valide (DevTools → Application)

### Problème: La synchronisation échoue

**Solutions:**
1. Vérifier la connexion Internet
2. Vérifier les logs Supabase (`bureau_access_logs`)
3. Vérifier les logs Firestore
4. Forcer une resynchronisation manuelle
5. Vérifier les règles RLS Supabase

### Problème: Les données ne sont pas cryptées

**Solutions:**
1. Vérifier que `encrypted: true` dans `SYNC_CONFIGS`
2. Vérifier que la clé de cryptage est définie
3. Tester manuellement:
```typescript
import { encryptData, decryptData } from '@/lib/encryption';
const encrypted = encryptData({ test: 'data' });
const decrypted = decryptData(encrypted);
console.log({ encrypted, decrypted });
```

---

## 📈 Métriques et Analytics

### Tables Supabase créées

- `pwa_installations` : Historique des installations
- `pwa_tokens` : Tokens générés et expirés
- `bureau_access_logs` : Logs d'accès détaillés

### Requêtes utiles

```sql
-- Nombre d'installations par bureau
SELECT bureau_id, COUNT(*) as installs
FROM pwa_installations
GROUP BY bureau_id;

-- Tokens expirés non utilisés
SELECT * FROM pwa_tokens
WHERE expires_at < NOW()
AND bureau_id NOT IN (SELECT bureau_id FROM pwa_installations);

-- Tentatives d'accès suspectes
SELECT * FROM bureau_access_logs
WHERE access_type = 'pwa_install_attempt'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 10;
```

---

## 🎯 Checklist de déploiement

- [ ] Firebase configuré (`firebaseClient.ts`)
- [ ] JWT_SECRET défini dans Supabase secrets
- [ ] Edge functions déployées (`verify-bureau-token`, `generate-bureau-token`)
- [ ] Tables Supabase créées (voir migrations)
- [ ] PWA testée en local
- [ ] PWA testée en production
- [ ] Icônes PWA générées (192x192, 512x512)
- [ ] Service Worker activé en production
- [ ] HTTPS activé
- [ ] Test d'installation sur mobile
- [ ] Test d'installation sur desktop
- [ ] Test du mode hors ligne
- [ ] Test de la synchronisation
- [ ] Documentation partagée avec l'équipe

---

## 📞 Support

Pour toute question :
- Documentation Firebase : https://firebase.google.com/docs
- Documentation Supabase : https://supabase.com/docs
- Documentation PWA : https://web.dev/progressive-web-apps/

---

## 🚀 Prochaines étapes suggérées

1. ✅ Ajouter des notifications push (Firebase Cloud Messaging)
2. ✅ Implémenter le partage de données entre bureaux
3. ✅ Ajouter des statistiques d'utilisation hors ligne
4. ✅ Créer un dashboard PDG pour suivre les installations
5. ✅ Ajouter une fonctionnalité de backup manuel
6. ✅ Implémenter un système de mise à jour automatique de la PWA
