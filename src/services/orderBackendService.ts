/**
 * 📦 ORDER BACKEND SERVICE
 * Appelle les routes backend Phase 4 pour les commandes
 * Toutes les créations passent par l'escrow systématique
 */

import { backendFetch, generateIdempotencyKey } from './backendApi';

// ==================== TYPES ====================

export interface CreateOrderItem {
  product_id: string;
  quantity: number;
  variant_id?: string;
}

export interface CreateOrderPayload {
  vendor_id: string;
  items: CreateOrderItem[];
  payment_method: 'card' | 'mobile_money' | 'cash_on_delivery';
  shipping_address?: {
    street: string;
    city: string;
    country: string;
    postal_code?: string;
  };
  notes?: string;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  escrow?: {
    id: string;
    status: string;
    release_at: string;
  };
}

// ==================== API CALLS ====================

/**
 * Créer une commande avec escrow systématique
 * Idempotency-Key obligatoire pour éviter les doubles commandes
 */
export async function createOrder(payload: CreateOrderPayload, signal?: AbortSignal) {
  const idempotencyKey = generateIdempotencyKey();

  return backendFetch<{ order: OrderSummary }>('/api/orders', {
    method: 'POST',
    body: payload,
    idempotencyKey,
    signal,
  });
}

/**
 * Lister les commandes de l'utilisateur connecté
 */
export async function listMyOrders(
  params: { limit?: number; offset?: number; status?: string } = {},
  signal?: AbortSignal
) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.status) query.set('status', String(params.status));

  const qs = query.toString();
  return backendFetch<OrderSummary[]>(`/api/orders${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    signal,
  });
}

/**
 * Détails d'une commande
 */
export async function getOrder(orderId: string, signal?: AbortSignal) {
  return backendFetch<OrderSummary>(`/api/orders/${orderId}`, {
    method: 'GET',
    signal,
  });
}

/**
 * Annuler une commande (si escrow non confirmé par le vendeur)
 */
export async function cancelOrder(orderId: string, reason?: string, signal?: AbortSignal) {
  return backendFetch(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
    body: { reason },
    idempotencyKey: generateIdempotencyKey(),
    signal,
  });
}
