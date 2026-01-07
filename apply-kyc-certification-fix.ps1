# ============================================================================
# SCRIPT POWERSHELL - APPLICATION DES CORRECTIONS KYC/CERTIFICATION
# Date: 2026-01-07
# Objectif: Automatiser l'application des corrections
# ============================================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SYSTÈME KYC & CERTIFICATION - CORRECTION AUTOMATIQUE        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Vérifier que les fichiers existent
$scriptSQL = "fix-kyc-certification-system.sql"
$analyseSQL = "analyse-complete-kyc-certification.sql"
$componentCEO = "src/components/ceo/VendorKYCReview.tsx"

Write-Host "🔍 Vérification des fichiers..." -ForegroundColor Yellow

if (-Not (Test-Path $scriptSQL)) {
    Write-Host "❌ ERREUR: $scriptSQL introuvable" -ForegroundColor Red
    exit 1
}

if (-Not (Test-Path $analyseSQL)) {
    Write-Host "❌ ERREUR: $analyseSQL introuvable" -ForegroundColor Red
    exit 1
}

if (-Not (Test-Path $componentCEO)) {
    Write-Host "❌ ERREUR: $componentCEO introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Tous les fichiers trouvés" -ForegroundColor Green
Write-Host ""

# Menu de choix
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  QUE VOULEZ-VOUS FAIRE?                                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 📊 Analyser le système (diagnostic complet)" -ForegroundColor White
Write-Host "2. 🔧 Appliquer les corrections (fix-kyc-certification-system.sql)" -ForegroundColor White
Write-Host "3. 🎯 Tout faire (analyse + corrections)" -ForegroundColor White
Write-Host "4. 📖 Voir le rapport complet (ouvrir RAPPORT_ANALYSE_KYC_CERTIFICATION_COMPLETE.md)" -ForegroundColor White
Write-Host "5. ❌ Annuler" -ForegroundColor White
Write-Host ""

$choix = Read-Host "Votre choix (1-5)"

# Fonction pour copier SQL et ouvrir Supabase
function Open-SupabaseSQL {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    Write-Host ""
    Write-Host "📋 Préparation du script: $Description" -ForegroundColor Cyan
    
    # Lire le contenu du fichier
    $content = Get-Content $FilePath -Raw
    
    # Copier dans le presse-papiers
    Set-Clipboard -Value $content
    
    Write-Host "✅ Script copié dans le presse-papiers!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  INSTRUCTIONS:                                               ║" -ForegroundColor Yellow
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Le navigateur va s'ouvrir sur Supabase SQL Editor" -ForegroundColor White
    Write-Host "2. Coller (Ctrl+V) le script dans l'éditeur" -ForegroundColor White
    Write-Host "3. Cliquer sur RUN (ou appuyer sur F5)" -ForegroundColor White
    Write-Host "4. Lire le rapport dans les NOTICES (panneau du bas)" -ForegroundColor White
    Write-Host ""
    
    # Ouvrir Supabase SQL Editor
    $supabaseURL = "https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new"
    Start-Process $supabaseURL
    
    Write-Host "🌐 Navigateur ouvert sur Supabase SQL Editor" -ForegroundColor Green
    Write-Host ""
    
    # Attendre confirmation
    Read-Host "Appuyez sur Entrée après avoir exécuté le script dans Supabase"
}

# Traiter le choix
switch ($choix) {
    "1" {
        Write-Host ""
        Write-Host "📊 ANALYSE DU SYSTÈME" -ForegroundColor Cyan
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Open-SupabaseSQL -FilePath $analyseSQL -Description "Analyse complète"
        
        Write-Host ""
        Write-Host "✅ Analyse terminée!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Le rapport vous a montré:" -ForegroundColor Yellow
        Write-Host "  • État actuel des tables KYC/Certification" -ForegroundColor White
        Write-Host "  • Nombre de vendeurs avec/sans KYC vérifié" -ForegroundColor White
        Write-Host "  • Problèmes de cohérence détectés" -ForegroundColor White
        Write-Host "  • Recommandations d'actions" -ForegroundColor White
        Write-Host ""
        Write-Host "👉 Si des problèmes ont été détectés, relancez ce script et choisissez option 2 (Corrections)" -ForegroundColor Cyan
    }
    
    "2" {
        Write-Host ""
        Write-Host "🔧 APPLICATION DES CORRECTIONS" -ForegroundColor Cyan
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  ATTENTION: Ce script va modifier la base de données:" -ForegroundColor Yellow
        Write-Host "  • Créer enregistrements manquants (vendors, vendor_certifications)" -ForegroundColor White
        Write-Host "  • Synchroniser KYC status entre tables" -ForegroundColor White
        Write-Host "  • Créer un vendeur test avec KYC vérifié" -ForegroundColor White
        Write-Host ""
        
        $confirm = Read-Host "Êtes-vous sûr de vouloir continuer? (oui/non)"
        
        if ($confirm -eq "oui") {
            Open-SupabaseSQL -FilePath $scriptSQL -Description "Corrections système"
            
            Write-Host ""
            Write-Host "✅ Corrections appliquées!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📝 Actions effectuées:" -ForegroundColor Yellow
            Write-Host "  • Enregistrements manquants créés" -ForegroundColor White
            Write-Host "  • KYC status synchronisés" -ForegroundColor White
            Write-Host "  • Vendeur test avec KYC vérifié créé" -ForegroundColor White
            Write-Host ""
            Write-Host "🎯 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "1. Intégrer VendorKYCReview.tsx dans PDGDashboard" -ForegroundColor White
            Write-Host "   Fichier: src/pages/PDGDashboard.tsx" -ForegroundColor Gray
            Write-Host "   Ajouter: import { VendorKYCReview } from '@/components/ceo/VendorKYCReview';" -ForegroundColor Gray
            Write-Host ""
            Write-Host "2. Tester le workflow complet:" -ForegroundColor White
            Write-Host "   a. Vendeur soumet KYC → VendorKYCForm.tsx" -ForegroundColor Gray
            Write-Host "   b. CEO approuve KYC → VendorKYCReview.tsx" -ForegroundColor Gray
            Write-Host "   c. CEO certifie vendeur → VendorCertificationManager.tsx" -ForegroundColor Gray
            Write-Host "   d. Badge affiché sur marketplace → CertifiedVendorBadge.tsx" -ForegroundColor Gray
            Write-Host ""
            Write-Host "3. Vérifier Edge Function verify-vendor déployée:" -ForegroundColor White
            Write-Host "   https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/functions" -ForegroundColor Gray
            Write-Host ""
        } else {
            Write-Host "❌ Opération annulée" -ForegroundColor Red
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "🎯 ANALYSE + CORRECTIONS COMPLÈTES" -ForegroundColor Cyan
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        # Étape 1: Analyse
        Write-Host "📊 ÉTAPE 1/2: ANALYSE" -ForegroundColor Yellow
        Open-SupabaseSQL -FilePath $analyseSQL -Description "Analyse complète"
        
        Write-Host ""
        Write-Host "✅ Analyse terminée!" -ForegroundColor Green
        Write-Host ""
        
        # Confirmation avant corrections
        Write-Host "📋 Avez-vous noté les problèmes détectés dans l'analyse?" -ForegroundColor Yellow
        $continuer = Read-Host "Continuer avec les corrections? (oui/non)"
        
        if ($continuer -eq "oui") {
            Write-Host ""
            Write-Host "🔧 ÉTAPE 2/2: CORRECTIONS" -ForegroundColor Yellow
            Open-SupabaseSQL -FilePath $scriptSQL -Description "Corrections système"
            
            Write-Host ""
            Write-Host "✅ Corrections appliquées!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🎉 SYSTÈME KYC/CERTIFICATION CORRIGÉ!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📖 Pour plus de détails, consultez:" -ForegroundColor Cyan
            Write-Host "   RAPPORT_ANALYSE_KYC_CERTIFICATION_COMPLETE.md" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host "❌ Corrections annulées" -ForegroundColor Red
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "📖 Ouverture du rapport complet..." -ForegroundColor Cyan
        
        $rapportPath = "RAPPORT_ANALYSE_KYC_CERTIFICATION_COMPLETE.md"
        
        if (Test-Path $rapportPath) {
            Start-Process $rapportPath
            Write-Host "✅ Rapport ouvert dans votre éditeur par défaut" -ForegroundColor Green
        } else {
            Write-Host "❌ Rapport introuvable: $rapportPath" -ForegroundColor Red
        }
    }
    
    "5" {
        Write-Host ""
        Write-Host "❌ Opération annulée" -ForegroundColor Red
    }
    
    default {
        Write-Host ""
        Write-Host "❌ Choix invalide" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Proposer d'ouvrir le rapport complet
if ($choix -ne "4" -and $choix -ne "5") {
    Write-Host "💡 Astuce: Pour voir le rapport complet avec toutes les explications," -ForegroundColor Yellow
    Write-Host "   consultez: RAPPORT_ANALYSE_KYC_CERTIFICATION_COMPLETE.md" -ForegroundColor White
    Write-Host ""
    
    $ouvrir = Read-Host "Voulez-vous l'ouvrir maintenant? (oui/non)"
    if ($ouvrir -eq "oui") {
        $rapportPath = "RAPPORT_ANALYSE_KYC_CERTIFICATION_COMPLETE.md"
        if (Test-Path $rapportPath) {
            Start-Process $rapportPath
            Write-Host "✅ Rapport ouvert" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "✨ Script terminé!" -ForegroundColor Green
Write-Host ""
