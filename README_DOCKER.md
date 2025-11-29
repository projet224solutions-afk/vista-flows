**Exécuter la migration dans un conteneur Docker**

- But : builder et exécuter un conteneur qui lance `apply-wallet-fix.js` en utilisant les variables d'environnement `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.

Pré-requis : Docker installé sur la machine.

1) Construire l'image Docker :

```powershell
docker build -t vista-flows-wallet-fix .
```

2) Lancer le conteneur en injectant la clé (exemples PowerShell) :

```powershell
# si vous avez défini la clé dans la session PowerShell
docker run --rm -e SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY" -e SUPABASE_URL="$env:SUPABASE_URL" vista-flows-wallet-fix:latest

# ou en utilisant le fichier .env (attention aux valeurs dans le dépôt)
docker-compose up --build --abort-on-container-exit
```

Remarques de sécurité :
- Évitez d'emballer la `service_role` dans l'image ou de la committer dans le dépôt.
- Préférez définir la variable en session ou via un secret Docker.

Si vous voulez, je peux builder et lancer le conteneur maintenant (je tenterai d'utiliser la variable `SUPABASE_SERVICE_ROLE_KEY` de la session). Si la clé est invalide, le conteneur échouera et affichera l'erreur Supabase.