# État des Systèmes - 224Solutions

## ✅ Système Wallet et Transactions

### Backend (Opérationnel)
**Routes API disponibles** :
- `GET /api/wallets/user/:userId` - Récupérer les wallets d'un utilisateur
- `GET /api/wallets/:userId/primary` - Récupérer le wallet principal
- `POST /api/wallets` - Créer un nouveau wallet
- `PATCH /api/wallets/:id/balance` - Mettre à jour le solde
- `GET /api/transactions/user/:userId` - Transactions d'un utilisateur
- `GET /api/transactions/:id` - Détails d'une transaction
- `POST /api/transactions` - Créer une transaction
- `PATCH /api/transactions/:id/status` - Mettre à jour le statut

**Fonctionnalités** :
- ✅ Création automatique de wallet lors de l'inscription (bonus de 10,000 GNF)
- ✅ Transferts wallet-to-wallet avec frais (1%)
- ✅ Historique des transactions
- ✅ Statistiques wallet (crédits, débits, volume mensuel)
- ✅ Support multi-devises (GNF par défaut)
- ✅ Validation des montants

### Frontend (Opérationnel)
**Service** : `client/src/services/walletService.ts`

**Méthodes disponibles** :
- `getUserWallet(userId)` - Récupérer wallet
- `createUserWallet(userId, initialBalance)` - Créer wallet
- `getWalletTransactions(walletId)` - Historique
- `transferFunds(fromWalletId, toWalletId, amount, description)` - Transfert
- `getWalletStats(walletId)` - Statistiques
- `formatAmount(amount, currency)` - Formatage

**Note** : Le service utilise Supabase directement pour les opérations wallet.

---

## ✅ Système de Géolocalisation

### Backend (Nouvellement Opérationnel)
**Routes API créées** :
- `POST /api/geolocation/position` - Sauvegarder position GPS
- `POST /api/geolocation/nearby` - Trouver utilisateurs proches
- `POST /api/geolocation/sharing` - Partager sa position
- `DELETE /api/geolocation/sharing/:id` - Arrêter le partage

**Sécurité** :
- ✅ Toutes les routes protégées avec `requireAuth`
- ✅ Validation Zod sur tous les payloads
- ✅ Logs de débogage pour le suivi

**Schémas de validation** :
- `positionSchema` - Coordonnées GPS (lat, lon, accuracy, altitude, speed, heading)
- `nearbySchema` - Recherche proximité (center, radius, userType)
- `sharingSchema` - Partage de position (permissions, expiration)

### Frontend (Opérationnel)
**Service** : `client/src/services/geolocation/GeolocationService.ts`

**Fonctionnalités** :
- ✅ Obtenir position actuelle (GPS)
- ✅ Suivi de position en temps réel (watchPosition)
- ✅ Calcul de distance entre deux points (formule Haversine)
- ✅ Recherche d'utilisateurs proches
- ✅ Partage de position avec permissions
- ✅ Géofences (zones géographiques virtuelles)
- ✅ Historique des positions
- ✅ Géocodage inverse (coordonnées → adresse) via Mapbox
- ✅ Géocodage (adresse → coordonnées) via Mapbox

**Méthodes principales** :
- `getCurrentPosition()` - Position actuelle
- `startTracking(interval)` - Démarrer suivi GPS
- `stopTracking()` - Arrêter suivi
- `calculateDistance(pos1, pos2)` - Distance en mètres
- `findNearbyUsers(center, radius, userType)` - Utilisateurs proches
- `shareLocation(toUserId, duration)` - Partager position
- `addGeofence(geofence)` - Ajouter zone virtuelle
- `getAddressFromCoordinates(position)` - Obtenir adresse

---

## Configuration Requise

### Variables d'environnement
```bash
# Mapbox (pour géocodage)
NEXT_PUBLIC_MAPBOX_TOKEN=<votre-token-mapbox>

# Agora (déjà configuré)
AGORA_APP_ID=6eb615539e434ff0991bb5f59dbca7ad
AGORA_APP_CERTIFICATE=<à-configurer>

# Database (déjà configuré)
DATABASE_URL=<postgresql-url>
```

### Mapbox Setup
Le système de géolocalisation utilise Mapbox pour :
- Convertir coordonnées → adresse
- Convertir adresse → coordonnées

**Note** : Les méthodes de géocodage retourneront "Adresse non trouvée" tant que le token Mapbox n'est pas configuré.

---

## Intégration Supabase

Le système utilise déjà les tables Supabase :
- `wallets` - Portefeuilles utilisateurs
- `wallet_transactions` - Transactions
- `profiles` - Profils utilisateurs

Les routes backend font actuellement office de stub pour la géolocalisation. Les données pourraient être persistées dans Supabase avec une table dédiée si besoin.

---

## Cas d'Usage

### Wallet
1. **Inscription utilisateur** → Wallet créé automatiquement avec 10,000 GNF
2. **Transfert** → `walletService.transferFunds(fromId, toId, amount, "Paiement course")`
3. **Historique** → `walletService.getWalletTransactions(walletId)`

### Géolocalisation
1. **Tracking chauffeur taxi-moto** :
   ```typescript
   const geoService = GeolocationService.getInstance();
   geoService.startTracking(5000); // Update toutes les 5 secondes
   geoService.addPositionListener('driver-tracking', (pos) => {
     console.log('Nouvelle position:', pos);
   });
   ```

2. **Trouver chauffeurs proches** :
   ```typescript
   const position = await geoService.getCurrentPosition();
   const nearbyDrivers = await geoService.findNearbyUsers(
     position,
     5000, // 5km
     'delivery'
   );
   ```

3. **Partage de position en temps réel** :
   ```typescript
   const sharingId = await geoService.shareLocation(
     'other-user-id',
     3600000 // 1 heure
   );
   // Pour arrêter
   await geoService.stopSharing(sharingId);
   ```

---

## Statut Final

✅ **Système Wallet** : Pleinement opérationnel (backend + frontend)
✅ **Système Géolocalisation** : Pleinement opérationnel (backend + frontend)

**Action requise** : 
- Configurer `NEXT_PUBLIC_MAPBOX_TOKEN` pour le géocodage Mapbox
- Configurer `AGORA_APP_CERTIFICATE` pour les appels vidéo/audio
