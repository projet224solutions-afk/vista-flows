# 📱 Guide Complet - Génération APK Android pour 224Solutions

Ce guide vous explique comment générer un fichier APK pour votre application 224Solutions.

---

## 🎯 Prérequis

### Option A : Génération Automatique via GitHub Actions (Recommandé)
- ✅ Compte GitHub
- ✅ Projet exporté vers GitHub

### Option B : Génération Locale
- ✅ Node.js 18+ installé
- ✅ Android Studio installé
- ✅ JDK 17+ installé

---

## 🚀 Option A : GitHub Actions (Automatique)

### Étape 1 : Exporter vers GitHub

1. Dans Lovable, cliquez sur **"Export to GitHub"** (Settings → GitHub)
2. Autorisez Lovable à accéder à votre compte GitHub
3. Créez un nouveau repository

### Étape 2 : Créer un Keystore Android

Un keystore est nécessaire pour signer votre APK. Exécutez cette commande sur votre ordinateur :

```bash
keytool -genkey -v -keystore 224solutions-release.keystore -alias 224solutions -keyalg RSA -keysize 2048 -validity 10000
```

**Répondez aux questions :**
- Mot de passe : choisissez un mot de passe sécurisé (ex: `MonMotDePasse123!`)
- Prénom et Nom : `224Solutions`
- Unité organisationnelle : `Development`
- Organisation : `224Solutions`
- Ville : `Conakry`
- État/Province : `Conakry`
- Code pays : `GN`

### Étape 3 : Convertir le Keystore en Base64

**Sur Windows (PowerShell) :**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("224solutions-release.keystore")) | Set-Clipboard
```

**Sur Mac/Linux :**
```bash
base64 224solutions-release.keystore | pbcopy  # Mac
base64 224solutions-release.keystore | xclip   # Linux
```

### Étape 4 : Configurer les Secrets GitHub

1. Allez sur votre repository GitHub
2. Settings → Secrets and variables → Actions
3. Cliquez "New repository secret" et ajoutez :

| Nom du Secret | Valeur |
|---------------|--------|
| `ANDROID_KEYSTORE` | Le contenu Base64 du keystore (étape 3) |
| `KEYSTORE_PASSWORD` | Le mot de passe choisi à l'étape 2 |
| `KEY_ALIAS` | `224solutions` |
| `KEY_PASSWORD` | Le même mot de passe que KEYSTORE_PASSWORD |

### Étape 5 : Déclencher le Build

1. Faites un push sur la branche `main`
2. OU allez dans Actions → "Build Android APK" → "Run workflow"

### Étape 6 : Récupérer l'APK

1. Allez dans Actions → Sélectionnez le dernier workflow réussi
2. Dans "Artifacts", téléchargez `224solutions-android-apk`
3. OU dans "Releases", trouvez la dernière release avec l'APK attaché

---

## 🔧 Option B : Génération Locale

### Étape 1 : Cloner le Projet

```bash
git clone https://github.com/VOTRE_USERNAME/224solutions.git
cd 224solutions
npm install
```

### Étape 2 : Build React

```bash
npm run build
```

### Étape 3 : Initialiser Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "224Solutions" "app.lovable.224solutions" --web-dir dist
npx cap add android
npx cap sync android
```

### Étape 4 : Ouvrir dans Android Studio

```bash
npx cap open android
```

### Étape 5 : Générer l'APK dans Android Studio

1. Build → Generate Signed Bundle / APK
2. Sélectionnez "APK"
3. Créez ou sélectionnez votre keystore
4. Choisissez "release" comme build variant
5. Cliquez "Finish"

L'APK sera généré dans : `android/app/release/app-release.apk`

---

## 📤 Hébergement de l'APK

### Option 1 : GitHub Releases (Recommandé)
- Automatique avec le workflow
- Lien direct : `https://github.com/USER/REPO/releases/latest/download/224solutions.apk`

### Option 2 : Votre Serveur
Uploadez l'APK sur votre serveur et mettez à jour le lien dans :
```
src/components/pwa/DownloadAppBanner.tsx
```

Ligne 24 :
```typescript
apkUrl: 'https://VOTRE-SERVEUR.com/224Solutions.apk',
```

### Option 3 : Google Drive
1. Uploadez l'APK sur Google Drive
2. Clic droit → Obtenir le lien → "Tout le monde avec le lien"
3. Convertissez le lien :
   - Original : `https://drive.google.com/file/d/FILE_ID/view`
   - Direct : `https://drive.google.com/uc?export=download&id=FILE_ID`

---

## 🔒 Sécurité

⚠️ **IMPORTANT** : Gardez votre keystore et mots de passe en sécurité !

- Ne commitez JAMAIS le keystore dans Git
- Sauvegardez le keystore dans un endroit sûr
- Si vous perdez le keystore, vous ne pourrez plus mettre à jour l'app

---

## 🐛 Dépannage

### Erreur "Keystore not found"
- Vérifiez que ANDROID_KEYSTORE est bien encodé en Base64
- Assurez-vous qu'il n'y a pas d'espaces ou retours à la ligne

### Erreur "Wrong password"
- Vérifiez KEYSTORE_PASSWORD et KEY_PASSWORD
- Ils doivent correspondre à ceux utilisés lors de la création

### Build échoue
- Vérifiez les logs dans GitHub Actions
- Assurez-vous que `npm run build` fonctionne localement

---

## 📞 Support

Besoin d'aide ? Contactez-nous :
- 📧 Email : support@224solutions.com
- 💬 Chat : Dans l'application

---

*Dernière mise à jour : Janvier 2026*
