# 🇨🇳 MODULE CHINA DROPSHIPPING - Guide d'Intégration

## 📋 Vue d'ensemble

Extension modulaire complète pour gérer les opérations de dropshipping avec les fournisseurs chinois (Alibaba, AliExpress, 1688).

**Version:** 1.0.0  
**Date:** 12 Janvier 2026  
**Compatibilité:** Extension pure - aucune modification du code existant

---

## 📁 Structure des fichiers créés

```
src/
├── types/
│   └── china-dropshipping.ts          # Types TypeScript (600+ lignes)
│
├── hooks/
│   ├── useChinaDropshipping.ts         # Hook principal (500+ lignes)
│   ├── useSupplierScoring.ts           # Système anti-fraude (350+ lignes)
│   └── useChinaReports.ts              # Génération rapports (450+ lignes)
│
├── components/
│   ├── dropshipping/china/
│   │   ├── index.ts                    # Exports
│   │   ├── ChinaProductImportDialog.tsx  # Import depuis URL
│   │   ├── ChinaSuppliersList.tsx        # Gestion fournisseurs
│   │   └── ChinaLogisticsTracking.tsx    # Suivi multi-segments
│   │
│   └── admin/china/
│       ├── index.ts                    # Exports admin
│       └── ChinaDropshipDashboard.tsx  # Dashboard PDG/Admin
│
supabase/
└── migrations/
    └── 20260112_china_dropshipping_module.sql  # Schema DB (450+ lignes)
```

---

## 🗃️ Base de données

### Tables créées

| Table | Description |
|-------|-------------|
| `china_suppliers` | Extension fournisseurs avec champs Chine |
| `china_product_imports` | Produits importés depuis plateformes |
| `china_supplier_orders` | Commandes vers fournisseurs chinois |
| `china_logistics` | Suivi logistique multi-segments |
| `china_price_syncs` | Historique synchronisation prix |
| `china_price_alerts` | Alertes prix/stock |
| `china_supplier_scores` | Scores anti-fraude |
| `china_dropship_settings` | Paramètres vendeur |
| `china_dropship_logs` | Logs audit |
| `china_dropship_reports` | Rapports générés |

### Exécution migration

```sql
-- Exécuter dans Supabase SQL Editor:
-- Copier le contenu de: supabase/migrations/20260112_china_dropshipping_module.sql
```

---

## 🔧 Intégration dans le code existant

### 1. Dans DropshippingModule.tsx

```tsx
// Ajouter les imports
import { 
  ChinaProductImportDialog, 
  ChinaSuppliersList, 
  ChinaLogisticsTracking 
} from '@/components/dropshipping/china';
import { useChinaDropshipping } from '@/hooks/useChinaDropshipping';

// Dans le composant
const { 
  chinaSuppliers, 
  loadChinaSuppliers,
  importFromUrl 
} = useChinaDropshipping();

// Ajouter un onglet "Chine" dans les tabs existants
<TabsTrigger value="china">
  <Globe className="h-4 w-4 mr-2" />
  Fournisseurs Chine
</TabsTrigger>

<TabsContent value="china">
  <ChinaSuppliersList 
    suppliers={chinaSuppliers}
    onRefresh={loadChinaSuppliers}
  />
</TabsContent>
```

### 2. Dans le menu Admin

```tsx
// src/components/admin/AdminSidebar.tsx
import { ChinaDropshipDashboard } from '@/components/admin/china';

// Ajouter dans les routes admin
<Route path="china-dropship" element={<ChinaDropshipDashboard />} />

// Ajouter dans le menu
<SidebarItem 
  icon={Globe} 
  label="Dropship Chine" 
  href="/admin/china-dropship" 
/>
```

### 3. Dans les pages commandes

```tsx
// Ajouter le tracking pour commandes Chine
import { ChinaLogisticsTracking } from '@/components/dropshipping/china';

{order.china_supplier_id && (
  <ChinaLogisticsTracking orderId={order.id} />
)}
```

---

## 📊 Fonctionnalités par module

### useChinaDropshipping

| Fonction | Description |
|----------|-------------|
| `loadChinaSuppliers()` | Charger tous les fournisseurs |
| `addChinaSupplier(data)` | Ajouter un fournisseur |
| `verifySupplier(id)` | Marquer comme vérifié |
| `disableSupplier(id, reason)` | Désactiver un fournisseur |
| `importFromUrl(url)` | Importer depuis URL plateforme |
| `syncPrices(productId)` | Synchroniser les prix |
| `calculateCosts(params)` | Calculer coûts complets |

### useSupplierScoring

| Fonction | Description |
|----------|-------------|
| `calculateScore(metrics)` | Calculer score fournisseur |
| `checkAndApplyAutoActions(supplierId)` | Actions automatiques |
| `getTopSuppliers(limit)` | Top fournisseurs |
| `getFlaggedSuppliers()` | Fournisseurs à risque |

### useChinaReports

| Fonction | Description |
|----------|-------------|
| `generateDailyReport(date)` | Rapport journalier |
| `generateWeeklyReport(week)` | Rapport hebdomadaire |
| `generateMonthlyReport(month)` | Rapport mensuel |
| `comparePerformance(p1, p2)` | Comparer 2 périodes |
| `exportReportCsv(report)` | Export CSV |

---

## 🎯 Workflow type vendeur

```
1. IMPORT PRODUIT
   └─> ChinaProductImportDialog
       └─> Coller URL Alibaba/AliExpress/1688
           └─> Prévisualisation automatique
               └─> Configuration marge
                   └─> Création produit dropship

2. RECEPTION COMMANDE CLIENT
   └─> Commande arrive sur tableau de bord
       └─> Transmission auto au fournisseur chinois
           └─> Suivi multi-segments activé

3. SUIVI LOGISTIQUE
   └─> ChinaLogisticsTracking
       └─> Production (Chine)
           └─> Expédition domestique
               └─> Entrepôt consolidation
                   └─> Expédition internationale
                       └─> Douane
                           └─> Livraison finale

4. ALERTES AUTOMATIQUES
   └─> Hausse prix fournisseur > 15%
   └─> Rupture stock
   └─> Score fournisseur < 40
   └─> Blocage douane
```

---

## 🛡️ Système Anti-Fraude

### Calcul du score (100 points max)

| Métrique | Poids | Description |
|----------|-------|-------------|
| Taux livraison | 25% | % commandes livrées |
| Ponctualité | 25% | % dans délais estimés |
| Qualité | 25% | Note moyenne retours |
| Réactivité | 15% | Temps réponse moyen |
| Litiges | 10% | Inverse taux litiges |

### Seuils automatiques

| Score | Niveau | Action |
|-------|--------|--------|
| ≥ 85 | 🥇 GOLD | Prioritaire, confiance max |
| ≥ 70 | 🥈 SILVER | Fiable, surveillance normale |
| ≥ 50 | 🥉 BRONZE | Acceptable, surveillance accrue |
| < 40 | ⚠️ WARNING | Alerte admin |
| < 25 | 🚫 AUTO-DISABLE | Désactivation automatique |

---

## 🌐 Plateformes supportées

| Plateforme | Detection URL | MOQ typique |
|------------|---------------|-------------|
| **Alibaba** | `alibaba.com` | 10-100 |
| **AliExpress** | `aliexpress.com` | 1 |
| **1688** | `1688.com` | 50-500 |
| **Privé** | Saisie manuelle | Variable |

---

## 💰 Calcul des coûts

```typescript
// Structure complète des coûts
interface ChinaCostBreakdown {
  supplier_price_usd: number;      // Prix fournisseur
  shipping_domestic_cny: number;   // Transport Chine interne
  shipping_international_usd: number; // Transport international
  customs_duties_estimate: number; // Estimation droits douane
  platform_fees_usd: number;       // Frais plateforme
  currency_conversion_fee: number; // Frais conversion
  total_cost_usd: number;          // Total en USD
  suggested_price_local: number;   // Prix vente suggéré
  estimated_margin_percent: number; // Marge estimée
}
```

---

## 📈 Rapports disponibles

### Rapport standard
- Commandes totales / complétées / annulées / litiges
- Revenus / coûts / profit / marge
- Délai moyen livraison
- Taux ponctualité
- Taux blocage douane
- Top 5 fournisseurs
- Top 5 produits

### Comparaisons
- Période vs période précédente
- Évolution % toutes métriques

---

## ⚙️ Configuration vendeur

```typescript
// Paramètres configurables par vendeur
{
  auto_sync_prices: true,          // Sync auto prix
  sync_frequency_hours: 24,        // Fréquence sync
  price_increase_alert_threshold: 15, // Seuil alerte hausse %
  auto_disable_on_price_spike: true,  // Auto-désactiver si spike
  auto_disable_threshold_percent: 30, // Seuil spike %
  show_origin_country: true,       // Afficher "Made in China"
  add_buffer_days: 3,              // Jours buffer estimations
}
```

---

## 🔒 Sécurité RLS

Toutes les tables sont protégées par Row Level Security:

- **Vendeurs**: Accès uniquement à leurs propres données
- **Admin/PDG**: Accès global lecture/écriture fournisseurs
- **Fournisseurs**: Lecture publique, écriture admin seul
- **Scores**: Lecture publique pour transparence

---

## ✅ Checklist déploiement

- [ ] Exécuter migration SQL dans Supabase
- [ ] Vérifier création des 10 tables
- [ ] Ajouter imports dans DropshippingModule
- [ ] Ajouter route admin Dashboard
- [ ] Tester import depuis URL
- [ ] Tester création fournisseur
- [ ] Tester calcul coûts
- [ ] Tester génération rapport
- [ ] Vérifier RLS policies

---

## 🆘 Support

En cas de problème:
1. Vérifier les logs dans `china_dropship_logs`
2. Consulter la console navigateur
3. Vérifier les policies RLS dans Supabase

---

**© 2026 224 Solutions - Module China Dropshipping v1.0.0**
