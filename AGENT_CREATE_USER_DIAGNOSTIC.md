# 🔧 Diagnostic: Agent ne peut pas créer d'utilisateurs

## ❌ Erreur Rencontrée
```
Edge Function returned a non-2xx status code
```

## 🎯 Solution Rapide

### Étape 1: Ouvrir le Diagnostic
1. Connectez-vous en tant qu'**Agent**
2. Allez dans **Dashboard Agent**
3. Cliquez sur l'onglet **Paramètres**
4. Le composant **Diagnostic des Permissions** s'affiche automatiquement

### Étape 2: Analyser les Résultats

Le diagnostic vérifie automatiquement:
- ✅ **Session Utilisateur** - Vous êtes bien connecté?
- ✅ **Profil Agent** - Votre compte agent existe?
- ✅ **Permission create_users** - Vous avez la permission?
- ✅ **Créer des agents** - can_create_sub_agent activé?
- ✅ **Statut Agent** - Votre compte est actif?

### Étape 3: Résoudre les Problèmes

#### 🔴 Erreur: "Permission manquante: create_users"

**Cause:** Votre agent n'a pas la permission de créer des utilisateurs.

**Solution:**
1. Contactez votre **PDG**
2. Demandez l'ajout de la permission `create_users`
3. Le PDG doit aller dans la gestion des agents
4. Modifier votre profil et cocher `create_users`

**Alternative SQL (pour le PDG):**
```sql
-- Ajouter permission create_users à un agent
UPDATE agents_management 
SET permissions = array_append(permissions, 'create_users')
WHERE email = 'agent@example.com';
```

#### 🔴 Erreur: "Agent désactivé"

**Solution:**
```sql
-- Réactiver l'agent
UPDATE agents_management 
SET is_active = true
WHERE email = 'agent@example.com';
```

#### 🔴 Erreur: "Session expirée"

**Solution:**
1. Déconnexion
2. Reconnexion
3. Réessayer

#### 🟡 Avertissement: "Ne peut pas créer de sous-agents"

**Solution:**
```sql
-- Activer création sous-agents
UPDATE agents_management 
SET can_create_sub_agent = true
WHERE email = 'agent@example.com';
```

## 🔍 Logs Détaillés

Les logs améliorés affichent maintenant:

```javascript
// Dans la console navigateur (F12)
[useAgentActions] Appel edge function avec: {
  agentId: "...",
  agentCode: "AGT00001",
  role: "client",
  email: "client@test.com"
}

[useAgentActions] Réponse edge function: {
  data: {...},
  error: {...}
}
```

### Codes d'Erreur Spécifiques

| Code | Signification | Solution |
|------|---------------|----------|
| `UNAUTHORIZED` | Token JWT manquant | Reconnexion |
| `UNAUTHENTICATED` | Session invalide | Reconnexion |
| `INSUFFICIENT_PERMISSIONS` | Permissions manquantes | Contacter PDG |
| `VALIDATION_ERROR` | Données invalides | Vérifier formulaire |
| `EMAIL_EXISTS` | Email déjà utilisé | Choisir autre email |
| `CANNOT_CREATE_AGENTS` | Pas autorisé pour agents | Activer can_create_sub_agent |

## 🧪 Test Manuel

Pour tester si tout fonctionne:

1. Ouvrir l'onglet **Vue d'ensemble**
2. Cliquer sur **Créer un utilisateur**
3. Remplir le formulaire:
   - Prénom: Test
   - Email: test@example.com
   - Téléphone: +224600000000
   - Rôle: Client
4. Soumettre

**Résultat attendu:**
```
✅ Utilisateur client créé avec succès!
```

**Si erreur:**
- Ouvrir la console (F12)
- Regarder les logs `[useAgentActions]`
- Noter le code d'erreur
- Consulter le tableau ci-dessus

## 🛠️ Pour les Développeurs

### Activer les Logs Détaillés

Les logs sont déjà activés dans `useAgentActions.ts`:

```typescript
console.log('[useAgentActions] Appel edge function avec:', {...});
console.log('[useAgentActions] Réponse edge function:', {data, error});
console.error('[useAgentActions] Edge function error complet:', error);
```

### Tester l'Edge Function Directement

```bash
# Avec curl
curl -X POST https://your-project.supabase.co/functions/v1/create-user-by-agent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "phone": "+224600000000",
    "role": "client",
    "agentId": "YOUR_AGENT_ID",
    "agentCode": "AGT00001"
  }'
```

### Vérifier les Permissions en SQL

```sql
-- Voir toutes les permissions d'un agent
SELECT 
  id, 
  name, 
  email, 
  permissions, 
  can_create_sub_agent,
  is_active
FROM agents_management
WHERE email = 'agent@example.com';
```

## 📊 Dashboard de Diagnostic

Le nouveau composant `AgentPermissionDiagnostic` affiche:

- ✅ **Résumé visuel** avec icônes (verte = OK, rouge = erreur)
- 📋 **Liste des vérifications** avec détails
- 🎯 **Permissions actuelles** avec badges
- 💡 **Solutions suggérées** en cas d'erreur
- 🔄 **Bouton rafraîchir** pour retester

## 🎯 Checklist Complète

Avant de créer un utilisateur, vérifier:

- [ ] Agent connecté et session valide
- [ ] Permission `create_users` présente
- [ ] Agent actif (is_active = true)
- [ ] Formulaire correctement rempli
- [ ] Email unique (pas déjà utilisé)
- [ ] Format email valide
- [ ] Téléphone valide (+224...)
- [ ] Rôle sélectionné

## 🚀 Prochaines Étapes

1. **Tester le diagnostic** dans l'onglet Paramètres
2. **Corriger les erreurs** identifiées
3. **Réessayer** la création d'utilisateur
4. **Contacter le support** si problème persiste

---

**Commit:** `04c1e3b` - Diagnostic permissions + logs améliorés
**Fichiers modifiés:**
- `src/hooks/useAgentActions.ts` (logs détaillés)
- `src/components/agent/AgentPermissionDiagnostic.tsx` (nouveau)
- `src/pages/AgentDashboard.tsx` (intégration diagnostic)
