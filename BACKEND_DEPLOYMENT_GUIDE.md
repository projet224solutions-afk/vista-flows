# 🚀 Guide Backend - 224Solutions

## ✅ Configuration Validée

### Port Backend : **3001**
- Le backend Node.js écoute sur le port **3001**
- Configuration dans `ecosystem.config.js` et `backend/src/server.js`
- URL locale : `http://localhost:3001`

### Endpoints Disponibles

#### Health Check
```bash
curl http://localhost:3001/health
```

**Réponse :**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-12-02T22:55:34.198Z",
  "uptime": 21.5552074,
  "environment": "development"
}
```

#### Health Check Détaillé
```bash
curl http://localhost:3001/health/detailed
```

Inclut : statut Supabase, mémoire, version Node.js

### Routes Principales

| Route | Description | Protection |
|-------|-------------|------------|
| `/health` | Health check | Public |
| `/auth` | Authentification | Public |
| `/api/wallet` | Wallet operations | JWT |
| `/internal` | API interne | Clé interne |
| `/jobs` | Jobs & Cron | JWT |

## 🔧 Démarrage Local

### 1. Installation des dépendances
```bash
cd backend
npm install
```

### 2. Démarrer le serveur
```bash
# Mode développement
node src/server.js

# Ou avec PM2
pm2 start ecosystem.config.js
```

### 3. Vérifier le démarrage
```bash
curl http://localhost:3001/health
```

## 📦 Déploiement Production

### Sur Hostinger avec PM2

```bash
# SSH vers le serveur
ssh root@72.61.110.182 -p 65002

# Aller dans le projet
cd /home/clp/htdocs/224solutionapp.com

# Pull dernières modifications
git pull origin main

# Installer dépendances backend
cd backend
npm install --production

# Démarrer avec PM2
cd ..
pm2 start ecosystem.config.js --env production

# Vérifier le statut
pm2 status
pm2 logs 224solutions-api

# Sauvegarder configuration PM2
pm2 save
pm2 startup
```

### Configuration Nginx pour Backend

Dans `/etc/nginx/sites-available/224solutions.conf` :

```nginx
server {
    listen 80;
    server_name 224solutionapp.com www.224solutionapp.com;

    # Frontend (React)
    location / {
        root /home/clp/public_html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check backend
    location /health {
        proxy_pass http://localhost:3001;
        access_log off;
    }
}
```

Recharger Nginx :
```bash
nginx -t
systemctl reload nginx
```

## 🔍 Monitoring

### Vérifier que le backend tourne
```bash
pm2 status
```

### Logs en temps réel
```bash
pm2 logs 224solutions-api
```

### Redémarrer le backend
```bash
pm2 restart 224solutions-api
```

### Métriques
```bash
pm2 monit
```

## 🐛 Dépannage

### Backend ne démarre pas
```bash
# Vérifier les logs
pm2 logs 224solutions-api --lines 50

# Vérifier le port
netstat -tulpn | grep 3001

# Tuer le processus si port occupé
lsof -ti:3001 | xargs kill -9

# Redémarrer
pm2 restart 224solutions-api
```

### Erreur de connexion depuis le frontend
1. Vérifier que le backend tourne : `pm2 status`
2. Tester l'endpoint : `curl http://localhost:3001/health`
3. Vérifier Nginx : `nginx -t`
4. Vérifier les CORS dans `backend/src/server.js`

### Port déjà utilisé
```bash
# Trouver qui utilise le port 3001
lsof -i :3001

# Tuer le processus
kill -9 <PID>

# Ou changer le port dans .env et ecosystem.config.js
```

## 📝 Variables d'Environnement

Créer un fichier `.env` dans `/home/clp/htdocs/224solutionapp.com/` :

```bash
# Supabase
VITE_SUPABASE_URL=https://cjomojytxdjxbnstpfsg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Backend
PORT=3001
NODE_ENV=production

# CORS (domaines autorisés)
CORS_ORIGINS=224solutionapp.com,www.224solutionapp.com
```

## ✅ Checklist Déploiement

- [ ] Backend code poussé sur GitHub
- [ ] `git pull` sur le serveur
- [ ] `npm install` dans le dossier backend
- [ ] `.env` configuré avec bonnes valeurs
- [ ] PM2 démarré : `pm2 start ecosystem.config.js`
- [ ] Backend accessible : `curl http://localhost:3001/health`
- [ ] Nginx configuré avec proxy_pass
- [ ] Nginx rechargé : `systemctl reload nginx`
- [ ] PM2 sauvegardé : `pm2 save`
- [ ] Site accessible : http://224solutionapp.com
- [ ] API accessible : http://224solutionapp.com/api/health

---

**Version** : 2025-12-02
**Port Backend** : 3001
**Commit** : 1cae426
