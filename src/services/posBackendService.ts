/**
 * 🏪 POS BACKEND SERVICE
 * Synchronisation des ventes POS offline → backend Node.js
 */

import { backendFetch } from './backendApi';

// ==================== TYPES ====================

export interface PosSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

export interface PosSalePayload {
  local_sale_id: string;
  items: PosSaleItem[];
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit';
  total_amount: number;
  discount_total: number;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  sold_at: string;
}

export interface SyncResult {
  local_sale_id: string;
  status: 'created' | 'duplicate' | 'error';
  sale_id?: string;
  error?: string;
}

export interface SyncSummary {
  total: number;
  created: number;
  duplicates: number;
  errors: number;
}

// ==================== API CALLS ====================

/**
 * Synchroniser un lot de ventes POS offline
 * Max 50 ventes par appel
 */
export async function syncPosSales(
  sales: PosSalePayload[],
  signal?: AbortSignal
) {
  return backendFetch<{ results: SyncResult[]; summary: SyncSummary }>(
    '/api/pos/sync',
    {
      method: 'POST',
      body: { sales },
      signal,
    }
  );
}

/**
 * Lister les ventes POS synchronisées
 */
export async function listPosSales(
  params: { limit?: number; offset?: number } = {},
  signal?: AbortSignal
) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  return backendFetch(`/api/pos/sales${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    signal,
  });
}
