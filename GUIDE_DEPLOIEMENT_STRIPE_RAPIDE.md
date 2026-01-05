# GUIDE RAPIDE - DEPLOIEMENT STRIPE V2

## ETAPE 1 : APPLIQUER LA MIGRATION SQL ✅

**Dans l'onglet Supabase qui vient de s'ouvrir :**

1. Le SQL est déjà dans votre presse-papiers
2. Faites **Ctrl+V** dans l'éditeur
3. Cliquez sur **RUN** (bouton en bas à droite)
4. Attendez ~10 secondes
5. Vous devriez voir : "Success. No rows returned"

---

## ETAPE 2 : VERIFICATION AUTOMATIQUE

Une fois que vous avez cliqué sur RUN, revenez ici et tapez : **"appliqué"**

Je vérifierai automatiquement que toutes les tables sont créées :
- stripe_config
- stripe_transactions
- stripe_wallets
- stripe_wallet_transactions
- stripe_withdrawals

---

## ETAPE 3 : MISE A JOUR DES TYPES TYPESCRIPT

Je mettrai à jour automatiquement les fichiers :
- src/types/stripePayment.ts (nouveaux noms de tables)
- src/components Stripe (références aux tables)

---

## ETAPE 4 : DEPLOIEMENT EDGE FUNCTIONS

Je déploierai les Edge Functions :
- create-payment-intent
- stripe-webhook

---

## ETAPE 5 : TEST FINAL

Je lancerai un test complet du système pour vérifier :
- ✓ Tables créées
- ✓ Types à jour
- ✓ Functions déployées
- ✓ Paiement test fonctionnel

---

**MAINTENANT : Collez le SQL dans Supabase (Ctrl+V) et cliquez RUN !**

Puis revenez me dire "appliqué" 🚀
