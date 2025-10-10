# 224Solutions - Agent System (React + TypeScript + Supabase)

## Prérequis
- Node.js 18+
- Compte Supabase (URL + clé anon)

## Installation
```
npm install
npm run dev
```

## Configuration
Créer un fichier `.env` à la racine:
```
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Le client utilisé par défaut est défini dans `src/integrations/supabase/client.ts`. Vous pouvez le régénérer ou le surcharger via `src/lib/supabaseClient.ts`.

## Schéma SQL (exemple)
Voir `sql/agent-system-schema.sql`. Copiez/collez dans Supabase SQL editor, exécutez.

Tables:
- `users(id, name, email, role, parent_id, created_at)`
- `pdg_management(id, user_id, name, email, phone, permissions, is_active)`
- `agents_management(id, pdg_id, agent_code, name, email, phone, permissions, can_create_sub_agent, is_active)`
- `transactions(id, user_id, amount, created_at)`
- `commissions(id, agent_id, user_id, amount, status, created_at)`

## Démarrage rapide
- Ouvrez `http://localhost:8080/agent-system` pour accéder à l'interface.
- Créez un PDG, puis des agents, puis des utilisateurs.
- Enregistrez une transaction pour voir les commissions se calculer (logique à compléter selon vos règles).

## Structure
- `src/pages/AgentSystem.tsx`: interface principale (onglets)
- `src/hooks/useAgentSystem.ts`: hooks métiers (PDG, agents, commissions)
- `src/services/agentService.ts`: appels Supabase
- `src/types/agent-system.ts`: types partagés


