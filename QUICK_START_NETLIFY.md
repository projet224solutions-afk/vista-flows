# ⚡ Quick Start - Déploiement Netlify en 5 Minutes

## 🎯 Configuration Ultra-Rapide

### 1️⃣ Push le Code (30 secondes)
```bash
git add .
git commit -m "Configure Netlify"
git push
```

### 2️⃣ Netlify UI - Build Settings (1 minute)
```
Build command: npm run build
Publish directory: dist
```

### 3️⃣ Netlify UI - Variables d'Environnement (2 minutes)

**Minimum requis:**
```bash
VITE_SUPABASE_URL=https://uakkxaibujzxdiqzpnpr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM
VITE_ENCRYPTION_KEY=(récupérer depuis vos secrets Supabase)
```

### 4️⃣ Déployer (1 minute)
Cliquez sur "Trigger deploy" ou push sur Git.

### 5️⃣ Vérifier (30 secondes)
Ouvrez votre site → Pas de page blanche ✅

---

## 🔥 C'est Tout !

Votre site est maintenant en ligne sur Netlify sans page blanche.

**Publish directory:** `dist`

Pour plus de détails, voir: `NETLIFY_DEPLOYMENT_GUIDE.md`