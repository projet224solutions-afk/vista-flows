
# Plan d'intégration - Animation Spline 3D (Globe) en arrière-plan

## Objectif
Intégrer l'animation 3D du globe terrestre Spline en arrière-plan de la section Hero de la page d'accueil, créant un effet visuel immersif et moderne.

## Approche technique

### Option choisie : Package React officiel `@splinetool/react-spline`

Cette approche est recommandée car :
- Intégration native avec React (meilleure compatibilité)
- Support du lazy loading pour optimiser les performances
- API propre avec gestion des événements

### URL de la scène Spline
```
https://prod.spline.design/h5xspcRA7yF54Tzy/scene.splinecode
```

---

## Étapes d'implémentation

### 1. Installation du package

Ajouter la dépendance `@splinetool/react-spline` au projet.

### 2. Création d'un composant SplineBackground

Créer un nouveau composant dédié `SplineBackground.tsx` dans `src/components/home/` :

- Utiliser `React.lazy()` pour charger Spline de manière asynchrone
- Envelopper dans `Suspense` avec un fallback élégant (gradient animé)
- Positionner en `absolute` avec `z-index: 0` pour rester derrière le contenu
- Ajouter un overlay semi-transparent pour garantir la lisibilité du texte

```text
┌─────────────────────────────────────┐
│  SplineBackground (position: abs)   │
│  ┌─────────────────────────────────┐│
│  │    Globe 3D Spline              ││
│  │    (opacity: 0.3-0.5)           ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │    Overlay gradient             ││
│  │    (pour lisibilité texte)      ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 3. Modification de HeroSection.tsx

- Importer le nouveau composant `SplineBackground`
- Ajouter `position: relative` et `overflow: hidden` à la section
- Placer `SplineBackground` comme premier enfant
- S'assurer que le contenu existant a un `z-index` supérieur

### 4. Optimisations de performance

- **Lazy loading** : Charger Spline seulement après le rendu initial
- **Préchargement différé** : Utiliser `setTimeout` pour déclencher le chargement après 2-3 secondes
- **Fallback gracieux** : Afficher un gradient animé pendant le chargement
- **Mobile** : Réduire l'opacité ou désactiver sur les appareils à faibles ressources

---

## Structure des fichiers modifiés

| Fichier | Action |
|---------|--------|
| `package.json` | Ajouter `@splinetool/react-spline` |
| `src/components/home/SplineBackground.tsx` | **Créer** - Composant wrapper Spline |
| `src/components/home/HeroSection.tsx` | Modifier - Intégrer SplineBackground |
| `src/components/home/index.ts` | Modifier - Exporter SplineBackground |

---

## Détails techniques

### SplineBackground.tsx

```text
Composant React avec :
├── React.lazy() pour import dynamique
├── Suspense avec fallback gradient
├── Container en position absolute, inset-0
├── Spline viewer avec scène URL
├── Overlay dégradé pour lisibilité
└── Contrôle d'opacité responsive
```

### Styles appliqués

- **Container** : `absolute inset-0 z-0 overflow-hidden`
- **Spline** : `w-full h-full opacity-30 sm:opacity-40`
- **Overlay** : `absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background`

### Fallback pendant chargement

Un dégradé animé avec effet de pulsation pour indiquer le chargement sans être intrusif.

---

## Résultat attendu

La page d'accueil affichera :
1. Le globe 3D interactif en arrière-plan (légèrement transparent)
2. Un overlay dégradé garantissant la lisibilité du texte
3. Tout le contenu existant (badge, titre, boutons, services) reste parfaitement visible et cliquable
4. Animation fluide sans impact sur les performances grâce au lazy loading
