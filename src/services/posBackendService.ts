/**
 * 🏪 POS BACKEND SERVICE — Phase 5
 * Aligné 1:1 avec backend/src/routes/pos.routes.ts
 */

import { backendFetch } from './backendApi';

// ==================== TYPES (alignés backend Zod schemas) ====================

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
  customer_name?: string | null;
  customer_phone?: string | null;
  marketing_contact?: string | null;
  notes?: string | null;
  sold_at: string; // ISO 8601
}

export interface PosMarketingContactPayload {
  contact: string;
  customer_name?: string | null;
  order_total?: number | null;
  sold_at?: string | null;
}

export interface SyncResult {
  local_sale_id: string;
  status: 'created' | 'duplicate' | 'error';
  sale_id?: string;
  stock_synced?: boolean;
  error?: string;
}

export interface SyncSummary {
  total: number;
  created: number;
  duplicates: number;
  errors: number;
  stock_pending: number;
}

export interface PosReconciliationEntry {
  id: string;
  vendor_id: string;
  pos_sale_id: string;
  product_id: string;
  expected_decrement: number;
  status: string;
  error_message: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  product?: { id: string; name: string; sku: string | null };
}

// ==================== API CALLS ====================

/**
 * Synchroniser un lot de ventes POS offline (max 50)
 */
export async function syncPosSales(
  sales: PosSalePayload[],
  vendorId?: string,
  signal?: AbortSignal
) {
  const headers: Record<string, string> = {};
  if (vendorId) headers['x-vendor-id'] = vendorId;

  return backendFetch<{ results: SyncResult[]; summary: SyncSummary }>(
    '/api/pos/sync',
    {
      method: 'POST',
      body: { sales },
      headers,
      signal,
    }
  );
}

/**
 * Lister les ventes POS synchronisées
 */
export async function listPosSales(
  params: { limit?: number; offset?: number } = {},
  vendorId?: string,
  signal?: AbortSignal
) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  const headers: Record<string, string> = {};
  if (vendorId) headers['x-vendor-id'] = vendorId;

  return backendFetch(`/api/pos/sales${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers,
    signal,
  });
}

/**
 * Lister les écarts de stock en attente de réconciliation
 */
export async function getReconciliationPending(vendorId?: string, signal?: AbortSignal) {
  const headers: Record<string, string> = {};
  if (vendorId) headers['x-vendor-id'] = vendorId;

  return backendFetch<PosReconciliationEntry[]>('/api/pos/reconciliation', {
    method: 'GET',
    headers,
    signal,
  });
}

/**
 * Collecter un contact marketing POS (email ou téléphone)
 */
export async function collectPosMarketingContact(
  payload: PosMarketingContactPayload,
  vendorId?: string,
  signal?: AbortSignal,
) {
  const headers: Record<string, string> = {};
  if (vendorId) headers['x-vendor-id'] = vendorId;

  return backendFetch<{ id: string; status: 'created' | 'updated' }>('/api/pos/marketing-contact', {
    method: 'POST',
    body: payload,
    headers,
    signal,
  });
}
