# 🎨 GUIDE VISUEL - MODULE MÉTIER VENDEUR

## 📱 INTERFACE UTILISATEUR

### 1. VendorBusinessDashboard - Vue Desktop

```
┌───────────────────────────────────────────────────────────────────┐
│  🏪 Mon Restaurant Gourmand                     [🔄][➕ Nouveau]  │
│  Gérez vos ventes, produits et clients                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ 🛒 Commandes│ │ 📦 Produits │ │ 👥 Clients  │ │💰 Chiffre   ││
│  │             │ │             │ │             │ │  d'affaires ││
│  │     45      │ │     128     │ │     89      │ │ 15.250.000  ││
│  │             │ │             │ │             │ │     FG      ││
│  │ ⏰ 5 pending│ │ 120 actifs  │ │ +12 ce mois │ │ 2.5M ce mois││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                    │
├───────────────────────────────────────────────────────────────────┤
│  [📊 Vue d'ensemble] [🛍️ Commandes récentes] [📦 Top produits]   │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │ 💵 Résumé des ventes     │  │ 🛒 État des commandes        │  │
│  │                          │  │                              │  │
│  │ Total général            │  │ ┌─────────┬─────────┐       │  │
│  │ 15.250.000 FG            │  │ │  POS    │  Online │       │  │
│  │                          │  │ │   25    │   20    │       │  │
│  │ ┌──────┬──────┐          │  │ └─────────┴─────────┘       │  │
│  │ │ POS  │Online│          │  │                              │  │
│  │ │ 10M  │ 5.2M │          │  │ ⏰ En attente:               │  │
│  │ └──────┴──────┘          │  │    POS: 3  Web: 2           │  │
│  │                          │  │                              │  │
│  │ Aujourd'hui: 850K FG     │  │ 📦 En cours:                 │  │
│  │ Cette semaine: 3.2M FG   │  │    POS: 8  Web: 5           │  │
│  │ Ce mois: 15.2M FG        │  │                              │  │
│  └─────────────────────────┘  │ ✅ Livrées:                  │  │
│                                │    POS: 14  Web: 13          │  │
│                                └──────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

---

### 2. VendorBusinessDashboard - Onglet Commandes

```
┌───────────────────────────────────────────────────────────────────┐
│  [📊 Vue d'ensemble] [🛍️ Commandes récentes] [📦 Top produits]   │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Commandes récentes                            [Voir tout →]      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ #ORD-12345  [Delivered] [POS]         1.250.000 FG         │ │
│  │ Jean Dupont • Il y a 2 heures                               │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ #ORD-12344  [Pending] [Online]          850.000 FG         │ │
│  │ Marie Martin • Il y a 5 heures                              │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ #ORD-12343  [Confirmed] [POS]         2.100.000 FG         │ │
│  │ Ahmed Diallo • Il y a 1 jour                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

### 3. VendorBusinessDashboard - Onglet Top Produits

```
┌───────────────────────────────────────────────────────────────────┐
│  [📊 Vue d'ensemble] [🛍️ Commandes récentes] [📦 Top produits]   │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Produits les plus vendus                      [Voir tout →]      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 1️⃣  [IMG] Plat du jour                            856.000 FG│ │
│  │          45 vendus                                           │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ 2️⃣  [IMG] Menu familial                         1.240.000 FG│ │
│  │          32 vendus                                           │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ 3️⃣  [IMG] Boissons fraîches                      420.000 FG│ │
│  │          28 vendus                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

### 4. AddServiceModal - Étape 1 (Sélection)

```
┌───────────────────────────────────────────────────────┐
│  ➕ Nouveau service professionnel              [✕]    │
│  Choisissez le type de service que vous souhaitez    │
│  créer                                                │
├───────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │ 🏪 E-commerce    │  │ 🍽️ Restaurant    │          │
│  │ [Commerce]    →  │  │ [Restauration] → │          │
│  │ Vente en ligne   │  │ Service resto... │          │
│  └──────────────────┘  └──────────────────┘          │
│                                                        │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │ ✂️ Salon beauté  │  │ 🚗 VTC           │          │
│  │ [Services]    →  │  │ [Transport]   →  │          │
│  │ Coiffure, soin.. │  │ Transport voi... │          │
│  └──────────────────┘  └──────────────────┘          │
│                                                        │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │ ❤️ Santé         │  │ 📚 Éducation     │          │
│  │ [Santé]       →  │  │ [Formation]   →  │          │
│  │ Services médi... │  │ Cours et form... │          │
│  └──────────────────┘  └──────────────────┘          │
│                                                        │
│                      [Scroll ↓]                        │
└───────────────────────────────────────────────────────┘
```

---

### 5. AddServiceModal - Étape 2 (Configuration)

```
┌───────────────────────────────────────────────────────┐
│  ➕ Configurer votre service                   [✕]    │
│  Configurez votre Restaurant                          │
├───────────────────────────────────────────────────────┤
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ 🍽️ Restaurant      ✅                          │  │
│  │ Restauration                                   │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  Nom de l'entreprise *                                │
│  ┌────────────────────────────────────────────────┐  │
│  │ Ex: Mon Restaurant Gourmand                    │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  Description (optionnel)                              │
│  ┌────────────────────────────────────────────────┐  │
│  │ Décrivez votre activité...                     │  │
│  │                                                 │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  Adresse (optionnel)                                  │
│  ┌────────────────────────────────────────────────┐  │
│  │ Ex: Kaloum, Conakry, Guinée                    │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ ℹ️  Bon à savoir                               │  │
│  │ Vous pourrez personnaliser votre service avec  │  │
│  │ des produits, menus, et horaires après la      │  │
│  │ création.                                       │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  [← Retour]              [➕ Créer le service]        │
└───────────────────────────────────────────────────────┘
```

---

### 6. Vue Mobile - Dashboard

```
┌─────────────────────────┐
│ 🏪 Mon Restaurant       │
│ Gérez vos ventes        │
│              [🔄]       │
├─────────────────────────┤
│                         │
│ ┌──────────┬──────────┐│
│ │🛒 45     │📦 128    ││
│ │Commandes │Produits  ││
│ │⏰ 5 pend.│120 actifs││
│ └──────────┴──────────┘│
│                         │
│ ┌──────────┬──────────┐│
│ │👥 89     │💰 15.2M  ││
│ │Clients   │C.A.      ││
│ │+12 mois  │2.5M mois ││
│ └──────────┴──────────┘│
│                         │
├─────────────────────────┤
│ [Vue] [Cmd] [Produits] │
├─────────────────────────┤
│                         │
│ Résumé ventes           │
│ Total: 15.2M FG         │
│                         │
│ POS: 10M | Online: 5.2M │
│                         │
│          [+]            │ ← Bouton flottant
└─────────────────────────┘
```

---

## 🎨 PALETTE DE COULEURS

### Codes couleurs par source

```css
/* POS (Point of Sale - Magasin) */
Background:  bg-amber-50 dark:bg-amber-900/20
Border:      border-amber-200 dark:border-amber-800
Text:        text-amber-600 dark:text-amber-400
Badge:       text-amber-600 border-amber-300

/* Online (Ventes en ligne) */
Background:  bg-blue-50 dark:bg-blue-900/20
Border:      border-blue-200 dark:border-blue-800
Text:        text-blue-600 dark:text-blue-400
Badge:       text-blue-600 border-blue-300

/* Chiffre d'affaires (Mise en évidence) */
Gradient:    from-primary/10 via-primary/5 to-background
Border:      border-primary/20
Text:        text-primary

/* Statuts de commande */
Pending:     text-amber-500     (⏰)
Confirmed:   text-blue-500      (📦)
Delivered:   text-green-500     (✅)
Cancelled:   text-red-500       (❌)

/* Banners d'alerte */
Info:        bg-blue-50 border-blue-200
Warning:     bg-amber-50 border-amber-200
Error:       bg-red-50 border-red-200
Success:     bg-green-50 border-green-200
```

---

## 🔄 FLUX UTILISATEUR

### Workflow 1 : Nouveau vendeur

```
1. 📝 INSCRIPTION
   └─> Formulaire avec :
       - Email, Mot de passe
       - Nom, Prénom
       - Ville
       - Type de service (dropdown)
       - Nom d'entreprise
   
   └─> [S'inscrire] 
       ↓
2. ⚙️ CRÉATION AUTOMATIQUE
   └─> Système crée :
       - auth.users (compte)
       - profiles (role: 'vendeur')
       - vendors (business_name, service_type)
       - professional_services (si service_type sélectionné)
       ↓
3. ✅ REDIRECTION
   └─> Dashboard vendeur (/vendeur)
       ↓
4. 📊 PREMIER ACCÈS MODULE MÉTIER
   └─> Clic sur bouton "Module Métier"
       ↓
   └─> VendorServiceModule charge
       ↓
   └─> VendorBusinessDashboard s'affiche
       ↓
   └─> KPIs à 0 (normal pour nouveau compte)
       ↓
   └─> Banner d'onboarding :
       "Bienvenue ! Commencez par ajouter un produit"
```

---

### Workflow 2 : Créer un nouveau service

```
1. 🏪 DASHBOARD VENDEUR
   └─> Module Métier actif
       ↓
2. ➕ CLIC "NOUVEAU SERVICE"
   └─> AddServiceModal s'ouvre (Étape 1)
       ↓
3. 🔍 SÉLECTION TYPE
   └─> Grille de cartes avec tous les service_types
   └─> Ex: Sélectionne "🍽️ Restaurant"
       ↓
4. ⚙️ CONFIGURATION
   └─> Formulaire (Étape 2)
       - Nom entreprise: "Mon Restaurant Gourmand"
       - Description: "Cuisine traditionnelle guinéenne"
       - Adresse: "Kaloum, Conakry"
       ↓
5. ✅ CRÉATION
   └─> Validation formulaire
   └─> Insertion dans professional_services
   └─> Toast: "Service créé avec succès !"
       ↓
6. 🔄 REDIRECTION
   └─> Retour au dashboard
   └─> Nouveau service visible
```

---

### Workflow 3 : Consultation des stats

```
1. 📊 VUE D'ENSEMBLE
   └─> KPIs en haut
       - Commandes (cliquable → /vendeur/orders)
       - Produits (cliquable → /vendeur/products)
       - Clients (non cliquable)
       - Chiffre d'affaires (mis en évidence)
   
   └─> Tab "Vue d'ensemble" active
       ├─> Résumé ventes (Total, POS, Online, périodes)
       └─> État commandes (par statut + POS/Online)
       ↓
2. 🛍️ COMMANDES RÉCENTES
   └─> Tab "Commandes récentes"
       └─> Liste des 5 dernières commandes
           - Numéro commande
           - Badges (statut + source)
           - Client et date
           - Montant
       └─> [Voir tout] → /vendeur/orders
       ↓
3. 📦 TOP PRODUITS
   └─> Tab "Top produits"
       └─> Classement des 5 meilleurs
           - Rang (1, 2, 3...)
           - Image produit
           - Nom + nb vendus
           - Revenu généré
       └─> [Voir tout] → /vendeur/products
```

---

## 📱 RESPONSIVE BREAKPOINTS

```css
/* Mobile First */
Mobile (< 768px):
  - Grid 2 colonnes pour KPIs
  - Texte réduit (text-xs, text-sm)
  - Icônes cachées dans les tabs
  - Bouton flottant "+" pour nouveau service
  - Navigation en bas de page

/* Tablet (768px - 1024px) */
Tablet:
  - Grid 2 colonnes KPIs (ou 4 si large)
  - Texte normal
  - Icônes visibles

/* Desktop (> 1024px) */
Desktop:
  - Grid 4 colonnes KPIs
  - Texte complet
  - Tous les labels visibles
  - Bouton "Nouveau service" dans header
  - Colonnes pour résumé ventes / état commandes
```

---

## 🎬 ANIMATIONS ET TRANSITIONS

```css
/* KPI Cards */
hover:shadow-md transition-shadow
hover:border-l-primary
cursor-pointer

/* Commandes récentes */
hover:bg-muted/50 transition-colors

/* Boutons */
hover:scale-105 transition-transform

/* Modals */
animate-in slide-in-from-bottom
fade-in duration-200

/* Loading */
animate-spin (icône RefreshCw)
animate-pulse (skeleton loaders)

/* Alerts/Banners */
slide-in-from-top
fade-in
```

---

## 🖼️ COMPOSANTS UI UTILISÉS (shadcn/ui)

```typescript
// Layout
Card, CardHeader, CardTitle, CardContent, CardDescription

// Navigation
Tabs, TabsList, TabsTrigger, TabsContent

// Forms
Input, Label, Textarea, Select

// Feedback
Button, Badge, Alert, AlertTitle, AlertDescription
Skeleton, ScrollArea

// Modals
Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription

// Icons (lucide-react)
ShoppingCart, Package, Users, TrendingUp, RefreshCw
Clock, CheckCircle, XCircle, DollarSign, BarChart3
ShoppingBag, Plus, Store, Briefcase, ArrowUpRight
```

---

## 📐 STRUCTURE GRID

### Desktop Layout (1440px)

```
┌──────────────────────────────────────────────────────┐
│ Header (full width)                                  │
├──────────────────────────────────────────────────────┤
│ ┌───────┬───────┬───────┬───────┐                   │
│ │  KPI  │  KPI  │  KPI  │  KPI  │  (grid-cols-4)    │
│ └───────┴───────┴───────┴───────┘                   │
├──────────────────────────────────────────────────────┤
│ Tabs (full width)                                    │
├──────────────────────────────────────────────────────┤
│ ┌─────────────────────┬──────────────────────┐      │
│ │  Résumé ventes      │  État commandes      │      │
│ │                     │                      │      │
│ │  (lg:col-span-1)    │  (lg:col-span-1)     │      │
│ └─────────────────────┴──────────────────────┘      │
└──────────────────────────────────────────────────────┘
```

### Mobile Layout (375px)

```
┌──────────────────────┐
│ Header               │
├──────────────────────┤
│ ┌─────────┬─────────┐│
│ │  KPI    │  KPI    ││
│ └─────────┴─────────┘│
│ ┌─────────┬─────────┐│
│ │  KPI    │  KPI    ││
│ └─────────┴─────────┘│
├──────────────────────┤
│ Tabs                 │
├──────────────────────┤
│ ┌──────────────────┐ │
│ │ Résumé ventes    │ │
│ │                  │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ État commandes   │ │
│ │                  │ │
│ └──────────────────┘ │
│                      │
│        [+]           │← Bouton flottant
└──────────────────────┘
```

---

## 🎯 RÈGLES UX

### 1. Feedback immédiat
- ✅ Toast à chaque action (succès/erreur)
- ✅ Loading states (skeletons) pendant chargement
- ✅ Animations de transition entre états

### 2. Navigation intuitive
- ✅ KPIs cliquables → pages détaillées
- ✅ Breadcrumbs pour situer l'utilisateur
- ✅ Boutons "Voir tout" pour accès rapide

### 3. Hiérarchie visuelle
- ✅ Chiffre d'affaires mis en évidence (gradient)
- ✅ Badges de couleur par source (POS/Online)
- ✅ Icons pour reconnaissance rapide

### 4. Progressive disclosure
- ✅ Tabs pour organiser l'information
- ✅ Top 5 seulement, "Voir tout" pour le reste
- ✅ Détails au clic, pas tout d'un coup

### 5. États vides
- ✅ Messages d'onboarding
- ✅ Icons illustratives
- ✅ Actions suggérées (CTAs)

---

## 🔍 ACCESSIBILITÉ

```html
<!-- Labels explicites -->
<Label htmlFor="business-name">Nom de l'entreprise *</Label>
<Input id="business-name" />

<!-- États ARIA -->
<Button aria-busy={loading}>Créer</Button>

<!-- Couleurs avec contraste suffisant -->
text-foreground (noir/blanc selon thème)
bg-muted (gris avec bon contraste)

<!-- Navigation clavier -->
TabIndex sur éléments interactifs
Focus visible (outline-primary)

<!-- Screen readers -->
<span className="sr-only">Chargement...</span>
```

---

## 📊 MÉTRIQUES DE PERFORMANCE

### Objectifs

```
First Contentful Paint (FCP):    < 1.5s
Largest Contentful Paint (LCP):  < 2.5s
Time to Interactive (TTI):       < 3.5s
Cumulative Layout Shift (CLS):   < 0.1
```

### Optimisations en place

- ✅ Lazy loading des composants lourds
- ✅ Memoization (React.memo) sur composants purs
- ✅ Queries optimisées (select spécifiques, indexes)
- ✅ Images lazy loaded dans les produits
- ✅ Skeleton loaders pour perceived performance

---

**Date:** Janvier 2026  
**Version:** 1.0  
**Statut:** 📖 Guide de référence visuel complet
