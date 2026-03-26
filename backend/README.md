# 🚀 224Solutions - Backend Node.js / Express / TypeScript

Backend centralisé pour **224Solutions**, migration progressive de JS → TypeScript.

## 📋 Architecture

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts           ✅ Typed env validation
│   │   ├── supabase.ts      ✅ Admin + anon clients
│   │   ├── logger.ts        ✅ Winston structured logging
│   │   ├── supabase.js      🔄 Legacy (kept)
│   │   └── logger.js        🔄 Legacy (kept)
│   ├── middlewares/
│   │   ├── auth.middleware.ts  ✅ Consolidated JWT + role + internal
│   │   ├── errorHandler.ts    ✅ Centralized error handling
│   │   ├── requestLogger.ts   ✅ HTTP request logging
│   │   ├── rateLimiter.js     🔄 Legacy (kept)
│   │   └── advancedSecurity.js 🔄 Legacy (kept)
│   ├── routes/
│   │   ├── health.routes.ts        ✅ Health + readiness probes
│   │   ├── wallet.routes.ts        ✅ Wallet v2
│   │   ├── subscriptions.routes.ts ✅ Phase 2
│   │   ├── payments.routes.ts      ✅ Phase 2
│   │   └── *.routes.js             🔄 Legacy routes (kept)
│   ├── types/
│   │   └── index.ts         ✅ Centralized types
│   ├── server.ts            ✅ New entry point
│   └── server.js            🔄 Legacy entry point (kept)
├── tsconfig.json
├── package.json
└── Dockerfile
```

## Migration Strategy

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Config, auth, health, logs | ✅ Done |
| 2 | Subscriptions, wallet v2, payments | 🔧 Scaffolded |
| 3 | Vendors, products, limits | ⏳ Planned |
| 4 | Orders, POS sync, inventory | ⏳ Planned |

## Commands

```bash
npm run dev          # TypeScript dev with hot reload
npm run start:legacy # Original JS server
npm run build        # Compile TypeScript
npm start            # Production (compiled)
npm run typecheck    # Type checking only
```

## 🔐 Security

- JWT Supabase verification via `supabaseAdmin.auth.getUser()`
- Internal API key for inter-backend communication
- Helmet, CORS, rate limiting, input validation
- No fallbacks on critical secrets (crash on missing env vars)
- Profile-based role checking

## 📡 API Routes

### Public
- `GET /health` - Health check
- `GET /health/detailed` - Detailed status + dependencies
- `GET /health/ready` - Readiness probe (K8s/Docker)

### JWT Protected
- `POST /api/wallet/initialize` - Init wallet
- `GET  /api/wallet/balance` - Get balance
- `POST /api/wallet/check` - Check wallet exists
- `GET  /api/wallet/transactions` - Transaction history
- `GET  /api/subscriptions/plans` - List plans (public)
- `GET  /api/subscriptions/current` - Current subscription
- `POST /api/subscriptions/subscribe` - Create subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/payments/initiate` - Initiate payment
- `GET  /api/payments/:id` - Payment details
- `GET  /api/payments/` - Payment history

### Internal (API Key)
- `POST /internal/trigger-job`
- `POST /internal/process-batch`
