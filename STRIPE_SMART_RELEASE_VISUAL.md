# 🎨 VISUALISATION - SYSTÈME DE DÉBLOCAGE INTELLIGENT

## 📊 VUE D'ENSEMBLE DU SYSTÈME

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PAIEMENT STRIPE RÉUSSI                           │
│                   (payment_intent.succeeded)                        │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│               🔐 VÉRIFICATION SIGNATURE WEBHOOK                     │
│                   stripe.webhooks.constructEvent()                  │
│                                                                      │
│   ✅ Signature valide → Continuer                                   │
│   ❌ Signature invalide → Rejeter (HTTP 400)                        │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│          🔍 DOUBLE VÉRIFICATION AVEC API STRIPE                     │
│             stripe.paymentIntents.retrieve(pi_xxx)                  │
│                                                                      │
│   Compare:                                                           │
│   • Montant webhook vs API                                          │
│   • Currency webhook vs API                                         │
│   • Status = succeeded                                              │
│   • charge.paid = true                                              │
│                                                                      │
│   ✅ Cohérent → Continuer                                           │
│   ❌ Incohérent → BLOCKED + fraud_signal                            │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│            📈 CALCUL DU TRUST SCORE (0-100)                         │
│          calculate_payment_trust_score()                            │
│                                                                      │
│   Facteur 1: Âge utilisateur (0-20 pts)                            │
│   ├─ >90 jours: 20 pts                                             │
│   ├─ >30 jours: 15 pts                                             │
│   ├─ >7 jours: 10 pts                                              │
│   └─ <7 jours: 5 pts                                               │
│                                                                      │
│   Facteur 2: Historique carte (0-20 pts)                           │
│   ├─ >10 transactions: 20 pts                                      │
│   ├─ >5 transactions: 15 pts                                       │
│   ├─ >2 transactions: 10 pts                                       │
│   └─ Première utilisation: 5 pts                                   │
│                                                                      │
│   Facteur 3: KYC vendeur (0-30 pts)                                │
│   ├─ Vérifié: 30 pts                                               │
│   └─ Non vérifié: 0 pts                                            │
│                                                                      │
│   Facteur 4: Montant normal (0-20 pts)                             │
│   ├─ Déviation <50%: 20 pts                                        │
│   ├─ Déviation <100%: 15 pts                                       │
│   ├─ Déviation <200%: 10 pts                                       │
│   └─ Déviation ≥200%: 5 pts                                        │
│                                                                      │
│   Facteur 5: Pas de chargeback (0-10 pts)                          │
│   ├─ 0 chargeback: 10 pts                                          │
│   ├─ ≤2 chargebacks: 5 pts                                         │
│   └─ >2 chargebacks: 0 pts                                         │
│                                                                      │
│   🚨 BLOCAGES AUTO (score forcé à 0):                              │
│   • Vendeur créé il y a <7 jours                                   │
│   • Montant >5x moyenne du vendeur                                 │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼
       ┌──────────┴──────────┐
       │                     │
       ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Score ≥ 80 │    │ Score 50-79  │    │  Score < 50  │
│              │    │              │    │   ou AUTO    │
│ AUTO_APPROVED│    │ ADMIN_REVIEW │    │   BLOCKED    │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │                   │                   │
       │    ┌─────────────►│                   │
       │    │ 3% random     │                   │
       │    │ review        │                   │
       ▼    │               ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  SMART DELAY    │  │  ATTENTE ADMIN  │  │    AUCUN        │
│                 │  │                 │  │   CRÉDIT        │
│ pending_balance │  │ pending_balance │  │                 │
│    + amount     │  │    + amount     │  │ fraud_signals   │
│                 │  │                 │  │    créés        │
│ Planifié:       │  │ Status: PENDING │  │                 │
│ • ≥90: 30 min   │  │                 │  │ Admin alerté    │
│ • ≥80: 60 min   │  │ Admin review    │  │                 │
│ • ≥70: 90 min   │  │ dans dashboard  │  └─────────────────┘
│ • <70: 120 min  │  │                 │
└────────┬────────┘  └────────┬────────┘
         │                    │
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│   CRON JOB      │  │  ADMIN DÉCIDE   │
│  (Toutes les    │  │                 │
│   5 minutes)    │  │ ┌─────────────┐ │
│                 │  │ │  APPROUVER  │ │
│ IF scheduled_   │  │ │      ↓      │ │
│ release_at ≤    │  │ │  Libération │ │
│ NOW()           │  │ │  immédiate  │ │
│                 │  │ └─────────────┘ │
│ THEN:           │  │                 │
│ • pending →     │  │ ┌─────────────┐ │
│   available     │  │ │   REJETER   │ │
│ • Notification  │  │ │      ↓      │ │
│ • wallet_tx     │  │ │ Remboursement│ │
│   créée         │  │ │   Stripe    │ │
│                 │  │ └─────────────┘ │
└────────┬────────┘  └────────┬────────┘
         │                    │
         └───────────┬────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   FONDS DISPONIBLES   │
         │  available_balance    │
         │                       │
         │ Vendeur peut retirer  │
         └───────────────────────┘
```

---

## 📱 INTERFACES UTILISATEURS

### Interface Admin - File d'attente de révision

```
╔═══════════════════════════════════════════════════════════════╗
║  🛡️  FILE D'ATTENTE DE RÉVISION DES PAIEMENTS              ║
║                                                               ║
║  [ 3 paiements en attente ]                                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Date         Vendeur        Acheteur      Montant    Score  ║
║  ─────────────────────────────────────────────────────────── ║
║  il y a 5min  Jean Dupont    Marie L.      5,000 XOF  65/100║
║  📧 jean@ex.  📧 marie@ex.    Trust Score   🟡 MEDIUM ║
║  🎲 Contrôle  ✅ KYC Vérifié  0 signaux                      ║
║  aléatoire                                                    ║
║                [✅ Approuver]  [❌ Rejeter]                   ║
║  ─────────────────────────────────────────────────────────── ║
║  il y a 12min Boutique A     Pierre K.     15,000 XOF 45/100║
║  📧 shop@ex.  📧 pierre@ex.   Trust Score   🔴 HIGH    ║
║  ⚠️ Nouveau   ❌ KYC Manquant 2 signaux                      ║
║  vendeur                                                      ║
║                [✅ Approuver]  [❌ Rejeter]                   ║
║  ─────────────────────────────────────────────────────────── ║
║  il y a 30min Service Pro    Client B.     8,500 XOF  72/100║
║  📧 serv@ex.  📧 client@ex.   Trust Score   🟡 MEDIUM ║
║  💳 1ère carte ✅ KYC Vérifié  0 signaux                      ║
║                [✅ Approuver]  [❌ Rejeter]                   ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Interface Vendeur - Statut des fonds

```
╔═══════════════════════════════════════════════════════════════╗
║  💰 MES FONDS                                                 ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ ║
║  │ 💵 DISPONIBLE   │  │ ⏳ EN ATTENTE   │  │ 📊 TOTAL     │ ║
║  │                 │  │                 │  │   GAGNÉ      │ ║
║  │   125,000 XOF   │  │    15,000 XOF   │  │ 850,000 XOF  │ ║
║  │                 │  │                 │  │              │ ║
║  │ Utilisable      │  │ 2 paiements     │  │ Toutes       │ ║
║  │ immédiatement   │  │ en cours        │  │ périodes     │ ║
║  └─────────────────┘  └─────────────────┘  └──────────────┘ ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  🔄 LIBÉRATIONS EN COURS                                      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌───────────────────────────────────────────────────────┐   ║
║  │ 💰 8,500 XOF  [🟢 Planifié]                           │   ║
║  │                                                        │   ║
║  │ Reçu il y a 25 minutes                                │   ║
║  │ 🛡️ Trust Score: 85/100                                │   ║
║  │                                                        │   ║
║  │ Libération dans: 35 min                               │   ║
║  │ ████████████████░░░░  75%                             │   ║
║  │                                                        │   ║
║  │ 📝 Transaction: pi_1JkQp2...                          │   ║
║  │ 🤖 Type: Automatique                                  │   ║
║  └───────────────────────────────────────────────────────┘   ║
║                                                               ║
║  ┌───────────────────────────────────────────────────────┐   ║
║  │ 💰 6,500 XOF  [🟡 En révision]                        │   ║
║  │                                                        │   ║
║  │ Reçu il y a 45 minutes                                │   ║
║  │ 🛡️ Trust Score: 65/100                                │   ║
║  │                                                        │   ║
║  │ ⚠️ Révision en cours                                  │   ║
║  │ Ce paiement fait l'objet d'un contrôle de routine     │   ║
║  │ aléatoire. Les fonds seront libérés après validation. │   ║
║  │                                                        │   ║
║  │ 📝 Transaction: pi_1JkQp3...                          │   ║
║  │ 👨‍💼 Type: Manuel (admin)                              │   ║
║  └───────────────────────────────────────────────────────┘   ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  ℹ️ Système de protection des paiements                      ║
║                                                               ║
║  Pour votre sécurité, tous les paiements font l'objet d'une  ║
║  vérification automatique avant libération des fonds.         ║
║  Les paiements à faible risque sont libérés automatiquement   ║
║  après un délai de 30 minutes à 2 heures.                     ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 📈 DISTRIBUTION DU TRUST SCORE (Objectif)

```
Distribution attendue sur 1000 paiements:

 100 │
  90 │                         ████████████
  80 │                   ██████████████████████
     │                 ████████████████████████████  ← 90% AUTO_APPROVED
  70 │               ██████████████████████████████
  60 │             ████████████████████████████████
     │           ██████████████████████████████████
  50 │         ██████████████████████████████████   ← Seuil ADMIN_REVIEW
     │       ████                                  ← 7% ADMIN_REVIEW
  40 │     ██
  30 │   ██
     │ ██                                          ← 3% BLOCKED
  20 │█
  10 │
   0 └──────────────────────────────────────────
     0    100   200   300   400   500   600   700   800   900  1000

Légende:
█ = 10 paiements

Répartition:
• Score 80-100 (LOW RISK):    900 paiements (90%) → AUTO_APPROVED
• Score 50-79 (MEDIUM RISK):   70 paiements (7%)  → ADMIN_REVIEW
• Score 0-49 (HIGH RISK):       30 paiements (3%)  → BLOCKED/ADMIN_REVIEW
```

---

## ⏱️ TIMELINE D'UN PAIEMENT TYPICAL

```
T+0min    Client paie avec Stripe
          ├─ Stripe crée PaymentIntent
          └─ Carte débitée

T+5sec    Webhook reçu
          ├─ Signature vérifiée ✅
          ├─ Transaction créée dans stripe_transactions
          └─ assess-payment-risk appelé

T+10sec   Évaluation des risques
          ├─ Double vérification API Stripe ✅
          ├─ Trust Score calculé: 85/100
          ├─ Décision: AUTO_APPROVED
          ├─ Délai: 60 minutes
          └─ Fonds → pending_balance

T+60min   CRON job s'exécute
          ├─ Détecte scheduled_release_at expiré
          ├─ Transfère pending → available
          ├─ Notification vendeur envoyée
          └─ wallet_transaction créée

T+61min   Vendeur peut retirer
          └─ Fonds dans available_balance ✅

┌──────────────────────────────────────────────────────────┐
│  TOTAL: ~61 minutes de bout en bout                     │
│  (dont 60 minutes de smart delay pour sécurité)         │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 FLOW DES DONNÉES

```
┌─────────────┐
│   STRIPE    │
│   (Cloud)   │
└──────┬──────┘
       │ webhook
       ▼
┌─────────────────────────────────────────────────┐
│          SUPABASE EDGE FUNCTIONS                │
│                                                  │
│  ┌────────────────┐      ┌──────────────────┐  │
│  │ stripe-webhook │─────►│ assess-payment-  │  │
│  │    (main)      │      │     risk         │  │
│  └────────────────┘      └─────────┬────────┘  │
│                                    │            │
│                    ┌───────────────┘            │
│                    ▼                            │
│         ┌────────────────────┐                  │
│         │  release-scheduled-│◄─────CRON        │
│         │      funds         │     (5 min)      │
│         └─────────┬──────────┘                  │
│                   │                             │
│                   │  ┌──────────────────┐       │
│                   └─►│ admin-review-    │       │
│                      │   payment        │       │
│                      └──────────────────┘       │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│          SUPABASE POSTGRESQL                    │
│                                                  │
│  ┌──────────────────┐  ┌────────────────────┐  │
│  │stripe_transactions│  │payment_risk_       │  │
│  │                   │  │  assessments       │  │
│  └──────────────────┘  └────────────────────┘  │
│                                                  │
│  ┌──────────────────┐  ┌────────────────────┐  │
│  │funds_release_    │  │payment_fraud_      │  │
│  │  schedule        │  │  signals           │  │
│  └──────────────────┘  └────────────────────┘  │
│                                                  │
│  ┌──────────────────┐  ┌────────────────────┐  │
│  │    wallets       │  │chargeback_history  │  │
│  │                   │  │                    │  │
│  └──────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│             REACT FRONTEND                      │
│                                                  │
│  ADMIN:                    VENDEUR:             │
│  • PaymentReviewQueue      • FundsReleaseStatus │
│  • PaymentSystemConfig                          │
└─────────────────────────────────────────────────┘
```

---

## 🎯 DÉCISIONS SELON LE TRUST SCORE

```
Trust Score    Décision          Action                        Délai
────────────────────────────────────────────────────────────────────────
  95-100     AUTO_APPROVED    Libération automatique        30 min
   90-94     AUTO_APPROVED    Libération automatique        30 min
   85-89     AUTO_APPROVED    Libération automatique        60 min
   80-84     AUTO_APPROVED    Libération automatique        60 min  ← Seuil
   75-79     ADMIN_REVIEW     Validation manuelle requise   Variable
   70-74     ADMIN_REVIEW     Validation manuelle requise   Variable
   65-69     ADMIN_REVIEW     Validation manuelle requise   Variable
   60-64     ADMIN_REVIEW     Validation manuelle requise   Variable
   55-59     ADMIN_REVIEW     Validation manuelle requise   Variable
   50-54     ADMIN_REVIEW     Validation manuelle requise   Variable  ← Seuil
   45-49     BLOCKED          Aucun crédit, alerte admin    N/A
   40-44     BLOCKED          Aucun crédit, alerte admin    N/A
    0-39     BLOCKED          Aucun crédit, alerte admin    N/A

Special:
• 3% des AUTO_APPROVED → forcés en ADMIN_REVIEW (contrôle aléatoire)
• Vendeur < 7 jours → BLOCKED (quelque soit le score)
• Montant > 5x moyenne → BLOCKED (quelque soit le score)
```

---

## 📊 TABLES DE LA BASE DE DONNÉES

```
┌────────────────────────────────────────────────────────────┐
│  payment_risk_assessments                                  │
├────────────────────────────────────────────────────────────┤
│  • id (UUID)                                               │
│  • transaction_id (FK → stripe_transactions)               │
│  • trust_score (0-100)                                     │
│  • risk_level (LOW, MEDIUM, HIGH, CRITICAL)                │
│  • decision (AUTO_APPROVED, ADMIN_REVIEW, BLOCKED)         │
│  • user_age_score, card_history_score, kyc_score, etc.    │
│  • auto_blocked (boolean)                                  │
│  • block_reasons (text[])                                  │
│  • random_review (boolean)                                 │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  funds_release_schedule                                    │
├────────────────────────────────────────────────────────────┤
│  • id (UUID)                                               │
│  • transaction_id (FK → stripe_transactions)               │
│  • wallet_id (FK → wallets)                                │
│  • amount_to_release (integer centimes)                    │
│  • held_at, scheduled_release_at, released_at              │
│  • status (PENDING, SCHEDULED, RELEASED, REJECTED)         │
│  • approved_by, rejected_by (FK → profiles)                │
│  • rejection_reason (text)                                 │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  payment_fraud_signals                                     │
├────────────────────────────────────────────────────────────┤
│  • id (UUID)                                               │
│  • transaction_id (FK → stripe_transactions)               │
│  • signal_type (UNUSUAL_AMOUNT, NEW_SELLER, etc.)          │
│  • severity (1-10)                                         │
│  • description, details (jsonb)                            │
│  • resolved (boolean)                                      │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  chargeback_history                                        │
├────────────────────────────────────────────────────────────┤
│  • id (UUID)                                               │
│  • stripe_charge_id                                        │
│  • buyer_id, seller_id (FK → profiles)                     │
│  • amount, reason, status                                  │
│  • disputed_at, resolved_at                                │
└────────────────────────────────────────────────────────────┘
```

---

**Date:** 2026-01-06  
**Version:** 1.0.0  
**Auteur:** GitHub Copilot  
**Type:** Documentation visuelle
