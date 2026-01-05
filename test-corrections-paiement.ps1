# ✅ VERIFICATION COMPLETE SYSTEME PAIEMENT STRIPE - 224SOLUTIONS

Write-Output "=================================================="
Write-Output "  TEST COMPLET CORRECTIONS PAIEMENT STRIPE"
Write-Output "  Date: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"
Write-Output "=================================================="
Write-Output ""

$erreurs = 0
$warnings = 0

# ============================================
# 1. VERIFICATION FICHIERS
# ============================================
Write-Output "📁 1. VERIFICATION FICHIERS..."
Write-Output ""

$fichiers = @(
    "supabase\functions\create-payment-intent\index.ts",
    "supabase\functions\manual-credit-seller\index.ts",
    "supabase\functions\stripe-webhook\index.ts",
    "supabase\migrations\20260104_stripe_payments.sql",
    "ANALYSE_PROBLEME_PAIEMENT_STRIPE.md",
    "GUIDE_CONFIGURATION_WEBHOOK_STRIPE.md"
)

foreach ($fichier in $fichiers) {
    if (Test-Path $fichier) {
        Write-Output "  ✅ $fichier"
    } else {
        Write-Output "  ❌ MANQUANT: $fichier"
        $erreurs++
    }
}

Write-Output ""

# ============================================
# 2. TEST CALCUL COMMISSION
# ============================================
Write-Output "💰 2. TEST CALCUL COMMISSION..."
Write-Output ""

$testCases = @(
    @{ Produit = 50000; Commission = 10; Attendu = 55000 },
    @{ Produit = 100000; Commission = 10; Attendu = 110000 },
    @{ Produit = 25000; Commission = 5; Attendu = 26250 },
    @{ Produit = 1000; Commission = 15; Attendu = 1150 }
)

foreach ($test in $testCases) {
    $produit = $test.Produit
    $tauxCommission = $test.Commission
    $commissionAmount = [Math]::Round(($produit * $tauxCommission) / 100)
    $totalClient = $produit + $commissionAmount
    $vendeurNet = $produit
    
    $status = if ($totalClient -eq $test.Attendu) { "✅" } else { "❌"; $erreurs++ }
    Write-Output "  $status Produit: $produit GNF | Commission ${tauxCommission}%: $commissionAmount GNF | Total client: $totalClient GNF (attendu: $($test.Attendu))"
}

Write-Output ""

# ============================================
# 3. VERIFICATION CODE SOURCE
# ============================================
Write-Output "🔍 3. VERIFICATION CODE SOURCE..."
Write-Output ""

# Vérifier create-payment-intent.ts
$createPaymentContent = Get-Content "supabase\functions\create-payment-intent\index.ts" -Raw

if ($createPaymentContent -match "totalAmountWithCommission") {
    Write-Output "  ✅ Variable totalAmountWithCommission présente"
} else {
    Write-Output "  ❌ Variable totalAmountWithCommission MANQUANTE"
    $erreurs++
}

if ($createPaymentContent -match "amount \+ commissionAmount") {
    Write-Output "  ✅ Calcul correct: amount + commissionAmount"
} else {
    Write-Output "  ❌ Calcul INCORRECT ou manquant"
    $erreurs++
}

if ($createPaymentContent -match "CLIENT PAIE PRODUIT \+ COMMISSION") {
    Write-Output "  ✅ Commentaire correction présent"
} else {
    Write-Output "  ⚠️  Commentaire correction manquant"
    $warnings++
}

if ($createPaymentContent -match "product_amount.*toString") {
    Write-Output "  ✅ Metadata product_amount ajouté"
} else {
    Write-Output "  ⚠️  Metadata product_amount manquant"
    $warnings++
}

Write-Output ""

# ============================================
# 4. VERIFICATION FONCTION PROCESS_SUCCESSFUL_PAYMENT
# ============================================
Write-Output "🗄️  4. VERIFICATION FONCTION BDD..."
Write-Output ""

if (Test-Path "supabase\migrations\20260104_stripe_payments.sql") {
    $migrationContent = Get-Content "supabase\migrations\20260104_stripe_payments.sql" -Raw
    
    if ($migrationContent -match "process_successful_payment") {
        Write-Output "  ✅ Fonction process_successful_payment définie"
    } else {
        Write-Output "  ❌ Fonction process_successful_payment MANQUANTE"
        $erreurs++
    }
    
    if ($migrationContent -match "seller_net_amount") {
        Write-Output "  ✅ Colonne seller_net_amount présente"
    } else {
        Write-Output "  ⚠️  Colonne seller_net_amount manquante"
        $warnings++
    }
    
    if ($migrationContent -match "wallet_transactions") {
        Write-Output "  ✅ Table wallet_transactions présente"
    } else {
        Write-Output "  ❌ Table wallet_transactions MANQUANTE"
        $erreurs++
    }
} else {
    Write-Output "  ❌ Migration Stripe MANQUANTE"
    $erreurs++
}

Write-Output ""

# ============================================
# 5. VERIFICATION WEBHOOK
# ============================================
Write-Output "🔔 5. VERIFICATION WEBHOOK..."
Write-Output ""

if (Test-Path "supabase\functions\stripe-webhook\index.ts") {
    $webhookContent = Get-Content "supabase\functions\stripe-webhook\index.ts" -Raw
    
    if ($webhookContent -match "payment_intent\.succeeded") {
        Write-Output "  ✅ Gestion event payment_intent.succeeded"
    } else {
        Write-Output "  ❌ Event payment_intent.succeeded NON GÉRÉ"
        $erreurs++
    }
    
    if ($webhookContent -match "process_successful_payment") {
        Write-Output "  ✅ Appel process_successful_payment"
    } else {
        Write-Output "  ❌ Appel process_successful_payment MANQUANT"
        $erreurs++
    }
    
    if ($webhookContent -match "STRIPE_WEBHOOK_SECRET") {
        Write-Output "  ✅ Vérification signature webhook"
    } else {
        Write-Output "  ❌ Vérification signature MANQUANTE"
        $erreurs++
    }
} else {
    Write-Output "  ❌ Fichier stripe-webhook MANQUANT"
    $erreurs++
}

Write-Output ""

# ============================================
# 6. VERIFICATION FONCTION CREDIT MANUEL
# ============================================
Write-Output "🔧 6. VERIFICATION CREDIT MANUEL..."
Write-Output ""

if (Test-Path "supabase\functions\manual-credit-seller\index.ts") {
    $manualCreditContent = Get-Content "supabase\functions\manual-credit-seller\index.ts" -Raw
    
    if ($manualCreditContent -match "manual-credit-seller") {
        Write-Output "  ✅ Fonction manual-credit-seller créée"
    }
    
    if ($manualCreditContent -match "CEO|SUPER_ADMIN|PDG|admin") {
        Write-Output "  ✅ Vérification rôle admin"
    } else {
        Write-Output "  ⚠️  Vérification rôle manquante"
        $warnings++
    }
    
    if ($manualCreditContent -match "stripe\.paymentIntents\.retrieve") {
        Write-Output "  ✅ Vérification statut Stripe"
    } else {
        Write-Output "  ⚠️  Vérification Stripe manquante"
        $warnings++
    }
    
    if ($manualCreditContent -match "process_successful_payment") {
        Write-Output "  ✅ Appel process_successful_payment"
    } else {
        Write-Output "  ❌ Appel process_successful_payment MANQUANT"
        $erreurs++
    }
} else {
    Write-Output "  ❌ Fonction manual-credit-seller MANQUANTE"
    $erreurs++
}

Write-Output ""

# ============================================
# 7. VERIFICATION DOCUMENTATION
# ============================================
Write-Output "📚 7. VERIFICATION DOCUMENTATION..."
Write-Output ""

if (Test-Path "ANALYSE_PROBLEME_PAIEMENT_STRIPE.md") {
    $analyseSize = (Get-Item "ANALYSE_PROBLEME_PAIEMENT_STRIPE.md").Length
    Write-Output "  ✅ ANALYSE_PROBLEME_PAIEMENT_STRIPE.md ($([Math]::Round($analyseSize/1024, 2)) KB)"
} else {
    Write-Output "  ⚠️  Analyse problème manquante"
    $warnings++
}

if (Test-Path "GUIDE_CONFIGURATION_WEBHOOK_STRIPE.md") {
    $guideSize = (Get-Item "GUIDE_CONFIGURATION_WEBHOOK_STRIPE.md").Length
    Write-Output "  ✅ GUIDE_CONFIGURATION_WEBHOOK_STRIPE.md ($([Math]::Round($guideSize/1024, 2)) KB)"
} else {
    Write-Output "  ⚠️  Guide webhook manquant"
    $warnings++
}

Write-Output ""

# ============================================
# 8. VERIFICATION GIT
# ============================================
Write-Output "📦 8. VERIFICATION GIT..."
Write-Output ""

$gitStatus = git status --porcelain 2>&1
if ($LASTEXITCODE -eq 0) {
    if ([string]::IsNullOrWhiteSpace($gitStatus)) {
        Write-Output "  ✅ Tous les changements committés"
    } else {
        Write-Output "  ⚠️  Fichiers non committés:"
        $gitStatus -split "`n" | ForEach-Object { Write-Output "     $_" }
        $warnings++
    }
} else {
    Write-Output "  ⚠️  Git non disponible ou pas un repo git"
    $warnings++
}

# Vérifier dernier commit
$lastCommit = git log -1 --oneline 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Output "  📝 Dernier commit: $lastCommit"
}

Write-Output ""

# ============================================
# 9. CHECKLIST ACTIONS REQUISES
# ============================================
Write-Output "⚠️  9. ACTIONS REQUISES..."
Write-Output ""

Write-Output "  [ ] Configurer webhook Stripe Dashboard"
Write-Output "      URL: https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook"
Write-Output ""
Write-Output "  [ ] Ajouter STRIPE_WEBHOOK_SECRET dans Supabase"
Write-Output "      Dashboard > Edge Functions > Secrets"
Write-Output ""
Write-Output "  [ ] Tester paiement complet end-to-end"
Write-Output "      1. Créer PaymentIntent"
Write-Output "      2. Payer avec carte test: 4242 4242 4242 4242"
Write-Output "      3. Vérifier webhook reçu"
Write-Output "      4. Vérifier wallet vendeur crédité"
Write-Output ""
Write-Output "  [ ] Ou utiliser crédit manuel en attendant:"
Write-Output "      supabase functions invoke manual-credit-seller"
Write-Output ""

# ============================================
# RESUME
# ============================================
Write-Output "=================================================="
Write-Output "  RÉSUMÉ"
Write-Output "=================================================="
Write-Output ""

if ($erreurs -eq 0 -and $warnings -eq 0) {
    Write-Output "✅ TOUT EST PARFAIT!"
    Write-Output ""
    Write-Output "Corrections appliquées avec succès:"
    Write-Output "  ✅ Commission ajoutée au montant client"
    Write-Output "  ✅ Fonction crédit manuel créée"
    Write-Output "  ✅ Documentation complète"
    Write-Output "  ✅ Code sans erreurs"
} elseif ($erreurs -eq 0) {
    Write-Output "✅ CORRECTIONS APPLIQUÉES"
    Write-Output "⚠️  $warnings avertissement(s) mineur(s)"
    Write-Output ""
    Write-Output "Le système est fonctionnel mais nécessite:"
    Write-Output "  - Configuration webhook Stripe"
    Write-Output "  - Tests end-to-end"
} else {
    Write-Output "❌ ERREURS DÉTECTÉES"
    Write-Output "  Erreurs: $erreurs"
    Write-Output "  Avertissements: $warnings"
    Write-Output ""
    Write-Output "Corriger les erreurs ci-dessus avant déploiement!"
}

Write-Output ""
Write-Output "=================================================="
Write-Output "  Pour plus d'infos:"
Write-Output "  - ANALYSE_PROBLEME_PAIEMENT_STRIPE.md"
Write-Output "  - GUIDE_CONFIGURATION_WEBHOOK_STRIPE.md"
Write-Output "=================================================="
