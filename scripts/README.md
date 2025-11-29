# Scripts E2E — instructions

Ce répertoire contient un script E2E (`e2e_test_wallet_communication.js`) destiné à tester la création/retour d'un `wallet` via la RPC `rpc_create_user_wallet` et un flux de message entre deux utilisateurs existants.

Important — sécurité
- Le script utilise la `SUPABASE_SERVICE_ROLE_KEY`. N'exécutez ce script que depuis un environnement sécurisé (poste local ou serveur de staging), jamais dans le navigateur.

Variables d'environnement possibles
- `SUPABASE_URL` : l'URL de votre instance Supabase (ex: `https://xxxx.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY` : la clé service role (nécessaire pour `auth.admin` et exécution de RPC sécurisée).
- `TEST_USER_ID` et `TEST_OTHER_USER_ID` : UUID des deux utilisateurs existants à utiliser pour le test (préféré).
- `TEST_USER_EMAIL` et `TEST_OTHER_USER_EMAIL` : alternative — emails des utilisateurs existants (le script les recherche parmi les users listés).

Commandes PowerShell (exemples)

1) Définir les variables d'environnement (PowerShell) :

```powershell
$env:SUPABASE_URL = 'https://uakkxaibujzxdiqzpnpr.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = 'service_role_xxx'
# Option A — utiliser des IDs existants
$env:TEST_USER_ID = 'uuid-of-existing-user-1'
$env:TEST_OTHER_USER_ID = 'uuid-of-existing-user-2'
# Option B — ou utiliser des emails existants
$env:TEST_USER_EMAIL = 'alice@example.com'
$env:TEST_OTHER_USER_EMAIL = 'bob@example.com'
```

2) Installer les dépendances (si besoin) :

```powershell
npm install
```

3) Lancer le script E2E :

```powershell
npm run e2e:wallet
```

Appliquer la migration RPC
- Si vous préférez appliquer la migration SQL depuis le dépôt, utilisez le script `apply-wallet-fix.js` (ou exécutez manuellement le fichier `supabase/migrations/20251129_fix_wallet_creation.sql` via l'éditeur SQL Supabase). Exemple PowerShell :

```powershell
$env:SUPABASE_URL = 'https://uakkxaibujzxdiqzpnpr.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = 'service_role_xxx'
node apply-wallet-fix.js
```

Notes finales
- Si le RPC `rpc_create_user_wallet` n'existe pas sur votre instance, l'appel RPC échouera. Appliquez la migration avant de lancer le test.
- Après tests, supprimez les données de test si nécessaire (utilisateurs/messages créés). Le script actuel ne crée pas d'utilisateurs — il utilise des utilisateurs existants — sauf si vous modifiez le script pour créer des comptes.

Si vous voulez, je peux :
- A) vous guider pas-à-pas pour exécuter `node apply-wallet-fix.js` depuis votre PowerShell, ou
- B) lancer la migration ici si vous fournissez la `SUPABASE_SERVICE_ROLE_KEY` via un moyen sûr, ou
- C) vous fournir une checklist de validation post-migration.
