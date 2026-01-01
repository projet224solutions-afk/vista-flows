# 🚀 QUICKSTART - Security Operations Center

## Installation rapide (5 minutes)

### 1️⃣ Installer la base de données

```bash
# Installer les dépendances
npm install

# Appliquer le schéma de sécurité
node scripts/apply-security-defense.mjs
```

**Résultat attendu:**
```
✅ Système de défense appliqué avec succès!
📊 Tables créées: 9 tables
🔧 Fonctions créées: 2 fonctions
📈 Vue créée: security_stats
🚀 Le système de défense est opérationnel!
```

### 2️⃣ Tester le système

```bash
# Exécuter les tests
node scripts/test-security-system.mjs
```

**Résultat attendu:**
```
✅ Tests réussis: 5/5
📈 Taux de réussite: 100%
🎉 Tous les tests sont passés!
```

### 3️⃣ Accéder au Dashboard

1. Connexion en tant qu'admin: https://votre-app.com/auth
2. Naviger vers: https://votre-app.com/pdg
3. Cliquer sur l'onglet **"Sécurité"**

Vous devriez voir le **Security Operations Center** avec:
- 📊 Statistiques temps réel
- 🚨 Liste des incidents
- ⚠️ Alertes actives
- 🚫 IPs bloquées

## 🎯 Premiers pas

### Créer un incident de test

Dans l'onglet **Incidents**:
1. Cliquer sur "Créer un Incident"
2. Type: `brute_force`
3. Sévérité: `high`
4. Titre: "Test Brute Force"
5. IP Source: `192.168.1.100`
6. Cocher "Actions automatiques"
7. Valider

**Actions automatiques:**
- ✅ IP bloquée pendant 24h
- ✅ Snapshot forensique créé
- ✅ Alertes envoyées
- ✅ Log audit créé

### Bloquer une IP manuellement

Dans l'onglet **IPs Bloquées**:
1. Cliquer sur "Bloquer une IP"
2. IP: `10.0.0.50`
3. Raison: "Activité suspecte détectée"
4. Durée: 24 heures
5. Valider

L'IP est immédiatement bloquée et une alerte est créée.

### Détecter des anomalies

Le système détecte automatiquement:

**Brute Force (5+ échecs login en 5 min)**
```bash
# Simuler des échecs
curl -X POST /api/auth/login -d '{"email":"test@test.com","password":"wrong"}' --repeat 10

# Résultat: IP auto-bloquée + incident créé
```

**Rate Limit (100+ requêtes/min)**
```bash
# Tester le rate limit
ab -n 200 -c 10 https://votre-api/

# Résultat: Alerte créée + rate limit appliqué
```

## 📊 Dashboard - Aperçu des KPIs

Le dashboard affiche en temps réel:

| Métrique | Description | Seuil d'alerte |
|----------|-------------|----------------|
| **Incidents Ouverts** | Incidents non résolus | > 5 |
| **Incidents 24h** | Nouveaux incidents | > 10 |
| **Alertes en Attente** | Alertes non reconnues | > 20 |
| **IPs Bloquées** | Blocages actifs | > 50 |
| **MTTR** | Temps moyen de réponse | > 30 min |
| **Incidents Critiques** | Nécessitent action | > 0 |

## 🚨 Scénarios de réponse

### Scénario 1: Attaque Brute Force

**Détection:**
```
🚨 5 tentatives de login échouées en 2 minutes
IP: 203.0.113.50
```

**Réponse automatique:**
1. ✅ IP bloquée (2h)
2. ✅ Incident créé (type: brute_force, severity: high)
3. ✅ Alerte envoyée
4. ✅ Log audit créé

**Actions manuelles:**
1. Vérifier l'origine de l'IP (whois)
2. Prolonger le blocage si nécessaire
3. Vérifier si d'autres comptes sont touchés
4. Résoudre l'incident

### Scénario 2: Suspicion d'exfiltration

**Détection:**
```
⚠️ Accès à un honeytoken détecté
User: user_abc123
Token: token_xyz789
```

**Réponse manuelle:**
1. Créer un incident (type: data_exfil, severity: critical)
2. Isoler le compte utilisateur
3. Créer un snapshot forensique
4. Analyser les logs d'accès
5. Bloquer les IPs suspectes
6. Contenir puis résoudre l'incident

### Scénario 3: Clé compromise

**Détection:**
```
🔑 Clé API utilisée depuis une IP anormale
Key: api_key_production
IP: 198.51.100.20
```

**Réponse:**
1. Créer un incident (type: key_compromise, severity: critical)
2. Marquer la clé comme compromise
3. Déclencher la rotation automatique
4. Mettre à jour tous les services
5. Vérifier les accès non autorisés
6. Documenter et résoudre

## 🔐 Accès et permissions

### Rôles autorisés

Seuls ces rôles peuvent accéder au Security Operations Center:
- `admin` - Accès complet
- `pdg` - Accès complet
- `security_officer` - Accès complet

### Permissions par action

| Action | Admin | PDG | Security Officer |
|--------|-------|-----|------------------|
| Voir incidents | ✅ | ✅ | ✅ |
| Créer incidents | ✅ | ✅ | ✅ |
| Contenir incidents | ✅ | ✅ | ✅ |
| Résoudre incidents | ✅ | ✅ | ✅ |
| Bloquer IPs | ✅ | ✅ | ✅ |
| Voir logs audit | ✅ | ✅ | ✅ |
| Gérer playbooks | ✅ | ✅ | ❌ |

## 🛠️ Configuration avancée

### Variables d'environnement

```bash
# .env
DATABASE_URL=postgresql://...
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_SERVICE_ROLE_KEY=...
```

### Notifications

Pour activer les notifications externes:
```typescript
// Dans useSecurityOps.ts
const sendNotification = async (incident) => {
  // Slack
  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({ text: `🚨 ${incident.title}` })
  });
  
  // Email
  await supabase.functions.invoke('send-email', {
    body: { to: 'security@company.com', subject: incident.title }
  });
};
```

## 📞 Support

**Urgences sécurité:**
- Dashboard: `/pdg` → Onglet "Sécurité"
- Email: security@224solution.net
- Téléphone: +224 XXX XXX XXX

**Documentation complète:**
- Guide complet: `SECURITY_DEFENSE_SYSTEM_GUIDE.md`
- Architecture: `sql/security_defense_system.sql`
- Tests: `scripts/test-security-system.mjs`

---

✅ **Système opérationnel et prêt pour production**
