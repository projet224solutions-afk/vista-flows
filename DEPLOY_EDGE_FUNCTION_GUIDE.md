# 🚀 Guide de Déploiement Edge Function create-sub-agent

## Problème
La fonction Edge `create-sub-agent` a été mise à jour localement mais n'est pas déployée sur Supabase. L'erreur "Edge Function returned a non-2xx status code" indique que la fonction retourne une erreur.

## Solution: Déployer la fonction mise à jour

### Option 1: Via Supabase CLI (Recommandé)

1. **Installer Supabase CLI** (si pas déjà installé)
```powershell
npm install -g supabase
```

2. **Se connecter à Supabase**
```powershell
supabase login
```

3. **Lier votre projet** (remplacer `YOUR_PROJECT_REF`)
```powershell
supabase link --project-ref YOUR_PROJECT_REF
```

4. **Déployer la fonction**
```powershell
supabase functions deploy create-sub-agent
```

### Option 2: Via Dashboard Supabase (Manuel)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet **224Solutions**
3. Cliquez sur **Edge Functions** dans le menu latéral
4. Trouvez ou créez la fonction `create-sub-agent`
5. Cliquez sur **Edit** ou **Create Function**
6. Copiez tout le contenu de `d:\224Solutions\supabase\functions\create-sub-agent\index.ts`
7. Collez dans l'éditeur du dashboard
8. Cliquez sur **Deploy**

### Option 3: Script PowerShell automatique

```powershell
.\deploy-edge-function.ps1 create-sub-agent
```

## Changements importants dans la fonction

La fonction `create-sub-agent` a été mise à jour avec:

1. ✅ **Validation 8 caractères** - Mot de passe minimum 8 caractères (était 6)
2. ✅ **Bcrypt hashing** - Hash sécurisé du mot de passe avant stockage
3. ✅ **Security Headers** - Headers de sécurité complets (CSP, HSTS, etc.)
4. ✅ **Table agents** - Insertion dans la table `agents` pour auth MFA
5. ✅ **Wallet création** - Création automatique du wallet général
6. ✅ **Gestion d'erreurs** - Rollback complet en cas d'erreur

## Vérification du déploiement

Après déploiement, testez la création d'un sous-agent:

1. Connectez-vous en tant qu'agent
2. Allez dans **Sous-Agents**
3. Cliquez sur **Créer un Sous-Agent**
4. Remplissez le formulaire avec un mot de passe de 8+ caractères
5. Vérifiez les logs de la console du navigateur (F12)

## Dépannage

### Si l'erreur persiste:

1. **Vérifier les logs Edge Function**
   - Dashboard Supabase → Edge Functions → create-sub-agent → Logs

2. **Vérifier les variables d'environnement**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **Vérifier les permissions**
   - L'agent doit avoir `can_create_sub_agent = true`
   - L'agent doit être actif (`is_active = true`)

4. **Vérifier la console navigateur**
   ```javascript
   // Les logs détaillés s'afficheront:
   📤 Création sous-agent via edge function: {...}
   📥 Réponse Edge Function: {...}
   ```

## Support

Si le problème persiste après déploiement, vérifiez:
- Les logs dans la console du navigateur (F12)
- Les logs de la fonction Edge dans le dashboard Supabase
- Que toutes les tables existent (agents, agents_management, wallets)
