/**
 * 📦 TYPES CENTRALISÉS - Backend 224Solutions
 */

import { Request } from 'express';

// ==================== AUTH ====================

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  profile: Record<string, any> | null;
  emailConfirmedAt?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

// ==================== WALLET ====================

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  wallet_status: string;
  created_at: string;
  updated_at?: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: 'credit' | 'debit' | 'transfer';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  description?: string;
  reference?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// ==================== SUBSCRIPTION ====================

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'expired' | 'trial' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  created_at: string;
}

// ==================== PAYMENT ====================

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  provider: 'stripe' | 'paypal' | 'orange_money' | 'mtn_money' | 'wallet';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  reference: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// ==================== ORDER ====================

export interface Order {
  id: string;
  buyer_id: string;
  vendor_id: string;
  items: OrderItem[];
  total_amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'canceled' | 'refunded';
  payment_id?: string;
  shipping_address?: Record<string, any>;
  created_at: string;
}

export interface OrderItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// ==================== VENDOR ====================

export interface Vendor {
  id: string;
  user_id: string;
  store_name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  subscription_tier?: string;
  product_limit?: number;
  created_at: string;
}
