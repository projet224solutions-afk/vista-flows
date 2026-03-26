/**
 * 📦 ORDER BACKEND SERVICE — Phase 5
 * Aligné 1:1 avec backend/src/routes/orders.routes.ts
 */

import { backendFetch, generateIdempotencyKey } from './backendApi';

// ==================== TYPES (alignés backend Zod schemas) ====================

export interface CreateOrderItem {
  product_id: string;
  quantity: number;
  variant_id?: string | null;
}

export interface CreateOrderPayload {
  vendor_id: string;
  items: CreateOrderItem[];
  payment_method: 'card' | 'mobile_money' | 'wallet' | 'cod';
  shipping_address: {
    full_name: string;
    phone: string;
    address_line: string;
    city: string;
    country: string;
    postal_code?: string | null;
    notes?: string | null;
  };
  payment_intent_id?: string | null;
  coupon_code?: string | null;
}

export interface OrderItemDetail {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_id?: string | null;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  total_amount: number;
  currency: string;
  shipping_address: Record<string, any>;
  tracking_number?: string;
  cancellation_reason?: string;
  seller_confirmed_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItemDetail[];
}

export interface CreateOrderResponse {
  order: OrderSummary;
  items: OrderItemDetail[];
  escrow_status: string;
}

export type OrderStatusTransition = 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

// ==================== API CALLS ====================

/**
 * Créer une commande avec escrow systématique
 */
export async function createOrder(payload: CreateOrderPayload, signal?: AbortSignal) {
  return backendFetch<CreateOrderResponse>('/api/orders', {
    method: 'POST',
    body: payload,
    idempotencyKey: generateIdempotencyKey(),
    signal,
  });
}

/**
 * Lister les commandes de l'utilisateur connecté (acheteur)
 */
export async function listMyOrders(
  params: { limit?: number; offset?: number; status?: string } = {},
  signal?: AbortSignal
) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.status) query.set('status', params.status);

  const qs = query.toString();
  return backendFetch<OrderSummary[]>(`/api/orders/mine${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    signal,
  });
}

/**
 * Lister les commandes reçues par le vendeur
 */
export async function listVendorOrders(
  params: { limit?: number; offset?: number; status?: string } = {},
  signal?: AbortSignal
) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.status) query.set('status', params.status);

  const qs = query.toString();
  return backendFetch<OrderSummary[]>(`/api/orders/vendor${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    signal,
  });
}

/**
 * Détails d'une commande (GET /api/orders/:orderId)
 */
export async function getOrder(orderId: string, signal?: AbortSignal) {
  return backendFetch<OrderSummary>(`/api/orders/${orderId}`, {
    method: 'GET',
    signal,
  });
}

/**
 * Annuler une commande (POST /api/orders/:orderId/cancel)
 */
export async function cancelOrder(orderId: string, reason: string, signal?: AbortSignal) {
  return backendFetch<OrderSummary>(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
    body: { reason },
    idempotencyKey: generateIdempotencyKey(),
    signal,
  });
}

/**
 * Mettre à jour le statut d'une commande (vendeur)
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatusTransition,
  options: { tracking_number?: string; cancellation_reason?: string } = {},
  signal?: AbortSignal
) {
  return backendFetch<OrderSummary>(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: { status, ...options },
    signal,
  });
}
