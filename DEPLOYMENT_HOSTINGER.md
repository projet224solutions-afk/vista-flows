# 🚀 Guide de Déploiement - 224Solutions sur Hostinger VPS

## 📋 Prérequis

- VPS Hostinger avec accès root
- Ubuntu 20.04 ou 22.04
- Minimum 2GB RAM, 2 CPU cores
- Nom de domaine configuré (ex: 224solutions.com)

---

## 🗄️ ÉTAPE 1: Préparation de la Base de Données

### 1.1 Export depuis Supabase

```bash
# Exécuter ce script pour exporter toute la DB
node scripts/export-database.js
```

Cela créera: `224solutions-database-export.sql`

### 1.2 Configuration PostgreSQL sur VPS

```bash
# SSH vers votre VPS
ssh root@votre-vps-ip

# Installer PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Créer la base de données
sudo -u postgres psql
CREATE DATABASE solutions224;
CREATE USER solutions224_user WITH PASSWORD 'VOTRE_MOT_DE_PASSE_SECURISE';
GRANT ALL PRIVILEGES ON DATABASE solutions224 TO solutions224_user;
\q

# Importer la base de données
sudo -u postgres psql solutions224 < 224solutions-database-export.sql
```

---

## 🔧 ÉTAPE 2: Installation des Dépendances sur VPS

```bash
# Installer Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installer PM2 (Process Manager)
sudo npm install -g pm2

# Installer Nginx (Reverse Proxy)
sudo apt install nginx -y

# Installer Certbot (SSL)
sudo apt install certbot python3-certbot-nginx -y
```

---

## 📦 ÉTAPE 3: Déploiement de l'Application

### 3.1 Upload des Fichiers

```bash
# Sur votre machine locale, créer l'archive
npm run build:production

# Créer l'archive
tar -czf 224solutions.tar.gz dist/ backend/ package*.json ecosystem.config.js .env.production

# Transférer vers le VPS
scp 224solutions.tar.gz root@votre-vps-ip:/var/www/

# Sur le VPS, extraire
cd /var/www
tar -xzf 224solutions.tar.gz
mv dist 224solutions
```

### 3.2 Configuration des Variables d'Environnement

```bash
cd /var/www/224solutions

# Créer le fichier .env
nano .env
```

Contenu du `.env`:

```env
# Database
DATABASE_URL=postgresql://solutions224_user:VOTRE_MOT_DE_PASSE@localhost:5432/solutions224
DB_HOST=localhost
DB_PORT=5432
DB_NAME=solutions224
DB_USER=solutions224_user
DB_PASSWORD=VOTRE_MOT_DE_PASSE_SECURISE

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://votre-domaine.com
API_URL=https://votre-domaine.com/api

# Sécurité
JWT_SECRET=GENEREZ_UNE_CLE_SECRETE_ALEATOIRE_64_CARACTERES
SESSION_SECRET=GENEREZ_UNE_AUTRE_CLE_SECRETE_64_CARACTERES
ENCRYPTION_KEY=GENEREZ_UNE_CLE_32_CARACTERES

# Email (utiliser SendGrid, Mailgun, ou SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app

# Paiements (si vous utilisez des API externes)
STRIPE_SECRET_KEY=sk_live_...
ORANGE_MONEY_API_KEY=...
MTN_MONEY_API_KEY=...

# Upload de fichiers
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/224solutions/uploads
```

### 3.3 Installation et Démarrage

```bash
# Installer les dépendances backend
cd /var/www/224solutions/backend
npm install --production

# Démarrer avec PM2
pm2 start ecosystem.config.js --env production

# Sauvegarder la configuration PM2
pm2 save
pm2 startup
```

---

## 🌐 ÉTAPE 4: Configuration Nginx

```bash
# Créer la configuration Nginx
sudo nano /etc/nginx/sites-available/224solutions
```

Contenu:

```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    # SSL Certificates (Certbot les créera)
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/224solutions-access.log;
    error_log /var/log/nginx/224solutions-error.log;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend (React)
    location / {
        root /var/www/224solutions/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploads
    location /uploads {
        alias /var/www/224solutions/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/224solutions /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Obtenir le certificat SSL
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Redémarrer Nginx
sudo systemctl restart nginx
```

---

## 🔐 ÉTAPE 5: Sécurisation du VPS

```bash
# Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban (protection contre bruteforce)
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Permissions des fichiers
sudo chown -R www-data:www-data /var/www/224solutions
sudo chmod -R 755 /var/www/224solutions
sudo chmod -R 777 /var/www/224solutions/uploads
```

---

## 📊 ÉTAPE 6: Monitoring et Maintenance

```bash
# Voir les logs de l'application
pm2 logs

# Monitoring en temps réel
pm2 monit

# Redémarrer l'application
pm2 restart all

# Voir les logs Nginx
sudo tail -f /var/log/nginx/224solutions-error.log

# Backup automatique de la base de données
sudo nano /etc/cron.daily/backup-database
```

Script de backup:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/224solutions"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
sudo -u postgres pg_dump solutions224 > "$BACKUP_DIR/db_$DATE.sql"

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
```

```bash
sudo chmod +x /etc/cron.daily/backup-database
```

---

## 🔄 ÉTAPE 7: Mises à Jour

```bash
# Sur votre machine locale
npm run build:production
tar -czf 224solutions-update.tar.gz dist/ backend/

# Sur le VPS
cd /var/www/224solutions
# Backup de l'ancienne version
tar -czf backup-$(date +%Y%m%d).tar.gz dist/ backend/

# Extraire la nouvelle version
tar -xzf 224solutions-update.tar.gz

# Redémarrer
pm2 restart all
```

---

## 📞 Support

En cas de problème:

1. **Logs Backend**: `pm2 logs`
2. **Logs Nginx**: `sudo tail -f /var/log/nginx/224solutions-error.log`
3. **Base de données**: `sudo -u postgres psql solutions224`
4. **Status services**: 
   - `pm2 status`
   - `sudo systemctl status nginx`
   - `sudo systemctl status postgresql`

---

## ✅ Checklist de Déploiement

- [ ] Base de données PostgreSQL installée et configurée
- [ ] Application uploadée et extraite
- [ ] Variables d'environnement configurées
- [ ] Backend démarré avec PM2
- [ ] Nginx configuré et SSL activé
- [ ] Firewall configuré
- [ ] Backup automatique activé
- [ ] DNS pointé vers le VPS
- [ ] Tests de l'application effectués

---

## 🎉 Votre application est maintenant en ligne !

Accédez à: **https://votre-domaine.com**
