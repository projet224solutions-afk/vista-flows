# 🔬 DIAGNOSTIC NOTIFICATION TAXI-MOTO - GUIDE DE DÉPANNAGE

**Date**: 4 décembre 2024  
**Problème**: Conducteur ne reçoit toujours pas les notifications

---

## ✅ CORRECTIONS APPLIQUÉES (Phase 2)

### 1. **Subscription Realtime cassée par re-souscriptions**

**Problème identifié**: 
```typescript
// ❌ AVANT - location dans les dépendances
}, [driverId, isOnline, location, hasAccess]);
```

Chaque fois que `location` change (toutes les secondes avec le GPS), la subscription se ré-abonne, causant:
- Perte de connexion Realtime
- Canal fermé puis rouvert constamment
- Notifications manquées

**Solution appliquée**:
```typescript
// ✅ APRÈS - location retiré
}, [driverId, isOnline, hasAccess]);
```

**Impact**: Subscription stable, pas de ré-abonnements intempestifs

---

### 2. **Logs de diagnostic manquants**

**Ajouté**:
```typescript
// Logs au chargement du profil
console.log('✅ [loadDriverProfile] Profil conducteur chargé:', data.id);
console.log('⚠️ [loadDriverProfile] Aucun profil conducteur trouvé');

// Logs de subscription
console.log('🔔 Subscription status:', status);
if (status === 'SUBSCRIBED') {
    console.log('✅ ABONNÉ avec succès aux courses');
} else if (status === 'CHANNEL_ERROR') {
    console.error('❌ ERREUR subscription Realtime!');
}

// Logs condition subscription
if (!driverId || !isOnline || !hasAccess) {
    console.log('⚠️ Subscription NON activée:', { driverId, isOnline, hasAccess });
}
```

**Impact**: Traçabilité complète du problème

---

### 3. **Message GPS confus**

**Avant**: `"📍 Recherche GPS en cours... (25 secondes max)"`
**Après**: `"📍 Activation GPS en cours..."`

**Impact**: Message plus clair, moins d'anxiété utilisateur

---

### 4. **Composant DriverDiagnostic créé**

Nouveau composant affiché quand conducteur en ligne sans courses actives:

**Affiche**:
- ✅ User ID
- ✅ Driver ID (critique!)
- ✅ Statut en ligne
- ✅ Statut abonnement
- ✅ **Statut Realtime** (SUBSCRIBED, CHANNEL_ERROR, etc.)
- ✅ Dernière notification reçue (timestamp + course)

**Couleurs**:
- 🟢 Vert: SUBSCRIBED (connecté)
- 🔴 Rouge: CHANNEL_ERROR (erreur)
- 🟠 Orange: TIMED_OUT (timeout)
- ⚪ Gris: Disconnected

---

## 🔍 PROCESSUS DE DIAGNOSTIC

### Étape 1: Vérifier Driver ID

**Ouvrir console navigateur** (F12):
```
Chercher: "[loadDriverProfile]"
```

**Résultats possibles**:

✅ **SUCCÈS**:
```
✅ [loadDriverProfile] Profil conducteur chargé: abc123-def456
```
→ Driver ID présent, passer à l'étape 2

❌ **ÉCHEC**:
```
⚠️ [loadDriverProfile] Aucun profil conducteur trouvé
```
→ **PROBLÈME**: Pas de profil dans `taxi_drivers`

**Solution si échec**:
```sql
-- Vérifier l'existence du profil
SELECT * FROM taxi_drivers WHERE user_id = 'USER_ID';

-- Si absent, créer manuellement
INSERT INTO taxi_drivers (user_id, is_online, status, vehicle_type)
VALUES ('USER_ID', false, 'offline', 'moto');
```

---

### Étape 2: Vérifier Subscription Realtime

**Chercher dans console**:
```
"🔔 Subscription status"
```

**Résultats possibles**:

✅ **SUCCÈS**:
```
🔔 Subscription status: SUBSCRIBED
✅ [TaxiMotoDriver] ABONNÉ avec succès aux courses
```
→ Connexion Realtime OK, passer à l'étape 3

❌ **ÉCHEC - CHANNEL_ERROR**:
```
🔔 Subscription status: CHANNEL_ERROR
❌ [TaxiMotoDriver] ERREUR subscription Realtime!
```
→ **PROBLÈME**: Erreur connexion Supabase Realtime

**Solution**:
1. Vérifier connexion internet
2. Vérifier statut Supabase (https://status.supabase.com)
3. Recharger la page (F5)
4. Vider cache navigateur

❌ **ÉCHEC - Pas de log**:
```
⚠️ [TaxiMotoDriver] Subscription NON activée: { driverId: null, isOnline: false, hasAccess: true }
```
→ **PROBLÈME**: Conditions non remplies

**Solution**:
- Si `driverId: null` → Revenir étape 1
- Si `isOnline: false` → Cliquer "En ligne"
- Si `hasAccess: false` → Vérifier abonnement

---

### Étape 3: Tester réception notification

**Commander une course** depuis interface client

**Chercher dans console conducteur**:
```
"📲 [TaxiMotoDriver] Nouvelle course détectée"
```

**Résultats possibles**:

✅ **SUCCÈS**:
```
📲 [TaxiMotoDriver] Nouvelle course détectée: { id: "xyz", ... }
🔊 Affichage notification + son pour course: xyz
📍 Distance calculée: 3.45km
✅ Ajout course à la liste (< 10km)
```
→ **TOUT FONCTIONNE!** 🎉

❌ **ÉCHEC - Pas de log**:
→ **PROBLÈME**: Événement Realtime pas reçu

**Causes possibles**:
1. Subscription pas `SUBSCRIBED`
2. RLS bloque l'événement
3. Statut course pas `requested`
4. Table `taxi_trips` n'existe pas

**Vérifications SQL**:
```sql
-- Vérifier la course créée
SELECT * FROM taxi_trips WHERE status = 'requested' ORDER BY created_at DESC LIMIT 1;

-- Vérifier RLS
SELECT * FROM pg_policies WHERE tablename = 'taxi_trips';

-- Tester événement manuel
INSERT INTO taxi_trips (customer_id, status, pickup_address, ...) 
VALUES (...) RETURNING *;
```

---

### Étape 4: Vérifier composant DriverDiagnostic

**Regarder l'interface** quand conducteur en ligne sans courses:

**Valeurs à vérifier**:

| Champ | Valeur attendue | Action si erreur |
|-------|----------------|------------------|
| User ID | `abc123...` | Reconnecter |
| Driver ID | `xyz789...` | Créer profil taxi_drivers |
| En ligne | ✅ OUI | Cliquer "En ligne" |
| Abonnement | ✅ Actif | Souscrire abonnement |
| Realtime | 🟢 SUBSCRIBED | Recharger page |

---

## 🚨 PROBLÈMES FRÉQUENTS ET SOLUTIONS

### Problème 1: "Driver ID non défini"

**Symptôme**: Composant diagnostic affiche "❌ Non défini"

**Cause**: Pas de ligne dans `taxi_drivers` pour cet user

**Solution**:
```sql
INSERT INTO taxi_drivers (user_id, is_online, status, vehicle_type)
SELECT id, false, 'offline', 'moto' 
FROM auth.users 
WHERE id = 'USER_ID'
ON CONFLICT (user_id) DO NOTHING;
```

---

### Problème 2: "Subscription status: CHANNEL_ERROR"

**Symptôme**: Connexion Realtime échoue

**Causes**:
- Connexion internet instable
- Supabase en maintenance
- Trop de connexions simultanées
- RLS trop restrictif

**Solutions**:
1. Recharger page (F5)
2. Vérifier https://status.supabase.com
3. Attendre 30 secondes et réessayer
4. Vider cache: Ctrl+Shift+Del

---

### Problème 3: "Course détectée mais pas de toast/son"

**Symptôme**: Log "Nouvelle course détectée" présent mais pas de notification visuelle

**Cause**: Son bloqué par navigateur ou toast pas affiché

**Solution**:
```typescript
// Vérifier dans code si audio.play() échoue
try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.8;
    await audio.play(); // ✅ Attend la promesse
} catch (e) {
    console.log('Autoplay bloqué:', e);
    // Demander interaction utilisateur
}
```

**Workaround**:
1. Cliquer n'importe où dans la page (active autoplay)
2. Autoriser notifications navigateur
3. Vérifier fichier `/notification.mp3` existe

---

### Problème 4: "Course trop loin (> 10km)"

**Symptôme**: Notification affichée mais course pas dans liste

**Cause**: NORMAL - Filtrage par distance

**Explication**:
```typescript
// Distance > 10km = notification uniquement
if (distance <= 10) {
    await addRideRequestFromDB(ride); // Ajoute à la liste
} else {
    // Notification seulement, pas dans la liste
}
```

**Solution**: 
- Si vous voulez voir toutes les courses dans la liste, augmenter rayon:
```typescript
if (distance <= 20) { // 20km au lieu de 10km
```

---

## 📊 MÉTRIQUES DE SUCCÈS

### Conducteur reçoit notifications si:

✅ **Driver ID**: Défini (visible dans diagnostic)  
✅ **En ligne**: Toggle activé  
✅ **Abonnement**: Actif  
✅ **Realtime**: `SUBSCRIBED` (vert dans diagnostic)  
✅ **GPS**: Position valide  
✅ **Console**: Logs `📲 Nouvelle course détectée`  
✅ **Interface**: Toast + Son joués  
✅ **Liste**: Course apparaît (si < 10km)  

---

## 🛠 COMMANDES UTILES

### Vérifier profil conducteur
```sql
SELECT * FROM taxi_drivers WHERE user_id = 'USER_ID';
```

### Vérifier courses en attente
```sql
SELECT * FROM taxi_trips WHERE status = 'requested' ORDER BY created_at DESC;
```

### Vérifier notifications envoyées
```sql
SELECT * FROM taxi_notifications 
WHERE user_id = 'DRIVER_ID' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Vérifier policies RLS
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('taxi_trips', 'taxi_notifications');
```

### Tester Realtime manuellement
```typescript
// Dans console navigateur
const channel = supabase
  .channel('test-channel')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'taxi_trips'
  }, (payload) => {
    console.log('✅ Événement reçu:', payload);
  })
  .subscribe((status) => {
    console.log('Status:', status);
  });
```

---

## ✅ CHECKLIST AVANT CONTACT SUPPORT

Avant de contacter le support, vérifier:

- [ ] Driver ID existe dans `taxi_drivers`
- [ ] Conducteur en ligne (toggle activé)
- [ ] Abonnement actif
- [ ] Composant diagnostic affiche "SUBSCRIBED"
- [ ] Console affiche logs subscription
- [ ] Pas d'erreurs JavaScript dans console
- [ ] Fichier `notification.mp3` existe
- [ ] Autoplay navigateur autorisé
- [ ] Connexion internet stable
- [ ] Supabase opérationnel

**Si tous cochés et toujours pas de notifications → Contacter support avec**:
- Capture d'écran composant diagnostic
- Logs console complets
- User ID + Driver ID
- Timestamp du test

---

**Développé par**: GitHub Copilot (Claude Sonnet 4.5)  
**Version**: 2.0 (avec diagnostic intégré)  
**Dernière mise à jour**: 4 décembre 2024
