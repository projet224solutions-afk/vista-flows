# 🧪 GUIDE DE TEST - ANALYSE CLIENT

## ✅ CE QUI FONCTIONNE

La fonctionnalité d'analyse client du Copilote Vendeur Enterprise accepte maintenant **DEUX formats d'identifiant**:

### 1️⃣ Format UUID Standard (recommandé)
```
Analyse le client 12345678-1234-1234-1234-123456789012
```
- Détection automatique via regex UUID
- Fonctionne avec `customer_id` (table customers) 
- Fonctionne avec `user_id` (table profiles)

### 2️⃣ Variantes acceptées
```
client 12345678-1234-1234-1234-123456789012
analyse 12345678-1234-1234-1234-123456789012
Donne moi les infos sur 12345678-1234-1234-1234-123456789012
```

## 🔍 DÉTECTION AUTOMATIQUE

Le système détecte automatiquement un UUID dans le message si:
1. Le message contient les mots-clés: `client`, `analyse`, `customer`
2. Un UUID valide est présent (format 8-4-4-4-12)

**Regex utilisée:**
```javascript
/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
```

## 📊 LOGIQUE DE RECHERCHE

Le service `VendorCopilotService.analyzeCustomer()` effectue une recherche en cascade:

```
1. Recherche dans table "customers" avec id = UUID
   ↓ (si non trouvé)
2. Recherche dans table "profiles" avec id = UUID (user_id)
   ↓ (si trouvé)
3. Récupère les commandes avec customer_id = user_id
```

### Avantages:
✅ Compatible avec les deux structures de données
✅ Fonctionne même si la table `customers` est vide
✅ Utilise `profiles` comme fallback (toujours peuplé)

## 🎯 DONNÉES RETOURNÉES

L'analyse retourne **59 champs** incluant:

### 📋 Identité (8 champs)
- customer_id, user_id, email, phone
- first_name, last_name, full_name
- created_at

### 📍 Localisation (6 champs)
- **country** ← Répond à "dans quel pays il vit"
- **city** ← Répond à "dans quelle ville"
- **address** ← Répond à "son adresse"
- addresses[] (liste complète avec types)

### 🛒 Historique (8 champs)
- **is_first_time_buyer** ← Répond à "premier achat ou habitué"
- total_orders, completed_orders
- first_order_date, last_order_date
- days_since_last_order

### 💰 Valeur (4 champs)
- total_spent, average_order_value
- largest_order_value, total_items_purchased

### 📊 Comportement (4 champs)
- favorite_vendor_id, favorite_vendor_name
- orders_with_this_vendor
- preferred_payment_method

### 📈 Engagement (4 champs)
- customer_lifetime_days
- purchase_frequency (commandes/mois)
- **customer_status**: new | active | at_risk | inactive | loyal

### 🎯 Segmentation (2 champs)
- **customer_segment**: vip | regular | occasional | one_time
- **loyalty_score**: 0-100

## 📝 EXEMPLES D'UTILISATION

### Scénario 1: Vendor ID connu
```javascript
// Dans le chat Copilote Vendeur
"Analyse le client 9e622843-5a2f-4a5e-8f1e-c3d4e5f6a7b8"
```

**Résultat:**
```markdown
# 👤 ANALYSE CLIENT DÉTAILLÉE

🆕 NOUVEAU CLIENT
✅ Statut: ACTIVE
⭐ Segment: REGULAR
⭐ Score fidélité: 75/100

---

## 📍 LOCALISATION

🌍 Pays: Guinée
🏙️ Ville: Conakry
🏠 Adresse: Ratoma, Commune de Ratoma

---

## 🛒 HISTORIQUE D'ACHATS

Total commandes: 8
• ✅ Complétées: 6
• ⏳ En cours: 1
• ❌ Annulées: 1

...
```

### Scénario 2: Table customers vide (utilise profiles)
```javascript
// Le système détecte automatiquement et cherche dans profiles
"client a3a8fdd4-1b2c-3d4e-5f6a-7b8c9d0e1f2a"
```

**Résultat:** Même format, données depuis profiles + orders

## 🔧 DÉPANNAGE

### ❌ "Client non trouvé"
**Causes possibles:**
1. UUID invalide ou n'existe pas dans la base
2. L'utilisateur n'a jamais passé de commande
3. L'UUID ne correspond ni à customers.id ni à profiles.id

**Solutions:**
```javascript
// Vérifier si l'UUID existe dans profiles
SELECT id, email FROM profiles WHERE id = 'UUID';

// Vérifier si l'UUID existe dans orders
SELECT DISTINCT customer_id FROM orders WHERE customer_id = 'UUID';
```

### ⚠️ Regex ne détecte pas l'UUID
**Vérification:**
```javascript
const uuid = "12345678-1234-1234-1234-123456789012";
const regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
console.log(regex.test(uuid)); // Doit retourner true
```

**Format invalide:** Si l'ID n'est pas un UUID, modifier le code pour accepter d'autres formats

## 🚀 TEST RAPIDE

### 1. Trouver un vendor_id valide:
```sql
SELECT id, business_name FROM vendors LIMIT 1;
```

### 2. Trouver un user_id (profiles):
```sql
SELECT id, email, role FROM profiles WHERE role = 'client' LIMIT 3;
```

### 3. Tester dans le Copilote:
```
Analyse le client [user_id trouvé]
```

### 4. Vérifier la console:
```
🔍 Analyse client [UUID] pour vendeur [UUID]...
⚠️ Pas trouvé dans customers, recherche dans profiles...
✅ Client trouvé dans table profiles (user_id)
```

## 📌 POINTS IMPORTANTS

1. **UUID requis**: La détection automatique nécessite un format UUID valide
2. **Mots-clés**: Inclure "client", "analyse" ou "customer" dans le message
3. **Fallback automatique**: Si `customers` est vide, utilise `profiles`
4. **Commandes cross-vendor**: Analyse TOUTES les commandes du client, pas seulement celles du vendeur actuel
5. **Format Markdown**: La réponse est formatée en Markdown professionnel

## ✨ AMÉLIORATIONS FUTURES

- [ ] Support ID numérique simple (123456)
- [ ] Support email comme identifiant (`client@example.com`)
- [ ] Support nom/prénom fuzzy search
- [ ] Cache des résultats d'analyse
- [ ] Export PDF du rapport client
