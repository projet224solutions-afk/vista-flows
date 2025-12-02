# 🔧 GUIDE DE DÉPANNAGE HOSTINGER - PAGE BLANCHE

## 📋 DIAGNOSTIC RAPIDE

### Étape 1: Vérifier les Logs d'Erreur

**Dans le navigateur (Console DevTools):**
1. Ouvrez l'application sur Hostinger
2. Appuyez sur F12 pour ouvrir DevTools
3. Allez dans l'onglet "Console"
4. Notez toutes les erreurs en rouge

**Erreurs Communes:**
```
❌ Failed to load module script
❌ Unexpected token '<'
❌ 404 Not Found (assets)
❌ CORS policy error
❌ Cannot find module
```

### Étape 2: Vérifier la Configuration du Serveur

**Hostinger requiert une configuration spéciale pour les SPA (Single Page Applications)**

---

## 🛠️ SOLUTIONS PAR TYPE D'ERREUR

### Solution 1: Fichier .htaccess Manquant (PLUS COMMUN)

**Symptôme:** Page blanche, erreurs 404 dans la console

**Cause:** Hostinger Apache ne sait pas comment gérer le routing React

**Fix:** Créer un fichier `.htaccess` dans le dossier public

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Redirect all requests to index.html except existing files
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache control
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
```

---

### Solution 2: Base Path Incorrect

**Symptôme:** Assets non chargés (CSS, JS), erreurs 404

**Cause:** L'app est dans un sous-dossier mais utilise des chemins absolus

**Fix dans `vite.config.ts`:**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  base: "/", // Change to "/subfolder/" if in subfolder
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
});
```

---

### Solution 3: Variables d'Environnement Manquantes

**Symptôme:** L'app charge mais fonctionnalités cassées, erreurs API

**Cause:** Les variables d'environnement ne sont pas configurées sur Hostinger

**Fix:**

1. **Créer `.env.production` localement:**
```bash
VITE_SUPABASE_URL=https://uakkxaibujzxdiqzpnpr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. **Build avec les bonnes variables:**
```bash
npm run build
```

3. **Uploader le dossier `dist` complet sur Hostinger**

---

### Solution 4: Permissions de Fichiers Incorrectes

**Symptôme:** Erreurs 403 Forbidden

**Fix dans Hostinger File Manager:**
```
Dossiers: 755
Fichiers: 644
.htaccess: 644
```

**Via SSH:**
```bash
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;
```

---

### Solution 5: Index.html Non Trouvé

**Symptôme:** Page blanche totale, pas d'erreurs console

**Cause:** Le fichier index.html n'est pas à la racine du public_html

**Fix:**
1. Extraire le contenu de `dist/` 
2. Placer TOUS les fichiers directement dans `public_html/`
3. Structure correcte:
```
public_html/
├── index.html (✅ À LA RACINE)
├── .htaccess
├── assets/
│   ├── index-abc123.js
│   ├── index-def456.css
│   └── ...
└── ...
```

**Structure INCORRECTE:**
```
public_html/
└── dist/  (❌ PAS DE SOUS-DOSSIER)
    └── index.html
```

---

## 🚀 PROCÉDURE DE DÉPLOIEMENT COMPLÈTE

### Étape 1: Build Local
```bash
# 1. Installer les dépendances
npm install

# 2. Build production
npm run build

# 3. Vérifier que dist/ contient index.html
ls -la dist/
```

### Étape 2: Préparer les Fichiers
```bash
# Créer .htaccess dans dist/
cat > dist/.htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
EOF
```

### Étape 3: Upload vers Hostinger

**Option A: File Manager (Interface Web)**
1. Se connecter à Hostinger hPanel
2. Aller dans "File Manager"
3. Naviguer vers `public_html/`
4. **Supprimer tous les fichiers existants**
5. Uploader TOUT le contenu de `dist/`
6. Attendre la fin de l'upload (peut prendre plusieurs minutes)

**Option B: FTP (Recommandé pour gros fichiers)**
1. Utiliser FileZilla ou similaire
2. Connexion:
   - Host: ftp.votredomaine.com
   - Username: votre_username
   - Password: votre_password
   - Port: 21
3. Aller dans `/public_html/`
4. **Supprimer l'ancien contenu**
5. Uploader tout le contenu de `dist/`

**Option C: SSH (Le plus rapide)**
```bash
# Se connecter via SSH
ssh username@votredomaine.com

# Aller dans le dossier web
cd public_html/

# Nettoyer l'ancien contenu
rm -rf *

# Uploader le nouveau build (depuis votre machine locale)
# Utiliser scp depuis un autre terminal
scp -r dist/* username@votredomaine.com:~/public_html/
```

### Étape 4: Vérification Post-Déploiement
1. Vider le cache du navigateur (Ctrl+Shift+Delete)
2. Ouvrir votre site en navigation privée
3. Ouvrir DevTools (F12) et vérifier:
   - ✅ Pas d'erreurs 404
   - ✅ Fichiers CSS/JS chargés
   - ✅ Pas d'erreurs console
   - ✅ L'app s'affiche correctement

---

## 🔍 DIAGNOSTIC AVANCÉ

### Vérifier les Fichiers sur le Serveur

**Via File Manager:**
```
public_html/
├── index.html         (✅ Doit exister)
├── .htaccess          (✅ Doit exister)
├── assets/
│   ├── index-[hash].js    (✅ Fichiers JS)
│   ├── index-[hash].css   (✅ Fichiers CSS)
│   └── images/
└── favicon.ico
```

### Tester le .htaccess

**Créer `test.php` dans public_html:**
```php
<?php
phpinfo();
?>
```

Accéder à `votredomaine.com/test.php`
- Si ça fonctionne: Serveur OK
- Si erreur 500: Problème .htaccess

### Vérifier les Logs d'Erreur Apache

**Via hPanel:**
1. Aller dans "Advanced" → "Error Logs"
2. Télécharger le dernier log
3. Chercher les erreurs récentes

**Erreurs communes:**
```
[error] script '/public_html/index.html' not found
[error] .htaccess: Invalid command 'RewriteEngine'
```

---

## 📝 CHECKLIST DE DÉPLOIEMENT

### Avant le Déploiement
- [ ] `npm run build` exécuté avec succès
- [ ] Dossier `dist/` créé
- [ ] `dist/index.html` existe
- [ ] `.htaccess` créé dans `dist/`
- [ ] Variables d'environnement configurées

### Pendant le Déploiement
- [ ] Ancien contenu de `public_html/` supprimé
- [ ] Tous les fichiers de `dist/` uploadés
- [ ] Upload terminé à 100%
- [ ] Permissions correctes (755/644)

### Après le Déploiement
- [ ] Cache navigateur vidé
- [ ] Site accessible
- [ ] Pas d'erreurs 404
- [ ] Pas d'erreurs console
- [ ] Routing fonctionne (tester plusieurs pages)
- [ ] API Supabase fonctionne

---

## 🆘 SOLUTIONS D'URGENCE

### Si Rien ne Fonctionne

**1. Build Minimaliste de Test**
```html
<!-- Créer test.html dans public_html -->
<!DOCTYPE html>
<html>
<head>
    <title>Test 224Solutions</title>
</head>
<body>
    <h1>Test OK - Serveur fonctionne</h1>
    <script>
        console.log('JavaScript OK');
        alert('App peut charger');
    </script>
</body>
</html>
```

Accéder à `votredomaine.com/test.html`
- Si ça marche: Problème avec le build React
- Si ça ne marche pas: Problème serveur Hostinger

**2. Contacter le Support Hostinger**
- Live Chat disponible 24/7
- Mentionner: "React SPA déployée, page blanche"
- Demander vérification de mod_rewrite

**3. Vérifier la Configuration PHP**
Hostinger requiert parfois:
- PHP 7.4+ ou 8.0+
- mod_rewrite activé
- AllowOverride All

---

## 📞 SUPPORT

Si le problème persiste après avoir suivi ce guide:

1. **Copier les erreurs console** (F12 → Console)
2. **Prendre des screenshots** de:
   - File Manager (structure des fichiers)
   - Erreurs console
   - Page blanche
3. **Vérifier les logs d'erreur** Hostinger
4. **Contacter le support** avec ces informations

---

**Mis à jour:** 2025-12-02  
**Compatible:** Hostinger Shared/VPS/Cloud
