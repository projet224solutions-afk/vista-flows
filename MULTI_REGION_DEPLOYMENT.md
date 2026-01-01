# 🌍 Guide de Déploiement Multi-Région - 224Solutions

## 📋 Architecture Multi-Région

```
                    ┌─────────────────────────────────────┐
                    │       Cloudflare Global LB          │
                    │    (Workers Edge - 300+ locations)  │
                    └──────────────┬──────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │ Africa West  │       │ Europe West  │       │   US East    │
    │   (Primary)  │       │              │       │              │
    └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
           │                      │                       │
           ▼                      ▼                       ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │   Supabase   │◄─────►│   Supabase   │◄─────►│   Supabase   │
    │   Primary    │       │    Replica   │       │    Replica   │
    └──────────────┘       └──────────────┘       └──────────────┘
```

## 🚀 Étapes de Déploiement

### 1. Configuration Cloudflare Workers

```bash
# Installation
npm install -g wrangler

# Authentification
wrangler login

# Déploiement du Load Balancer
cd cloudflare/workers
wrangler publish
```

### 2. Configuration DNS Cloudflare

Ajouter les enregistrements DNS dans Cloudflare Dashboard:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | api | 224solutions-global-lb.workers.dev | ✅ |
| CNAME | api-africa | africa-backend.railway.app | ✅ |
| CNAME | api-eu | eu-backend.railway.app | ✅ |
| CNAME | api-us-east | us-east-backend.railway.app | ✅ |

### 3. Déploiement Backend Multi-Région

#### Railway (Recommandé)

```bash
# Région Afrique (Primary)
cd backend
railway init --name 224solutions-africa
railway variables set NODE_ENV=production REGION=africa-west
railway up

# Région Europe
railway init --name 224solutions-eu
railway variables set NODE_ENV=production REGION=europe-west
railway up

# Région US East
railway init --name 224solutions-us-east
railway variables set NODE_ENV=production REGION=us-east
railway up
```

#### Docker Compose Multi-Région

```yaml
# docker-compose.multi-region.yml
version: '3.8'

services:
  api-africa:
    build: ./backend
    environment:
      - REGION=africa-west
      - NODE_ENV=production
    deploy:
      replicas: 3
      
  api-europe:
    build: ./backend
    environment:
      - REGION=europe-west
      - NODE_ENV=production
    deploy:
      replicas: 2
      
  api-us:
    build: ./backend
    environment:
      - REGION=us-east
      - NODE_ENV=production
    deploy:
      replicas: 2
```

### 4. Configuration Supabase Multi-Région

#### Option A: Read Replicas (Recommandé)

1. Aller dans Supabase Dashboard → Project Settings → Database
2. Activer "Read Replicas"
3. Ajouter des replicas dans les régions souhaitées:
   - EU West (Ireland)
   - US East (Virginia)
   - Asia Pacific (Singapore)

#### Option B: Multi-Projet avec Sync

```typescript
// sync-service.ts - Synchronisation entre projets Supabase
import { createClient } from '@supabase/supabase-js';

const primaryDb = createClient(PRIMARY_URL, PRIMARY_KEY);
const replicaEU = createClient(REPLICA_EU_URL, REPLICA_EU_KEY);
const replicaUS = createClient(REPLICA_US_URL, REPLICA_US_KEY);

// Synchroniser les changements
primaryDb
  .channel('db-changes')
  .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
    // Répliquer vers les autres régions
    await Promise.all([
      replicaEU.from(payload.table).upsert(payload.new),
      replicaUS.from(payload.table).upsert(payload.new),
    ]);
  })
  .subscribe();
```

### 5. Configuration CDN

#### Cloudflare CDN

```javascript
// cloudflare/workers/cdn-config.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Cache statique (1 an)
    if (url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
      const response = await fetch(request);
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return newResponse;
    }
    
    // API - pas de cache
    if (url.pathname.startsWith('/api/')) {
      const response = await fetch(request);
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Cache-Control', 'private, no-cache, no-store');
      return newResponse;
    }
    
    return fetch(request);
  }
};
```

### 6. Monitoring Multi-Région

#### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "224Solutions - Multi-Region Health",
    "panels": [
      {
        "title": "Region Latency",
        "type": "graph",
        "targets": [
          { "expr": "api_latency_seconds{region=\"africa-west\"}" },
          { "expr": "api_latency_seconds{region=\"europe-west\"}" },
          { "expr": "api_latency_seconds{region=\"us-east\"}" }
        ]
      },
      {
        "title": "Error Rate by Region",
        "type": "graph",
        "targets": [
          { "expr": "rate(api_errors_total[5m])" }
        ]
      },
      {
        "title": "Active Users by Region",
        "type": "stat",
        "targets": [
          { "expr": "sum(active_users) by (region)" }
        ]
      }
    ]
  }
}
```

## 📊 Coûts Estimés

| Service | Gratuit | Pro | Enterprise |
|---------|---------|-----|------------|
| Cloudflare Workers | 100K req/jour | $5/10M req | Custom |
| Railway (3 régions) | - | $60/mois | $200+/mois |
| Supabase Read Replicas | - | $25/replica | Custom |
| Redis Cloud | 30MB | $5/GB | Custom |

**Total estimé pour 100M utilisateurs: $5,000 - $50,000/mois**

## ✅ Checklist Pré-Production

- [ ] Cloudflare Workers déployé
- [ ] DNS configuré avec Proxy activé
- [ ] Backend déployé dans 3+ régions
- [ ] Health checks fonctionnels
- [ ] SSL/TLS configuré
- [ ] Rate limiting activé
- [ ] Monitoring configuré
- [ ] Alertes configurées
- [ ] Failover testé
- [ ] Backup strategy en place

## 🔧 Commandes Utiles

```bash
# Vérifier le statut du Load Balancer
curl https://api.224solution.net/lb-status

# Tester la latence
curl -w "@curl-format.txt" https://api.224solution.net/health

# Vérifier la région servie
curl -I https://api.224solution.net/health | grep X-Served-By-Region

# Logs Cloudflare Workers
wrangler tail 224solutions-global-lb

# Déployer une mise à jour
wrangler publish --env production
```

## 📞 Support

- Documentation: https://docs.224solution.net
- Status Page: https://status.224solution.net
- Email: support@224solution.net
