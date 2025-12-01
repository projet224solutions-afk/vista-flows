# 🧪 GUIDE TEST MFA - AGENTS & BUREAUX

## 🚀 ACCÈS RAPIDE

### Agent Login
```
URL: http://localhost:5173/agent/login
OU
URL: https://votre-domaine.netlify.app/agent/login
```

### Bureau Login
```
URL: http://localhost:5173/bureau/login
OU
URL: https://votre-domaine.netlify.app/bureau/login
```

---

## 📋 ÉTAPES TEST COMPLET

### 1️⃣ CRÉER UN AGENT DE TEST (PDG uniquement)

**Via interface PDG:**
```
1. Se connecter en tant que PDG
2. Aller dans /pdg → Section "Gestion Agents"
3. Cliquer "Créer nouvel agent"
4. Remplir formulaire:
   - Nom: Jean
   - Prénom: Dupont
   - Email: jean.dupont@test.com
   - Téléphone: 628123456
   - Mot de passe: TestPass123!
   - Permissions: manage_users
   - Commission: 10%
5. Cliquer "Créer agent"
6. ✅ Agent créé avec password_hash
```

**OU via Edge Function directe (dev):**
```bash
curl -X POST https://xxx.supabase.co/functions/v1/create-pdg-agent \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jean Dupont",
    "email": "jean.dupont@test.com",
    "phone": "628123456",
    "password": "TestPass123!",
    "permissions": ["manage_users"],
    "commission_rate": 10
  }'
```

---

### 2️⃣ TESTER LOGIN AGENT

**Étape 1: Password**
```
1. Ouvrir /agent/login
2. Saisir email: jean.dupont@test.com
   OU téléphone: 628123456
3. Saisir password: TestPass123!
4. Cliquer "Se connecter"

✅ Attendu:
- Toast vert: "Code de sécurité envoyé à votre email"
- Passage à l'écran OTP
- Email reçu avec code 6 chiffres
```

**Étape 2: OTP**
```
5. Vérifier email (jean.dupont@test.com)
6. Copier code 6 chiffres (ex: 123456)
7. Coller dans inputs OTP
   OU saisir manuellement

✅ Attendu:
- Auto-submit après 6ème chiffre
- Toast vert: "Bienvenue Jean Dupont !"
- Redirection automatique vers /agent
- Dashboard agent affiché
```

**Vérifier session:**
```javascript
// Console navigateur (F12)
console.log('Session:', sessionStorage.getItem('agent_session'));
console.log('User:', sessionStorage.getItem('agent_user'));

// Doit afficher:
// Session: session_agent_uuid-agent_timestamp
// User: {"id":"xxx","email":"jean.dupont@test.com",...}
```

---

### 3️⃣ TESTER SCÉNARIOS ERREUR

**Test 1: Mot de passe incorrect (3x)**
```
1. Login avec email correct
2. Saisir mauvais password 3 fois
✅ Attendu:
- Toast rouge: "Identifiant ou mot de passe incorrect"
- Toast orange: "⚠️ 2 tentative(s) restante(s)"
- Toast orange: "⚠️ 1 tentative(s) restante(s)"
- Toast orange: "⚠️ 0 tentative(s) restante(s)"
```

**Test 2: Compte verrouillé (après 5 tentatives)**
```
1. Échouer password 5 fois
✅ Attendu:
- Toast rouge: "Compte temporairement verrouillé. Réessayez dans 30 minutes."
- Status 429
```

**Test 3: OTP incorrect (3x)**
```
1. Connexion réussie → OTP affiché
2. Saisir mauvais code 3 fois
✅ Attendu:
- Toast rouge: "Code incorrect"
- Toast orange: "⚠️ 4 tentative(s) restante(s)"
- Toast orange: "⚠️ 3 tentative(s) restante(s)"
```

**Test 4: OTP expiré (après 5min)**
```
1. Connexion réussie → OTP affiché
2. Attendre 5 minutes 1 seconde
3. Tenter validation code
✅ Attendu:
- Toast rouge: "Code OTP expiré. Demandez un nouveau code."
- Compteur affiche "0:00" en rouge
- Inputs OTP désactivés
```

**Test 5: Compte inactif**
```
1. Désactiver agent via SQL:
   UPDATE agents SET is_active=false WHERE email='jean.dupont@test.com'
2. Tenter connexion
✅ Attendu:
- Toast rouge: "Compte désactivé. Contactez l'administrateur."
- Status 403
```

---

### 4️⃣ TESTER FONCTIONNALITÉS UX

**Test 1: Copier-coller OTP**
```
1. Arriver à l'écran OTP
2. Copier code depuis email (ex: 123456)
3. Cliquer sur premier input OTP
4. Ctrl+V (coller)
✅ Attendu:
- Code distribué dans les 6 inputs
- Auto-submit immédiat
- Vérification automatique
```

**Test 2: Navigation clavier**
```
1. Saisir chiffres avec clavier
✅ Attendu:
- Auto-focus input suivant après chaque chiffre
- Backspace revient à input précédent
- Flèches gauche/droite naviguent
```

**Test 3: Compteur temps restant**
```
1. Observer compteur en haut OTPInput
✅ Attendu:
- Format MM:SS (ex: "4:37")
- Décrémentation temps réel
- Texte rouge si <1min
- "0:00" quand expiré
```

**Test 4: Bouton renvoyer code**
```
1. Cliquer "Renvoyer le code"
✅ Attendu actuellement:
- Toast orange: "Veuillez vous reconnecter pour recevoir un nouveau code"
- Retour écran login
- (Note: Edge Function resend-otp pas encore créée)
```

---

### 5️⃣ TESTER LOGOUT

```javascript
// Via console navigateur
const { useAgentAuth } = require('@/hooks/useAgentAuth');
const { logout } = useAgentAuth();
logout();

// OU ajouter bouton dans AgentDashboard:
<Button onClick={logout}>Déconnexion</Button>
```

✅ Attendu:
- Session supprimée
- Toast vert: "Déconnexion réussie"
- Redirection → /agent/login

---

## 🏢 BUREAU SYNDICAT - TESTS IDENTIQUES

### Prérequis: Créer bureau de test

**Via SQL direct (dev):**
```sql
-- Ajouter colonnes auth si pas fait
ALTER TABLE syndicate_bureaus
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Créer bureau test (password: "BureauPass123!" hashé)
INSERT INTO syndicate_bureaus (
  bureau_code, 
  president_email, 
  president_phone, 
  prefecture, 
  commune, 
  password_hash,
  is_active
) VALUES (
  'TEST001',
  'bureau.test@example.com',
  '628987654',
  'Conakry',
  'Kaloum',
  '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', -- Hash de "BureauPass123!"
  true
);
```

**Puis tester:** Même flux que Agent Login, mais URL `/bureau/login`

---

## 📊 CHECKLIST TESTS

### Tests Fonctionnels
- [ ] Login agent avec email réussi
- [ ] Login agent avec téléphone réussi
- [ ] Validation OTP 6 chiffres réussie
- [ ] Redirection automatique après OTP
- [ ] Session agent créée correctement
- [ ] Login bureau avec email réussi
- [ ] Login bureau avec téléphone réussi
- [ ] Session bureau créée correctement

### Tests Sécurité
- [ ] Mot de passe incorrect → Erreur
- [ ] 5 tentatives échouées → Verrouillage 30min
- [ ] OTP incorrect → Erreur + tentatives restantes
- [ ] OTP expiré (>5min) → Refusé
- [ ] Compte inactif → Accès refusé
- [ ] Session persiste après refresh page
- [ ] Logout supprime session

### Tests UX
- [ ] Copier-coller OTP fonctionne
- [ ] Navigation clavier (auto-focus) fonctionne
- [ ] Compteur temps restant s'affiche
- [ ] Compteur devient rouge <1min
- [ ] Bouton renvoyer code fonctionne
- [ ] Toasts feedback appropriés
- [ ] Page responsive mobile
- [ ] Loading states affichés

### Tests Edge Functions
- [ ] auth-agent-login retourne requires_otp=true
- [ ] auth-bureau-login retourne requires_otp=true
- [ ] auth-verify-otp valide code correct
- [ ] Email OTP reçu (<30 secondes)
- [ ] OTP stocké dans auth_otp_codes
- [ ] Login loggé dans auth_login_logs

---

## 🐛 TROUBLESHOOTING

### Problème: "Code non reçu"

**Vérifications:**
1. Check spam/promotions email
2. Vérifier Edge Function `send-email` déployée
3. Logs Supabase:
   ```
   Dashboard → Functions → auth-agent-login → Logs
   Chercher: "OTP généré pour [email]"
   ```
4. Variable env `RESEND_API_KEY` configurée

**Fix temporaire dev:**
```javascript
// Dans auth-agent-login/index.ts, ligne ~170
console.log('🔑 CODE OTP:', otp);
// Code affiché dans logs Edge Function
```

---

### Problème: "Session non persistée après refresh"

**Cause:** sessionStorage vidé

**Vérifier:**
```javascript
console.log(sessionStorage.getItem('agent_session'));
// Doit retourner: "session_agent_xxx_timestamp"
```

**Fix:** Utiliser localStorage au lieu de sessionStorage
```typescript
// Dans useAgentAuth.ts, remplacer:
sessionStorage.setItem → localStorage.setItem
sessionStorage.getItem → localStorage.getItem
```

---

### Problème: "Redirection échoue après OTP"

**Cause:** `redirect_url` non retourné par Edge Function

**Vérifier Edge Function response:**
```json
{
  "success": true,
  "user": {...},
  "session_token": "xxx",
  "redirect_url": "/agent"  // ← Doit être présent
}
```

**Fix dans auth-verify-otp:**
```typescript
return new Response(JSON.stringify({
  success: true,
  ...
  redirect_url: userType === 'agent' ? '/agent' : '/bureau'
}))
```

---

## 📧 EXEMPLE EMAIL OTP REÇU

```
De: 224Solutions <noreply@224solutions.com>
À: jean.dupont@test.com
Sujet: 🔐 Code de sécurité - 224Solutions

Bonjour Jean Dupont,

Votre code de sécurité pour vous connecter à votre espace Agent:

┌─────────────────────┐
│                     │
│       123456        │
│                     │
└─────────────────────┘

Ce code expire dans 5 minutes.

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

--
224Solutions
Votre plateforme tout-en-un
```

---

## ✅ VALIDATION FINALE

**Test complet end-to-end:**
```
1. Créer agent via interface PDG ✅
2. Ouvrir /agent/login ✅
3. Login avec email + password ✅
4. Recevoir email OTP ✅
5. Saisir code OTP ✅
6. Redirection /agent ✅
7. Session persistée ✅
8. Logout fonctionne ✅
9. Répéter pour bureau ✅
```

**Si tout ✅ → MFA 100% opérationnel ! 🎉**

---

## 📞 SUPPORT

**Logs à vérifier en cas d'erreur:**

1. **Browser Console (F12):**
   - Erreurs JavaScript
   - Logs hooks (useAgentAuth)

2. **Network Tab:**
   - Requêtes Edge Functions
   - Status codes (200/401/403/429)
   - Payloads request/response

3. **Supabase Dashboard:**
   - Functions → Logs → auth-agent-login
   - Functions → Logs → auth-verify-otp
   - Database → auth_otp_codes (table)
   - Database → auth_login_logs (table)

**Contact urgence:**
- Dev Lead: dev@224solutions.com
- PDG: pdg@224solutions.com
