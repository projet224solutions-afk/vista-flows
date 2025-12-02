# 🆘 CORRECTION PAGE BLANCHE HOSTINGER - GUIDE URGENT

## ⚡ SOLUTION RAPIDE (5 MINUTES)

### Étape 1: Ouvrir la Console du Navigateur
1. Ouvrez votre site: `https://votredomaine.com`
2. Appuyez sur **F12** (ou clic droit → "Inspecter")
3. Allez dans l'onglet **"Console"**
4. **PRENEZ UN SCREENSHOT** de toutes les erreurs rouges

### Étape 2: Identifier le Problème

**Si vous voyez des erreurs comme:**

#### ❌ "Failed to load module" ou "Unexpected token '<'"
→ **Problème de .htaccess manquant**  
→ Allez à **SOLUTION A** ci-dessous

#### ❌ "404 Not Found" pour les fichiers .js et .css
→ **Problème de chemin ou structure de fichiers**  
→ Allez à **SOLUTION B** ci-dessous

#### ❌ "CORS policy" ou "blocked by CORS"
→ **Problème de configuration API**  
→ Allez à **SOLUTION C** ci-dessous

#### ✅ Aucune erreur dans la console
→ **Problème d'assets ou build**  
→ Allez à **SOLUTION D** ci-dessous

---

## 📌 SOLUTION A: Ajouter/Corriger .htaccess

### Méthode 1: Via File Manager Hostinger

1. **Connectez-vous à hPanel Hostinger**
2. **Allez dans "File Manager"**
3. **Naviguez vers `public_html/`**
4. **Vérifiez si `.htaccess` existe:**
   - Si NON: Créez-le (bouton "+ New File")
   - Si OUI: Éditez-le (clic droit → Edit)

5. **Remplacez TOUT le contenu par:**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Redirect to index.html for all routes
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Allow CORS
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
</IfModule>

Options -Indexes
```

6. **Sauvegardez le fichier**
7. **Videz le cache du navigateur** (Ctrl+Shift+Delete)
8. **Rechargez le site**

---

## 📌 SOLUTION B: Corriger la Structure des Fichiers

### Vérifier la Structure dans File Manager

**Structure CORRECTE:**
```
public_html/
├── index.html          ✅ À LA RACINE
├── .htaccess           ✅ À LA RACINE
├── assets/
│   ├── index-abc.js
│   ├── index-def.css
│   └── logo.png
└── favicon.ico
```

**Structure INCORRECTE:**
```
public_html/
└── dist/               ❌ PAS DE SOUS-DOSSIER
    ├── index.html
    └── assets/
```

**Si vos fichiers sont dans un sous-dossier:**

1. **Sélectionnez TOUT dans `public_html/dist/`**
2. **Coupez** (Ctrl+X ou bouton "Move")
3. **Allez dans `public_html/`** (niveau parent)
4. **Collez** tout
5. **Supprimez** le dossier `dist/` vide
6. **Rechargez** votre site

---

## 📌 SOLUTION C: Problèmes de Variables d'Environnement

### Si l'app charge mais ne fonctionne pas

**Les variables d'environnement doivent être "baked in" au build**

1. **Sur votre machine locale:**

Créez `.env.production` à la racine du projet:
```bash
VITE_SUPABASE_URL=https://uakkxaibujzxdiqzpnpr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM
```

2. **Rebuild:**
```bash
npm run build
```

3. **Re-uploadez TOUT le contenu de `dist/`**

---

## 📌 SOLUTION D: Rebuild Complet

### Si rien d'autre ne fonctionne

**Sur votre machine locale:**

```bash
# 1. Nettoyer complètement
rm -rf node_modules/
rm -rf dist/
rm -rf .vite/

# 2. Réinstaller les dépendances
npm install

# 3. Rebuild
npm run build

# 4. Vérifier que le build fonctionne localement
cd dist
npx serve -s .
# Ouvrir http://localhost:3000

# 5. Si ça marche localement, uploader sur Hostinger
```

---

## 🎯 CHECKLIST DE DIAGNOSTIC

Cochez chaque élément:

### Sur Hostinger (File Manager)
- [ ] `index.html` est dans `public_html/` (pas dans un sous-dossier)
- [ ] `.htaccess` existe dans `public_html/`
- [ ] Dossier `assets/` existe avec des fichiers `.js` et `.css`
- [ ] Permissions: dossiers 755, fichiers 644

### Dans le Navigateur (F12 → Console)
- [ ] Aucune erreur 404
- [ ] Aucune erreur "Failed to load module"
- [ ] Aucune erreur CORS
- [ ] `index.html` se charge correctement

### Variables d'Environnement
- [ ] `.env.production` existe localement
- [ ] Build fait APRÈS création de `.env.production`
- [ ] URLs Supabase correctes

---

## 🔧 SCRIPT DE DÉPLOIEMENT AUTOMATIQUE

**Pour éviter les erreurs, utilisez le script:**

```bash
chmod +x scripts/deploy-hostinger.sh
./scripts/deploy-hostinger.sh
```

Le script va:
1. ✅ Nettoyer les anciens builds
2. ✅ Builder l'application
3. ✅ Créer le .htaccess automatiquement
4. ✅ Créer une archive ZIP prête à uploader
5. ✅ Afficher les instructions détaillées

---

## 📸 TESTS À EFFECTUER

### Test 1: Page d'Accueil
- URL: `https://votredomaine.com/`
- Attendu: L'app React charge

### Test 2: Navigation Directe
- URL: `https://votredomaine.com/vendeur`
- Attendu: La page vendeur charge (pas 404)

### Test 3: Assets
- F12 → Network → Rafraîchir
- Vérifier que les fichiers CSS/JS ont le status **200 OK**

---

## 🚨 SI TOUJOURS PAS RÉSOLU

### Créer un Fichier de Test

**Créez `test.html` dans `public_html/`:**
```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Test 224Solutions</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .success {
            padding: 20px;
            background: #4CAF50;
            color: white;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>🎉 Test de Déploiement 224Solutions</h1>
    <div class="success">
        <h2>✅ Le serveur Hostinger fonctionne!</h2>
        <p>Si vous voyez ce message, le serveur Apache est opérationnel.</p>
    </div>
    
    <h3>Informations Système:</h3>
    <ul id="info"></ul>
    
    <h3>Test JavaScript:</h3>
    <p id="js-test">En attente...</p>
    
    <script>
        // Test JavaScript
        document.getElementById('js-test').innerHTML = '✅ JavaScript fonctionne!';
        document.getElementById('js-test').style.color = 'green';
        
        // Afficher des infos
        const info = [
            'URL: ' + window.location.href,
            'User Agent: ' + navigator.userAgent,
            'Date: ' + new Date().toLocaleString('fr-FR')
        ];
        
        const ul = document.getElementById('info');
        info.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
        });
        
        console.log('✅ Test de console.log() OK');
    </script>
</body>
</html>
```

**Accédez à:** `https://votredomaine.com/test.html`

- ✅ **Si ça marche:** Le serveur est OK, problème avec l'app React
- ❌ **Si ça ne marche pas:** Problème configuration serveur Hostinger

---

## 📞 CONTACTER LE SUPPORT HOSTINGER

Si aucune solution ne fonctionne:

**Live Chat Hostinger:**
1. Connectez-vous à hPanel
2. Cliquez sur l'icône de chat en bas à droite
3. Dites: "J'ai déployé une application React (SPA) mais j'obtiens une page blanche. Pouvez-vous vérifier si mod_rewrite est activé et si .htaccess fonctionne?"

**Email:** support@hostinger.com

**Informations à fournir:**
- Votre domaine
- Type d'hébergement (Shared/VPS/Cloud)
- Screenshots des erreurs console
- Contenu de votre .htaccess

---

## ✅ SOLUTION GARANTIE

**Si RIEN ne fonctionne, utilisez cette méthode:**

1. **Créez un fichier `index.php` dans `public_html/`:**
```php
<?php
// Redirect all to index.html
header('Location: /index.html');
exit;
?>
```

2. **Assurez-vous que `index.html` existe**

3. **Testez:** `https://votredomaine.com/`

Cette méthode force le serveur à charger index.html.

---

**Dernière mise à jour:** 2025-12-02  
**Testé sur:** Hostinger Shared/VPS/Cloud
