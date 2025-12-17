# 🚨 RÉSOUDRE L'ERREUR 624 CINETPAY - GUIDE RAPIDE

## ❌ Erreur Actuelle
```
UNKNOWN_ERROR: An error occurred while processing the request 
(code: 624 | id: 1765973989.7184)
```

**Localisation:** Interface vendeur → Bouton POS → Paiement Orange Money

**Cause:** Credentials CinetPay non configurés dans `.env`

---

## ✅ SOLUTION EN 3 ÉTAPES

### ÉTAPE 1: Créer/Activer votre compte CinetPay

1. **Allez sur:** [https://cinetpay.com](https://cinetpay.com)
2. **Cliquez:** "S'inscrire" ou "Créer un compte"
3. **Remplissez:**
   - Nom de l'entreprise: 224Solutions
   - Email professionnel
   - Téléphone
   - Pays: Guinée
4. **Vérifiez** votre email
5. **Complétez** le KYC (documents d'identité)
6. **Attendez** l'activation (24-48h généralement)

### ÉTAPE 2: Obtenir vos Credentials

Une fois votre compte activé:

1. **Connectez-vous:** [https://dashboard.cinetpay.com](https://dashboard.cinetpay.com)
2. **Allez dans:** Paramètres → API
3. **Copiez:**
   - ✅ **API Key** (chaîne longue alphanumérique)
   - ✅ **Site ID** (nombre, ex: 123456)

**Screenshot des champs à copier:**
```
┌─────────────────────────────────────────┐
│ Configuration API                        │
├─────────────────────────────────────────┤
│ API Key: abc123def456...                │  ← COPIEZ CECI
│ Site ID: 123456                         │  ← COPIEZ CECI
│ Mode: Sandbox / Production              │
└─────────────────────────────────────────┘
```

### ÉTAPE 3: Configurer le fichier .env

1. **Ouvrez:** `d:\224Solutions\.env` (déjà ouvert dans votre éditeur)

2. **Remplacez les valeurs:**
   ```bash
   # AVANT (placeholders)
   VITE_CINETPAY_API_KEY="VOTRE_CLE_API_CINETPAY"
   VITE_CINETPAY_SITE_ID="VOTRE_SITE_ID_CINETPAY"
   VITE_CINETPAY_MODE="sandbox"
   
   # APRÈS (vos vraies valeurs)
   VITE_CINETPAY_API_KEY="abc123def456ghi789jkl..."  ← Collez votre API Key
   VITE_CINETPAY_SITE_ID="123456"                     ← Collez votre Site ID
   VITE_CINETPAY_MODE="sandbox"                       ← ou "production" si compte activé
   ```

3. **Sauvegardez** le fichier `.env`

4. **Redémarrez** le serveur:
   ```bash
   # Arrêtez le serveur (Ctrl+C dans le terminal)
   # Relancez:
   npm run dev
   ```

---

## 🧪 TESTER LE PAIEMENT

1. **Ouvrez** l'interface vendeur
2. **Allez sur** le bouton POS
3. **Testez** avec numéros sandbox CinetPay:
   - Orange Money test: `620000000` (succès garanti)
   - MTN Money test: `655000000` (succès garanti)
   - Montant test: 1000 GNF

**Résultat attendu:**
- ✅ Pas d'erreur 624
- ✅ Redirection vers page de paiement CinetPay
- ✅ Simulation de paiement réussie (mode sandbox)

---

## ⚠️ SI VOUS N'AVEZ PAS ENCORE DE COMPTE CINETPAY

**Option 1 - Utiliser des credentials de test (temporaire)**

Contactez le support CinetPay pour des credentials sandbox:
- Email: support@cinetpay.com
- Objet: "Demande credentials sandbox pour tests 224Solutions"

**Option 2 - Désactiver temporairement CinetPay**

En attendant l'activation de votre compte, vous pouvez:

1. Masquer le bouton Orange Money dans l'interface vendeur
2. Utiliser uniquement les autres moyens de paiement (Wallet, Cash)

---

## 🔍 VÉRIFICATION RAPIDE

**Vérifier que les credentials sont bien chargés:**

1. Ouvrez la console browser (F12) dans l'interface vendeur
2. Tapez:
   ```javascript
   console.log('API Key:', import.meta.env.VITE_CINETPAY_API_KEY?.substring(0, 10) + '...');
   console.log('Site ID:', import.meta.env.VITE_CINETPAY_SITE_ID);
   console.log('Mode:', import.meta.env.VITE_CINETPAY_MODE);
   ```

**Résultat attendu:**
```
API Key: abc123def4...
Site ID: 123456
Mode: sandbox
```

**Si vous voyez `undefined`:**
- ❌ Le serveur n'a pas été redémarré
- ❌ Le fichier `.env` n'a pas été sauvegardé
- ❌ Les noms de variables sont incorrects

---

## 📞 SUPPORT

**CinetPay:**
- Dashboard: [https://dashboard.cinetpay.com](https://dashboard.cinetpay.com)
- Email: support@cinetpay.com
- Documentation: [https://docs.cinetpay.com](https://docs.cinetpay.com)

**224Solutions (technique):**
- Voir: `CINETPAY_INTEGRATION_COMPLETE.md`
- Service: `src/services/payment/CinetPayService.ts`
- Composant: `src/components/payment/CinetPayOrangeMoneyButton.tsx`

---

## ✅ CHECKLIST

- [ ] Compte CinetPay créé
- [ ] KYC complété
- [ ] Compte activé
- [ ] API Key copiée
- [ ] Site ID copié
- [ ] `.env` modifié avec vraies valeurs
- [ ] `.env` sauvegardé
- [ ] Serveur redémarré (`npm run dev`)
- [ ] Test avec 620000000 réussi
- [ ] Pas d'erreur 624

---

**Une fois tout configuré, l'erreur 624 disparaîtra complètement! 🎉**
