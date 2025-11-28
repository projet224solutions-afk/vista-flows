# Architecture Contrats avec IA

## Vue d'ensemble

Le système de contrats intègre maintenant la génération automatique par IA (Lovable AI) pour les contrats de vente.

## Flux de génération automatique

### 1. Formulaire simplifié (3 champs)
Le vendeur entre seulement:
- Nom du client
- Téléphone du client
- Adresse du client

### 2. Génération par IA
L'Edge Function `generate-contract-with-ai` :
- Récupère les informations du vendeur/entreprise
- Génère un numéro de contrat unique
- Appelle Lovable AI (google/gemini-2.5-flash) pour générer:
  - Texte complet du contrat avec clauses légales
  - Conditions conformes au droit guinéen
  - Résumé automatique
- Stocke le contrat en statut "created" (brouillon)

### 3. Modification avant finalisation
Le composant `AIContractEditor` permet au vendeur de:
- Voir le contrat généré
- Modifier les informations client
- Modifier le texte du contrat
- Enregistrer les modifications
- Finaliser le contrat

### 4. Finalisation
Une fois finalisé (statut "finalized"):
- Le contrat ne peut plus être modifié
- Il peut être téléchargé en PDF
- Il peut être envoyé au client
- Il peut être archivé

## Composants

### Frontend
- `AIContractForm.tsx`: Formulaire simplifié 3 champs
- `AIContractEditor.tsx`: Interface de modification et finalisation
- `ContractForm.tsx`: Formulaire manuel (types existants)
- `ContractsList.tsx`: Liste de tous les contrats

### Backend
- `generate-contract-with-ai/index.ts`: Génération IA
- `create-contract/index.ts`: Création manuelle (existant)
- `generate-contract-pdf/index.ts`: Génération PDF (existant)

## Base de données

### Table `contracts`
Champs clés pour les contrats IA:
- `contract_type`: 'vente_ai'
- `status`: 'created' | 'finalized' | 'sent' | 'signed' | 'archived'
- `custom_fields`: JSON contenant:
  - `contract_number`: Numéro unique
  - `creation_date`: Date formatée
  - `summary`: Résumé automatique
  - `generated_by_ai`: true

## Extensibilité

### Ajouter de nouveaux types de contrats IA

1. Dans `CONTRACT_TYPES` de `ContractForm.tsx`, ajouter:
```typescript
{ 
  value: 'nouveau_type_ai', 
  label: '🤖 Nouveau type (IA)', 
  fields: [], 
  isAI: true 
}
```

2. Dans `generate-contract-with-ai/index.ts`, adapter le prompt système selon le type

3. Optionnellement créer un formulaire spécifique si besoin de champs différents

## Sécurité

- ✅ Authentification JWT requise
- ✅ Validation des données
- ✅ Gestion des erreurs API IA (429, 402)
- ✅ RLS policies sur la table contracts
- ✅ Clé API Lovable stockée en tant que secret Supabase

## Gestion des erreurs

### Erreurs IA courantes
- **429 (Rate Limit)**: Limite de requêtes atteinte
- **402 (Payment Required)**: Crédits épuisés
- **Timeout**: Génération trop longue

Toutes ces erreurs sont catchées et affichées à l'utilisateur avec des messages clairs.

## Performance

- Génération moyenne: 5-10 secondes
- Pas de streaming (contrat complet)
- Cache possible pour templates répétitifs (à implémenter si besoin)

## Notes

- Les contrats IA sont stockés de la même manière que les contrats manuels
- Un contrat peut être modifié jusqu'à sa finalisation
- Le système est compatible avec les 6 types de contrats existants
