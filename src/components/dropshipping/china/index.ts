/**
 * CHINA DROPSHIPPING MODULE - Exports
 * Extension modulaire pour le dropshipping depuis la Chine
 */

// Composants
export { ChinaProductImportDialog } from './ChinaProductImportDialog';
export { ChinaSuppliersList } from './ChinaSuppliersList';
export { ChinaLogisticsTracking } from './ChinaLogisticsTracking';

// Ré-export des types
export type {
  ChinaPlatformType,
  ChinaSupplierExtension,
  ChinaProductImport,
  ChinaSupplierOrder,
  ChinaCostBreakdown,
  ChinaLogistics,
  ChinaPriceAlert,
  ChinaDropshipSettings,
  SupplierScore,
  SupplierScoreLevel,
  TransportMethod,
  Incoterm
} from '@/types/china-dropshipping';

export {
  CHINA_PLATFORMS,
  TRANSPORT_METHODS,
  INCOTERMS,
  SUPPLIER_SCORE_THRESHOLDS,
  DEFAULT_CHINA_SETTINGS
} from '@/types/china-dropshipping';
