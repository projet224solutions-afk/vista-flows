# 🔒 Documentation Sécurité RBAC - Dashboard PDG 224Solutions

## Vue d'ensemble de la sécurité

Le dashboard PDG de 224Solutions implémente un contrôle d'accès basé sur les rôles (RBAC) multi-couches avec authentification multi-facteurs (MFA) pour toutes les actions destructives.

## 🎯 Contrôles d'accès requis

### 1. Contrôle Frontend (Première couche)
```typescript
// Vérification côté client (ne pas s'y fier uniquement)
useEffect(() => {
  if (!user || profile?.role !== 'PDG') {
    toast.error("Accès refusé. Privilèges PDG requis.");
    navigate('/auth');
    return;
  }
}, [user, profile, navigate]);
```

### 2. Middleware Serveur (Couche critique)
```javascript
// middleware/auth.js
const requirePDGRole = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier le rôle PDG
    if (decoded.role !== 'PDG') {
      auditLog.security({
        event: 'UNAUTHORIZED_PDG_ACCESS_ATTEMPT',
        userId: decoded.id,
        ip: req.ip,
        timestamp: new Date()
      });
      return res.status(403).json({ error: 'Accès PDG requis' });
    }
    
    // Vérifier que le token n'est pas révoqué
    const tokenExists = await TokenBlacklist.findOne({ token });
    if (tokenExists) {
      return res.status(401).json({ error: 'Token révoqué' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};
```

### 3. Vérification MFA pour actions destructives
```javascript
// middleware/mfa.js
const requireFreshMFA = (req, res, next) => {
  const { mfaVerifiedAt } = req.user;
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  const now = Date.now();
  
  if (!mfaVerifiedAt || (now - mfaVerifiedAt) > FIFTEEN_MINUTES) {
    return res.status(403).json({ 
      error: 'Vérification MFA requise',
      requiresMFA: true,
      mfaExpired: true
    });
  }
  
  next();
};

// Endpoint de vérification MFA
app.post('/api/auth/verify-mfa', requirePDGRole, async (req, res) => {
  const { mfaCode } = req.body;
  
  try {
    const isValid = await verifyMFACode(req.user.id, mfaCode);
    
    if (isValid) {
      // Mettre à jour le timestamp MFA
      await User.updateOne(
        { id: req.user.id },
        { mfaVerifiedAt: new Date() }
      );
      
      res.json({ success: true, mfaVerified: true });
    } else {
      auditLog.security({
        event: 'INVALID_MFA_ATTEMPT',
        userId: req.user.id,
        ip: req.ip,
        timestamp: new Date()
      });
      res.status(400).json({ error: 'Code MFA invalide' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur de vérification MFA' });
  }
});
```

## 🛡️ Endpoints Protégés

### 1. API Copilot PDG
```javascript
// routes/copilot.js
app.post('/api/copilot/action', 
  requirePDGRole, 
  requireFreshMFA, 
  auditMiddleware,
  async (req, res) => {
    const { action, parameters } = req.body;
    
    try {
      // Vérifier si l'action est autorisée
      if (!isAllowedPDGAction(action)) {
        return res.status(403).json({ error: 'Action non autorisée' });
      }
      
      // Mode sandbox pour les tests
      if (req.body.sandbox) {
        const result = await executeSandboxAction(action, parameters);
        return res.json({ ...result, sandbox: true });
      }
      
      // Exécution en production
      const result = await executePDGAction(action, parameters, req.user);
      
      // Log de l'action réussie
      await auditLog.action({
        userId: req.user.id,
        action,
        parameters,
        result: result.success,
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json(result);
    } catch (error) {
      await auditLog.error({
        userId: req.user.id,
        action,
        error: error.message,
        timestamp: new Date()
      });
      
      res.status(500).json({ error: 'Erreur lors de l\'exécution' });
    }
  }
);

// Chat Copilot (lecture seule)
app.get('/api/copilot/chat', requirePDGRole, (req, res) => {
  // Retourner l'historique du chat pour ce PDG
});

app.post('/api/copilot/chat', requirePDGRole, (req, res) => {
  // Sauvegarder un message de chat
});
```

### 2. Actions PDG Autorisées
```javascript
// services/pdgActions.js
const ALLOWED_PDG_ACTIONS = {
  // Actions utilisateurs
  'BLOCK_USER': { requiresMFA: true, destructive: true },
  'UNBLOCK_USER': { requiresMFA: true, destructive: true },
  'DELETE_USER': { requiresMFA: true, destructive: true },
  'VIEW_USER_DETAILS': { requiresMFA: false, destructive: false },
  
  // Actions système
  'SYSTEM_UPDATE': { requiresMFA: true, destructive: true },
  'SYSTEM_ROLLBACK': { requiresMFA: true, destructive: true },
  'VIEW_SYSTEM_STATUS': { requiresMFA: false, destructive: false },
  
  // Actions financières
  'GENERATE_FINANCIAL_REPORT': { requiresMFA: false, destructive: false },
  'FORCE_PAYMENT_REFUND': { requiresMFA: true, destructive: true },
  
  // Actions produits
  'BLOCK_PRODUCT': { requiresMFA: true, destructive: true },
  'APPROVE_PRODUCT': { requiresMFA: false, destructive: false }
};

const executePDGAction = async (action, parameters, user) => {
  const actionConfig = ALLOWED_PDG_ACTIONS[action];
  
  if (!actionConfig) {
    throw new Error(`Action non autorisée: ${action}`);
  }
  
  switch (action) {
    case 'BLOCK_USER':
      return await blockUser(parameters.userId, user.id);
    
    case 'SYSTEM_UPDATE':
      return await performSystemUpdate(parameters.version, user.id);
    
    case 'GENERATE_FINANCIAL_REPORT':
      return await generateFinancialReport(parameters.period, user.id);
    
    default:
      throw new Error(`Action non implémentée: ${action}`);
  }
};
```

## 📋 Audit et Logging

### 1. Schema d'audit
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  action VARCHAR(100),
  parameters JSONB,
  result JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

### 2. Service d'audit
```javascript
// services/auditLog.js
class AuditLogger {
  static async logPDGAction(data) {
    await db.audit_logs.create({
      user_id: data.userId,
      event_type: 'PDG_ACTION',
      action: data.action,
      parameters: data.parameters,
      result: data.result,
      ip_address: data.ip,
      user_agent: data.userAgent,
      success: data.success
    });
  }
  
  static async logSecurityEvent(data) {
    await db.audit_logs.create({
      user_id: data.userId,
      event_type: 'SECURITY_EVENT',
      action: data.event,
      ip_address: data.ip,
      timestamp: data.timestamp,
      success: false
    });
    
    // Alerte immédiate pour les événements de sécurité critiques
    if (data.event.includes('UNAUTHORIZED')) {
      await SecurityAlert.create({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        details: data
      });
    }
  }
}
```

## 🚨 Alertes de Sécurité

### 1. Détection d'anomalies
```javascript
// services/securityMonitoring.js
class SecurityMonitoring {
  static async checkPDGAccess(userId, ip) {
    // Vérifier les tentatives d'accès répétées
    const recentAttempts = await db.audit_logs
      .where('user_id', userId)
      .where('event_type', 'PDG_LOGIN_ATTEMPT')
      .where('timestamp', '>', new Date(Date.now() - 5 * 60 * 1000))
      .count();
    
    if (recentAttempts > 5) {
      await this.triggerSecurityAlert({
        type: 'SUSPICIOUS_PDG_ACCESS',
        userId,
        ip,
        attempts: recentAttempts
      });
    }
    
    // Vérifier l'accès depuis une nouvelle géolocalisation
    const previousIPs = await db.audit_logs
      .select('ip_address')
      .where('user_id', userId)
      .where('success', true)
      .distinct();
    
    if (!previousIPs.includes(ip)) {
      await this.triggerSecurityAlert({
        type: 'NEW_LOCATION_PDG_ACCESS',
        userId,
        ip
      });
    }
  }
  
  static async triggerSecurityAlert(alert) {
    // Envoyer notification immédiate
    await NotificationService.sendCriticalAlert(alert);
    
    // Enregistrer l'alerte
    await SecurityAlert.create(alert);
  }
}
```

## 🔧 Configuration d'environnement

### Variables d'environnement requises
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=1h

# MFA Configuration
MFA_SECRET_KEY=your-mfa-secret
MFA_TOKEN_VALIDITY=900000  # 15 minutes

# Database
DATABASE_URL=postgresql://username:password@localhost/224solutions

# Security
RATE_LIMIT_PDG_ACTIONS=10  # Actions par minute
SESSION_TIMEOUT=3600000    # 1 heure
```

## 📱 Implémentation Frontend

### Hook de sécurité
```typescript
// hooks/usePDGSecurity.ts
export const usePDGSecurity = () => {
  const checkMFAFreshness = useCallback(() => {
    const lastMFA = localStorage.getItem('lastMFAVerification');
    if (!lastMFA) return false;
    
    const fifteenMinutes = 15 * 60 * 1000;
    return (Date.now() - parseInt(lastMFA)) < fifteenMinutes;
  }, []);
  
  const executePDGAction = useCallback(async (action: string, params: any) => {
    const needsMFA = !checkMFAFreshness();
    
    if (needsMFA) {
      // Déclencher le dialog MFA
      return { requiresMFA: true };
    }
    
    const response = await fetch('/api/copilot/action', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action, parameters: params })
    });
    
    return response.json();
  }, [checkMFAFreshness]);
  
  return { executePDGAction, checkMFAFreshness };
};
```

## ⚠️ Points critiques à retenir

1. **Jamais de confiance côté client** - Toute vérification frontend doit être doublée côté serveur
2. **MFA obligatoire** pour toutes les actions destructives
3. **Audit complet** de toutes les actions PDG
4. **Monitoring en temps réel** des accès PDG
5. **Rotation régulière** des secrets et tokens
6. **Tests de sécurité** réguliers et pen-testing
7. **Sauvegarde séparée** des logs d'audit
8. **Chiffrement** des données sensibles en base

Cette documentation doit être mise à jour à chaque modification de sécurité.

