# 🔍 Guide de Débogage: "Edge Function returned a non-2xx status code"

## 📋 Comment Déboguer

### Étape 1: Ouvrir la Console du Navigateur
1. Appuyez sur **F12** (ou Ctrl+Shift+I)
2. Allez dans l'onglet **Console**
3. Effacez les anciens logs (icône 🚫 ou Ctrl+L)

### Étape 2: Tenter de Créer un Utilisateur
1. Remplissez le formulaire
2. Cliquez sur **Créer**
3. Observez les logs dans la console

## 📊 Logs à Surveiller

### ✅ Logs Normaux (Succès)

```javascript
✅ [useAgentActions] Session active: {
  userId: "xxxx-xxxx-xxxx",
  email: "agent@example.com"
}

🔄 [CreateUserForm] Tentative création utilisateur: {
  agentId: "...",
  agentCode: "AGT00001",
  role: "client",
  email: "client@test.com",
  hasAccessToken: false
}

[useAgentActions] Appel edge function avec: {...}

[useAgentActions] Réponse edge function: {
  data: { success: true, user: {...} },
  error: null,
  hasError: false,
  hasData: true
}

📥 [CreateUserForm] Résultat: { success: true }

✅ Utilisateur créé avec succès!
```

### ❌ Logs d'Erreur (À Analyser)

#### Erreur 401: Non Autorisé
```javascript
❌ [useAgentActions] Edge function error complet: {
  message: "Edge Function returned a non-2xx status code: 401",
  ...
}

📍 Status Code: 401

❌ Non autorisé. Vérifiez vos permissions (Code: 401)
```

**Cause:** Token JWT manquant ou invalide
**Solution:** 
- Se déconnecter puis se reconnecter
- Vérifier que vous êtes bien connecté

#### Erreur 403: Permissions Insuffisantes
```javascript
📍 Status Code: 403

❌ Permissions insuffisantes pour créer des utilisateurs (Code: 403)
```

**Cause:** L'agent n'a pas la permission `create_users`
**Solution:**
1. Aller dans **Paramètres** → **Diagnostic des Permissions**
2. Vérifier si `create_users` est dans les permissions
3. Contacter le PDG pour ajouter la permission

**SQL pour le PDG:**
```sql
UPDATE agents_management 
SET permissions = array_append(permissions, 'create_users')
WHERE id = 'VOTRE_AGENT_ID';
```

#### Erreur 400: Données Invalides
```javascript
📍 Status Code: 400

❌ Données invalides: ...
```

**Cause:** Formulaire mal rempli
**Solution:** Vérifier:
- Email valide (format: xxx@xxx.com)
- Téléphone valide (format: +224...)
- Tous les champs obligatoires remplis

#### Erreur 500: Erreur Serveur
```javascript
📍 Status Code: 500

❌ Erreur serveur (Code: 500). Contactez le support.
```

**Cause:** Problème côté serveur
**Solution:**
- Vérifier que l'Edge Function est déployée
- Vérifier les logs Supabase
- Contacter le support technique

#### Pas de Session
```javascript
❌ [useAgentActions] Pas de session active: {...}

🔒 Session expirée. Veuillez vous reconnecter.
```

**Cause:** Session expirée ou utilisateur déconnecté
**Solution:** Se reconnecter

## 🎯 Checklist de Vérification

Avant de contacter le support, vérifiez:

- [ ] **Console ouverte** (F12) et logs visibles
- [ ] **Code de statut HTTP** identifié (401, 403, 400, 500)
- [ ] **Session active** - Log `✅ Session active` visible
- [ ] **Permissions vérifiées** - Onglet Paramètres → Diagnostic
- [ ] **Formulaire valide** - Tous les champs obligatoires remplis
- [ ] **Email unique** - Pas déjà utilisé par un autre utilisateur
- [ ] **Reconnexion testée** - Déconnexion → Reconnexion

## 🔧 Actions Correctives par Code

| Code | Erreur | Action Immédiate |
|------|--------|------------------|
| 401 | Non autorisé | Se reconnecter |
| 403 | Permissions | Contacter PDG |
| 400 | Données invalides | Vérifier formulaire |
| 500 | Erreur serveur | Contacter support |

## 📝 Informations à Fournir au Support

Si le problème persiste, fournir:

1. **Code de statut HTTP** (ex: 401, 403)
2. **Copie des logs console** (screenshot ou texte)
3. **Email de l'agent** 
4. **Rôle de l'utilisateur** à créer (client, vendeur, etc.)
5. **Résultat du diagnostic** (onglet Paramètres)

Exemple de rapport:
```
Code: 403
Agent: agent@example.com
Tentative: Créer un client
Logs: [copier les logs de la console]
Diagnostic: Permission create_users manquante
```

## 🚀 Tests Rapides

### Test 1: Vérifier la Session
```javascript
// Dans la console navigateur
supabase.auth.getSession().then(({data}) => console.log(data))
```

**Résultat attendu:**
```javascript
{
  session: {
    user: { id: "...", email: "..." },
    access_token: "..."
  }
}
```

### Test 2: Vérifier les Permissions
```javascript
// Dans la console navigateur
supabase.from('agents_management')
  .select('permissions, is_active')
  .eq('user_id', 'VOTRE_USER_ID')
  .single()
  .then(({data}) => console.log(data))
```

**Résultat attendu:**
```javascript
{
  permissions: ["create_users", ...],
  is_active: true
}
```

## 💡 Astuces

### Activer les Logs Réseau
1. F12 → Onglet **Network** (Réseau)
2. Filtrer: `create-user-by-agent`
3. Tenter de créer un utilisateur
4. Cliquer sur la requête
5. Voir **Response** pour le détail de l'erreur

### Vider le Cache
Si les erreurs persistent:
1. F12 → Onglet **Application**
2. **Storage** → **Clear site data**
3. Recharger la page (F5)
4. Se reconnecter

## 📞 Support

Si aucune solution ne fonctionne:
- Ouvrir un ticket avec tous les logs
- Inclure screenshot de la console
- Inclure résultat du diagnostic (onglet Paramètres)

---

**Version:** 2025-12-03
**Commit:** eeb5baa
**Status:** Logs améliorés avec codes HTTP
