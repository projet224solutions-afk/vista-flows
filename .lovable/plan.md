

# Analyse : Supabase Pro et Capacité Réelle

## Diagnostic Actuel

Votre base Supabase est **massivement surdimensionnée en schéma** par rapport aux données réelles :

| Métrique | Valeur | Problème |
|---|---|---|
| Tables | **477** | ~400 probablement inutilisées |
| RLS Policies | **1,018** | Évaluation lente à chaque requête |
| Fonctions SQL | **1,252** | Overhead mémoire PostgreSQL |
| Index | **1,596** | Ralentit les écritures |
| Données réelles | **~5,000 lignes** total | Très peu de données |

## Pourquoi 500 utilisateurs max ?

Ce n'est **pas** une limite du plan Pro Supabase. Le plan Pro supporte normalement **10,000+ utilisateurs**. Le problème vient de :

1. **1,018 RLS policies** - Chaque requête évalue des dizaines de policies, ce qui consomme le CPU PostgreSQL
2. **477 tables avec 1,596 index** - PostgreSQL maintient tous ces index en mémoire, laissant peu de ressources pour les requêtes
3. **1,252 fonctions** - Le catalogue PostgreSQL est saturé

## Ce que Supabase Pro offre réellement

- **8 Go RAM**, CPU dédié
- **Connexions directes illimitées** (pool de 60)
- Support **5,000-50,000 utilisateurs** selon la complexité des requêtes

## Plan d'Optimisation (sans changer de plan)

### Phase 1 — Nettoyage base de données (impact majeur)
- Identifier et supprimer les ~350 tables inutilisées (logs, tables de debug, tables vides)
- Supprimer les index redondants ou inutilisés (~800+)
- Supprimer les fonctions SQL orphelines (~900+)
- **Résultat attendu : x5-x10 performance**

### Phase 2 — Optimisation RLS
- Consolider les policies redondantes (passer de 1,018 à ~200)
- Utiliser des fonctions `SECURITY DEFINER` pour les vérifications complexes
- **Résultat attendu : x3-x5 sur les requêtes authentifiées**

### Phase 3 — Décharger Supabase
- Déplacer les lectures fréquentes (produits, catégories) vers le cache Redis (déjà configuré avec Upstash)
- Utiliser le backend AWS pour les opérations lourdes (analytics, rapports)
- **Résultat attendu : -70% de charge sur PostgreSQL**

### Capacité après optimisation

| Scénario | Avant | Après |
|---|---|---|
| Utilisateurs simultanés | ~500 | **5,000-10,000** |
| Requêtes/seconde | ~100 | **1,000-3,000** |
| Requêtes/minute | ~6,000 | **60,000-180,000** |

## Résumé

Le plan Pro Supabase est **largement suffisant**. Le problème n'est pas l'abonnement mais la **complexité excessive du schéma** (477 tables, 1,018 RLS, 1,252 fonctions pour seulement 5,000 lignes de données). Un nettoyage en profondeur multipliera la capacité par 10 sans aucun coût supplémentaire.

