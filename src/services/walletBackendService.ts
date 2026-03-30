/**
 * 💰 WALLET BACKEND SERVICE — Phase 6
 * Client centralisé pour les opérations wallet via le backend Node.js
 * Remplace les appels supabase.functions.invoke('wallet-operations')
 */

import { backendFetch, generateIdempotencyKey } from './backendApi';

// ==================== TYPES ====================

export interface WalletBalance {
  id: string;
  balance: number;
  currency: string;
  wallet_status: string;
  is_blocked: boolean;
  daily_limit: number;
  monthly_limit: number;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  sender_wallet_id: string;
  receiver_wallet_id: string;
  transaction_type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  metadata: any;
}

export interface WalletStatus {
  id: string;
  balance: number;
  currency: string;
  wallet_status: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
  biometric_enabled: boolean;
  daily_limit: number;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export interface WalletOperationResult {
  success: boolean;
  new_balance?: number;
  operation?: string;
  transaction_id?: string;
  error?: string;
}

// ==================== API CALLS ====================

/**
 * Récupère le solde du wallet
 */
export async function getWalletBalance(signal?: AbortSignal) {
  return backendFetch<WalletBalance>('/api/v2/wallet/balance', {
    method: 'GET',
    signal,
  });
}

/**
 * Initialise le wallet si inexistant
 */
export async function initializeWallet(signal?: AbortSignal) {
  return backendFetch<{ wallet: WalletBalance; created: boolean }>('/api/v2/wallet/initialize', {
    method: 'POST',
    signal,
  });
}

/**
 * Récupère l'historique des transactions
 */
export async function getWalletTransactions(
  options: { limit?: number; offset?: number } = {},
  signal?: AbortSignal
) {
  const { limit = 20, offset = 0 } = options;
  return backendFetch<WalletTransaction[]>(
    `/api/v2/wallet/transactions?limit=${limit}&offset=${offset}`,
    { method: 'GET', signal }
  );
}

/**
 * Récupère le statut complet du wallet
 */
export async function getWalletStatus(signal?: AbortSignal) {
  return backendFetch<WalletStatus>('/api/v2/wallet/status', {
    method: 'GET',
    signal,
  });
}

/**
 * Dépôt sur le wallet
 */
export async function depositToWallet(
  amount: number,
  description?: string,
  reference?: string
): Promise<WalletOperationResult> {
  const idempotencyKey = generateIdempotencyKey();
  const result = await backendFetch<WalletOperationResult>('/api/v2/wallet/deposit', {
    method: 'POST',
    body: { amount, description, reference, idempotency_key: idempotencyKey },
    idempotencyKey,
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Erreur lors du dépôt' };
  }
  return { success: true, new_balance: result.data?.new_balance, operation: 'deposit' };
}

/**
 * Retrait du wallet
 */
export async function withdrawFromWallet(
  amount: number,
  description?: string
): Promise<WalletOperationResult> {
  const idempotencyKey = generateIdempotencyKey();
  const result = await backendFetch<WalletOperationResult>('/api/v2/wallet/withdraw', {
    method: 'POST',
    body: { amount, description, idempotency_key: idempotencyKey },
    idempotencyKey,
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Erreur lors du retrait' };
  }
  return { success: true, new_balance: result.data?.new_balance, operation: 'withdraw' };
}

/**
 * Transfert P2P vers un autre wallet
 */
export async function transferToWallet(
  recipientId: string,
  amount: number,
  description?: string
): Promise<WalletOperationResult> {
  const idempotencyKey = generateIdempotencyKey();
  const result = await backendFetch<WalletOperationResult>('/api/v2/wallet/transfer', {
    method: 'POST',
    body: {
      amount,
      recipient_id: recipientId,
      description,
      idempotency_key: idempotencyKey,
    },
    idempotencyKey,
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Erreur lors du transfert' };
  }
  return { success: true, transaction_id: result.data?.transaction_id, operation: 'transfer' };
}

/**
 * Crédit admin/interne (réservé aux admins)
 */
export async function adminCreditWallet(
  userId: string,
  amount: number,
  description: string,
  reference?: string
): Promise<WalletOperationResult> {
  const result = await backendFetch<WalletOperationResult>('/api/v2/wallet/credit', {
    method: 'POST',
    body: { user_id: userId, amount, description, reference },
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Erreur lors du crédit' };
  }
  return { success: true, new_balance: result.data?.new_balance, operation: 'admin_credit' };
}
