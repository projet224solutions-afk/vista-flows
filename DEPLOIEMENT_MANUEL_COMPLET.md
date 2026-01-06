# GUIDE DE DEPLOIEMENT MANUEL - 224SOLUTIONS
## Etape par Etape sans CLI

**Date:** 6 janvier 2026  
**Duree totale:** 20-30 minutes  

---

## PHASE 1: Regeneration Secret Djomy (10-15 min)

### Etape 1: Regenerer le secret sur Djomy

1. **Ouvrir le dashboard Djomy:**
   ```
   https://djomy.com/dashboard
   ```

2. **Se connecter** avec vos identifiants PDG

3. **Naviguer vers:**
   ```
   Parametres → API → Client Secret
   ```

4. **Cliquer sur** "Regenerer le secret"

5. **Copier** le nouveau secret genere (format: `djomy_xxx...`)

### Etape 2: Mettre a jour dans Supabase

1. **Ouvrir Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/settings/vault
   ```

2. **Aller dans:** Settings → Vault (Secrets)

3. **Trouver:** `JOMY_CLIENT_SECRET`

4. **Modifier** ou **Creer** le secret avec la nouvelle valeur

5. **Sauvegarder**

### Etape 3: Verification

1. **Tester une transaction wallet** dans l'application

2. **Verifier les logs:**
   ```
   https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs
   ```

3. **Succes si:**
   - Transaction reussit
   - Pas d'erreur "Client secret invalid"
   - Pas d'erreur 403 Forbidden

---

## PHASE 2: Deploiement Edge Functions (15-20 min)

### Fonctions a deployer:

#### 1. create-pdg-agent (PRIORITE 1)

**Fichier:** `supabase\functions\create-pdg-agent\index.ts`

**Deploiement:**
1. Ouvrir: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/functions
2. Cliquer sur "create-pdg-agent"
3. Cliquer "Deploy new version"
4. Coller le contenu du fichier
5. Cliquer "Deploy"
6. Attendre "Deployed successfully"

#### 2. create-sub-agent (PRIORITE 1)

**Fichier:** `supabase\functions\create-sub-agent\index.ts`

**Deploiement:**
1. Ouvrir: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/functions
2. Cliquer sur "create-sub-agent"
3. Cliquer "Deploy new version"
4. Coller le contenu du fichier
5. Cliquer "Deploy"
6. Attendre "Deployed successfully"

#### 3. wallet-operations (PRIORITE 2)

**Fichier:** `supabase\functions\wallet-operations\index.ts`

Meme procedure que ci-dessus.

#### 4. wallet-transfer (PRIORITE 2)

**Fichier:** `supabase\functions\wallet-transfer\index.ts`

Meme procedure que ci-dessus.

#### 5. stripe-webhook (PRIORITE 3)

**Fichier:** `supabase\functions\stripe-webhook\index.ts`

Meme procedure que ci-dessus.

### Verification:

1. **Verifier dates de deploiement:**
   - Toutes doivent afficher "Last deployed: Today"

2. **Tester CORS:**
   - Creer un agent depuis l'interface
   - Verifier dans DevTools → Network
   - Headers Access-Control-Allow-Origin doivent etre restrictifs

3. **Tester validation commission:**
   - Essayer de creer un agent avec commission > 50%
   - Devrait retourner erreur 400

---

## PHASE 3: Migration Smart Funds Release (5-10 min)

### Etape 1: Copier la migration

1. **Ouvrir le fichier:**
   ```
   d:\224Solutions\supabase\migrations\20260106000000_smart_funds_release.sql
   ```

2. **Selectionner tout** (Ctrl+A) et **Copier** (Ctrl+C)

### Etape 2: Executer dans Supabase

1. **Ouvrir SQL Editor:**
   ```
   https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new
   ```

2. **Coller** le contenu de la migration (Ctrl+V)

3. **Cliquer** sur "Run" (en bas a droite)

4. **Attendre** le message "Success"

### Etape 3: Verification

1. **Verifier les tables creees:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name LIKE 'payment%';
   ```
   
   **Devrait afficher:**
   - payment_risk_assessments
   - payment_fraud_signals

2. **Verifier les fonctions creees:**
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
     AND routine_name LIKE '%payment%';
   ```
   
   **Devrait afficher:**
   - calculate_payment_trust_score
   - schedule_funds_release
   - release_scheduled_funds
   - admin_approve_payment
   - admin_reject_payment

3. **Verifier la vue admin:**
   ```sql
   SELECT * FROM admin_payment_review_queue LIMIT 5;
   ```

---

## CHECKLIST COMPLETE

### Phase 1: Djomy
- [ ] Dashboard Djomy ouvert
- [ ] Secret regenere
- [ ] Nouveau secret copie
- [ ] Secret mis a jour dans Supabase Vault
- [ ] Transaction test reussie
- [ ] Logs verifies (pas d'erreur)

### Phase 2: Edge Functions
- [ ] create-pdg-agent deploye
- [ ] create-sub-agent deploye
- [ ] wallet-operations deploye
- [ ] wallet-transfer deploye
- [ ] stripe-webhook deploye
- [ ] Dates "Last deployed" = Today
- [ ] CORS verifie (restrictif)
- [ ] Validation commission testee

### Phase 3: Smart Funds
- [ ] Migration SQL copiee
- [ ] Executee dans SQL Editor
- [ ] Message "Success" recu
- [ ] 4 tables creees
- [ ] 5 fonctions creees
- [ ] Vue admin creee
- [ ] Tests SQL passes

---

## VERIFICATION FINALE

Une fois tout termine:

1. **Test complet de bout en bout:**
   - Faire un achat avec Stripe
   - Verifier le Trust Score calcule
   - Verifier la planification de liberation
   - Verifier les logs sans erreur

2. **Verifier les logs Supabase:**
   - Edge Functions: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs/edge-functions
   - Database: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs/postgres-logs

3. **Criteres de succes:**
   - Secret Djomy regenere et fonctionnel
   - 5 Edge Functions deployees
   - Migration Smart Funds appliquee
   - Transaction test reussie
   - Aucune erreur dans les logs

---

## EN CAS DE PROBLEME

### Probleme: Secret Djomy ne fonctionne pas
1. Verifier que le secret copie est complet (pas de coupure)
2. Verifier qu'il n'y a pas d'espaces avant/apres
3. Regenerer a nouveau si necessaire
4. Attendre 1-2 minutes pour la propagation

### Probleme: Edge Function en erreur
1. Verifier les logs: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs/edge-functions
2. Verifier la syntaxe du fichier index.ts
3. Verifier que tous les imports sont presents
4. Redeployer si necessaire

### Probleme: Migration SQL echoue
1. Verifier que les tables n'existent pas deja
2. Executer section par section si erreur
3. Verifier les dependances (tables stripe_transactions, wallets, etc.)
4. Contacter support si bloque

---

## PROCHAINES ETAPES (POST-DEPLOIEMENT)

### Court terme (aujourd'hui)
1. **Integrer Trust Score au webhook Stripe**
   - Modifier `supabase/functions/stripe-webhook/index.ts`
   - Appeler `calculate_payment_trust_score()` apres `payment.succeeded`

2. **Creer CRON job liberation fonds**
   - Supabase → Database → Cron Jobs
   - Nom: `release-scheduled-funds`
   - Interval: `*/5 * * * *` (toutes les 5 minutes)

### Moyen terme (cette semaine)
3. **Interface admin revision paiements**
   - Creer composant AdminPaymentReviewQueue.tsx
   - Utiliser vue `admin_payment_review_queue`

4. **Interface vendeur statut fonds**
   - Integrer FundsReleaseStatus.tsx dans dashboard vendeur

5. **Tests en production**
   - Faire paiements test
   - Verifier Trust Score
   - Verifier liberation automatique

---

**IMPORTANT:** Gardez ce guide ouvert pendant le deploiement et cochez chaque etape completee.

*Derniere mise a jour: 6 janvier 2026*
