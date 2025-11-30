# 🔒 SERVICES SÉCURITÉ - GUIDE COMPLET
## 224Solutions - Infrastructure Sécurité Production-Ready

---

## 📋 Vue d'Ensemble

Suite complète de 6 services de sécurité pour porter la sécurité de **50% à 95%** et résoudre **28 erreurs critiques + 170 erreurs en attente**.

### Services Créés

| Service | Fichier | Fonction Principale |
|---------|---------|---------------------|
| **Monitoring Service** | `MonitoringService.ts` | Surveillance santé système temps réel |
| **Content Security Policy** | `ContentSecurityPolicy.ts` | Protection XSS/injection |
| **Secure Logger** | `SecureLogger.ts` | Logging centralisé sécurisé |
| **Enhanced Error Boundary** | `EnhancedErrorBoundary.tsx` | Capture erreurs React élégante |
| **Alerting Service** | `AlertingService.ts` | Notifications incidents critiques |
| **Health Check Service** | `HealthCheckService.ts` | Vérifications automatiques santé |

---

## 🚀 Installation Rapide

### 1. Appliquer Migration Base de Données

```bash
# Appliquer migration (crée 7 tables)
supabase db push

# Ou manuellement
psql -d votre_database -f supabase/migrations/20240130_security_services_infrastructure.sql
```

**Tables créées:**
- `secure_logs` - Logs centralisés masqués
- `error_logs` - Erreurs avec résolution tracking
- `system_health_logs` - Health checks système
- `performance_metrics` - Métriques performance API
- `alerts` - Alertes email/push/SMS
- `health_check_reports` - Rapports health checks
- `csp_violations` - Violations CSP

### 2. Initialiser Services dans App

**`src/App.tsx`:**
```typescript
import { initializeSecurityServices } from '@/services/security';
import EnhancedErrorBoundary from '@/components/error/EnhancedErrorBoundary';

function App() {
  React.useEffect(() => {
    // Initialiser services au démarrage
    initializeSecurityServices().catch(console.error);
  }, []);

  return (
    <EnhancedErrorBoundary level="app">
      {/* Votre app ici */}
    </EnhancedErrorBoundary>
  );
}
```

### 3. Remplacer console.error Existants

**Avant (170+ occurrences):**
```typescript
console.error('❌ Erreur:', error);
throw new Error('Message technique exposé');
```

**Après:**
```typescript
import { secureLogger } from '@/services/SecureLogger';

secureLogger.error('payment', 'Erreur traitement paiement', error, {
  orderId: order.id,
  amount: order.amount
});

// Données sensibles automatiquement masquées
```

---

## 📦 Services Détaillés

### 1️⃣ Monitoring Service

**Fichier:** `src/services/MonitoringService.ts`

**Fonctionnalités:**
- ✅ Health checks automatiques toutes les 30 secondes
- ✅ Surveillance sécurité, database, API, frontend
- ✅ Comptage erreurs critiques/en attente
- ✅ Métriques temps réel (uptime, response time, active users)
- ✅ Alertes automatiques si statut critique

**Utilisation:**

```typescript
import { monitoringService } from '@/services/MonitoringService';

// Obtenir santé système
const health = await monitoringService.getCurrentHealth();
console.log(`Système: ${health.overall}`);
console.log(`Erreurs critiques: ${health.metrics.criticalErrors}`);

// Enregistrer métrique performance
await monitoringService.trackPerformance({
  endpoint: '/api/orders',
  method: 'POST',
  responseTime: 450,
  statusCode: 200,
  timestamp: new Date().toISOString()
});

// Logger erreur
await monitoringService.logError(
  'critical',
  'payment',
  'Transaction échouée',
  { orderId: '123', amount: 5000 }
);
```

**Health Check Output:**
```json
{
  "overall": "healthy",
  "security": "healthy",
  "database": "healthy",
  "api": "healthy",
  "frontend": "healthy",
  "timestamp": "2024-01-30T10:00:00Z",
  "metrics": {
    "criticalErrors": 0,
    "pendingErrors": 5,
    "uptime": 86400,
    "responseTime": 250,
    "activeUsers": 42
  }
}
```

---

### 2️⃣ Content Security Policy Service

**Fichier:** `src/services/ContentSecurityPolicy.ts`

**Fonctionnalités:**
- ✅ CSP header strict (blocage XSS, injection)
- ✅ Validation data URIs audio/vidéo
- ✅ Whitelist sources autorisées
- ✅ Détection violations automatique
- ✅ Blocage `data:audio/mpeg;base64` malveillant

**Utilisation:**

```typescript
import { cspService } from '@/services/ContentSecurityPolicy';

// Valider data URI audio
const result = cspService.validateAudioDataURI('data:audio/mpeg;base64,...');
if (!result.valid) {
  console.error(`Audio bloqué: ${result.reason}`);
}

// Valider URL ressource
const urlCheck = cspService.validateResourceURL(
  'https://cdn.example.com/script.js',
  'script'
);

// Sanitizer input utilisateur
const safeHtml = cspService.sanitizeHTML(userInput);
const safeUrl = cspService.sanitizeUserInput(url, 'url');

// Obtenir violations récentes
const violations = cspService.getRecentViolations(20);
console.log(`${violations.length} violations détectées`);
```

**CSP Header Généré:**
```
default-src 'self'; 
script-src 'self' 'unsafe-inline' https://maps.googleapis.com; 
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
img-src 'self' data: blob: https:; 
media-src 'self' https://*.supabase.co; 
object-src 'none'; 
frame-ancestors 'none'; 
upgrade-insecure-requests
```

---

### 3️⃣ Secure Logger Service

**Fichier:** `src/services/SecureLogger.ts`

**Fonctionnalités:**
- ✅ Masquage automatique données sensibles (email, phone, token, password, IBAN)
- ✅ Logging structuré avec contexte
- ✅ Buffer + flush automatique (50 logs ou 5s)
- ✅ Console.error remplacé automatiquement
- ✅ Rotation logs (rétention 30 jours)

**Utilisation:**

```typescript
import { secureLogger } from '@/services/SecureLogger';

// Debug (dev uniquement)
secureLogger.debug('auth', 'User login attempt', { email: 'user@example.com' });

// Info
secureLogger.info('payment', 'Paiement réussi', { orderId: '123', amount: 5000 });

// Warning
secureLogger.warn('security', 'Tentative accès non autorisé', { userId: 'abc' });

// Error
secureLogger.error('api', 'API timeout', error, { endpoint: '/api/orders' });

// Critical (flush immédiat)
secureLogger.critical('database', 'Connexion DB perdue', error);
```

**Masquage Automatique:**

| Type | Avant | Après |
|------|-------|-------|
| Email | `user@example.com` | `***@example.com` |
| Phone | `+224 622 123 456` | `***-***-****` |
| JWT | `eyJhbGc...` | `eyJ***MASKED***` |
| Password | `password: "secret123"` | `password: ***MASKED***` |
| Credit Card | `4532 1234 5678 9010` | `****-****-****-****` |
| IBAN | `FR76 1234...` | `********************` |

---

### 4️⃣ Enhanced Error Boundary

**Fichier:** `src/components/error/EnhancedErrorBoundary.tsx`

**Fonctionnalités:**
- ✅ Capture erreurs React élégante
- ✅ Fallback UI user-friendly
- ✅ Logging automatique erreurs
- ✅ Boutons "Réessayer" et "Retour Accueil"
- ✅ Auto-redirect si erreurs répétées (loop protection)

**Utilisation:**

```typescript
import EnhancedErrorBoundary, { withErrorBoundary, useErrorHandler, tryCatch } from '@/components/error/EnhancedErrorBoundary';

// 1. Wrapper composant
<EnhancedErrorBoundary level="page">
  <MaPage />
</EnhancedErrorBoundary>

// 2. HOC
const SafeComponent = withErrorBoundary(MonComposant, { level: 'component' });

// 3. Hook pour erreurs async
function MyComponent() {
  const { handleError } = useErrorHandler();

  const fetchData = async () => {
    try {
      const data = await api.getData();
    } catch (error) {
      handleError(error as Error);
    }
  };
}

// 4. Utilitaire try-catch élégant
const [result, error] = await tryCatch(
  async () => await api.riskyOperation(),
  'Erreur opération risquée'
);

if (error) {
  // Erreur déjà loggée automatiquement
  return;
}
```

**UI Fallback:**
```
┌─────────────────────────────────────┐
│  ⚠️  Page Error                     │
│                                     │
│  Cette page a rencontré un problème │
│  Veuillez réessayer.                │
│                                     │
│  [Développement uniquement]         │
│  Error: Cannot read property 'id'   │
│  Stack trace: ...                   │
│                                     │
│  [ 🔄 Réessayer ]  [ 🏠 Accueil ]  │
└─────────────────────────────────────┘
```

---

### 5️⃣ Health Check Service

**Fichier:** `src/services/HealthCheckService.ts`

**Fonctionnalités:**
- ✅ 7 health checks automatiques (60s interval)
- ✅ Vérification: Database, Auth, Storage, Edge Functions, Realtime, LocalStorage, Network
- ✅ Calcul uptime système
- ✅ Alertes automatiques si dégradé/critique

**Utilisation:**

```typescript
import { healthCheckService } from '@/services/HealthCheckService';

// Check manuel
const report = await healthCheckService.checkNow();
console.log(`Santé: ${report.overall}`);
console.log(`Checks: ${report.checksPassed}/${report.checksPerformed} réussis`);

// Obtenir dernier rapport
const lastReport = healthCheckService.getLastReport();

// Obtenir uptime (secondes)
const uptime = healthCheckService.getUptime();
console.log(`Uptime: ${Math.floor(uptime / 3600)} heures`);
```

**Rapport Health Check:**
```json
{
  "overall": "healthy",
  "checks": [
    { "name": "Database", "status": "healthy", "responseTime": 85 },
    { "name": "Authentication", "status": "healthy", "responseTime": 42 },
    { "name": "Storage", "status": "healthy", "responseTime": 120 },
    { "name": "Edge Functions", "status": "healthy", "responseTime": 200 },
    { "name": "Realtime", "status": "healthy", "responseTime": 150 },
    { "name": "LocalStorage", "status": "healthy", "responseTime": 1 },
    { "name": "Network", "status": "healthy", "responseTime": 0 }
  ],
  "timestamp": "2024-01-30T10:00:00Z",
  "uptime": 86400,
  "checksPerformed": 7,
  "checksPassed": 7,
  "checksFailed": 0
}
```

---

### 6️⃣ Alerting Service (Existant Amélioré)

**Fichier:** `src/services/AlertingService.ts`

**Note:** Service existant conservé. Pour l'intégrer avec nouveaux services:

```typescript
import { alertingService } from '@/services/AlertingService';

// Utilisation reste identique
await alertingService.createAlert({
  title: 'Incident Sécurité',
  message: 'Tentative accès non autorisé détectée',
  priority: 'critical',
  category: 'security'
});
```

---

## 🔧 Configuration

**`src/services/security/index.ts`:**

```typescript
export const SECURITY_CONFIG = {
  // Monitoring
  monitoringEnabled: true,
  healthCheckInterval: 60000, // 60s
  
  // Logging
  logLevel: 'warn', // 'debug' | 'info' | 'warn' | 'error' | 'critical'
  logRetention: 30, // jours
  
  // CSP
  cspEnabled: true,
  cspReportOnly: false,
  
  // Alerting
  alertingEnabled: true,
  criticalAlertChannels: ['email', 'push'],
  
  // Error Boundaries
  errorBoundariesEnabled: true,
  autoResetErrors: true,
};
```

---

## 📊 Dashboard Sécurité

**Créer page monitoring (optionnel):**

```typescript
// src/pages/SecurityDashboard.tsx
import { monitoringService } from '@/services/MonitoringService';
import { healthCheckService } from '@/services/HealthCheckService';
import { cspService } from '@/services/ContentSecurityPolicy';

function SecurityDashboard() {
  const [health, setHealth] = useState(null);
  const [violations, setViolations] = useState([]);

  useEffect(() => {
    monitoringService.getCurrentHealth().then(setHealth);
    setViolations(cspService.getRecentViolations(50));
  }, []);

  return (
    <div>
      <h1>Dashboard Sécurité</h1>
      
      {/* Santé Système */}
      <Card>
        <h2>Santé Système: {health?.overall}</h2>
        <p>Erreurs critiques: {health?.metrics.criticalErrors}</p>
        <p>Erreurs en attente: {health?.metrics.pendingErrors}</p>
        <p>Uptime: {Math.floor(health?.metrics.uptime / 3600)}h</p>
      </Card>

      {/* Violations CSP */}
      <Card>
        <h2>Violations CSP ({violations.length})</h2>
        {violations.map(v => (
          <div key={v.timestamp}>
            {v.violatedDirective}: {v.blockedUri}
          </div>
        ))}
      </Card>
    </div>
  );
}
```

---

## ✅ Checklist Migration

### Phase 1: Installation (Jour 1 - 2h)

- [ ] Appliquer migration SQL (`20240130_security_services_infrastructure.sql`)
- [ ] Vérifier 7 tables créées dans Supabase
- [ ] Initialiser services dans `App.tsx`
- [ ] Tester services fonctionnent (check console logs)

### Phase 2: Remplacer console.error (Jour 2-3 - 8h)

- [ ] Scanner tous les fichiers avec `console.error`
- [ ] Remplacer par `secureLogger.error()` dans `src/hooks/*`
- [ ] Remplacer dans `src/services/*`
- [ ] Remplacer dans `src/components/*`
- [ ] Remplacer dans `supabase/functions/*`
- [ ] Vérifier aucun `console.error` restant

**Script automatique (optionnel):**
```bash
# Trouver tous les console.error
grep -r "console\.error" src/ --include="*.ts" --include="*.tsx"

# TODO: Créer script automated replacement
```

### Phase 3: Ajouter try-catch (Jour 3-4 - 6h)

- [ ] Identifier 30+ `throw new Error` sans try-catch
- [ ] Wrapper dans `tryCatch()` ou `tryCatchSync()`
- [ ] Fichiers prioritaires:
  - [ ] `supabase/functions/wallet-operations/index.ts` (ligne 225)
  - [ ] `src/services/CopiloteService.ts` (ligne 131)
  - [ ] `src/services/emergencyService.ts` (ligne 36)
  - [ ] `src/hooks/useTransitaireActions.ts` (lignes 92,97,101,105)

### Phase 4: Error Boundaries (Jour 4-5 - 4h)

- [ ] Wrapper `App.tsx` avec `<EnhancedErrorBoundary level="app">`
- [ ] Wrapper pages principales niveau "page"
- [ ] Wrapper composants critiques niveau "component"
- [ ] Tester erreurs capturées correctement

### Phase 5: Compléter TODOs (Jour 5-7 - 8h)

- [ ] `DeliveryPaymentService.ts`: Intégrer Orange Money/MTN API
- [ ] `DeliveryPaymentService.ts`: Intégrer Stripe SDK
- [ ] `VendorPaymentService.ts`: Intégrer PayPal SDK
- [ ] `send-security-alert`: Intégrer service SMS (Twilio)
- [ ] `useAgentStats.ts`: Implémenter système commissions

### Phase 6: Tests Sécurité (Jour 7 - 4h)

- [ ] Tests manuels (OWASP Top 10)
- [ ] Scan automatique (OWASP ZAP)
- [ ] Test charge (100+ alertes simultanées)
- [ ] Test injection SQL/XSS
- [ ] Vérifier CSP efficace

---

## 📈 Métriques Succès

| Métrique | Avant | Objectif 7j | Objectif 30j |
|----------|-------|-------------|--------------|
| **Niveau Sécurité** | 50% 🔴 | 95% 🟢 | 99% 🟢 |
| **Erreurs Critiques** | 28 | 0 | 0 |
| **Erreurs En Attente** | 170 | 5 | 0 |
| **Monitoring** | DÉGRADÉ 🟡 | OPÉRATIONNEL 🟢 | OPÉRATIONNEL 🟢 |
| **console.error non gérés** | 170+ | 0 | 0 |
| **Violations CSP** | Inconnu | <5/jour | <1/jour |
| **Uptime** | N/A | 99.5% | 99.9% |

---

## 🆘 Troubleshooting

### Problème: Services ne démarrent pas

**Solution:**
```typescript
// Vérifier logs console
initializeSecurityServices()
  .then(() => console.log('✅ Services OK'))
  .catch(err => console.error('❌ Erreur:', err));

// Vérifier tables existent
const { data } = await supabase.from('secure_logs').select('*').limit(1);
```

### Problème: Logs pas enregistrés en DB

**Solution:**
```typescript
// Vérifier permissions RLS
// Vérifier user est authentifié
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// Flush manuel
import { secureLogger } from '@/services/SecureLogger';
secureLogger.destroy(); // Force flush
```

### Problème: CSP bloque ressources légitimes

**Solution:**
```typescript
// Ajouter source à whitelist
import { CSP_CONFIG } from '@/services/ContentSecurityPolicy';

CSP_CONFIG.scriptSrc.push('https://cdn.trusted.com');
CSP_CONFIG.mediaSrc.push('https://audio.trusted.com');
```

---

## 📞 Support

**Contacts Urgence:**
- **Technique:** tech@224solutions.com
- **Sécurité:** security@224solutions.com
- **Escalade:** pdg@224solutions.com

**Documentation:**
- Guide complet: `SECURITY_SERVICES_GUIDE.md` (ce fichier)
- Rapport audit: `SECURITY_AUDIT_REPORT.md`
- Changelog: `SECURITY_CHANGELOG.md`

---

## 🎯 Prochaines Étapes

1. ✅ **Jour 1**: Appliquer migration + initialiser services
2. ⏳ **Jour 2-3**: Scanner et remplacer 170+ console.error
3. ⏳ **Jour 3-4**: Ajouter try-catch aux 30+ throw errors
4. ⏳ **Jour 4-5**: Déployer Error Boundaries partout
5. ⏳ **Jour 5-7**: Compléter TODOs critiques + tests sécurité

**Objectif 7 jours:** Passer de **50% à 95%** sécurité, **0 erreurs critiques**

---

*Dernière mise à jour: 30 janvier 2024*
*Version: 1.0.0*
*Auteur: GitHub Copilot - 224Solutions Security Team*
