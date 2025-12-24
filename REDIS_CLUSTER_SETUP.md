# Configuration Redis Cluster pour 100M+ Utilisateurs

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GLOBAL REDIS CLUSTER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │ Africa West │    │ Europe West │    │   US East   │        │
│  │   Cluster   │    │   Cluster   │    │   Cluster   │        │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤        │
│  │ Master ─────│────│─── Sync ────│────│─── Master   │        │
│  │ Replica 1   │    │ Master      │    │ Replica 1   │        │
│  │ Replica 2   │    │ Replica 1   │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
│  ┌─────────────┐                                               │
│  │ Asia SE     │                                               │
│  │  Cluster    │                                               │
│  ├─────────────┤                                               │
│  │ Master      │                                               │
│  │ Replica 1   │                                               │
│  └─────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Choix du Provider

### Option A: Redis Cloud (Recommandé)
- **Prix**: ~$500-2000/mois pour 100M utilisateurs
- **Avantages**: Géré, multi-région natif, auto-scaling

```bash
# Créer un compte sur https://redis.com/try-free/
# Configurer les clusters par région dans le dashboard
```

### Option B: AWS ElastiCache
```bash
# Via AWS CLI
aws elasticache create-replication-group \
  --replication-group-id sokoby-redis-cluster \
  --replication-group-description "Sokoby Global Cache" \
  --engine redis \
  --cache-node-type cache.r6g.xlarge \
  --num-node-groups 3 \
  --replicas-per-node-group 2 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled
```

### Option C: Upstash (Serverless)
- **Prix**: Pay-per-request, ~$200-500/mois
- **Avantages**: Serverless, global, pas de gestion

```typescript
// Configuration Upstash
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})
```

## 2. Configuration Production

### Variables d'environnement
```env
# Redis Cluster Principal
REDIS_CLUSTER_NODES=redis-africa:6379,redis-europe:6379,redis-us:6379

# Par région
REDIS_AFRICA_MASTER=redis-africa-master.sokoby.com:6379
REDIS_AFRICA_REPLICAS=redis-africa-r1:6379,redis-africa-r2:6379

REDIS_EUROPE_MASTER=redis-europe-master.sokoby.com:6379
REDIS_EUROPE_REPLICAS=redis-europe-r1:6379

REDIS_US_MASTER=redis-us-master.sokoby.com:6379
REDIS_US_REPLICAS=redis-us-r1:6379

# Authentification
REDIS_PASSWORD=your-super-secure-password
REDIS_TLS_ENABLED=true
```

### Configuration Node.js (Backend)
```typescript
// src/config/redis-production.ts
import Redis from 'ioredis';

const clusterNodes = [
  { host: 'redis-africa-master.sokoby.com', port: 6379 },
  { host: 'redis-europe-master.sokoby.com', port: 6379 },
  { host: 'redis-us-master.sokoby.com', port: 6379 },
];

export const redisCluster = new Redis.Cluster(clusterNodes, {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS_ENABLED === 'true' ? {} : undefined,
  },
  scaleReads: 'slave',
  maxRedirections: 16,
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 100,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  natMap: {
    // Mapping pour accès cross-région
  },
});

// Event handlers
redisCluster.on('connect', () => console.log('Redis Cluster connected'));
redisCluster.on('error', (err) => console.error('Redis Cluster error:', err));
redisCluster.on('node error', (err, node) => {
  console.error(`Redis node ${node} error:`, err);
});
```

## 3. Stratégies de Cache

### Write-Through (Transactions critiques)
```typescript
async function updateWalletBalance(walletId: string, newBalance: number) {
  // 1. Écrire en DB
  await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [newBalance, walletId]);
  
  // 2. Mettre à jour le cache
  await redis.set(`wallet:${walletId}`, JSON.stringify({ balance: newBalance }), 'EX', 3600);
}
```

### Read-Through (Données fréquentes)
```typescript
async function getProduct(productId: string) {
  // 1. Vérifier le cache
  const cached = await redis.get(`product:${productId}`);
  if (cached) return JSON.parse(cached);
  
  // 2. Charger depuis DB
  const product = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
  
  // 3. Mettre en cache
  await redis.set(`product:${productId}`, JSON.stringify(product), 'EX', 3600);
  
  return product;
}
```

### Cache-Aside avec Invalidation
```typescript
async function updateProduct(productId: string, data: any) {
  // 1. Mettre à jour en DB
  await db.query('UPDATE products SET ... WHERE id = $1', [productId]);
  
  // 2. Invalider le cache
  await redis.del(`product:${productId}`);
  
  // 3. Invalider les caches de recherche liés
  const searchKeys = await redis.keys('search:*');
  if (searchKeys.length > 0) {
    await redis.del(...searchKeys);
  }
}
```

## 4. Rate Limiting Distribué

```typescript
// Algorithme Token Bucket avec Redis
async function checkRateLimit(userId: string, limit: number, windowSec: number): Promise<boolean> {
  const key = `rate:${userId}`;
  const now = Date.now();
  const windowStart = now - (windowSec * 1000);
  
  const pipeline = redis.pipeline();
  
  // Supprimer les anciennes entrées
  pipeline.zremrangebyscore(key, 0, windowStart);
  
  // Ajouter la nouvelle requête
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  
  // Compter les requêtes dans la fenêtre
  pipeline.zcard(key);
  
  // Définir l'expiration
  pipeline.expire(key, windowSec);
  
  const results = await pipeline.exec();
  const requestCount = results[2][1] as number;
  
  return requestCount <= limit;
}
```

## 5. Pub/Sub pour Temps Réel

```typescript
// Publisher
async function publishEvent(channel: string, event: any) {
  await redis.publish(channel, JSON.stringify(event));
}

// Subscriber
const subscriber = redis.duplicate();
subscriber.subscribe('orders', 'notifications', 'wallet-updates');

subscriber.on('message', (channel, message) => {
  const event = JSON.parse(message);
  handleEvent(channel, event);
});
```

## 6. Monitoring

### Dashboard Grafana
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  redis-exporter:
    image: oliver006/redis_exporter
    environment:
      - REDIS_ADDR=redis://redis-master:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    ports:
      - "9121:9121"

  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana-storage:/var/lib/grafana
```

### Métriques à surveiller
- Hit Rate: > 90%
- Latence: < 10ms p99
- Mémoire utilisée: < 80%
- Connexions actives
- Évictions par seconde
- Commandes par seconde

## 7. Coûts Estimés

| Provider | Capacité | Régions | Prix/mois |
|----------|----------|---------|-----------|
| Redis Cloud | 100GB | 4 | $1,500 |
| AWS ElastiCache | 100GB | 4 | $2,000 |
| Upstash | Pay-per-use | Global | $500-800 |
| Self-hosted | 100GB | 4 | $800 + ops |

## 8. Checklist Déploiement

- [ ] Choisir le provider Redis
- [ ] Configurer les clusters par région
- [ ] Configurer TLS/SSL
- [ ] Configurer les mots de passe
- [ ] Tester le failover
- [ ] Configurer le monitoring
- [ ] Configurer les alertes
- [ ] Tester les performances (benchmark)
- [ ] Documenter les runbooks
- [ ] Former l'équipe ops

## 9. Prochaines Étapes

1. **Immédiat**: Configurer Upstash ou Redis Cloud (1 jour)
2. **Semaine 1**: Intégrer le backend avec Redis
3. **Semaine 2**: Migrer le rate limiting vers Redis
4. **Semaine 3**: Activer Pub/Sub pour temps réel
5. **Semaine 4**: Monitoring et optimisation
