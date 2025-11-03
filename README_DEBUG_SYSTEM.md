# 🛠️ Système de Debug & Correction Automatique - 224SOLUTIONS

## 📖 Vue d'ensemble

Le système de debug et de correction automatique de 224SOLUTIONS est une infrastructure complète qui détecte, analyse, corrige et rapporte les erreurs en temps réel. Il s'agit d'un système multi-couches intégré dans toute l'application.

## 🏗️ Architecture

### 1. **Couche de Détection**
- **ErrorMonitor Service** (`src/services/errorMonitor.ts`)
  - Intercepte toutes les erreurs frontend (window.onerror, unhandledrejection)
  - Détecte les erreurs React via ErrorBoundary
  - Log automatique dans la base de données Supabase

### 2. **Couche de Stockage**
- **Tables Supabase:**
  - `system_errors` - Historique complet des erreurs
  - `system_health` - Métriques de santé système
  - `auto_fixes` - Bibliothèque de correctifs automatiques

### 3. **Couche de Correction Automatique**
- **Correctifs pré-configurés:**
  - Reconnexion DB automatique
  - Retry des requêtes réseau
  - Vérifications null/undefined
  - Détection RLS
  - Augmentation timeouts

### 4. **Couche d'Interface PDG**
- **PdgDebugPanel** (`/pdg/debug`)
  - Vue complète des erreurs
  - Actions manuelles de correction
  - Redémarrage de modules
  - Statistiques en temps réel

## 🚀 Utilisation

### Pour les Développeurs

#### Intégration dans votre code

```typescript
import { errorMonitor } from '@/services/errorMonitor';

// Logger une erreur manuellement
errorMonitor.logError({
  module: 'payment_module',
  error_type: 'payment_failed',
  error_message: 'La transaction a échoué',
  severity: 'critique',
  metadata: {
    transaction_id: '12345',
    amount: 50000
  }
});
```

#### Protection des composants React

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

function MyComponent() {
  return (
    <ErrorBoundary>
      <YourRiskyComponent />
    </ErrorBoundary>
  );
}
```

### Pour le PDG

#### Accès au Panneau de Debug

1. Connectez-vous en tant qu'admin
2. Accédez au Dashboard PDG
3. Dans la section "Système", cliquez sur **"Debug & Surveillance"**
4. Ou accédez directement à `/pdg/debug`

#### Actions disponibles

- **Corriger** : Applique une correction automatique à une erreur
- **Redémarrer Module** : Redémarre un module système spécifique
- **Actualiser** : Recharge les données en temps réel
- **Filtrer** : Par gravité (critique, modérée, mineure)

## 📊 Types d'Erreurs

### Gravité

- **Critique** 🔴 : Affecte les fonctionnalités principales, nécessite une action immédiate
- **Modérée** 🟡 : Affecte certaines fonctionnalités, correction recommandée
- **Mineure** 🟢 : N'affecte pas les fonctionnalités, correction facultative

### Statut

- **detected** : Erreur détectée, en attente de traitement
- **fixing** : Correction en cours
- **fixed** : Corrigée avec succès
- **failed** : Échec de la correction

## 🔧 Edge Functions

### 1. error-monitor
**Endpoint:** `POST /functions/v1/error-monitor`

Enregistre une erreur dans le système avec tentative de correction automatique.

```typescript
{
  error: {
    module: string,
    error_type?: string,
    error_message: string,
    stack_trace?: string,
    severity: 'critique' | 'modérée' | 'mineure',
    user_id?: string,
    metadata?: object
  },
  autoFix?: boolean // default: true
}
```

### 2. fix-error
**Endpoint:** `POST /functions/v1/fix-error`

Applique une correction manuelle à une erreur spécifique (requiert rôle admin).

```typescript
{
  errorId: string
}
```

### 3. restart-module
**Endpoint:** `POST /functions/v1/restart-module`

Redémarre un module système spécifique (requiert rôle admin).

```typescript
{
  moduleName: string
}
```

## 📈 Métriques & Statistiques

Le système génère automatiquement des statistiques:

- **Total des erreurs**
- **Erreurs critiques**
- **Erreurs modérées**
- **Erreurs mineures**
- **Taux de correction automatique**
- **Erreurs en attente**

Ces métriques sont affichées dans le Dashboard PDG et mises à jour en temps réel.

## 🔄 Correctifs Automatiques Pré-configurés

| Pattern d'erreur | Type de correctif | Description |
|------------------|-------------------|-------------|
| `ECONNREFUSED` | `reconnect_db` | Reconnexion automatique à Supabase |
| `Cannot read property` | `null_check` | Ajout de vérifications null |
| `undefined is not an object` | `undefined_check` | Vérification undefined |
| `Network request failed` | `retry_request` | Nouvelle tentative requête |
| `timeout` | `increase_timeout` | Augmentation délai d'attente |
| `violates row-level security` | `rls_check` | Vérification politiques RLS |

## 🛡️ Sécurité

- ✅ Toutes les actions de correction nécessitent l'authentification
- ✅ Seuls les admins peuvent accéder au panneau de debug
- ✅ Toutes les actions sont loguées dans `audit_logs`
- ✅ Les données sensibles ne sont jamais exposées dans les logs

## 🔮 Évolutions Futures

- [ ] Alertes en temps réel (email, SMS, push)
- [ ] Machine Learning pour détecter les patterns d'erreurs
- [ ] Correction prédictive
- [ ] Intégration avec Sentry/DataDog
- [ ] Dashboard mobile pour le PDG
- [ ] Export des rapports PDF

## 📞 Support

En cas de problème avec le système de debug:

1. Vérifiez les logs Supabase
2. Consultez la documentation Supabase
3. Contactez l'équipe technique 224SOLUTIONS

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-11-03  
**Auteur:** 224SOLUTIONS Team
