# 🔔 FIX: Impossible d'initialiser les notifications

## ❌ Erreur
```
Impossible d'initialiser les notifications
```

## 🔍 Causes possibles

### 1. **Permission refusée**
- L'utilisateur a bloqué les notifications dans le navigateur
- Solution: Demander à réautoriser dans les paramètres du navigateur

### 2. **Configuration Firebase manquante**
- Edge function `firebase-config` non déployée ou erreur
- Secrets Firebase manquants dans Supabase

### 3. **VAPID Key manquante**
- La clé Web Push n'est pas configurée
- La VAPID key doit avoir ~87-88 caractères

### 4. **Service Worker non enregistré**
- Le fichier `/service-worker.js` n'est pas accessible
- HTTPS requis (localhost OK en dev)

---

## ✅ Solutions

### **Solution 1 : Vérifier les permissions navigateur**

Dans Chrome/Edge :
1. Cliquer sur l'icône cadenas/infos (à gauche de l'URL)
2. Aller dans **Paramètres du site**
3. Chercher **Notifications** → Mettre sur **Autoriser**
4. Recharger la page

Dans Firefox :
1. Cliquer sur l'icône cadenas
2. **Autorisations** → **Notifications** → **Autoriser**
3. Recharger

---

### **Solution 2 : Configurer Firebase Cloud Messaging**

#### A. Créer la VAPID Key dans Firebase Console

1. Aller sur https://console.firebase.google.com
2. Sélectionner votre projet
3. **Project Settings** (icône engrenage) → **Cloud Messaging**
4. Onglet **Web Push certificates**
5. Cliquer **Generate key pair**
6. Copier la clé générée (commence par `B...`, ~87-88 caractères)

#### B. Ajouter les secrets dans Supabase

```powershell
# 1. VAPID Key (Web Push certificate)
supabase secrets set FIREBASE_VAPID_KEY="BPxxx...votre_cle_vapid...xxx"

# 2. Config Firebase complète (depuis Firebase Console > Project Settings)
supabase secrets set FIREBASE_API_KEY="AIza...votre_api_key"
supabase secrets set FIREBASE_AUTH_DOMAIN="votre-projet.firebaseapp.com"
supabase secrets set FIREBASE_PROJECT_ID="votre-projet-id"
supabase secrets set FIREBASE_STORAGE_BUCKET="votre-projet.appspot.com"
supabase secrets set FIREBASE_MESSAGING_SENDER_ID="123456789012"
supabase secrets set FIREBASE_APP_ID="1:123456789012:web:abc123def456"

# 3. Vérifier
supabase secrets list
```

---

### **Solution 3 : Déployer l'Edge Function firebase-config**

Créer le fichier si manquant :

**`supabase/functions/firebase-config/index.ts`**
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Récupérer les secrets Firebase depuis l'environnement
    const config = {
      configured: true,
      apiKey: Deno.env.get('FIREBASE_API_KEY'),
      authDomain: Deno.env.get('FIREBASE_AUTH_DOMAIN'),
      projectId: Deno.env.get('FIREBASE_PROJECT_ID'),
      storageBucket: Deno.env.get('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: Deno.env.get('FIREBASE_MESSAGING_SENDER_ID'),
      appId: Deno.env.get('FIREBASE_APP_ID'),
      vapidKey: Deno.env.get('FIREBASE_VAPID_KEY')
    };

    // Vérifier que tous les secrets sont présents
    const missingSecrets = Object.entries(config)
      .filter(([key, value]) => key !== 'configured' && !value)
      .map(([key]) => key);

    if (missingSecrets.length > 0) {
      return new Response(
        JSON.stringify({
          configured: false,
          error: 'Configuration Firebase incomplète',
          missing: missingSecrets
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Retourner la config (sans exposer les clés sensibles dans les logs)
    return new Response(
      JSON.stringify(config),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Erreur firebase-config:', error);
    return new Response(
      JSON.stringify({
        configured: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

**Déployer :**
```powershell
supabase functions deploy firebase-config
```

---

### **Solution 4 : Vérifier le Service Worker**

Tester dans la console DevTools (F12) :
```javascript
// Vérifier l'enregistrement
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg ? 'Enregistré' : 'Non enregistré');
});

// Vérifier les permissions
console.log('Permission notifications:', Notification.permission);

// Réenregistrer le SW si nécessaire
navigator.serviceWorker.register('/service-worker.js').then(() => {
  console.log('Service Worker réenregistré');
});
```

Vérifier que `/public/service-worker.js` existe et contient :
```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');
```

---

### **Solution 5 : Tester l'initialisation**

Dans la console navigateur (F12) :
```javascript
// Test complet
const testNotifications = async () => {
  // 1. Permission
  const permission = await Notification.requestPermission();
  console.log('Permission:', permission);
  
  // 2. Service Worker
  const reg = await navigator.serviceWorker.getRegistration();
  console.log('Service Worker:', reg);
  
  // 3. Firebase config
  const response = await fetch('/api/v1/functions/firebase-config', {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('sb-token')
    }
  });
  const config = await response.json();
  console.log('Config Firebase:', config);
  
  // 4. VAPID Key
  console.log('VAPID Key longueur:', config.vapidKey?.length || 0);
};

testNotifications();
```

---

## 🔧 Commandes de diagnostic

```powershell
# Vérifier les secrets Supabase
supabase secrets list

# Vérifier les logs edge function
supabase functions logs firebase-config --tail

# Redéployer si nécessaire
supabase functions deploy firebase-config

# Tester en local
supabase functions serve firebase-config
```

---

## 📝 Checklist

- [ ] Permission notifications autorisée dans le navigateur
- [ ] HTTPS activé (ou localhost en dev)
- [ ] VAPID Key générée dans Firebase Console
- [ ] Tous les secrets Firebase ajoutés dans Supabase
- [ ] Edge function `firebase-config` déployée
- [ ] Service Worker enregistré (`/service-worker.js` accessible)
- [ ] Config Firebase valide (vérifier avec DevTools)

---

## 🆘 Fallback : Désactiver temporairement

Si les notifications ne sont pas critiques, commentez l'initialisation :

**`src/hooks/useFirebaseMessaging.ts`**
```typescript
const init = async () => {
  // TEMPORAIRE : Désactiver FCM
  setStatus(prev => ({
    ...prev,
    isSupported: false,  // ← Forcer false
    isLoading: false
  }));
  return;
  
  // ... reste du code
};
```

---

## 🎯 Test final

Une fois tout configuré :
```javascript
// Dans la console navigateur
const testFCM = async () => {
  const { initializeMessaging, requestNotificationPermission } = 
    await import('./src/lib/firebaseMessaging.ts');
  
  const init = await initializeMessaging();
  console.log('Init:', init);
  
  if (init) {
    const token = await requestNotificationPermission();
    console.log('Token:', token ? 'OK' : 'ÉCHEC');
  }
};

testFCM();
```

✅ **Résultat attendu :**
- `Init: true`
- `Token: OK`
- Token FCM affiché dans les logs (commence par `c...` ou `d...`)
