# =====================================================
# SCRIPT - DÉPLOIEMENT SYSTÈME SMART FUNDS RELEASE
# =====================================================
# Date: 2026-01-06
# Système: Trust Score + Libération progressive des fonds
# Impact: Protection contre fraude + Meilleure UX vendeur
# Temps estimé: 5-10 minutes
# =====================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "💰 DÉPLOIEMENT SMART FUNDS RELEASE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 DESCRIPTION DU SYSTÈME:" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Trust Score automatique (0-100)" -ForegroundColor White
Write-Host "   - Âge utilisateur, historique carte, KYC vendeur" -ForegroundColor Gray
Write-Host "   - Montant cohérent, pas de chargebacks" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Libération progressive (30min - 2h)" -ForegroundColor White
Write-Host "   - Score 90+ : 30 minutes" -ForegroundColor Gray
Write-Host "   - Score 80+ : 1 heure" -ForegroundColor Gray
Write-Host "   - Score 70+ : 1h30" -ForegroundColor Gray
Write-Host "   - Score <70 : 2 heures" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Révision admin pour cas suspects" -ForegroundColor White
Write-Host "   - Contrôle aléatoire 3%" -ForegroundColor Gray
Write-Host "   - Détection automatique de fraude" -ForegroundColor Gray
Write-Host ""

# Vérifier Supabase CLI
Write-Host "📋 Vérification de Supabase CLI..." -ForegroundColor Cyan
$cliVersion = supabase --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase CLI non installé" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation:" -ForegroundColor Yellow
    Write-Host "   npm install -g supabase" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
Write-Host "✅ Supabase CLI: $cliVersion" -ForegroundColor Green
Write-Host ""

# Vérifier la connexion au projet
Write-Host "📋 Vérification de la connexion au projet..." -ForegroundColor Cyan
$projectRef = "uakkxaibujzxdiqzpnpr"
$status = supabase status 2>&1

if ($status -notmatch $projectRef) {
    Write-Host "⚠️  Projet non lié" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Liaison au projet..." -ForegroundColor Cyan
    supabase link --project-ref $projectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec de liaison au projet" -ForegroundColor Red
        Write-Host ""
        Write-Host "Action manuelle requise:" -ForegroundColor Yellow
        Write-Host "   supabase login" -ForegroundColor Gray
        Write-Host "   supabase link --project-ref $projectRef" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
}
Write-Host "✅ Projet lié: $projectRef" -ForegroundColor Green
Write-Host ""

# Vérifier que le fichier de migration existe
$migrationFile = "supabase\migrations\20260106000000_smart_funds_release.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Fichier de migration non trouvé: $migrationFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Veuillez vérifier que le fichier existe et réessayer." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "✅ Fichier de migration trouvé" -ForegroundColor Green
Write-Host ""

# Afficher le contenu de la migration
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "📋 CONTENU DE LA MIGRATION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tables créées:" -ForegroundColor White
Write-Host "   1. payment_risk_assessments - Évaluation Trust Score" -ForegroundColor Gray
Write-Host "   2. funds_release_schedule - Planification libération" -ForegroundColor Gray
Write-Host "   3. payment_fraud_signals - Détection fraude" -ForegroundColor Gray
Write-Host "   4. chargeback_history - Historique litiges" -ForegroundColor Gray
Write-Host ""
Write-Host "Fonctions créées:" -ForegroundColor White
Write-Host "   1. calculate_payment_trust_score() - Calcul Trust Score" -ForegroundColor Gray
Write-Host "   2. schedule_funds_release() - Planifier libération" -ForegroundColor Gray
Write-Host "   3. release_scheduled_funds() - Libérer fonds" -ForegroundColor Gray
Write-Host "   4. admin_approve_payment() - Approuver manuellement" -ForegroundColor Gray
Write-Host "   5. admin_reject_payment() - Rejeter paiement" -ForegroundColor Gray
Write-Host ""
Write-Host "Vues créées:" -ForegroundColor White
Write-Host "   1. admin_payment_review_queue - File attente admin" -ForegroundColor Gray
Write-Host ""
Write-Host "Policies RLS:" -ForegroundColor White
Write-Host "   ✅ Admins: accès complet" -ForegroundColor Gray
Write-Host "   ✅ Vendeurs: voir leurs propres données" -ForegroundColor Gray
Write-Host ""

# Confirmation
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "⚠️  CONFIRMATION REQUISE" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Cette migration va:" -ForegroundColor White
Write-Host "   • Créer 4 nouvelles tables" -ForegroundColor Gray
Write-Host "   • Créer 5 nouvelles fonctions" -ForegroundColor Gray
Write-Host "   • Créer 1 vue admin" -ForegroundColor Gray
Write-Host "   • Activer RLS sur toutes les tables" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Cette opération est IRRÉVERSIBLE sans backup" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Voulez-vous continuer? (oui/non)"
if ($confirm -ne "oui") {
    Write-Host ""
    Write-Host "❌ Déploiement annulé" -ForegroundColor Red
    Write-Host ""
    exit 0
}

# Option de déploiement
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "📦 OPTIONS DE DÉPLOIEMENT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Automatique via Supabase CLI (recommandé)" -ForegroundColor White
Write-Host "2. Manuel via Dashboard" -ForegroundColor White
Write-Host ""
$deployChoice = Read-Host "Choisissez (1 ou 2)"

if ($deployChoice -eq "1") {
    # Déploiement automatique
    Write-Host ""
    Write-Host "🚀 Déploiement automatique en cours..." -ForegroundColor Cyan
    Write-Host ""
    
    try {
        # Pousser la migration
        Write-Host "Exécution: supabase db push" -ForegroundColor Gray
        $output = supabase db push 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            throw "Échec du déploiement: $output"
        }
        
        Write-Host ""
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host "✅ MIGRATION DÉPLOYÉE AVEC SUCCÈS" -ForegroundColor Green
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host ""
        
    } catch {
        Write-Host ""
        Write-Host "❌ Erreur lors du déploiement: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Essayez le déploiement manuel (option 2)" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    
} elseif ($deployChoice -eq "2") {
    # Déploiement manuel
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Yellow
    Write-Host "📋 INSTRUCTIONS DÉPLOIEMENT MANUEL" -ForegroundColor Yellow
    Write-Host "=============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Ouvrir l'éditeur SQL Supabase:" -ForegroundColor White
    Write-Host "   👉 https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Copier le contenu du fichier:" -ForegroundColor White
    Write-Host "   $migrationFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Coller dans l'éditeur SQL" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Cliquer sur 'Run' en bas à droite" -ForegroundColor White
    Write-Host ""
    Write-Host "5. Attendre le message 'Success'" -ForegroundColor White
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "💡 COPIE DU FICHIER DANS LE PRESSE-PAPIER" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    
    $copyChoice = Read-Host "Voulez-vous copier le SQL dans le presse-papier? (oui/non)"
    if ($copyChoice -eq "oui") {
        Get-Content $migrationFile | Set-Clipboard
        Write-Host "✅ SQL copié dans le presse-papier" -ForegroundColor Green
        Write-Host "   Vous pouvez maintenant le coller dans Supabase" -ForegroundColor Gray
    }
    Write-Host ""
    
} else {
    Write-Host ""
    Write-Host "❌ Choix invalide" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Tests de vérification
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🧪 TESTS DE VÉRIFICATION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Vérifier les tables créées:" -ForegroundColor White
Write-Host "   SELECT table_name FROM information_schema.tables" -ForegroundColor Gray
Write-Host "   WHERE table_schema = 'public' AND table_name LIKE 'payment%';" -ForegroundColor Gray
Write-Host ""
Write-Host "   Devrait afficher:" -ForegroundColor White
Write-Host "   - payment_risk_assessments" -ForegroundColor Green
Write-Host "   - payment_fraud_signals" -ForegroundColor Green
Write-Host ""
Write-Host "2. Vérifier les fonctions:" -ForegroundColor White
Write-Host "   SELECT routine_name FROM information_schema.routines" -ForegroundColor Gray
Write-Host "   WHERE routine_schema = 'public' AND routine_name LIKE '%payment%';" -ForegroundColor Gray
Write-Host ""
Write-Host "   Devrait afficher:" -ForegroundColor White
Write-Host "   - calculate_payment_trust_score" -ForegroundColor Green
Write-Host "   - schedule_funds_release" -ForegroundColor Green
Write-Host "   - release_scheduled_funds" -ForegroundColor Green
Write-Host "   - admin_approve_payment" -ForegroundColor Green
Write-Host "   - admin_reject_payment" -ForegroundColor Green
Write-Host ""
Write-Host "3. Tester le calcul Trust Score:" -ForegroundColor White
Write-Host "   (Nécessite une transaction Stripe existante)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Vérifier la vue admin:" -ForegroundColor White
Write-Host "   SELECT * FROM admin_payment_review_queue LIMIT 5;" -ForegroundColor Gray
Write-Host ""

# Instructions post-déploiement
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "📋 PROCHAINES ÉTAPES" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Mettre à jour le webhook Stripe:" -ForegroundColor White
Write-Host "   - Modifier supabase/functions/stripe-webhook/index.ts" -ForegroundColor Gray
Write-Host "   - Appeler calculate_payment_trust_score() après payment.succeeded" -ForegroundColor Gray
Write-Host "   - Appeler schedule_funds_release() si AUTO_APPROVED" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Créer un CRON job pour libérer les fonds:" -ForegroundColor White
Write-Host "   - Exécuter release_scheduled_funds() toutes les 5-10 minutes" -ForegroundColor Gray
Write-Host "   - Filtrer WHERE status='SCHEDULED' AND scheduled_release_at <= NOW()" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Créer l'interface admin:" -ForegroundColor White
Write-Host "   - Composant AdminPaymentReviewQueue.tsx" -ForegroundColor Gray
Write-Host "   - Utiliser la vue admin_payment_review_queue" -ForegroundColor Gray
Write-Host "   - Boutons Approuver/Rejeter" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Créer l'interface vendeur:" -ForegroundColor White
Write-Host "   - Composant FundsReleaseStatus.tsx (existe déjà)" -ForegroundColor Gray
Write-Host "   - Afficher le statut de libération" -ForegroundColor Gray
Write-Host "   - Progress bar pour countdown" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Tester avec transactions réelles:" -ForegroundColor White
Write-Host "   - Faire un paiement Stripe test" -ForegroundColor Gray
Write-Host "   - Vérifier le Trust Score calculé" -ForegroundColor Gray
Write-Host "   - Vérifier la planification de libération" -ForegroundColor Gray
Write-Host "   - Attendre le délai et vérifier la libération automatique" -ForegroundColor Gray
Write-Host ""

Write-Host "=============================================" -ForegroundColor Green
Write-Host "✅ PROCESSUS TERMINÉ" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Documentation complète:" -ForegroundColor Cyan
Write-Host "   - STRIPE_SMART_RELEASE_SYSTEM.md" -ForegroundColor Gray
Write-Host "   - STRIPE_SMART_RELEASE_RECAP.md" -ForegroundColor Gray
Write-Host "   - STRIPE_SMART_RELEASE_TESTS.md" -ForegroundColor Gray
Write-Host ""
