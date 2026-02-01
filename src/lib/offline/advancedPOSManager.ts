/**
 * Advanced POS Manager - Gestionnaire POS hors ligne avancé
 * 224SOLUTIONS - Mode Offline Avancé
 *
 * Gère les ventes POS en mode hors ligne avec:
 * - Limite journalière (50M GNF)
 * - Paiements cash, USSD, QR codes locaux
 * - Queue de sync automatique
 * - Historique local complet
 *
 * IMPORTANT: Ce fichier ÉTEND offlinePOSManager.ts existant, ne le remplace pas.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { storeEvent } from '@/lib/offlineDB';
import { globalSyncQueue, SyncPriority } from './sync/advancedSyncEngine';

/**
 * Limite quotidienne de ventes offline (GNF)
 */
export const DAILY_OFFLINE_SALES_LIMIT = 50_000_000; // 50M GNF

/**
 * Méthodes de paiement supportées en mode offline
 */
export type OfflinePaymentMethod = 'cash' | 'ussd' | 'qr_local';

/**
 * Structure d'une vente POS offline
 */
export interface OfflinePOSSale {
  id: string;
  vendor_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  items: OfflinePOSItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: OfflinePaymentMethod;
  payment_reference?: string; // USSD code ou QR code
  notes?: string;
  created_at: string;
  synced: boolean;
  sync_attempts: number;
  receipt_number: string;
  offline_sale: boolean; // Flag pour identifier ventes offline
}

export interface OfflinePOSItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  sku?: string;
}

/**
 * Schéma de la base de données POS offline
 */
interface OfflinePOSSchema extends DBSchema {
  sales: {
    key: string;
    value: OfflinePOSSale;
    indexes: {
      'by-vendor': string;
      'by-date': string;
      'by-sync-status': number;
      'by-receipt': string;
    };
  };
  daily_totals: {
    key: string; // Format: YYYY-MM-DD:vendor_id
    value: {
      date: string;
      vendor_id: string;
      total_sales: number;
      sales_count: number;
      last_updated: string;
    };
  };
  payment_refs: {
    key: string; // USSD code ou QR code
    value: {
      reference: string;
      sale_id: string;
      payment_method: OfflinePaymentMethod;
      amount: number;
      created_at: string;
      used: boolean;
    };
  };
}

let posDB: IDBPDatabase<OfflinePOSSchema> | null = null;

/**
 * Initialiser la base de données POS offline
 */
async function initPOSDB(): Promise<IDBPDatabase<OfflinePOSSchema>> {
  if (posDB) return posDB;

  posDB = await openDB<OfflinePOSSchema>('224Solutions-OfflinePOS', 1, {
    upgrade(database) {
      console.log('[OfflinePOS] Création du schéma DB');

      // Store des ventes
      if (!database.objectStoreNames.contains('sales')) {
        const salesStore = database.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('by-vendor', 'vendor_id');
        salesStore.createIndex('by-date', 'created_at');
        salesStore.createIndex('by-sync-status', 'synced');
        salesStore.createIndex('by-receipt', 'receipt_number');
      }

      // Store des totaux journaliers
      if (!database.objectStoreNames.contains('daily_totals')) {
        database.createObjectStore('daily_totals', { keyPath: 'date' });
      }

      // Store des références de paiement
      if (!database.objectStoreNames.contains('payment_refs')) {
        database.createObjectStore('payment_refs', { keyPath: 'reference' });
      }
    }
  });

  console.log('[OfflinePOS] ✅ Base de données initialisée');
  return posDB;
}

/**
 * Générer un numéro de reçu unique
 */
function generateReceiptNumber(vendorId: string): string {
  const date = new Date();
  const timestamp = date.getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const vendorPrefix = vendorId.substring(0, 4).toUpperCase();

  return `${vendorPrefix}-${timestamp}-${random}`;
}

/**
 * Générer un code USSD local pour paiement différé
 */
function generateUSSDCode(): string {
  // Format: *224*XXX*YYYY#
  const prefix = Math.floor(100 + Math.random() * 900); // 100-999
  const suffix = Math.floor(1000 + Math.random() * 9000); // 1000-9999

  return `*224*${prefix}*${suffix}#`;
}

/**
 * Générer un code QR local pour paiement différé
 */
function generateLocalQRCode(saleId: string, amount: number): string {
  // Format JSON encodé en Base64
  const qrData = {
    type: 'offline_payment',
    sale_id: saleId,
    amount,
    timestamp: new Date().toISOString(),
    vendor: 'offline'
  };

  return btoa(JSON.stringify(qrData));
}

/**
 * Vérifier la limite journalière
 */
export async function checkDailyLimit(vendorId: string, saleAmount: number): Promise<{
  allowed: boolean;
  currentTotal: number;
  remaining: number;
  limit: number;
}> {
  const db = await initPOSDB();
  const today = new Date().toISOString().split('T')[0];
  const key = `${today}:${vendorId}`;

  const dailyTotal = await db.get('daily_totals', key);
  const currentTotal = dailyTotal?.total_sales || 0;
  const newTotal = currentTotal + saleAmount;

  return {
    allowed: newTotal <= DAILY_OFFLINE_SALES_LIMIT,
    currentTotal,
    remaining: Math.max(0, DAILY_OFFLINE_SALES_LIMIT - currentTotal),
    limit: DAILY_OFFLINE_SALES_LIMIT
  };
}

/**
 * Mettre à jour le total journalier
 */
async function updateDailyTotal(vendorId: string, saleAmount: number): Promise<void> {
  const db = await initPOSDB();
  const today = new Date().toISOString().split('T')[0];
  const key = `${today}:${vendorId}`;

  const existing = await db.get('daily_totals', key);

  await db.put('daily_totals', {
    date: key,
    vendor_id: vendorId,
    total_sales: (existing?.total_sales || 0) + saleAmount,
    sales_count: (existing?.sales_count || 0) + 1,
    last_updated: new Date().toISOString()
  });
}

/**
 * Créer une vente POS offline
 */
export async function createOfflineSale(
  sale: Omit<OfflinePOSSale, 'id' | 'created_at' | 'synced' | 'sync_attempts' | 'receipt_number' | 'offline_sale'>
): Promise<{ success: boolean; sale?: OfflinePOSSale; error?: string; limitExceeded?: boolean }> {
  try {
    // Vérifier la limite journalière
    const limitCheck = await checkDailyLimit(sale.vendor_id, sale.total);
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: `Limite journalière atteinte (${limitCheck.limit.toLocaleString()} GNF). Restant: ${limitCheck.remaining.toLocaleString()} GNF`,
        limitExceeded: true
      };
    }

    const db = await initPOSDB();
    const saleId = `offline_sale_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const receiptNumber = generateReceiptNumber(sale.vendor_id);

    // Générer référence de paiement selon la méthode
    let paymentReference: string | undefined;

    if (sale.payment_method === 'ussd') {
      paymentReference = generateUSSDCode();
    } else if (sale.payment_method === 'qr_local') {
      paymentReference = generateLocalQRCode(saleId, sale.total);
    }

    const fullSale: OfflinePOSSale = {
      ...sale,
      id: saleId,
      created_at: new Date().toISOString(),
      synced: false,
      sync_attempts: 0,
      receipt_number: receiptNumber,
      payment_reference: paymentReference,
      offline_sale: true
    };

    // Stocker la vente
    await db.put('sales', fullSale);

    // Mettre à jour le total journalier
    await updateDailyTotal(sale.vendor_id, sale.total);

    // Stocker la référence de paiement si applicable
    if (paymentReference && sale.payment_method !== 'cash') {
      await db.put('payment_refs', {
        reference: paymentReference,
        sale_id: saleId,
        payment_method: sale.payment_method,
        amount: sale.total,
        created_at: fullSale.created_at,
        used: false
      });
    }

    // Ajouter à la queue de sync avec priorité critique
    globalSyncQueue.enqueue('pos_sales', fullSale, SyncPriority.CRITICAL);

    // Aussi utiliser le système d'événements existant
    await storeEvent({
      type: 'pos_sale',
      data: fullSale,
      vendor_id: sale.vendor_id,
      created_at: fullSale.created_at
    }, true); // Crypter

    console.log('[OfflinePOS] ✅ Vente créée:', saleId, receiptNumber);

    return { success: true, sale: fullSale };
  } catch (error: any) {
    console.error('[OfflinePOS] ❌ Erreur création vente:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la création de la vente'
    };
  }
}

/**
 * Récupérer toutes les ventes offline d'un vendeur
 */
export async function getOfflineSales(vendorId: string, options?: {
  synced?: boolean;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<OfflinePOSSale[]> {
  const db = await initPOSDB();
  const allSales = await db.getAllFromIndex('sales', 'by-vendor', vendorId);

  let filtered = allSales;

  // Filtrer par statut de sync
  if (options?.synced !== undefined) {
    filtered = filtered.filter(s => s.synced === options.synced);
  }

  // Filtrer par date
  if (options?.startDate) {
    const startTime = options.startDate.getTime();
    filtered = filtered.filter(s => new Date(s.created_at).getTime() >= startTime);
  }

  if (options?.endDate) {
    const endTime = options.endDate.getTime();
    filtered = filtered.filter(s => new Date(s.created_at).getTime() <= endTime);
  }

  // Limiter le nombre de résultats
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  // Trier par date (plus récent en premier)
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return filtered;
}

/**
 * Récupérer les ventes non synchronisées
 */
export async function getPendingSales(vendorId: string): Promise<OfflinePOSSale[]> {
  return getOfflineSales(vendorId, { synced: false });
}

/**
 * Marquer une vente comme synchronisée
 */
export async function markSaleAsSynced(saleId: string): Promise<void> {
  const db = await initPOSDB();
  const sale = await db.get('sales', saleId);

  if (sale) {
    sale.synced = true;
    await db.put('sales', sale);
    console.log('[OfflinePOS] ✅ Vente synchronisée:', saleId);
  }
}

/**
 * Incrémenter le compteur de tentatives de sync
 */
export async function incrementSyncAttempts(saleId: string): Promise<void> {
  const db = await initPOSDB();
  const sale = await db.get('sales', saleId);

  if (sale) {
    sale.sync_attempts++;
    await db.put('sales', sale);
  }
}

/**
 * Obtenir les statistiques de ventes offline
 */
export async function getOfflineSalesStats(vendorId: string): Promise<{
  totalSales: number;
  totalRevenue: number;
  pendingSync: number;
  todayTotal: number;
  todayRemaining: number;
  byPaymentMethod: Record<OfflinePaymentMethod, { count: number; total: number }>;
}> {
  const sales = await getOfflineSales(vendorId);
  const pending = sales.filter(s => !s.synced);

  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.created_at.startsWith(today));
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

  const byPaymentMethod: Record<OfflinePaymentMethod, { count: number; total: number }> = {
    cash: { count: 0, total: 0 },
    ussd: { count: 0, total: 0 },
    qr_local: { count: 0, total: 0 }
  };

  sales.forEach(sale => {
    const method = sale.payment_method;
    byPaymentMethod[method].count++;
    byPaymentMethod[method].total += sale.total;
  });

  return {
    totalSales: sales.length,
    totalRevenue: sales.reduce((sum, s) => sum + s.total, 0),
    pendingSync: pending.length,
    todayTotal,
    todayRemaining: Math.max(0, DAILY_OFFLINE_SALES_LIMIT - todayTotal),
    byPaymentMethod
  };
}

/**
 * Rechercher une vente par numéro de reçu
 */
export async function findSaleByReceipt(receiptNumber: string): Promise<OfflinePOSSale | undefined> {
  const db = await initPOSDB();
  const sales = await db.getAllFromIndex('sales', 'by-receipt', receiptNumber);
  return sales[0];
}

/**
 * Vérifier une référence de paiement (USSD ou QR)
 */
export async function validatePaymentReference(reference: string): Promise<{
  valid: boolean;
  sale?: OfflinePOSSale;
  amount?: number;
  error?: string;
}> {
  const db = await initPOSDB();
  const paymentRef = await db.get('payment_refs', reference);

  if (!paymentRef) {
    return { valid: false, error: 'Référence de paiement invalide' };
  }

  if (paymentRef.used) {
    return { valid: false, error: 'Cette référence a déjà été utilisée' };
  }

  const sale = await db.get('sales', paymentRef.sale_id);

  return {
    valid: true,
    sale,
    amount: paymentRef.amount
  };
}

/**
 * Marquer une référence de paiement comme utilisée
 */
export async function markPaymentReferenceAsUsed(reference: string): Promise<void> {
  const db = await initPOSDB();
  const paymentRef = await db.get('payment_refs', reference);

  if (paymentRef) {
    paymentRef.used = true;
    await db.put('payment_refs', paymentRef);
  }
}

/**
 * Nettoyer les ventes synchronisées anciennes (> 30 jours)
 */
export async function cleanupOldSyncedSales(): Promise<number> {
  const db = await initPOSDB();
  const allSales = await db.getAll('sales');
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let cleaned = 0;

  for (const sale of allSales) {
    const saleTime = new Date(sale.created_at).getTime();
    if (sale.synced && saleTime < thirtyDaysAgo) {
      await db.delete('sales', sale.id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[OfflinePOS] 🧹 ${cleaned} ventes anciennes nettoyées`);
  }

  return cleaned;
}

export default {
  initPOSDB,
  createOfflineSale,
  getOfflineSales,
  getPendingSales,
  markSaleAsSynced,
  incrementSyncAttempts,
  getOfflineSalesStats,
  findSaleByReceipt,
  validatePaymentReference,
  markPaymentReferenceAsUsed,
  cleanupOldSyncedSales,
  checkDailyLimit
};
