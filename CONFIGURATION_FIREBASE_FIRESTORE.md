# 🔥 Configuration Firebase + Firestore

## 📋 Vue d'ensemble

Le système 224SOLUTIONS utilise maintenant une **architecture hybride dual** avec :
- **Supabase** (base principale)
- **Firestore** (réplication et sauvegarde)

### ✅ Fonctionnalités implémentées

1. **Synchronisation bidirectionnelle automatique** Firestore ↔ Supabase
2. **Persistance hors ligne** avec Firestore IndexedDB
3. **Cryptage AES-256** des données sensibles
4. **Détection des doublons** avant synchronisation
5. **Résolution de conflits** automatique
6. **Temps réel** avec listeners sur les deux bases

---

## 🔧 Configuration initiale

### 1. Obtenir les clés Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet **solutions224-project**
3. Allez dans **Paramètres du projet** (⚙️)
4. Dans l'onglet **Général**, trouvez vos applications
5. Copiez la configuration web

### 2. Configurer le client Firebase

Éditez le fichier `src/lib/firebaseClient.ts` :

```typescript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY_ICI",
  authDomain: "solutions224-project.firebaseapp.com",
  projectId: "solutions224-project",
  storageBucket: "solutions224-project.appspot.com",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID",
  measurementId: "VOTRE_MEASUREMENT_ID"
};
```

### 3. Activer Firestore

Dans Firebase Console :
1. Allez dans **Firestore Database**
2. Cliquez **Créer une base de données**
3. Choisissez le mode **Production**
4. Sélectionnez la région (Europe par exemple)

### 4. Configurer les règles de sécurité Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Motos enregistrées
    match /registered_motos/{motoId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Ventes
    match /sales/{saleId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Membres
    match /members/{memberId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Alertes de sécurité
    match /security_alerts/{alertId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 🚀 Utilisation

### Dans un composant React

```typescript
import { useDualSync } from '@/hooks/useDualSync';

function MonComposant() {
  const { 
    status, 
    syncAll, 
    enableRealTimeSync,
    isConnected 
  } = useDualSync();

  // Activer la synchronisation en temps réel
  useEffect(() => {
    enableRealTimeSync();
  }, []);

  // Synchroniser manuellement
  const handleSync = async () => {
    await syncAll('supabase-to-firestore');
  };

  return (
    <div>
      <p>Firestore: {status.isFirestoreConnected ? '✅' : '❌'}</p>
      <p>Supabase: {status.isSupabaseConnected ? '✅' : '❌'}</p>
      <button onClick={handleSync}>Synchroniser</button>
    </div>
  );
}
```

### Synchronisation manuelle d'une donnée

```typescript
import dualSyncManager from '@/lib/dualSyncManager';

// Sauvegarder dans Supabase et synchroniser vers Firestore
const motoData = {
  id: crypto.randomUUID(),
  plate_number: 'GN-1234-AB',
  serial_number: '123456789',
  // ... autres données
};

// Sauvegarder d'abord dans Supabase
await supabase.from('registered_motos').insert(motoData);

// Puis synchroniser vers Firestore
await dualSyncManager.syncSupabaseToFirestore('motos', motoData);
```

---

## 📊 Tableau de bord d'administration

Un composant `DualSyncDashboard` a été créé pour gérer la synchronisation :

```typescript
import DualSyncDashboard from '@/components/admin/DualSyncDashboard';

// Dans votre page d'admin
<DualSyncDashboard />
```

**Fonctionnalités :**
- ✅ Statut de connexion Firestore / Supabase
- ✅ Activation / désactivation sync temps réel
- ✅ Synchronisation manuelle dans les deux sens
- ✅ Statistiques de synchronisation
- ✅ Gestion des erreurs

---

## 🔄 Flux de synchronisation

### Mode hors ligne

1. **Utilisateur hors ligne** → Données stockées dans IndexedDB (cryptées)
2. **Retour en ligne** → Synchronisation vers Supabase
3. **Supabase → Firestore** → Réplication automatique

### Mode en ligne avec sync temps réel

1. **Modification dans Supabase** → Trigger → Firestore
2. **Modification dans Firestore** → Listener → Supabase
3. **Détection de conflits** → Dernière modification gagne

---

## 🔐 Sécurité

### Cryptage des données sensibles

```typescript
import { encryptData, decryptData } from '@/lib/encryption';

// Crypter avant stockage local
const encrypted = encryptData(sensitiveData);

// Décrypter lors de la récupération
const decrypted = decryptData(encrypted);
```

### Configuration des collections à synchroniser

Éditez `src/lib/dualSyncManager.ts` :

```typescript
export const SYNC_CONFIGS: Record<string, SyncConfig> = {
  motos: {
    collection: 'registered_motos',
    supabaseTable: 'registered_motos',
    uniqueField: 'serial_number',
    encrypted: true, // ← Cryptage activé
    syncDirection: 'both' // ← Bidirectionnel
  },
  // ... autres collections
};
```

---

## 🧪 Tests

### Vérifier la connexion Firestore

```typescript
import { useDualSync } from '@/hooks/useDualSync';

const { checkFirestoreConnection } = useDualSync();
const isConnected = await checkFirestoreConnection();
console.log('Firestore:', isConnected ? 'OK' : 'KO');
```

### Tester la synchronisation

1. Allez sur `/admin` (ou là où vous avez intégré `DualSyncDashboard`)
2. Cliquez sur **Activer synchronisation temps réel**
3. Modifiez une donnée dans Supabase
4. Vérifiez qu'elle apparaît dans Firestore Console
5. Modifiez la même donnée dans Firestore
6. Vérifiez qu'elle se met à jour dans Supabase

---

## 📈 Monitoring

### Logs de synchronisation

Tous les événements de sync sont loggés dans la console :

```
✅ Sync Supabase → Firestore: motos abc-123
🔄 Changement Firestore détecté: motos abc-123
❌ Erreur sync: Connection timeout
```

### Statistiques en temps réel

Le hook `useDualSync` fournit des stats :

```typescript
const { status } = useDualSync();

console.log('Synced:', status.stats.synced);
console.log('Failed:', status.stats.failed);
console.log('Last sync:', status.lastSync);
```

---

## ⚠️ Limitations et considérations

1. **Coût Firestore** : Facturation par lecture/écriture
2. **Latence** : Sync peut prendre 1-2 secondes
3. **Conflits** : En cas de modification simultanée, dernière gagne
4. **Quotas** : Vérifiez les limites Firebase gratuites

---

## 🆘 Dépannage

### Firestore ne se connecte pas

1. Vérifiez les clés dans `firebaseClient.ts`
2. Vérifiez que Firestore est activé dans Firebase Console
3. Vérifiez les règles de sécurité Firestore

### Synchronisation échoue

1. Vérifiez la connexion Internet
2. Regardez les logs dans la console
3. Vérifiez que les tables Supabase existent
4. Vérifiez les règles de sécurité (RLS)

### Boucle infinie de synchronisation

- Les flags `synced_from_firestore` et `synced_from_supabase` évitent ça
- Si problème persiste, désactivez la sync temps réel

---

## 📚 Architecture technique

```
┌─────────────┐
│   Offline   │
│  IndexedDB  │ (crypté)
└──────┬──────┘
       │
       ▼
┌─────────────┐     Sync      ┌─────────────┐
│  Supabase   │ ◄──────────► │  Firestore  │
│ (Principal) │   Temps réel  │ (Réplique)  │
└─────────────┘               └─────────────┘
```

### Collections synchronisées

| Collection Supabase | Collection Firestore | Cryptage | Direction |
|---------------------|---------------------|----------|-----------|
| `registered_motos` | `registered_motos` | ✅ Oui | ↔ Both |
| `sales` | `sales` | ✅ Oui | ↔ Both |
| `members` | `members` | ❌ Non | ↔ Both |
| `moto_security_alerts` | `security_alerts` | ❌ Non | ↔ Both |

---

## 🎯 Prochaines étapes

1. ✅ Configurer les clés Firebase
2. ✅ Tester la connexion
3. ✅ Activer la sync temps réel
4. ✅ Intégrer dans les composants vendeur/bureau
5. ⏳ Ajouter d'autres collections si nécessaire
6. ⏳ Configurer les alertes de monitoring

---

## 📞 Support

Pour toute question sur la configuration ou l'utilisation :
- Consultez la [documentation Firebase](https://firebase.google.com/docs/firestore)
- Consultez la [documentation Supabase](https://supabase.com/docs)
- Vérifiez les logs dans la console du navigateur
