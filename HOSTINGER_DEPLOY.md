# 🚀 Guide de Déploiement Hostinger - 224Solutions

## 📦 Fichiers Préparés

✅ **224solutions-app.zip** (6.33 MB)
✅ **224solutions-app.tar.gz** (6.25 MB)

## 🎯 Étapes de Déploiement sur Hostinger

### Option 1 : Déploiement via File Manager (Recommandé)

1. **Connectez-vous à Hostinger**
   - Accédez à hPanel : https://hpanel.hostinger.com
   - Cliquez sur votre domaine

2. **Accédez au File Manager**
   - Cliquez sur "File Manager" dans le menu
   - Naviguez vers le dossier `public_html`

3. **Uploadez l'archive**
   - Cliquez sur "Upload Files"
   - Sélectionnez `224solutions-app.zip`
   - Attendez la fin de l'upload (6.33 MB)

4. **Extrayez l'archive**
   - Clic droit sur `224solutions-app.zip`
   - Sélectionnez "Extract"
   - Confirmez l'extraction dans `public_html`

5. **Supprimez l'archive**
   - Clic droit sur `224solutions-app.zip`
   - Sélectionnez "Delete"

### Option 2 : Déploiement via FTP

1. **Configurez votre client FTP**
   - **Host** : ftp.votredomaine.com
   - **Username** : Votre username FTP
   - **Password** : Votre mot de passe FTP
   - **Port** : 21

2. **Téléchargez les fichiers**
   ```
   Connectez-vous avec FileZilla ou tout autre client FTP
   Naviguez vers /public_html
   Uploadez tous les fichiers du dossier dist/
   ```

### Option 3 : Déploiement via SSH (Si disponible)

```bash
# Se connecter en SSH
ssh username@votredomaine.com

# Naviguer vers public_html
cd public_html

# Télécharger l'archive depuis votre ordinateur
# (utilisez scp ou rsync)

# Extraire l'archive
unzip 224solutions-app.zip
# OU
tar -xzf 224solutions-app.tar.gz

# Nettoyer
rm 224solutions-app.zip
```

## ⚙️ Configuration Post-Déploiement

### 1. Fichier .htaccess (Important pour React Router)

Créez un fichier `.htaccess` dans `public_html` avec ce contenu :

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Redirection HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # React Router - Rediriger toutes les routes vers index.html
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Compression GZIP
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache Browser
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
</IfModule>
```

### 2. Variables d'Environnement

Créez un fichier `.env` dans `public_html` :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```

⚠️ **Important** : Configurez ces variables dans les paramètres Hostinger, pas dans un fichier texte !

### 3. Configuration Supabase

Dans votre projet Supabase :

1. **Authentication → URL Configuration**
   - Site URL : `https://votredomaine.com`
   - Redirect URLs : `https://votredomaine.com/auth/callback`

2. **Edge Functions**
   - Déployez les Edge Functions depuis votre projet local :
   ```bash
   supabase functions deploy
   ```

## ✅ Vérifications Post-Déploiement

1. ✅ Accédez à `https://votredomaine.com`
2. ✅ Vérifiez que l'application charge correctement
3. ✅ Testez l'authentification
4. ✅ Testez la navigation entre les pages
5. ✅ Vérifiez que les assets (images, CSS, JS) se chargent
6. ✅ Testez sur mobile

## 🔧 Dépannage

### Problème : Page blanche
- Vérifiez la console du navigateur (F12)
- Vérifiez que le fichier `.htaccess` est présent
- Vérifiez les permissions des fichiers (755 pour dossiers, 644 pour fichiers)

### Problème : Routes 404
- Vérifiez le fichier `.htaccess`
- Assurez-vous que `mod_rewrite` est activé

### Problème : Variables d'environnement non trouvées
- Vérifiez que les variables sont définies dans Hostinger
- Rebuildez l'application avec les bonnes variables

## 📱 Support

Si vous avez des problèmes :
1. Contactez le support Hostinger
2. Vérifiez les logs d'erreurs dans hPanel
3. Consultez la documentation React : https://react.dev

## 🎉 Félicitations !

Votre application **224Solutions** est maintenant déployée sur Hostinger !

---

**Date de création** : 1er décembre 2025
**Version** : 1.0.0
