/**
 * 📦 INVENTORY BACKEND SERVICE
 * Gestion du stock 100% via backend Node.js
 */

import { backendFetch } from './backendApi';

// ==================== TYPES ====================

export interface StockLevel {
  product_id: string;
  product_name: string;
  stock_quantity: number;
  low_stock_threshold?: number;
  is_low_stock: boolean;
  updated_at: string;
}

export interface StockAdjustment {
  product_id: string;
  adjustment: number; // positif = ajout, négatif = retrait
  reason: string;
}

export interface InventoryHistoryEntry {
  id: string;
  product_id: string;
  adjustment: number;
  reason: string;
  previous_stock: number;
  new_stock: number;
  created_at: string;
  adjusted_by: string;
}

// ==================== API CALLS ====================

/**
 * Récupérer les niveaux de stock du vendeur
 */
export async function getStockLevels(
  params: { low_stock_only?: boolean } = {},
  signal?: AbortSignal
) {
  const query = new URLSearchParams();
  if (params.low_stock_only) query.set('low_stock_only', 'true');

  const qs = query.toString();
  return backendFetch<StockLevel[]>(
    `/api/inventory/stock${qs ? `?${qs}` : ''}`,
    { method: 'GET', signal }
  );
}

/**
 * Ajuster manuellement le stock (avec raison obligatoire)
 */
export async function adjustStock(
  payload: StockAdjustment,
  signal?: AbortSignal
) {
  return backendFetch<{ product_id: string; new_stock: number }>(
    '/api/inventory/adjust',
    {
      method: 'POST',
      body: payload,
      signal,
    }
  );
}

/**
 * Historique des ajustements de stock
 */
export async function getInventoryHistory(
  params: { product_id?: string; limit?: number; offset?: number } = {},
  signal?: AbortSignal
) {
  const query = new URLSearchParams();
  if (params.product_id) query.set('product_id', params.product_id);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  return backendFetch<InventoryHistoryEntry[]>(
    `/api/inventory/history${qs ? `?${qs}` : ''}`,
    { method: 'GET', signal }
  );
}
