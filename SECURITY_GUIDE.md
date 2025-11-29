# 🔐 GUIDE COMPLET DE SÉCURITÉ - 224SOLUTIONS

## 📋 Vue d'ensemble

Ce document détaille toutes les mesures de sécurité implémentées dans le système 224Solutions. **Aucune fonctionnalité existante n'a été modifiée ou supprimée** - seules des couches de protection supplémentaires ont été ajoutées.

## 🛡️ Architecture de Sécurité

### Niveaux de Protection

```
┌─────────────────────────────────────────────────────────┐
│              NIVEAU 1: FRONTEND                          │
│  - Validation des entrées                               │
│  - Chiffrement AES-256                                  │
│  - Protection CSRF                                      │
│  - Rate limiting client                                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              NIVEAU 2: BACKEND NODE.JS                   │
│  - Authentification JWT Supabase                        │
│  - Middlewares de sécurité avancés                      │
│  - Rate limiting serveur                                │
│  - Anti-brute force                                     │
│  - Détection activités suspectes                        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│         NIVEAU 3: EDGE FUNCTIONS SUPABASE                │
│  - Validation stricte des requêtes                      │
│  - Vérification des permissions                         │
│  - Signatures HMAC                                      │
│  - Rate limiting par fonction                           │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│           NIVEAU 4: BASE DE DONNÉES                      │
│  - Row Level Security (RLS) renforcé                    │
│  - Politiques immuables                                 │
│  - Triggers de protection                               │
│  - Audit logs                                           │
└─────────────────────────────────────────────────────────┘
```

## 🔒 Composants de Sécurité

### 1. SecurityLayer.ts (Frontend)

**Localisation**: `src/security/SecurityLayer.ts`

**Fonctionnalités**:
- ✅ Chiffrement/déchiffrement AES-256 des données sensibles
- ✅ Validation et sanitization des entrées utilisateur
- ✅ Génération et validation de tokens CSRF
- ✅ Protection contre injections SQL et XSS
- ✅ Hash SHA-256 pour intégrité des données
- ✅ Rate limiting côté client
- ✅ Validation de montants et devises
- ✅ Validation de fichiers uploadés
- ✅ Obfuscation pour logs sécurisés

**Utilisation**:
```typescript
import { SecurityLayer } from '@/security/SecurityLayer';

// Chiffrer des données sensibles
const encrypted = SecurityLayer.encrypt({ password: 'secret123' });

// Valider une entrée utilisateur
const clean = SecurityLayer.sanitizeInput(userInput);

// Générer un token CSRF
const token = SecurityLayer.generateCSRFToken();

// Valider un montant
const { valid, error } = SecurityLayer.validateAmount(1000);
```

### 2. advancedSecurity.js (Backend)

**Localisation**: `backend/src/middlewares/advancedSecurity.js`

**Fonctionnalités**:
- ✅ Validation avancée des entrées (détection XSS, SQL injection)
- ✅ Anti-brute force sur login (5 tentatives max, lockout 15min)
- ✅ Détection d'activités suspectes par IP
- ✅ Protection CSRF côté serveur
- ✅ Rate limiting avancé par endpoint
- ✅ Validation de session sécurisée
- ✅ Logging d'audit complet
- ✅ Anti-énumération d'utilisateurs
- ✅ Validation stricte Content-Type

**Utilisation dans Express**:
```javascript
import {
  advancedInputValidation,
  antiBruteForce,
  suspiciousActivityDetector,
  advancedRateLimit
} from './middlewares/advancedSecurity.js';

// Appliquer globalement
app.use(advancedInputValidation);
app.use(suspiciousActivityDetector);

// Sur routes sensibles
app.post('/auth/login', antiBruteForce, authController.login);

// Rate limiting personnalisé
app.use('/api/payments', advancedRateLimit({
  windowMs: 60000,
  maxRequests: 10
}));
```

### 3. edgeSecurity.ts (Edge Functions)

**Localisation**: `supabase/functions/_shared/edgeSecurity.ts`

**Fonctionnalités**:
- ✅ Validation complète des requêtes HTTP
- ✅ Authentification JWT Supabase
- ✅ Rate limiting par utilisateur
- ✅ Validation de schéma de données
- ✅ Vérification des permissions par rôle
- ✅ Génération et vérification de signatures HMAC
- ✅ Headers de sécurité HTTP
- ✅ Logging sécurisé sans données sensibles

**Utilisation dans Edge Functions**:
```typescript
import { secureEdgeFunction, EdgeFunctionSecurity } from '../_shared/edgeSecurity.ts';

// Wrapper sécurisé
export default secureEdgeFunction(
  async (req, context) => {
    // Validation du schéma
    const validation = EdgeFunctionSecurity.validateInputData(data, {
      amount: { type: 'number', required: true, min: 0 },
      currency: { type: 'string', required: true }
    });

    if (!validation.valid) {
      return EdgeFunctionSecurity.secureResponse(
        { errors: validation.errors },
        400
      );
    }

    // Votre logique ici
    return EdgeFunctionSecurity.secureResponse({ success: true });
  },
  {
    requireAuth: true,
    requiredRole: ['vendeur', 'admin'],
    rateLimit: true
  }
);
```

### 4. Politiques RLS Renforcées (Database)

**Localisation**: `supabase/migrations/20251129_enhanced_security_policies.sql`

**Protections Implémentées**:

#### Profils Utilisateurs
- ✅ Vue limitée à son propre profil (sauf admins/PDG)
- ✅ Empêche auto-promotion de rôle
- ✅ Modifications tracées

#### Wallets
- ✅ Consultation stricte (wallet actif uniquement)
- ✅ **Empêche modification directe du balance**
- ✅ Modifications uniquement via RPC functions sécurisées

#### Transactions
- ✅ Vue limitée aux transactions personnelles
- ✅ **Transactions immuables après création**
- ✅ Suppression interdite (sauf PDG)
- ✅ Empêche modification des montants/parties

#### Produits E-Commerce
- ✅ Vendeurs voient uniquement leurs produits
- ✅ **Empêche changement de vendeur après création**
- ✅ PDG/admins ont visibilité totale

#### Commandes
- ✅ Vue limitée aux parties impliquées
- ✅ **Montant immuable après création**
- ✅ Audit complet des modifications

#### Données KYC
- ✅ Accès ultra-restreint (utilisateur + admins)
- ✅ **Empêche modification après validation**
- ✅ Protection maximale des documents sensibles

#### Messages
- ✅ Vue limitée aux participants
- ✅ **Messages immuables après envoi**
- ✅ Support peut consulter pour assistance

#### Logs d'Audit
- ✅ **Lecture seule pour admins**
- ✅ **Modification interdite**
- ✅ **Suppression interdite**
- ✅ Traçabilité totale

#### Subscriptions Drivers
- ✅ Vue limitée à son propre abonnement
- ✅ **Empêche réactivation frauduleuse**
- ✅ Vérification de l'expiration

**Fonctions Utilitaires**:
```sql
-- Vérifier le rôle d'un utilisateur
SELECT check_user_role('admin');

-- Vérifier la propriété d'une ressource
SELECT is_resource_owner('uuid-user-id');
```

### 5. Système d'Audit (SecurityAuditSystem.ts)

**Localisation**: `src/security/SecurityAuditSystem.ts`

**Fonctionnalités**:
- ✅ Enregistrement de tous les événements de sécurité
- ✅ 18 types d'événements trackés (login, transactions, accès, etc.)
- ✅ Niveaux de sévérité (low, medium, high, critical)
- ✅ Alertes immédiates pour événements critiques
- ✅ Détection de patterns suspects
- ✅ Génération de rapports de sécurité
- ✅ Batch processing pour performance
- ✅ Flush automatique toutes les 30 secondes

**Types d'Événements Trackés**:
```typescript
enum SecurityEventType {
  // Authentification
  LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, PASSWORD_CHANGE,
  
  // Accès
  UNAUTHORIZED_ACCESS, PERMISSION_DENIED, RESOURCE_ACCESS,
  
  // Transactions
  WALLET_TRANSACTION, PAYMENT_CREATED, PAYMENT_FAILED, WITHDRAWAL_ATTEMPT,
  
  // Données
  DATA_CREATED, DATA_UPDATED, DATA_DELETED,
  
  // Sécurité
  RATE_LIMIT_EXCEEDED, SUSPICIOUS_ACTIVITY, CSRF_VIOLATION,
  XSS_ATTEMPT, SQL_INJECTION_ATTEMPT,
  
  // Système
  SESSION_EXPIRED, API_ERROR, CONFIGURATION_CHANGE
}
```

**Utilisation**:
```typescript
import { securityAudit, SecurityEventType } from '@/security/SecurityAuditSystem';

// Logger un événement
securityAudit.logEvent({
  type: SecurityEventType.LOGIN_SUCCESS,
  userId: user.id,
  ip: req.ip,
  success: true,
  severity: 'low'
});

// Détecter activités suspectes
const analysis = await securityAudit.detectSuspiciousPatterns(userId);
if (analysis.suspicious) {
  console.warn('⚠️ Activité suspecte:', analysis.reasons);
}

// Générer rapport
const report = await securityAudit.generateSecurityReport(
  startDate,
  endDate
);
```

**Hook React**:
```typescript
import { useSecurityAudit } from '@/security/SecurityAuditSystem';

function MyComponent() {
  const { logEvent, detectSuspiciousActivity } = useSecurityAudit();
  
  const handleAction = async () => {
    logEvent({
      type: SecurityEventType.RESOURCE_ACCESS,
      success: true,
      severity: 'low',
      resourceType: 'product',
      resourceId: productId
    });
  };
}
```

## 🚨 Détection d'Attaques

### Patterns Détectés Automatiquement

1. **Injections XSS**:
   - `<script>`, `javascript:`, `onerror=`, `onclick=`
   - Bloquées au niveau frontend ET backend

2. **Injections SQL**:
   - `OR 1=1`, `DROP TABLE`, `DELETE FROM`, `INSERT INTO`
   - Détectées et loguées immédiatement

3. **Path Traversal**:
   - `../../`, `%00`, `../`
   - Bloquées et IP marquée comme suspecte

4. **Brute Force**:
   - Max 5 tentatives de login
   - Lockout automatique 15 minutes
   - IP trackée

5. **Rate Limiting**:
   - Frontend: stockage local
   - Backend: mémoire (production: Redis)
   - Edge Functions: par utilisateur

## 📊 Monitoring et Alertes

### Événements Critiques

Déclenchent une alerte immédiate:
- Tentative d'injection SQL
- Tentative d'injection XSS
- Accès non autorisé répété
- Modification de données sensibles
- Suppression de logs d'audit
- Changement de rôle non autorisé

### Métriques Disponibles

```typescript
// Obtenir les métriques de sécurité
import { getSecurityMetrics } from '@/security/advancedSecurity';

const metrics = getSecurityMetrics();
console.log({
  loginAttempts: metrics.loginAttempts,
  suspiciousIPs: metrics.suspiciousIPs,
  rateLimitEntries: metrics.rateLimitEntries
});
```

## 🔧 Configuration

### Variables d'Environnement Requises

```env
# Frontend (.env)
VITE_ENCRYPTION_KEY=your-secure-encryption-key-change-in-production

# Backend (.env)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
INTERNAL_API_KEY=your-internal-api-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Edge Functions
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Activation des Middlewares

**Backend Express**:
```javascript
// Dans backend/src/server.js
import {
  advancedInputValidation,
  antiBruteForce,
  suspiciousActivityDetector,
  secureSessionValidation,
  securityAuditLogger
} from './middlewares/advancedSecurity.js';

// Ordre d'application (IMPORTANT)
app.use(suspiciousActivityDetector);
app.use(advancedInputValidation);
app.use(secureSessionValidation);
app.use(securityAuditLogger);

// Routes spécifiques
app.post('/auth/login', antiBruteForce, authController.login);
```

## 📝 Checklist de Sécurité

### Avant Production

- [ ] Changer `VITE_ENCRYPTION_KEY` par une clé forte (32+ caractères)
- [ ] Configurer Redis pour rate limiting (remplacer Map en mémoire)
- [ ] Activer HTTPS uniquement (désactiver HTTP)
- [ ] Configurer Content Security Policy (CSP)
- [ ] Activer les logs vers un service externe (DataDog, Sentry)
- [ ] Configurer les alertes email/SMS pour événements critiques
- [ ] Tester tous les endpoints avec un outil de pentest
- [ ] Vérifier que tous les secrets sont en variables d'environnement
- [ ] Activer les backups automatiques Supabase
- [ ] Configurer la rotation des logs (max 90 jours)

### Tests de Sécurité

- [ ] Tester tentatives de XSS sur tous les formulaires
- [ ] Tester tentatives d'injection SQL sur toutes les queries
- [ ] Tester brute force sur login
- [ ] Tester accès non autorisé à toutes les routes
- [ ] Tester modification de balance wallet direct
- [ ] Tester modification de transactions après création
- [ ] Tester suppression de logs d'audit
- [ ] Vérifier rate limiting fonctionne
- [ ] Tester CSRF sur toutes les routes POST/PUT/DELETE

## 🎯 Bonnes Pratiques

### Pour les Développeurs

1. **Toujours valider les entrées**:
```typescript
const clean = SecurityLayer.sanitizeInput(userInput);
```

2. **Utiliser le décorateur @SecureFunction**:
```typescript
class MyService {
  @SecureFunction
  async sensitiveOperation(data: any) {
    // Votre code
  }
}
```

3. **Logger les événements importants**:
```typescript
securityAudit.logEvent({
  type: SecurityEventType.PAYMENT_CREATED,
  userId,
  success: true,
  severity: 'medium'
});
```

4. **Ne jamais logger de données sensibles**:
```typescript
// ❌ MAL
console.log('Password:', user.password);

// ✅ BIEN
console.log('User logged in:', SecurityLayer.obfuscate(user.email));
```

5. **Toujours vérifier les permissions**:
```typescript
const hasPermission = await EdgeFunctionSecurity.checkUserPermission(
  userId,
  ['admin', 'vendeur']
);
```

## 📚 Ressources

### Documentation Complémentaire
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/security)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

### Support
- Email: security@224solutions.com
- Reporting de vulnérabilité: security-report@224solutions.com

## ⚠️ Avertissements Importants

1. **Ne jamais désactiver RLS** sur les tables en production
2. **Ne jamais commiter** de secrets dans Git
3. **Ne jamais exposer** SUPABASE_SERVICE_ROLE_KEY côté client
4. **Toujours utiliser HTTPS** en production
5. **Vérifier régulièrement** les logs d'audit pour activités suspectes
6. **Mettre à jour** les dépendances de sécurité régulièrement
7. **Former tous les développeurs** aux bonnes pratiques de sécurité

---

## 📞 Contact Sécurité

Pour toute question ou signalement de vulnérabilité:
- **Email**: security@224solutions.com
- **Urgent**: +224 XXX XXX XXX

**Dernier audit de sécurité**: 29 novembre 2025
**Prochaine révision**: 29 décembre 2025
