# 🚀 DÉPLOIEMENT STORES - Guide Complet
# Publication sur Google Play Store et Apple App Store

## 📋 PRÉREQUIS

### Google Play Store
- [ ] Compte Google Play Developer ($25 one-time)
- [ ] Android Studio installé
- [ ] Keystore pour signature d'app
- [ ] Téléphone Android pour tests

### Apple App Store
- [ ] Apple Developer Account ($99/an)
- [ ] macOS avec Xcode
- [ ] Certificats de distribution
- [ ] iPhone pour tests

---

## 🤖 PUBLICATION GOOGLE PLAY STORE

### Étape 1: Créer le Keystore (Première fois uniquement)

```powershell
# Créer le dossier pour le keystore
New-Item -ItemType Directory -Force -Path "android/keystores"

# Générer le keystore
keytool -genkey -v -keystore android/keystores/224solutions-release.keystore `
  -alias 224solutions `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000

# Informations à fournir:
# - Nom: 224Solutions
# - Organisation: 224Solutions
# - Ville: Conakry
# - Pays: GN (Guinée)
# - Mot de passe: [SAUVEGARDER SÉCURISÉMENT]
```

**⚠️ IMPORTANT:** Sauvegardez le keystore et le mot de passe ! Impossible de mettre à jour l'app sans eux.

### Étape 2: Configurer la Signature

Créer `android/key.properties`:

```properties
storePassword=VOTRE_MOT_DE_PASSE
keyPassword=VOTRE_MOT_DE_PASSE
keyAlias=224solutions
storeFile=keystores/224solutions-release.keystore
```

**⚠️ Ajouter à .gitignore:**
```
android/key.properties
android/keystores/
```

### Étape 3: Build Release AAB

```powershell
# 1. Build web
npm run build

# 2. Sync Capacitor
npx cap sync android

# 3. Ouvrir Android Studio
npx cap open android

# Dans Android Studio:
# 4. Build → Generate Signed Bundle/APK
# 5. Sélectionner "Android App Bundle"
# 6. Sélectionner le keystore créé
# 7. Entrer les mots de passe
# 8. Build type: "release"
# 9. Signature versions: V1 + V2 cochées
# 10. Finish

# L'AAB sera généré dans:
# android/app/release/app-release.aab
```

### Étape 4: Préparer les Assets Store

**Screenshots requis (minimum 2 par catégorie):**
- Téléphone (16:9): 1080x1920 ou 1440x2560
- Tablette 7": 1024x600
- Tablette 10": 1920x1200

**Icône haute résolution:**
- 512x512 PNG (32-bit)
- Fond transparent ou uni

**Bannière feature graphic:**
- 1024x500 PNG/JPEG

**Vidéo (optionnel):**
- YouTube URL

### Étape 5: Créer l'Application sur Play Console

1. **Aller sur:** https://play.google.com/console
2. **Créer une application**
3. **Informations de base:**
   - Nom: 224Solutions - Taxi, Livraison & Shopping
   - Langue par défaut: Français
   - App/Jeu: Application
   - Gratuit/Payant: Gratuit

4. **Fiche du Store:**
   - Description courte (80 caractères max):
     ```
     Super-app Guinée: Taxi-Moto, Livraison, E-Commerce. Tout en un !
     ```
   
   - Description complète (4000 caractères max):
     ```
     🚀 224Solutions - La Super-App de la Guinée

     Bienvenue sur 224Solutions, la première super-application tout-en-un de Guinée !
     
     🚖 TAXI-MOTO
     • Réservez un taxi-moto en quelques secondes
     • Suivi en temps réel de votre chauffeur
     • Paiement sécurisé (cash, mobile money, wallet)
     • Tarifs transparents et compétitifs
     
     📦 LIVRAISON EXPRESS
     • Envoyez et recevez vos colis rapidement
     • Livraison le jour même à Conakry
     • Suivi GPS en temps réel
     • Preuve de livraison (photo + signature)
     
     🛒 MARKETPLACE E-COMMERCE
     • Des milliers de produits disponibles
     • Vendeurs certifiés et vérifiés
     • Paiement sécurisé avec protection acheteur
     • Livraison à domicile ou en point relais
     
     💰 WALLET UNIVERSEL
     • Portefeuille électronique sécurisé
     • Rechargez par Orange Money, MTN, Moov
     • Payez rapidement tous vos services
     • Historique complet de vos transactions
     
     ✨ FONCTIONNALITÉS PREMIUM
     • Mode hors ligne (POS pour vendeurs)
     • Paiement en espèces accepté
     • Support multi-devises (GNF, USD, EUR)
     • Service client 24/7
     • Notifications en temps réel
     
     🔒 SÉCURITÉ MAXIMALE
     • Authentification multi-facteurs (MFA)
     • Chiffrement de bout en bout
     • Transactions sécurisées avec escrow
     • Données protégées (conformité RGPD)
     
     📍 DISPONIBLE À CONAKRY
     Bientôt dans toute la Guinée !
     
     Téléchargez 224Solutions maintenant et simplifiez votre vie quotidienne !
     ```

5. **Catégorie:**
   - Catégorie principale: Shopping
   - Catégories secondaires: Transport, Livraison & Alimentation

6. **Coordonnées:**
   - Email: contact@224solution.net
   - Site web: https://224solution.net
   - Numéro de téléphone: +224 XXX XX XX XX

7. **Politique de confidentialité:**
   - URL: https://224solution.net/privacy-policy

### Étape 6: Contenu de l'App

**Questionnaire de contenu:**
- Public cible: 16+
- Contient des publicités: Non
- Achats in-app: Non (ou Oui si abonnements)
- Localisation requise: Oui (pour taxi et livraison)
- Caméra requise: Oui (pour KYC et preuve livraison)

**Classification du contenu:**
- Violence: Aucune
- Contenu sexuel: Aucun
- Langage grossier: Aucun
- Drogue/Alcool: Aucun

### Étape 7: Upload AAB et Publication

```powershell
# 1. Aller dans "Production" → "Créer une version"
# 2. Upload app-release.aab
# 3. Ajouter les notes de version:

Version 1.0.0 (Première version)
------------------------------------
🎉 Lancement de 224Solutions !

✨ Fonctionnalités:
• Réservation taxi-moto en temps réel
• Livraison express à Conakry
• Marketplace avec milliers de produits
• Wallet sécurisé avec mobile money
• Mode offline pour vendeurs
• Paiement cash/mobile money/wallet

🔒 Sécurité:
• Authentification multi-facteurs
• Transactions sécurisées
• Données chiffrées

📱 UX Optimisée:
• Interface intuitive
• Notifications push
• Support français/soussou/malinké/peul

Bienvenue sur 224Solutions ! 🚀

# 4. Enregistrer
# 5. Examiner et lancer la version
# 6. Attendre la révision (1-3 jours généralement)
```

---

## 🍎 PUBLICATION APPLE APP STORE

### Étape 1: Configurer Xcode

```bash
# 1. Build web
npm run build

# 2. Sync Capacitor
npx cap sync ios

# 3. Ouvrir Xcode
npx cap open ios

# Dans Xcode:
# 4. Sélectionner "Signing & Capabilities"
# 5. Team: Sélectionner votre Apple Developer Team
# 6. Bundle Identifier: com.224solutions.app (unique)
# 7. Cocher "Automatically manage signing"
```

### Étape 2: Créer l'App sur App Store Connect

1. **Aller sur:** https://appstoreconnect.apple.com
2. **My Apps → +** (Nouvelle app)
3. **Informations:**
   - Plateformes: iOS
   - Nom: 224Solutions
   - Langue principale: Français
   - Bundle ID: com.224solutions.app
   - SKU: 224SOLUTIONS001

### Étape 3: Build et Archive

```bash
# Dans Xcode:
# 1. Sélectionner "Any iOS Device (arm64)"
# 2. Product → Archive
# 3. Attendre la fin de l'archive (5-10 min)
# 4. Window → Organizer (archives)
# 5. Sélectionner l'archive → Distribute App
# 6. App Store Connect → Upload
# 7. Attendre le traitement (15-30 min)
```

### Étape 4: Remplir App Store Connect

**Informations générales:**
- Nom: 224Solutions - Taxi, Livraison & Shopping
- Sous-titre (30 caractères): Super-app Guinée tout-en-un
- Catégorie principale: Shopping
- Catégorie secondaire: Navigation

**Description:**
(Utiliser la même description que Google Play)

**Mots-clés (100 caractères max):**
```
taxi,livraison,shopping,guinée,conakry,ecommerce,wallet,paiement,moto
```

**URL support:** https://224solution.net/support
**URL marketing:** https://224solution.net

**Screenshots requis:**
- iPhone 6.7" (1290x2796): 3-10 screenshots
- iPhone 6.5" (1242x2688): 3-10 screenshots
- iPhone 5.5" (1242x2208): optionnel
- iPad Pro 12.9": optionnel

**App Preview (vidéo optionnelle):**
- Format: .mov ou .mp4
- Durée: 15-30 secondes
- Résolution: identique aux screenshots

### Étape 5: Informations Supplémentaires

**Âge minimum:** 12+

**Confidentialité:**
- Types de données collectées:
  * Localisation (pour taxi/livraison)
  * Informations de contact (nom, email, téléphone)
  * Informations financières (transactions)
  * Photos (pour KYC et livraison)

- URL politique confidentialité: https://224solution.net/privacy-policy

**Achats intégrés:** Non (ou configurer si abonnements)

### Étape 6: Soumission

1. **Sélectionner le build uploadé**
2. **Remplir les notes de version** (même que Google Play)
3. **Copyright:** 2026 224Solutions
4. **Coordonnées de révision:**
   - Nom: [Votre nom]
   - Email: [Votre email]
   - Téléphone: [Votre numéro]
   
5. **Soumettre pour révision**
6. **Attendre approbation (1-2 jours généralement)**

---

## 📊 SUIVI POST-PUBLICATION

### Analytics à monitorer:

**Google Play Console:**
- Installations
- Désinstallations
- Notes et avis
- Crashs et ANR
- Taux de rétention

**App Store Connect:**
- Téléchargements
- Mises à jour
- Avis utilisateurs
- Crashs
- Données d'utilisation

### Répondre aux avis:

**Avis positifs:**
```
Merci beaucoup pour votre avis ! 🙏
Nous sommes ravis que 224Solutions vous facilite la vie.
N'hésitez pas à partager l'app avec vos proches ! 🚀
```

**Avis négatifs:**
```
Nous sommes désolés pour votre expérience. 😔
Notre équipe technique va examiner votre problème.
Contactez-nous à support@224solution.net pour une assistance personnalisée.
Merci de nous aider à améliorer ! 💪
```

---

## 🔄 MISES À JOUR

### Pour publier une mise à jour:

```powershell
# 1. Mettre à jour version dans package.json
npm version patch  # 1.0.0 → 1.0.1
# ou
npm version minor  # 1.0.0 → 1.1.0
# ou  
npm version major  # 1.0.0 → 2.0.0

# 2. Rebuild
npm run build
npx cap sync

# 3. Android: Incrémenter versionCode dans android/app/build.gradle
# 4. iOS: Incrémenter version dans Xcode

# 5. Rebuild et republier (mêmes étapes que publication initiale)
```

---

## ✅ CHECKLIST FINALE AVANT PUBLICATION

### Tests:
- [ ] App fonctionne sur Android 8+ (minimum)
- [ ] App fonctionne sur iOS 13+ (minimum)
- [ ] Toutes les fonctionnalités testées
- [ ] Pas de crashs critiques
- [ ] Permissions bien demandées
- [ ] Notifications fonctionnelles
- [ ] Paiements testés
- [ ] Mode offline testé

### Assets:
- [ ] Screenshots de qualité (toutes tailles)
- [ ] Icône haute résolution (512x512)
- [ ] Bannière feature graphic (Android)
- [ ] Description complète et attractive
- [ ] Mots-clés optimisés SEO

### Légal:
- [ ] Politique de confidentialité publiée
- [ ] Conditions d'utilisation publiées
- [ ] Email de contact configuré
- [ ] Numéro de téléphone support actif

### Sécurité:
- [ ] Keystore sauvegardé (Android)
- [ ] Certificats sauvegardés (iOS)
- [ ] Variables d'environnement sécurisées
- [ ] API keys en production

---

## 🎉 APRÈS PUBLICATION

1. **Annoncer le lancement:**
   - Site web: bannière "Télécharger l'app"
   - Réseaux sociaux
   - Email aux utilisateurs existants
   - Communiqué de presse

2. **Monitorer les métriques:**
   - Installations jour 1, 7, 30
   - Taux de rétention
   - Crashs et bugs
   - Feedback utilisateurs

3. **Itérer rapidement:**
   - Corriger bugs critiques en 24-48h
   - Publier mises à jour régulières
   - Écouter feedback utilisateurs
   - Améliorer continuellement

---

## 📞 SUPPORT

**Questions Play Store:** https://support.google.com/googleplay/android-developer
**Questions App Store:** https://developer.apple.com/contact/

**Délais typiques:**
- Google Play: 1-3 jours (parfois quelques heures)
- Apple App Store: 1-2 jours (révision plus stricte)

**Bonnes pratiques:**
- Publier en dehors des périodes de fête (moins d'attente)
- Répondre rapidement aux avis
- Publier des mises à jour tous les 2-4 semaines
- Communiquer les nouveautés aux utilisateurs

---

Bonne publication ! 🚀📱
