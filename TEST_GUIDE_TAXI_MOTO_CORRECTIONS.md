# 🧪 GUIDE DE TEST - CORRECTIONS TAXI-MOTO

## 📋 RÉSUMÉ DES CORRECTIONS

### Commit: `fe48b7ff`
- ✅ Vérification suspension avant accès conducteur
- ✅ Badge ID visible sur mobile
- ✅ Messages d'erreur clairs

---

## 🔒 TEST 1 : SUSPENSION FONCTIONNELLE

### Objectif
Vérifier qu'un conducteur suspendu ne peut plus accéder à l'interface

### Étapes

#### 1. Créer un compte conducteur test
```sql
-- Dans Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('conducteur.test@224solutions.com', crypt('Test1234!', gen_salt('bf')), NOW());

INSERT INTO profiles (id, email, role, is_active, first_name, last_name)
SELECT id, email, 'taxi', true, 'Test', 'Conducteur'
FROM auth.users 
WHERE email = 'conducteur.test@224solutions.com';
```

#### 2. Connecter le conducteur
- Ouvrir l'app sur mobile/navigateur
- Se connecter avec : `conducteur.test@224solutions.com` / `Test1234!`
- ✅ Devrait accéder à l'interface taxi-moto

#### 3. Suspendre le conducteur (PDG)
```sql
-- Interface PDG ou SQL
UPDATE profiles 
SET is_active = false 
WHERE email = 'conducteur.test@224solutions.com';
```

#### 4. Vérifier le blocage
- Recharger la page conducteur (F5)
- ✅ **ATTENDU** : Message "Votre compte a été suspendu par l'administrateur"
- ✅ **ATTENDU** : Impossible d'accéder au dashboard
- ✅ **ATTENDU** : Logs console : `❌ [useTaxiDriverProfile] Compte suspendu ou inactif`

#### 5. Réactiver le conducteur
```sql
UPDATE profiles 
SET is_active = true 
WHERE email = 'conducteur.test@224solutions.com';
```

#### 6. Vérifier l'accès rétabli
- Recharger la page
- ✅ **ATTENDU** : Accès normal au dashboard
- ✅ **ATTENDU** : Badge "EN LIGNE" disponible

---

## 📱 TEST 2 : AFFICHAGE ID MOBILE

### Objectif
Vérifier que l'ID du conducteur est visible sur petits écrans

### Étapes

#### 1. Mode Desktop (> 768px)
- Ouvrir l'interface conducteur
- Inspecter le header
- ✅ **ATTENDU** : Badge violet avec Shield icon et `ID: 12345678...`

#### 2. Mode Mobile (< 640px)
- Ouvrir DevTools (F12)
- Activer mode responsive : 375px width
- ✅ **ATTENDU** : Badge ID toujours visible
- ✅ **ATTENDU** : Police `font-mono` lisible
- ✅ **ATTENDU** : Couleur purple-400 pour distinction

#### 3. Vérifier le badge
```tsx
// Structure attendue dans DriverHeader.tsx
{driverId && (
  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
    <Shield className="w-3 h-3" />
    <span className="font-mono">ID: {driverId.substring(0, 8)}</span>
  </div>
)}
```

#### 4. Tester sur différents appareils
- iPhone SE (375px)
- iPhone 12 (390px)
- Samsung S20 (360px)
- ✅ **ATTENDU** : Badge toujours visible et lisible

---

## 🔐 TEST 3 : SÉCURITÉ RENFORCÉE

### Objectif
Vérifier que les vérifications de sécurité sont actives

### Étapes

#### 1. Tester création profil avec compte inactif
```sql
-- Créer un utilisateur inactif
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('inactif@test.com', crypt('Test1234!', gen_salt('bf')), NOW());

INSERT INTO profiles (id, email, role, is_active)
SELECT id, email, 'taxi', false
FROM auth.users WHERE email = 'inactif@test.com';
```

- Essayer de se connecter
- ✅ **ATTENDU** : Accès refusé immédiatement
- ✅ **ATTENDU** : Pas de création de profil taxi_drivers

#### 2. Vérifier les logs
- Ouvrir la console navigateur
- ✅ **ATTENDU** : Logs détaillés :
  ```
  🔄 [useTaxiDriverProfile] Chargement profil pour user: xxx
  ❌ [useTaxiDriverProfile] Compte suspendu ou inactif
  ```

#### 3. Tester avec compte actif
```sql
UPDATE profiles SET is_active = true WHERE email = 'inactif@test.com';
```
- Se reconnecter
- ✅ **ATTENDU** : Accès autorisé
- ✅ **ATTENDU** : Profil taxi_drivers créé si inexistant

---

## 📊 RÉSULTATS ATTENDUS

### ✅ Checklist Complète

| Test | Résultat | Notes |
|------|----------|-------|
| Suspension bloque accès | ✅ | Message clair affiché |
| Réactivation restaure accès | ✅ | Fonctionne immédiatement |
| Badge ID visible desktop | ✅ | Badge violet avec Shield |
| Badge ID visible mobile | ✅ | Lisible sur 360px+ |
| Compte inactif refuse accès | ✅ | Pas de création profil |
| Logs audit détaillés | ✅ | Console affiche états |

---

## 🚨 PROBLÈMES POTENTIELS

### Si l'accès n'est pas bloqué :
```bash
# Vérifier la table profiles
SELECT id, email, is_active FROM profiles WHERE role = 'taxi';

# Vérifier les RLS policies
SELECT * FROM pg_policies WHERE tablename = 'taxi_drivers';
```

### Si l'ID n'apparaît pas :
```bash
# Vérifier le driverId dans le composant
console.log('Driver ID:', driverId);

# Inspecter l'élément dans DevTools
# Chercher : class="bg-purple-500/20"
```

---

## 📝 RAPPORT DE TEST

### Date : ___________
### Testeur : ___________

**Test 1 - Suspension** : ☐ PASS ☐ FAIL  
Notes : _________________________________

**Test 2 - Affichage ID** : ☐ PASS ☐ FAIL  
Notes : _________________________________

**Test 3 - Sécurité** : ☐ PASS ☐ FAIL  
Notes : _________________________________

**Problèmes identifiés** :
_________________________________
_________________________________

**Actions correctives** :
_________________________________
_________________________________
