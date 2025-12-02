# 🚀 Guide de Déploiement Manuel - 224Solutions

## ✅ Étape 1 : Upload du fichier ZIP

1. **Fichier à uploader** : `224solutions-deploy.zip` (6.12 MB)
2. **Destination** : Uploadez via **File Manager** de Hostinger dans `/home/clp/public_html/`

## 📋 Étape 2 : Extraction sur le serveur

### Option A : Via File Manager Hostinger
1. Connectez-vous à **CloudPanel** : https://72.61.110.182:8443
2. Allez dans **File Manager**
3. Naviguez vers `/home/clp/public_html/`
4. **Supprimez tous les anciens fichiers** dans ce dossier
5. Uploadez `224solutions-deploy.zip`
6. Clic droit sur le ZIP → **Extract**
7. Supprimez le fichier ZIP après extraction

### Option B : Via SSH (si accessible)
```bash
ssh root@72.61.110.182 -p 65002

# Aller dans public_html
cd /home/clp/public_html/

# Supprimer les anciens fichiers
rm -rf *

# Uploader le ZIP (utilisez FileZilla, WinSCP, ou File Manager)
# Puis extraire :
unzip 224solutions-deploy.zip
rm 224solutions-deploy.zip

# Créer .htaccess si manquant
cat > .htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
EOF

# Définir les permissions correctes
chmod 755 /home/clp/public_html
find /home/clp/public_html -type d -exec chmod 755 {} \;
find /home/clp/public_html -type f -exec chmod 644 {} \;
chown -R clp:clp /home/clp/public_html
```

## ✅ Étape 3 : Vérifications importantes

### 1. Vérifier les fichiers présents
Assurez-vous que `/home/clp/public_html/` contient :
```
index.html         ✅ Fichier principal
.htaccess          ✅ Configuration Apache
assets/            ✅ Dossier avec JS et CSS
favicon.png        ✅ Icône du site
icon-192.png       ✅
icon-512.png       ✅
apple-touch-icon.png ✅
manifest.json      ✅ Configuration PWA
```

### 2. Vérifier que index.html est complet
```bash
head -5 /home/clp/public_html/index.html
tail -5 /home/clp/public_html/index.html
```

Doit contenir :
- **Début** : `<!doctype html><html lang="fr">`
- **Fin** : `<div id="root"></div>` et `</body></html>`

### 3. Vérifier .htaccess
```bash
cat /home/clp/public_html/.htaccess
```

Si manquant ou vide, créez-le avec le contenu ci-dessus.

### 4. Vérifier les permissions
```bash
ls -la /home/clp/public_html/
```

- Dossiers : `755` (drwxr-xr-x)
- Fichiers : `644` (-rw-r--r--)
- Propriétaire : `clp:clp`

## 🌐 Étape 4 : Tester le site

1. **Videz le cache du navigateur** : `Ctrl + F5` ou navigation privée
2. Ouvrez : **http://224solutionapp.com**
3. Si page blanche :
   - `F12` → **Console** pour voir les erreurs
   - Vérifiez **Network** pour voir si les fichiers `.js` et `.css` se chargent
   - Code 404 → Problème de chemin ou .htaccess manquant
   - Code 500 → Erreur serveur Apache

## 🔧 Dépannage

### Problème : Page blanche
**Cause** : Fichiers manquants ou index.html incomplet
**Solution** : 
```bash
# Vérifier index.html
wc -l /home/clp/public_html/index.html
# Doit avoir environ 79 lignes

# Vérifier que <body> existe
grep -n "body" /home/clp/public_html/index.html
```

### Problème : Erreur 404 sur /vendeur, /pdg, etc.
**Cause** : .htaccess manquant ou mod_rewrite désactivé
**Solution** :
1. Créer .htaccess (voir ci-dessus)
2. Vérifier que mod_rewrite est activé dans Apache

### Problème : CSS/JS ne chargent pas
**Cause** : Chemins incorrects ou permissions
**Solution** :
```bash
# Vérifier que assets/ existe
ls -la /home/clp/public_html/assets/

# Corriger permissions
chmod -R 755 /home/clp/public_html/assets/
```

## 📊 Vérification finale

### Checklist avant de déclarer le déploiement réussi :
- [ ] `index.html` existe et est complet (79 lignes)
- [ ] `.htaccess` existe avec règles de réécriture
- [ ] Dossier `assets/` contient les fichiers JS et CSS
- [ ] Permissions correctes (755/644)
- [ ] Site accessible via http://224solutionapp.com
- [ ] Pas d'erreurs dans Console F12
- [ ] Routes fonctionnent : /vendeur, /pdg, /auth, etc.
- [ ] Connexion Supabase fonctionne

## 🎯 Fonctionnalités débloquées dans cette version

✅ **TOUTES les fonctionnalités vendeur sont accessibles sans restriction** :
- Point de vente (POS)
- Gestion produits, commandes, inventaire
- Entrepôts, fournisseurs, agents
- CRM clients et prospects
- Marketing et promotions
- Wallet et paiements
- Analytics et rapports
- Livraisons et support
- Communication universelle

✅ **Banner KYC supprimé**
✅ **Panneau de sécurité retiré**
✅ **Aucune vérification d'abonnement**

## 📞 Support

Si problème persiste après ces étapes, fournissez :
1. Capture d'écran de la Console (F12)
2. Résultat de `ls -la /home/clp/public_html/`
3. Contenu de `head -20 /home/clp/public_html/index.html`
4. URL exacte testée

---
**Version** : 2025-12-02 19:10
**Commit** : 33ff86f
**Build** : Vite 7.2.4 - 3m 11s
