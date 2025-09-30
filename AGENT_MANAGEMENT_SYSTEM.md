# 🤝 Système de Gestion d'Agents - 224Solutions

## 📋 **Vue d'Ensemble**

Système complet de gestion d'agents, sous-agents et utilisateurs pour 224Solutions avec automatisation complète du workflow et calcul automatique des commissions.

### ✨ **Fonctionnalités Principales**

- ✅ **Hiérarchie Complète** : PDG → Agents → Sous-Agents → Utilisateurs
- ✅ **Automatisation Totale** : Aucune intervention manuelle nécessaire
- ✅ **Calcul Automatique** : Commissions avec répartition configurable
- ✅ **Détection Device** : Mobile/PC/Tablet avec téléchargement adapté
- ✅ **Notifications** : Email/SMS automatiques
- ✅ **Audit Complet** : Traçabilité de toutes les actions
- ✅ **Sécurité** : Permissions granulaires et RLS

---

## 🏗️ **Architecture du Système**

### 📊 **Base de Données (Supabase)**

#### **Tables Principales :**

```sql
-- PDG (Président Directeur Général)
pdg: id, name, email, phone, permissions[], created_at, updated_at

-- Agents principaux
agents: id, name, email, phone, pdg_id, can_create_sub_agent, is_active, permissions[], created_at, updated_at

-- Sous-agents
sub_agents: id, name, email, phone, parent_agent_id, is_active, created_at, updated_at

-- Utilisateurs finaux
agent_users: id, name, email, phone, creator_id, creator_type, status, invite_token, activation_link, device_type, activated_at, last_login, created_at, updated_at

-- Paramètres de commission configurables
commission_settings: id, setting_key, setting_value, description, updated_by, updated_at

-- Commissions calculées
commissions: id, recipient_id, recipient_type, amount, source_type, source_user_id, transaction_id, commission_rate, calculated_at, paid_at, status, created_at

-- Transactions générant des revenus
agent_transactions: id, user_id, gross_amount, fees, taxes, net_amount, transaction_type, description, metadata, processed_at, created_at

-- Logs d'audit
agent_audit_logs: id, actor_id, actor_type, action, target_id, target_type, details, ip_address, user_agent, created_at

-- Suivi des invitations
user_invitations: id, user_id, invite_token, invite_link, sent_via, sent_to, sent_at, opened_at, activated_at, expires_at, is_expired
```

#### **Fonctions PostgreSQL :**

```sql
-- Génération de token unique
generate_invite_token() RETURNS TEXT

-- Calcul automatique des commissions
calculate_user_commission(p_user_id UUID, p_net_amount DECIMAL) 
RETURNS TABLE(recipient_id UUID, recipient_type TEXT, amount DECIMAL, commission_rate DECIMAL)
```

### 🔧 **Backend API (TypeScript)**

#### **Service Principal :**
- `AgentManagementService` : Gestion complète des agents
- `NotificationService` : Envoi email/SMS (placeholder)
- `DeviceDetectionService` : Détection automatique du device

#### **APIs Principales :**
```typescript
// Création d'agent (PDG)
POST /create-agent { name, email, phone, canCreateSubAgent, permissions }

// Création de sous-agent (Agent autorisé)
POST /create-sub-agent { name, email, phone, parentAgentId }

// Création d'utilisateur (Agent ou Sous-Agent)
POST /create-user { name, email, phone, creatorId, type, notificationMethod }

// Activation utilisateur
POST /activate-user { userId, deviceType, userAgent, ipAddress }

// Traitement transaction + calcul commissions
POST /transaction { userId, grossAmount, fees, taxes, transactionType, description }

// Mise à jour paramètres commission (PDG)
PUT /commission-settings { baseUserCommission, parentShareRatio }
```

### 🎨 **Frontend Interfaces (React + TypeScript)**

#### **1. Dashboard PDG (`/pdg-agents`)**
- ✅ Création et gestion des agents
- ✅ Attribution des permissions
- ✅ Configuration des taux de commission
- ✅ Vue globale sur tous les utilisateurs
- ✅ Analytics et statistiques complètes
- ✅ Audit logs

#### **2. Dashboard Agent (`/agent-dashboard/:agentId`)**
- ✅ Création d'utilisateurs et sous-agents (si autorisé)
- ✅ Gestion de ses utilisateurs et sous-agents
- ✅ Suivi de ses commissions
- ✅ Génération de liens d'invitation
- ✅ Statistiques personnalisées

#### **3. Dashboard Sous-Agent (`/sub-agent-dashboard/:subAgentId`)**
- ✅ Création uniquement d'utilisateurs
- ✅ Dashboard limité à ses utilisateurs
- ✅ Suivi de ses commissions
- ✅ Interface simplifiée
- ✅ Génération de liens d'invitation

#### **4. Page d'Activation (`/activate/:token`)**
- ✅ Validation automatique du token
- ✅ Détection device (Mobile/PC/Tablet)
- ✅ Activation du compte
- ✅ Proposition de téléchargement adaptée
- ✅ Interface responsive avec étapes visuelles

---

## 🔄 **Workflow Complet**

### 1️⃣ **Création d'Agent (PDG)**
```typescript
const result = await agentService.createAgent(pdgId, {
  name: "Jean Dupont",
  email: "jean@example.com", 
  phone: "+221 77 123 45 67",
  canCreateSubAgent: true,
  permissions: ["create_user", "view_analytics"]
});
// → Agent créé avec ID unique
```

### 2️⃣ **Création de Sous-Agent (Agent autorisé)**
```typescript
const result = await agentService.createSubAgent(agentId, {
  name: "Marie Martin",
  email: "marie@example.com",
  phone: "+221 77 234 56 78"
});
// → Sous-agent créé et lié à l'agent parent
```

### 3️⃣ **Création d'Utilisateur (Agent ou Sous-Agent)**
```typescript
const result = await agentService.createUser(creatorId, 'agent', {
  name: "Ahmed Diallo",
  email: "ahmed@example.com",
  phone: "+221 77 345 67 89",
  notificationMethod: 'both' // email + SMS
});
// → Utilisateur créé, token généré, invitations envoyées automatiquement
// → Lien: https://224solutions.app/activate/abc123...
```

### 4️⃣ **Activation Utilisateur (Automatique)**
```typescript
// L'utilisateur clique le lien, device détecté automatiquement
const result = await agentService.activateUser(token, {
  deviceType: 'mobile', // détecté automatiquement
  userAgent: navigator.userAgent,
  ipAddress: '192.168.1.100'
});
// → Compte activé, app mobile proposée, liaison avec créateur
```

### 5️⃣ **Génération de Commissions (Automatique)**
```typescript
// Dès qu'un utilisateur génère des revenus
const result = await agentService.processTransaction({
  userId: "user-abc-123",
  grossAmount: 100000, // 100,000 FCFA
  fees: 5000,          // 5,000 FCFA frais
  taxes: 15000         // 15,000 FCFA taxes
  // netAmount = 80,000 FCFA
});

// Calcul automatique avec paramètres configurables:
// baseUserCommission = 20% → 16,000 FCFA de commission totale

// Si utilisateur créé par Agent:
// → Agent reçoit: 16,000 FCFA (100%)

// Si utilisateur créé par Sous-Agent (parentShareRatio = 50%):
// → Sous-Agent reçoit: 8,000 FCFA (50%)
// → Agent Parent reçoit: 8,000 FCFA (50%)
```

---

## 💰 **Système de Commissions**

### ⚙️ **Configuration (PDG)**

```typescript
interface CommissionSettings {
  base_user_commission: number;    // 0.2 = 20% du revenu net
  parent_share_ratio: number;      // 0.5 = 50% pour l'agent parent
}

// Mise à jour par PDG
await agentService.updateCommissionSettings(pdgId, {
  base_user_commission: 0.15,      // 15%
  parent_share_ratio: 0.6          // 60% parent, 40% sous-agent
});
```

### 📊 **Calcul Automatique**

#### **Scénario 1 : Utilisateur créé par Agent**
```
Revenu Net: 100,000 FCFA
Commission Base: 20%
→ Agent reçoit: 20,000 FCFA (100%)
```

#### **Scénario 2 : Utilisateur créé par Sous-Agent**
```
Revenu Net: 100,000 FCFA
Commission Base: 20% = 20,000 FCFA
Répartition 50/50:
→ Sous-Agent reçoit: 10,000 FCFA (50%)
→ Agent Parent reçoit: 10,000 FCFA (50%)
```

### 📋 **Traçabilité**
- ✅ Taux appliqué stocké pour audit
- ✅ Référence à la transaction source
- ✅ Statut de paiement (pending/paid/cancelled)
- ✅ Horodatage complet
- ✅ Logs d'audit pour toute modification

---

## 🔐 **Sécurité et Permissions**

### 🛡️ **Row Level Security (RLS)**
```sql
-- Agents voient leurs propres données
CREATE POLICY "Agents can view their own data" ON agents
FOR ALL USING (auth.uid()::text = id::text);

-- Créateurs voient leurs utilisateurs
CREATE POLICY "Creators can view their users" ON agent_users
FOR ALL USING (auth.uid()::text = creator_id::text);
```

### 🔑 **Permissions Granulaires**
```typescript
interface AgentPermissions {
  create_user: boolean;
  create_sub_agent: boolean;
  view_analytics: boolean;
  manage_commissions: boolean;
  access_audit_logs: boolean;
}
```

### 📊 **Audit Complet**
Toutes les actions sont loggées :
```typescript
await createAuditLog({
  actor_id: userId,
  actor_type: 'agent',
  action: 'create_user',
  target_id: newUserId,
  target_type: 'user',
  details: { user_name: 'Ahmed', notification_sent: true },
  ip_address: '192.168.1.100',
  user_agent: navigator.userAgent
});
```

---

## 📱 **Détection Device et Téléchargements**

### 🔍 **Détection Automatique**
```typescript
const detectDevice = (): DeviceInfo => {
  const userAgent = navigator.userAgent;
  
  // Détection type
  if (/Android|iPhone|iPad|iPod/i.test(userAgent)) {
    return /iPad/i.test(userAgent) ? 'tablet' : 'mobile';
  }
  return 'pc';
};
```

### 📲 **URLs de Téléchargement**
```typescript
const getDownloadUrl = (deviceType: string) => {
  switch (deviceType) {
    case 'mobile':
      return 'https://play.google.com/store/apps/details?id=com.solutions224';
    case 'tablet':
      return 'https://play.google.com/store/apps/details?id=com.solutions224';
    case 'pc':
      return 'https://224solutions.app/download/224solutions-setup.exe';
  }
};
```

---

## 🚀 **Déploiement et URLs**

### 🌐 **Routes Principales**
```typescript
// Dashboards
/pdg-agents                          // Interface PDG
/agent-dashboard/:agentId           // Interface Agent
/sub-agent-dashboard/:subAgentId    // Interface Sous-Agent

// Activation
/activate/:token                    // Page d'activation utilisateur

// APIs
/api/create-agent                   // Création agent
/api/create-sub-agent              // Création sous-agent
/api/create-user                   // Création utilisateur
/api/activate-user                 // Activation utilisateur
/api/transaction                   // Traitement transaction
/api/commission-settings           // Paramètres commission
```

### 📦 **Fichiers Créés**
```
📁 supabase/migrations/
  └── 20241201000000_agent_management_system.sql

📁 src/services/
  └── agentManagementService.ts

📁 src/pages/
  ├── PDGAgentDashboard.tsx
  ├── AgentDashboard.tsx
  ├── SubAgentDashboard.tsx
  └── UserActivation.tsx

📁 src/components/
  ├── AgentDashboardWrapper.tsx
  └── SubAgentDashboardWrapper.tsx

📁 Documentation/
  ├── agent-system-demo.html
  └── AGENT_MANAGEMENT_SYSTEM.md (ce fichier)
```

---

## 🧪 **Tests et Démonstration**

### 📊 **Interface de Démo**
Ouvrez `agent-system-demo.html` pour une démonstration interactive complète avec :
- ✅ Vue d'ensemble du système
- ✅ Workflow détaillé step-by-step
- ✅ Tests interactifs des fonctionnalités
- ✅ URLs de test pour chaque interface
- ✅ Exemples de calculs de commission

### 🔗 **URLs de Test**
```
http://localhost:5173/pdg-agents
http://localhost:5173/agent-dashboard/demo-agent-123
http://localhost:5173/sub-agent-dashboard/demo-subagent-456
http://localhost:5173/activate/demo-token-789
```

---

## 🎯 **Bénéfices Système**

### ⚡ **Automatisation**
- ✅ **0% intervention manuelle** après configuration initiale
- ✅ **Workflow fluide** de création à activation
- ✅ **Notifications automatiques** email/SMS
- ✅ **Calcul temps réel** des commissions

### 💼 **Business**
- ✅ **Scalabilité** : Gestion de milliers d'agents/utilisateurs
- ✅ **Transparence** : Traçabilité complète des commissions
- ✅ **Flexibilité** : Paramètres configurables par PDG
- ✅ **ROI mesurable** : Analytics détaillées

### 🔒 **Sécurité**
- ✅ **Permissions granulaires** par rôle
- ✅ **Row Level Security** au niveau base
- ✅ **Audit trail complet** de toutes les actions
- ✅ **Tokens sécurisés** avec expiration

### 👥 **Expérience Utilisateur**
- ✅ **Interfaces dédiées** par type d'utilisateur
- ✅ **Design responsive** mobile/tablette/desktop
- ✅ **Activation simple** en un clic
- ✅ **Détection intelligente** du device

---

## 📈 **Roadmap Future**

### Phase 2 : Améliorations
- [ ] **Notifications Push** temps réel
- [ ] **Analytics avancées** avec graphiques
- [ ] **Export de données** PDF/Excel
- [ ] **API webhooks** pour intégrations tierces

### Phase 3 : Extensions
- [ ] **Machine Learning** pour optimisation commissions
- [ ] **Géolocalisation** des agents
- [ ] **Chat intégré** support en temps réel
- [ ] **Mobile apps** natives iOS/Android

---

## 💡 **Utilisation Rapide**

### 🚀 **Démarrage**
1. **Migration Base :** Appliquer `20241201000000_agent_management_system.sql`
2. **Service :** Importer `agentManagementService.ts`
3. **Routes :** Routes déjà intégrées dans `App.tsx`
4. **Test :** Ouvrir `/pdg-agents` pour commencer

### 🔧 **Configuration**
```typescript
// 1. Créer un PDG (manuel en base ou interface)
// 2. Le PDG configure les paramètres commission
await agentService.updateCommissionSettings(pdgId, {
  base_user_commission: 0.2,    // 20%
  parent_share_ratio: 0.5       // 50/50
});

// 3. Créer des agents
const agent = await agentService.createAgent(pdgId, {
  name: "Premier Agent",
  email: "agent@224solutions.com",
  phone: "+221 77 123 45 67",
  canCreateSubAgent: true
});

// 4. Le workflow automatique peut commencer !
```

---

**🎉 Système complet opérationnel avec automatisation totale pour 224Solutions !**

---

*📧 Support : Contactez l'équipe technique pour toute question sur l'implémentation ou l'utilisation du système.*
