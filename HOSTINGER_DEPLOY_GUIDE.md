# 🚀 Guide de Déploiement Hostinger - 224Solutions

## ⚡ Déploiement en 10 minutes

### Étape 1: Préparation locale

```bash
# Sur Windows (PowerShell)
.\deploy-hostinger.ps1

# Sur Mac/Linux
chmod +x scripts/deploy-hostinger.sh
./scripts/deploy-hostinger.sh
```

Le script va créer automatiquement:
- ✅ Build de production avec variables d'environnement
- ✅ Fichier .htaccess pour React routing
- ✅ Archive ZIP prête à uploader

### Étape 2: Upload sur Hostinger

1. **Connectez-vous à Hostinger**
   - URL: https://hpanel.hostinger.com
   - Utilisez vos identifiants

2. **Ouvrez File Manager**
   - Dans le panneau, cliquez sur "File Manager"
   - Attendez le chargement

3. **Naviguez vers public_html/**
   - Double-cliquez sur le dossier `public_html`
   - C'est ici que va votre site

4. **⚠️ NETTOYEZ TOUT (TRÈS IMPORTANT)**
   ```
   - Sélectionnez TOUS les fichiers existants (Ctrl+A)
   - Cliquez sur "Delete"
   - Confirmez la suppression
   ```

5. **Uploadez l'archive**
   - Cliquez sur "Upload"
   - Sélectionnez `224solutions-app.zip`
   - Attendez la fin de l'upload (barre de progression)

6. **Extrayez l'archive**
   - Clic droit sur `224solutions-app.zip`
   - Sélectionnez "Extract"
   - Choisissez "Extract Here"
   - Attendez la fin de l'extraction

7. **Vérifiez la structure**
   ```
   public_html/
   ├── index.html          ✅ DOIT ÊTRE LÀ
   ├── .htaccess           ✅ DOIT ÊTRE LÀ
   ├── assets/             ✅ Contient les JS/CSS
   │   ├── index-xxx.js
   │   └── index-xxx.css
   └── favicon.png
   ```

8. **Supprimez le ZIP**
   - Sélectionnez `224solutions-app.zip`
   - Cliquez sur "Delete"

### Étape 3: Vérification

1. **Ouvrez votre site en navigation privée**
   ```
   Chrome/Edge: Ctrl + Shift + N
   Firefox: Ctrl + Shift + P
   Safari: Cmd + Shift + N
   ```

2. **Vérifiez que .htaccess est visible**
   - Dans File Manager, cliquez sur "Settings" (icône engrenage)
   - Cochez "Show Hidden Files"
   - Vérifiez que `.htaccess` apparaît

3. **Testez la navigation**
   - Page d'accueil: `https://votredomaine.com/`
   - Page vendeur: `https://votredomaine.com/vendeur`
   - Les deux doivent charger sans erreur 404

## 🆘 Si Page Blanche

### Diagnostic rapide (2 minutes)

1. **Ouvrez la Console**
   - Appuyez sur F12
   - Allez dans l'onglet "Console"
   - **Prenez un screenshot des erreurs rouges**

2. **Vérifiez l'onglet Network**
   - Allez dans "Network"
   - Rechargez la page (F5)
   - Cherchez les fichiers en **404 (rouge)**

### Solutions selon l'erreur

#### Erreur: "Failed to load module script"
**Cause**: `.htaccess` manquant ou incorrect

**Solution**:
```bash
# Dans File Manager Hostinger:
1. Créez un fichier `.htaccess` dans public_html/
2. Copiez le contenu du fichier public/.htaccess du projet
3. Sauvegardez
4. Rechargez votre site
```

#### Erreur: "404 Not Found" sur les fichiers JS/CSS
**Cause**: Structure de fichiers incorrecte

**Solution**:
```bash
# Vérifiez que les fichiers sont directement dans public_html/
# PAS dans public_html/dist/ ou autre sous-dossier

✅ CORRECT:
public_html/
├── index.html
├── .htaccess
└── assets/

❌ INCORRECT:
public_html/
└── dist/
    ├── index.html
    └── assets/
```

#### Erreur: "Unexpected token '<'" ou "SyntaxError"
**Cause**: React Router essaie de charger un JS mais reçoit du HTML

**Solution**:
```bash
1. Vérifiez que .htaccess existe dans public_html/
2. Vérifiez les permissions:
   - Dossiers: 755
   - Fichiers: 644
   - .htaccess: 644
3. Videz le cache: Ctrl+Shift+Delete
4. Rechargez en navigation privée
```

#### Erreur: "createClient requires a valid Supabase URL"
**Cause**: Variables d'environnement non injectées au build

**Solution**:
```bash
# Sur votre machine locale:
1. Vérifiez que .env.production existe à la racine
2. Vérifiez qu'il contient:
   VITE_SUPABASE_URL=https://uakkxaibujzxdiqzpnpr.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...
3. Relancez le build: npm run build
4. Re-uploadez tout sur Hostinger
```

## 🔧 Permissions correctes

```bash
# Dossiers
chmod 755 public_html
chmod 755 public_html/assets

# Fichiers
chmod 644 public_html/index.html
chmod 644 public_html/.htaccess
chmod 644 public_html/assets/*
```

## ✅ Checklist finale

- [ ] `.env.production` existe avec les URLs Supabase
- [ ] Build local réussit sans erreur
- [ ] Archive ZIP créée
- [ ] `public_html/` complètement vidé avant upload
- [ ] ZIP uploadé et extrait
- [ ] `index.html` dans `public_html/` (pas dans sous-dossier)
- [ ] `.htaccess` visible dans `public_html/`
- [ ] Permissions correctes (755/644)
- [ ] Cache navigateur vidé
- [ ] Test en navigation privée
- [ ] Aucune erreur dans Console (F12)
- [ ] Tous les fichiers CSS/JS chargent (Network tab)

## 📞 Support

Si problème persiste après ces étapes:

1. **Prenez des screenshots**:
   - Console (F12 → Console)
   - Network (F12 → Network)
   - Structure File Manager

2. **Vérifiez les logs Apache** (dans hPanel Hostinger)

3. **Contactez support Hostinger**:
   - Live chat: hPanel → icône chat
   - Email: support@hostinger.com

---

**Dernière mise à jour**: 2 décembre 2025  
**Version**: 2.0 - Configuration Supabase intégrée
