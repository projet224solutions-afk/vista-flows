# 🔑 GUIDE: OBTENIR VOS VRAIS CREDENTIALS DJOMY

## ⚠️ PROBLÈME ACTUEL

Votre fichier `.env` contient des credentials **INVALIDES** :
```env
JOMY_CLIENT_ID="djomy-client-1767199023499-77d4"  ❌ Format invalide
JOMY_CLIENT_SECRET="s3cr3t-OxmGJyRvh_T3AxKlSZaqGwi12CuhEcqs"  ❌ Secret test
```

**Format attendu par Djomy :**
```env
JOMY_CLIENT_ID="djomy-merchant-XXXXX"  ✅ Format valide
JOMY_CLIENT_SECRET="votre_vrai_secret_djomy"  ✅ Secret prodution
```

---

## 📋 ÉTAPES POUR OBTENIR VOS CREDENTIALS

### Option 1: Dashboard Marchand Djomy (RECOMMANDÉ)

1. **Connectez-vous à l'espace marchand Djomy :**
   ```
   🌐 URL: https://merchant.djomy.africa
   ```

2. **Naviguez vers les paramètres API :**
   - Cliquez sur **"Paramètres"** ou **"Settings"**
   - Allez dans **"API & Intégration"** ou **"Développeurs"**

3. **Copiez vos identifiants :**
   - **Client ID** (commence par `djomy-merchant-`)
   - **Client Secret** (longue chaîne alphanumérique)

4. **Si pas encore de compte marchand :**
   - Créez un compte sur https://merchant.djomy.africa
   - Complétez votre dossier KYC (Know Your Customer)
   - Attendez l'activation (24-48h)

---

### Option 2: Contacter le Support Djomy

**Email :** support@djomy.africa

**Objet :** Demande d'activation API - 224Solutions

**Message type :**
```
Bonjour,

Je suis [Votre Nom], représentant de 224Solutions.

Nous souhaitons intégrer l'API Djomy pour les paiements Mobile Money 
(Orange Money & MTN MoMo) dans notre plateforme e-commerce.

Pouvez-vous nous fournir nos credentials API de production :
- Client ID (marchand)
- Client Secret

Informations entreprise :
- Nom : 224Solutions
- Type : Marketplace e-commerce
- Volume estimé : [nombre] transactions/mois
- Téléphone : [votre numéro]

Merci d'avance,
[Votre Nom]
```

---

## ⚙️ CONFIGURATION DANS VOTRE PROJET

### 1. Mettre à jour le fichier `.env`

```env
# ============================================
# DJOMY PAYMENT API - PRODUCTION
# ============================================
JOMY_CLIENT_ID="djomy-merchant-XXXXX"
JOMY_CLIENT_SECRET="votre_secret_ici"

# SANDBOX (optionnel pour tests)
JOMY_CLIENT_ID_SANDBOX="djomy-merchant-sandbox-XXXXX"
JOMY_CLIENT_SECRET_SANDBOX="votre_secret_sandbox_ici"
```

### 2. Configurer dans Supabase (IMPORTANT)

Les credentials doivent aussi être dans **Supabase Edge Functions** :

1. **Allez sur Supabase Dashboard :**
   ```
   https://supabase.com/dashboard/project/[VOTRE_PROJECT_ID]/settings/functions
   ```

2. **Ajoutez les secrets :**
   - `DJOMY_CLIENT_ID` = `djomy-merchant-XXXXX`
   - `DJOMY_CLIENT_SECRET` = `votre_secret_ici`

3. **Commande CLI (alternative) :**
   ```bash
   supabase secrets set DJOMY_CLIENT_ID=djomy-merchant-XXXXX
   supabase secrets set DJOMY_CLIENT_SECRET=votre_secret_ici
   ```

---

## 🧪 TESTER L'INTÉGRATION

### Mode Sandbox (Tests)

Pour tester sans argent réel, utilisez le mode sandbox :

**Dans le code (exemple POSSystem.tsx) :**
```typescript
const { data, error } = await supabase.functions.invoke('djomy-init-payment', {
  body: {
    // ... autres paramètres
    useSandbox: true,  // ✅ Active le mode sandbox
  }
});
```

**Credentials sandbox :**
- URL : `https://sandbox-api.djomy.africa`
- Format ID : `djomy-merchant-sandbox-XXXXX`

### Mode Production (Argent réel)

Une fois les tests validés :

```typescript
useSandbox: false,  // ✅ Mode production activé
```

---

## ✅ VÉRIFICATION POST-CONFIGURATION

### 1. Tester un paiement de 100 GNF

**Via POS Vendeur :**
1. Connectez-vous comme vendeur
2. Ajoutez un produit au panier
3. Sélectionnez "Mobile Money"
4. Entrez votre numéro de test
5. Validez le paiement

**Vous devriez voir :**
- ✅ Message "Initialisation du paiement..."
- ✅ Notification sur votre téléphone (Orange Money / MTN)
- ✅ Transaction enregistrée dans la base de données

### 2. Vérifier les logs

**Dans Supabase :**
```sql
-- Voir les dernières transactions
SELECT * FROM djomy_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Voir les logs API
SELECT * FROM djomy_api_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔒 SÉCURITÉ

### ⚠️ CRITICAL - Ne JAMAIS commiter les secrets

```bash
# Vérifiez que .env est bien dans .gitignore
cat .gitignore | grep .env

# Si .env est déjà commité, le retirer de l'historique :
git rm --cached .env
git commit -m "security: Remove .env from git"
```

### ✅ Bonnes pratiques

1. **Utilisez des variables d'environnement** (Supabase Secrets)
2. **Rotation des secrets** tous les 3-6 mois
3. **Logs de monitoring** pour détecter les accès suspects
4. **IP Whitelisting** si Djomy le supporte

---

## 📞 CONTACTS UTILES

- **Support Djomy :** support@djomy.africa
- **Documentation API :** https://docs.djomy.africa (si disponible)
- **Dashboard Marchand :** https://merchant.djomy.africa
- **Téléphone Support :** [À demander à Djomy]

---

## 🐛 TROUBLESHOOTING

### Erreur 403 "Access Forbidden"

**Cause :** Credentials invalides ou format incorrect

**Solution :**
1. Vérifiez que le Client ID commence par `djomy-merchant-`
2. Vérifiez que le secret n'a pas d'espaces
3. Vérifiez que les secrets sont bien configurés dans Supabase

### Erreur 401 "Unauthorized"

**Cause :** Secret incorrect

**Solution :**
1. Regénérez le secret depuis le dashboard Djomy
2. Mettez à jour dans `.env` ET Supabase Secrets
3. Redéployez les edge functions

### Paiement bloqué "Pending" indéfiniment

**Cause :** Webhook non configuré ou URL invalide

**Solution :**
1. Configurez l'URL webhook dans Djomy dashboard :
   ```
   https://[VOTRE_PROJECT].supabase.co/functions/v1/djomy-webhook
   ```
2. Vérifiez que l'edge function `djomy-webhook` est déployée

---

## 📊 STATISTIQUES ACTUELLES

**État du système :**
- ✅ Edge Functions : 5 fonctions déployées
- ✅ Tables Database : Créées et indexées
- ❌ Credentials : Invalides (à remplacer)
- ✅ Code migré : Utilise `djomy-init-payment` (OAuth2 + cache)
- ✅ Mode production : Activé par défaut

**Prêt pour la production après obtention des vrais credentials !** 🚀
