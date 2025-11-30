# 🔐 AUTHENTIFICATION AGENTS + BUREAUX SYNDICAT - 224SOLUTIONS

## 📋 Vue d'ensemble

Système d'authentification sécurisé avec MFA (Multi-Factor Authentication) pour:
- **Agents PDG** (créés par le PDG)
- **Bureaux Syndicat** (existants dans le système)

## 🏗️ Architecture

### 🔹 Composants créés

1. **Edge Functions** (3 fonctions Supabase)
   - `auth-agent-login` - Connexion Agent (étape 1: mot de passe)
   - `auth-bureau-login` - Connexion Bureau (étape 1: mot de passe)
   - `auth-verify-otp` - Vérification OTP MFA (étape 2: code 6 chiffres)

2. **Tables Supabase** (3 tables)
   - `auth_otp_codes` - Stockage codes OTP
   - `auth_login_logs` - Logs connexions
   - Colonnes ajoutées à `agents` et `syndicate_bureaus`:
     - `password_hash` (bcrypt)
     - `failed_login_attempts`
     - `locked_until`
     - `last_login`

3. **Amélioration création Agent**
   - Hashage bcrypt du mot de passe
   - Validation 8 caractères minimum
   - Création dans `agents` table (MFA) ET `agents_management` (gestion)

---

## 🔐 FLUX D'AUTHENTIFICATION

### 📱 1. AGENTS - Connexion en 2 étapes

#### **Étape 1: Validation mot de passe**

**Endpoint:** `POST /functions/v1/auth-agent-login`

**Body:**
```json
{
  "identifier": "agent@mail.com",  // OU "628765432"
  "password": "MonMotDePasse123!"
}
```

**Logique:**
1. ✅ Détection automatique email/téléphone
2. ✅ Recherche agent dans table `agents` (champ `email` ou `phone`)
3. ✅ Vérification compte actif (`is_active = true`)
4. ✅ Vérification verrouillage (`locked_until`)
5. ✅ Comparaison bcrypt du `password_hash`
6. ✅ Génération OTP 6 chiffres (valide 5 minutes)
7. ✅ Stockage OTP dans `auth_otp_codes`
8. ✅ Envoi email avec OTP
9. ✅ Log connexion (`auth_login_logs`)

**Réponse succès:**
```json
{
  "success": true,
  "message": "Un code de sécurité a été envoyé à votre email",
  "requires_otp": true,
  "identifier": "agent@mail.com",
  "otp_expires_at": "2025-11-30T14:35:00Z"
}
```

**Réponse échec (mot de passe incorrect):**
```json
{
  "success": false,
  "error": "Identifiant ou mot de passe incorrect",
  "attempts_remaining": 3
}
```

**Sécurité:**
- ❌ Mot de passe incorrect → Incrément `failed_login_attempts`
- 🔒 5 tentatives échouées → Verrouillage 30 minutes (`locked_until`)

---

#### **Étape 2: Vérification OTP**

**Endpoint:** `POST /functions/v1/auth-verify-otp`

**Body:**
```json
{
  "identifier": "agent@mail.com",
  "otp": "482910",
  "user_type": "agent"  // Optionnel (auto-détecté)
}
```

**Logique:**
1. ✅ Validation format OTP (6 chiffres)
2. ✅ Recherche OTP dans `auth_otp_codes`
3. ✅ Vérification expiration (< 5 min)
4. ✅ Vérification tentatives (< 5)
5. ✅ Marquage OTP comme `verified = true`
6. ✅ Récupération données agent
7. ✅ Génération session token
8. ✅ Log connexion réussie

**Réponse succès:**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "user": {
    "id": "uuid-agent",
    "email": "agent@mail.com",
    "first_name": "Jean",
    "agent_type": "pdg_agent"
  },
  "user_type": "agent",
  "session_token": "session_agent_uuid_timestamp",
  "redirect_url": "/agent"
}
```

**Réponse échec (OTP incorrect):**
```json
{
  "success": false,
  "error": "Code OTP incorrect",
  "attempts_remaining": 4
}
```

**Sécurité:**
- ❌ OTP incorrect → Incrément `attempts`
- 🔒 5 tentatives OTP échouées → Demander nouveau code

---

### 🏢 2. BUREAUX SYNDICAT - Connexion en 2 étapes

#### **Étape 1: Validation mot de passe**

**Endpoint:** `POST /functions/v1/auth-bureau-login`

**Body:**
```json
{
  "identifier": "bureau@mail.com",  // OU "628123456"
  "password": "BureauPass123!"
}
```

**Logique:** Identique à `auth-agent-login`, mais:
- 🔍 Recherche dans table `syndicate_bureaus`
- 🔍 Champs: `president_email` ou `president_phone`
- 📧 Email envoyé au `president_email`

**Réponse:** Identique à auth-agent-login

---

#### **Étape 2: Vérification OTP**

**Endpoint:** `POST /functions/v1/auth-verify-otp`

**Body:**
```json
{
  "identifier": "bureau@mail.com",
  "otp": "123456",
  "user_type": "bureau"  // Optionnel
}
```

**Logique:** Identique, mais:
- 🔍 Recherche bureau dans `syndicate_bureaus`
- 🏢 Retourne données bureau (bureau_code, prefecture, commune)

**Réponse succès:**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "user": {
    "id": "uuid-bureau",
    "bureau_code": "BUR001",
    "president_email": "bureau@mail.com",
    "prefecture": "Conakry",
    "commune": "Kaloum"
  },
  "user_type": "bureau",
  "session_token": "session_bureau_uuid_timestamp",
  "redirect_url": "/bureau"
}
```

---

## 🔒 SÉCURITÉ

### ✅ Hashage mot de passe
- **Algorithme:** bcrypt (cost factor: 10)
- **Stockage:** `password_hash` dans `agents` et `syndicate_bureaus`
- **Création Agent:** Mot de passe hashé automatiquement

### ✅ Verrouillage compte
- **Déclencheur:** 5 tentatives mot de passe échouées
- **Durée:** 30 minutes
- **Champ:** `locked_until` (TIMESTAMPTZ)

### ✅ Expiration OTP
- **Durée:** 5 minutes
- **Tentatives max:** 5
- **Nettoyage auto:** Fonction `clean_expired_otp_codes()` (> 1h)

### ✅ Logs connexion
- **Table:** `auth_login_logs`
- **Données:** user_type, user_id, identifier, success, step, failure_reason, ip_address, user_agent, created_at
- **Rétention:** 90 jours (fonction `clean_old_login_logs()`)
- **Vue stats:** `auth_login_stats` (30 derniers jours)

---

## 📊 TABLES SUPABASE

### 🔹 `auth_otp_codes`
```sql
id UUID PRIMARY KEY
user_type TEXT (agent | bureau)
user_id UUID
identifier TEXT (email ou phone)
otp_code TEXT (6 chiffres)
expires_at TIMESTAMPTZ (NOW() + 5 min)
verified BOOLEAN DEFAULT FALSE
verified_at TIMESTAMPTZ
attempts INT DEFAULT 0 (max 5)
ip_address TEXT
user_agent TEXT
created_at TIMESTAMPTZ
```

### 🔹 `auth_login_logs`
```sql
id UUID PRIMARY KEY
user_type TEXT (agent | bureau)
user_id UUID
identifier TEXT
success BOOLEAN
step TEXT (password_validated, otp_verified)
failure_reason TEXT (invalid_password, invalid_otp, account_locked)
ip_address TEXT
user_agent TEXT
created_at TIMESTAMPTZ
```

### 🔹 `agents` (colonnes ajoutées)
```sql
password_hash TEXT (bcrypt)
failed_login_attempts INT DEFAULT 0
locked_until TIMESTAMPTZ
last_login TIMESTAMPTZ
```

### 🔹 `syndicate_bureaus` (colonnes ajoutées)
```sql
password_hash TEXT (bcrypt)
failed_login_attempts INT DEFAULT 0
locked_until TIMESTAMPTZ
last_login TIMESTAMPTZ
```

---

## 🧪 TESTS

### ✅ Test Connexion Agent

**1. Créer un Agent:**
```bash
# Via interface PDG ou API
POST /functions/v1/create-pdg-agent
{
  "name": "Jean Dupont",
  "email": "jean@test.com",
  "phone": "628123456",
  "password": "TestPass123!",
  "permissions": ["manage_users"],
  "commission_rate": 10
}
```

**2. Connexion Agent (Étape 1):**
```bash
POST /functions/v1/auth-agent-login
{
  "identifier": "jean@test.com",
  "password": "TestPass123!"
}
# → OTP envoyé par email
```

**3. Vérifier OTP (Étape 2):**
```bash
POST /functions/v1/auth-verify-otp
{
  "identifier": "jean@test.com",
  "otp": "482910"
}
# → Connexion réussie, redirection /agent
```

---

### ✅ Test Connexion Bureau

**1. Connexion Bureau (Étape 1):**
```bash
POST /functions/v1/auth-bureau-login
{
  "identifier": "bureau@conakry.com",
  "password": "BureauPass123!"
}
# → OTP envoyé par email
```

**2. Vérifier OTP (Étape 2):**
```bash
POST /functions/v1/auth-verify-otp
{
  "identifier": "bureau@conakry.com",
  "otp": "123456"
}
# → Connexion réussie, redirection /bureau
```

---

## 📝 NOTES IMPORTANTES

### ✅ Préservation fonctionnalités existantes
- ✅ Aucune suppression de routes existantes
- ✅ Aucune modification de l'authentification Supabase classique
- ✅ Système MFA additionnel pour Agents + Bureaux uniquement

### ✅ Changement mot de passe
- **Agent:** Interface `/agent/settings` (à implémenter)
- **Bureau:** Interface `/bureau/settings` (à implémenter)
- **API:** Utiliser `supabase.auth.updateUser({ password: 'nouveau' })`

### ✅ Nettoyage automatique
```sql
-- OTP expirés (> 1h)
SELECT clean_expired_otp_codes();

-- Logs anciens (> 90 jours)
SELECT clean_old_login_logs();
```

### ✅ Statistiques
```sql
-- Stats connexions 30 derniers jours
SELECT * FROM auth_login_stats
WHERE user_type = 'agent'
ORDER BY login_date DESC;
```

---

## 🚀 DÉPLOIEMENT

### 1. Migrations Supabase
```bash
# Appliquer migrations
supabase db push

# Vérifier tables
psql -U postgres -h localhost -d postgres
\dt auth_*
```

### 2. Edge Functions
```bash
# Déployer fonctions
supabase functions deploy auth-agent-login
supabase functions deploy auth-bureau-login
supabase functions deploy auth-verify-otp
```

### 3. Variables d'environnement
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

---

## 📧 CONTACT

Pour toute question technique:
- **Équipe:** 224Solutions Dev Team
- **Documentation:** `/docs/auth-mfa.md`
