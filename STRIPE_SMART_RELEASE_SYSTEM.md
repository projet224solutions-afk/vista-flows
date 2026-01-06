# 🔐 SYSTÈME DE DÉBLOCAGE DE FONDS HYBRIDE INTELLIGENT - 224SOLUTIONS

## 📋 ANALYSE DE L'EXISTANT

### ✅ Infrastructure actuelle
- **Table** : `stripe_transactions` avec statuts PENDING, SUCCEEDED, FAILED, CANCELED
- **Webhook** : `stripe-webhook` Edge Function (vérification signature)
- **Wallets** : Système de wallets avec `available_balance`, `pending_balance`, `frozen_balance`
- **KYC Vendeurs** : Table `vendor_kyc` avec statuts verified/pending/rejected
- **Commission** : Calcul automatique avec `process_successful_payment()`

### 🎯 Architecture proposée

```
┌─────────────────────────────────────────────────────────────┐
│           FLUX DE PAIEMENT STRIPE SÉCURISÉ                  │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  1. WEBHOOK STRIPE (payment_intent.succeeded)               │
│     ✓ Vérification signature Stripe-Signature               │
│     ✓ Validation PaymentIntent ID unique                    │
│     ✓ Montant amount_received exact                         │
│     ✓ Currency correcte                                     │
│     ✓ Status = succeeded                                    │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  2. DOUBLE VÉRIFICATION SERVEUR                             │
│     ✓ Appel API Stripe.retrievePaymentIntent()             │
│     ✓ Comparaison webhook vs API                           │
│     ✓ Vérifier charges.data[0].paid = true                 │
│     ❌ Incohérence → BLOCKED                                │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  3. CALCUL TRUST SCORE (0-100)                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Utilisateur ancien (>30j) : +20                   │  │
│  │ • Carte déjà utilisée sans litige : +20             │  │
│  │ • Vendeur KYC validé : +30                          │  │
│  │ • Montant dans la moyenne : +20                     │  │
│  │ • Aucun chargeback passé : +10                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ⚠️ BLOCAGES IMMÉDIATS (SCORE = 0)                         │
│  • Nouveau vendeur (<7 jours)                              │
│  • Montant anormalement élevé (>5x moyenne)                │
│  • Carte ou pays à risque                                  │
│  • Paiement inhabituel (heure/device)                      │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  4. DÉCISION AUTOMATIQUE                                    │
│                                                              │
│     Score ≥ 80 → AUTO_APPROVED (avec smart delay)          │
│     Score < 80 → ADMIN_REVIEW                               │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  5. SMART DELAY (même si AUTO_APPROVED)                     │
│                                                              │
│     • Fonds en pending_balance                              │
│     • Délai configurable : 30 min - 2h                      │
│     • Job scheduler vérifie litiges                         │
│     • Libération automatique → available_balance            │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  6. CONTRÔLE ALÉATOIRE                                      │
│                                                              │
│     1-5% transactions auto-validées                         │
│     Forcées en ADMIN_REVIEW                                 │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ STRUCTURE DES TABLES

### Table : `payment_risk_assessments`
```sql
CREATE TABLE payment_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES stripe_transactions(id),
  
  -- Trust Score
  trust_score INTEGER NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
  risk_level risk_level_enum NOT NULL,
  
  -- Facteurs de score
  user_age_days INTEGER,
  card_usage_count INTEGER,
  kyc_verified BOOLEAN,
  amount_deviation DECIMAL(5,2),
  chargeback_history INTEGER DEFAULT 0,
  
  -- Blocages
  auto_blocked BOOLEAN DEFAULT false,
  block_reasons TEXT[],
  
  -- Décision
  decision decision_enum NOT NULL,
  decision_made_at TIMESTAMPTZ DEFAULT NOW(),
  decision_expires_at TIMESTAMPTZ,
  
  -- Aléatoire
  random_review BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE risk_level_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE decision_enum AS ENUM ('AUTO_APPROVED', 'ADMIN_REVIEW', 'BLOCKED');
```

### Table : `funds_release_schedule`
```sql
CREATE TABLE funds_release_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES stripe_transactions(id),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  
  -- Montants
  amount_held INTEGER NOT NULL,
  amount_to_release INTEGER NOT NULL,
  
  -- Scheduling
  held_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_release_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  
  -- Statut
  status release_status_enum DEFAULT 'PENDING',
  
  -- Admin override
  approved_by UUID REFERENCES profiles(id),
  rejected_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE release_status_enum AS ENUM (
  'PENDING',      -- En attente
  'SCHEDULED',    -- Planifié
  'RELEASED',     -- Libéré
  'REJECTED',     -- Rejeté par admin
  'DISPUTED'      -- En litige
);
```

### Table : `payment_fraud_signals`
```sql
CREATE TABLE payment_fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES stripe_transactions(id),
  
  -- Type de signal
  signal_type fraud_signal_enum NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 1 AND 10),
  
  -- Détails
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  
  -- Résolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE fraud_signal_enum AS ENUM (
  'UNUSUAL_AMOUNT',
  'NEW_SELLER',
  'HIGH_VELOCITY',
  'RISKY_COUNTRY',
  'SUSPICIOUS_PATTERN',
  'CARD_TESTING',
  'DEVICE_MISMATCH'
);
```

## 📁 FICHIERS À CRÉER

### 1. Migration SQL
`supabase/migrations/20260106_smart_funds_release.sql`

### 2. Edge Functions
- `supabase/functions/assess-payment-risk/index.ts`
- `supabase/functions/admin-review-payment/index.ts`
- `supabase/functions/release-scheduled-funds/index.ts` (CRON)

### 3. Frontend Components
- `src/components/admin/PaymentReviewQueue.tsx`
- `src/components/vendor/FundsReleaseStatus.tsx`

### 4. Services
- `src/services/payment/PaymentRiskService.ts`

## 🔧 RÈGLES DE SCORING

### Calcul du Trust Score (0-100)

```typescript
function calculateTrustScore(params: {
  userAgeDays: number;
  cardUsageCount: number;
  kycVerified: boolean;
  amount: number;
  averageAmount: number;
  chargebackCount: number;
  sellerAgeDays: number;
}): number {
  let score = 0;
  
  // 1. Âge utilisateur (0-20 points)
  if (params.userAgeDays > 90) score += 20;
  else if (params.userAgeDays > 30) score += 15;
  else if (params.userAgeDays > 7) score += 10;
  
  // 2. Carte déjà utilisée (0-20 points)
  if (params.cardUsageCount > 10) score += 20;
  else if (params.cardUsageCount > 5) score += 15;
  else if (params.cardUsageCount > 2) score += 10;
  
  // 3. KYC vendeur (0-30 points)
  if (params.kycVerified) score += 30;
  
  // 4. Montant normal (0-20 points)
  const deviation = Math.abs(params.amount - params.averageAmount) / params.averageAmount;
  if (deviation < 0.5) score += 20;
  else if (deviation < 1.0) score += 15;
  else if (deviation < 2.0) score += 10;
  
  // 5. Pas de chargeback (0-10 points)
  if (params.chargebackCount === 0) score += 10;
  
  return Math.min(score, 100);
}
```

### Blocages Automatiques

```typescript
function checkAutoBlock(params: {
  sellerAgeDays: number;
  amount: number;
  averageAmount: number;
  countryCode: string;
  hourOfDay: number;
}): { blocked: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  // Nouveau vendeur
  if (params.sellerAgeDays < 7) {
    reasons.push('Vendeur créé il y a moins de 7 jours');
  }
  
  // Montant anormal
  if (params.amount > params.averageAmount * 5) {
    reasons.push('Montant 5x supérieur à la moyenne');
  }
  
  // Pays à risque
  const riskyCountries = ['XX', 'YY'];
  if (riskyCountries.includes(params.countryCode)) {
    reasons.push('Pays à risque élevé');
  }
  
  // Heure suspecte (3h-5h du matin)
  if (params.hourOfDay >= 3 && params.hourOfDay <= 5) {
    reasons.push('Paiement à heure inhabituelle');
  }
  
  return {
    blocked: reasons.length > 0,
    reasons
  };
}
```

## 🎛️ CONFIGURATION

### Variables d'environnement
```env
# Délais de libération
FUNDS_RELEASE_DELAY_HIGH_RISK=7200  # 2h
FUNDS_RELEASE_DELAY_MEDIUM_RISK=3600  # 1h
FUNDS_RELEASE_DELAY_LOW_RISK=1800  # 30min

# Seuils de score
TRUST_SCORE_AUTO_APPROVE=80
TRUST_SCORE_ADMIN_REVIEW=50

# Contrôle aléatoire
RANDOM_REVIEW_PERCENTAGE=3  # 3%
```

## 🧪 SCÉNARIOS DE TEST

### Test 1 : Paiement LOW RISK (auto-approuvé)
- Vendeur ancien (>30j) + KYC validé
- Carte utilisée 10x
- Montant normal
- **Attendu** : Trust Score = 90, AUTO_APPROVED, libération après 30 min

### Test 2 : Paiement MEDIUM RISK (review admin)
- Vendeur récent (15j) sans KYC
- Première utilisation carte
- Montant légèrement élevé
- **Attendu** : Trust Score = 45, ADMIN_REVIEW

### Test 3 : Paiement HIGH RISK (bloqué)
- Vendeur nouveau (<7j)
- Montant 10x moyenne
- **Attendu** : Trust Score = 0, BLOCKED, alerte admin

### Test 4 : Contrôle aléatoire
- Paiement normal (score 85)
- Tirage aléatoire 3%
- **Attendu** : Marqué random_review=true, ADMIN_REVIEW malgré score élevé

---

**Date de création** : 2026-01-06  
**Auteur** : GitHub Copilot  
**Version** : 1.0.0  
**Statut** : 📋 Spécification
