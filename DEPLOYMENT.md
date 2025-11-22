# 🚀 Guide de Déploiement - 224Solutions

## 📦 Architecture de déploiement

### Frontend (React + Vite)
- **Plateforme recommandée** : Vercel / Netlify / Cloudflare Pages
- **Build** : `npm run build`
- **Dossier de production** : `dist/`

### Backend A : Supabase Edge Functions
- **Plateforme** : Supabase (auto-déployé)
- **Déploiement** : Automatique via Supabase CLI
- **Région** : Multi-région (edge computing)

### Backend B : Node.js Express
- **Plateforme recommandée** : Railway / Render / Fly.io / DigitalOcean
- **Conteneurisation** : Docker (optionnel)
- **Scalabilité** : Horizontale

---

## 🔧 Déploiement Frontend

### Option 1 : Vercel (Recommandé)

```bash
# Installation Vercel CLI
npm i -g vercel

# Build et déploiement
npm run build
vercel --prod
```

**Variables d'environnement Vercel :**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_BASE_URL=https://your-backend-api.com
```

### Option 2 : Netlify

```bash
# Installation Netlify CLI
npm i -g netlify-cli

# Build et déploiement
npm run build
netlify deploy --prod --dir=dist
```

**Configuration `netlify.toml` :**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 🟩 Déploiement Edge Functions (Supabase)

### Automatique via Lovable
Les Edge Functions sont déployées automatiquement lors du build.

### Manuel via Supabase CLI

```bash
# Installation Supabase CLI
npm install -g supabase

# Login
supabase login

# Link au projet
supabase link --project-ref uakkxaibujzxdiqzpnpr

# Déployer toutes les fonctions
supabase functions deploy

# Déployer une fonction spécifique
supabase functions deploy wallet-operations
```

### Vérification

```bash
# Tester une fonction
supabase functions invoke wallet-operations --body '{"test": true}'

# Voir les logs
supabase functions logs wallet-operations
```

---

## 🟦 Déploiement Backend Node.js

### Option 1 : Railway (Recommandé)

**1. Installation Railway CLI**
```bash
npm i -g @railway/cli
railway login
```

**2. Initialiser le projet**
```bash
cd backend
railway init
```

**3. Variables d'environnement**
Ajouter dans Railway Dashboard :
```env
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
INTERNAL_API_KEY=your-secure-key
CORS_ORIGINS=https://your-frontend.vercel.app
```

**4. Déployer**
```bash
railway up
```

**5. Obtenir l'URL**
```bash
railway domain
```

### Option 2 : Render

**1. Créer un `render.yaml`**
```yaml
services:
  - type: web
    name: 224solutions-backend
    env: node
    region: oregon
    plan: starter
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
```

**2. Connecter le repo GitHub**
- Aller sur Render.com
- "New +" → "Blueprint"
- Connecter GitHub repo
- Configurer les variables d'environnement

### Option 3 : Docker + DigitalOcean

**Dockerfile**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .

EXPOSE 3001

CMD ["node", "src/server.js"]
```

**Build et push**
```bash
docker build -t 224solutions-backend .
docker tag 224solutions-backend registry.digitalocean.com/your-registry/backend
docker push registry.digitalocean.com/your-registry/backend
```

**Déployer sur DigitalOcean App Platform**
```bash
doctl apps create --spec app-spec.yaml
```

---

## 🔐 Configuration des secrets

### Supabase Edge Functions

```bash
# Ajouter un secret
supabase secrets set OPENAI_API_KEY=sk-...

# Lister les secrets
supabase secrets list

# Les secrets sont disponibles via Deno.env.get()
```

### Backend Node.js

**Railway / Render :**
- Ajouter via Dashboard
- Variables disponibles via `process.env`

**Docker / DigitalOcean :**
```bash
# Fichier .env en production (sécurisé)
docker secret create backend_env .env
```

---

## 🌍 Configuration DNS et Domaines

### Frontend
```
frontend.224solutions.com → Vercel/Netlify
```

### Backend Node.js
```
api.224solutions.com → Railway/Render
```

### Certificats SSL
- Automatique avec Vercel/Netlify/Railway
- Let's Encrypt pour auto-hébergement

---

## 📊 Monitoring et Logs

### Frontend
- **Vercel Analytics** : Intégré
- **Sentry** : Pour erreurs JavaScript

### Edge Functions
```bash
# Logs en temps réel
supabase functions logs wallet-operations --tail

# Logs avec filtre
supabase functions logs wallet-operations --level error
```

### Backend Node.js
- **Logs** : Winston (fichiers `backend/logs/`)
- **Railway Logs** : `railway logs`
- **Render Logs** : Dashboard Render

### Monitoring avancé (Production)
- **Prometheus** + **Grafana**
- **Datadog** / **New Relic**
- **UptimeRobot** pour health checks

---

## 🔄 CI/CD Automatisé

### GitHub Actions

**`.github/workflows/deploy.yml`**
```yaml
name: Deploy 224Solutions

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-edge-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: cd backend && npm install
      - run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 🧪 Tests avant déploiement

```bash
# Tests frontend
npm run lint
npm run build

# Tests Edge Functions
supabase functions serve wallet-operations
curl http://localhost:54321/functions/v1/wallet-operations

# Tests backend
cd backend
npm run dev
curl http://localhost:3001/health
```

---

## 🚨 Rollback en cas de problème

### Frontend (Vercel)
```bash
vercel rollback
```

### Edge Functions
```bash
# Redéployer version précédente
git checkout previous-commit
supabase functions deploy
```

### Backend Node.js (Railway)
```bash
railway rollback
```

---

## 📈 Scaling

### Frontend
- **Auto-scalé** par Vercel/Netlify

### Edge Functions
- **Auto-scalé** par Supabase/Deno Deploy

### Backend Node.js

**Railway :**
```bash
# Augmenter les instances
railway scale --replicas 3
```

**DigitalOcean :**
```bash
# Augmenter les ressources
doctl apps update <app-id> --spec app-spec-large.yaml
```

---

## ✅ Checklist pré-déploiement

- [ ] Variables d'environnement configurées
- [ ] Secrets Supabase configurés
- [ ] Tests passés (lint + build)
- [ ] CORS configuré correctement
- [ ] Rate limiting activé
- [ ] Monitoring configuré
- [ ] DNS pointant vers les bons endpoints
- [ ] Certificats SSL valides
- [ ] Logs accessibles
- [ ] Health checks opérationnels
- [ ] Backup DB configuré
- [ ] Plan de rollback défini

---

## 🆘 Support

En cas de problème :
1. Vérifier les logs (`railway logs` / Dashboard)
2. Tester les health checks (`/health`)
3. Vérifier les variables d'environnement
4. Consulter la documentation plateforme

**Documentation officielle :**
- Supabase : https://supabase.com/docs
- Vercel : https://vercel.com/docs
- Railway : https://docs.railway.app

---

**🎯 Déploiement complet réussi = Application production-ready !** ✨
