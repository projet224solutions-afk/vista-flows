/**
 * 📦 TYPES CENTRALISÉS - Backend 224Solutions
 * Alignés avec les tables Supabase existantes
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

// ==================== WALLET (aligné table `wallets`) ====================

export interface Wallet {
  id: number; // bigint dans la DB
  user_id: string;
  balance: number;
  currency: string; // default 'GNF'
  wallet_status: 'active' | 'frozen' | 'blocked';
  is_blocked: boolean;
  blocked_reason?: string | null;
  blocked_at?: string | null;
  pin_hash?: string | null;
  biometric_enabled: boolean;
  daily_limit: number;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: number; // bigint
  transaction_id: string; // varchar unique
  sender_wallet_id?: number | null;
  receiver_wallet_id?: number | null;
  sender_user_id?: string | null;
  receiver_user_id?: string | null;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  transaction_type: string; // USER-DEFINED enum
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  description?: string | null;
  reference_id?: string | null;
  metadata?: Record<string, any>;
  signature?: string | null;
  signature_verified: boolean;
  ip_address?: string | null;
  device_info?: Record<string, any> | null;
  idempotency_key?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

// ==================== PLANS (aligné table `plans`) ====================

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  monthly_price_gnf: number;
  yearly_price_gnf?: number | null;
  yearly_discount_percentage: number;
  max_products?: number | null;
  max_images_per_product?: number | null;
  analytics_access: boolean;
  priority_support: boolean;
  featured_products: boolean;
  api_access: boolean;
  custom_branding: boolean;
  features: any[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ==================== SUBSCRIPTION (aligné table `subscriptions`) ====================

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  price_paid_gnf: number;
  billing_cycle: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'trialing' | 'past_due';
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  auto_renew: boolean;
  payment_method?: string | null;
  payment_transaction_id?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ==================== VENDOR ====================

export interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  shop_slug?: string;
  business_type: 'online' | 'physical' | 'hybrid';
  is_active: boolean;
  country?: string | null;
  city?: string | null;
  created_at: string;
}

// ==================== ORDER ====================

export interface Order {
  id: string;
  buyer_id: string;
  vendor_id: string;
  total_amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'canceled' | 'refunded';
  payment_id?: string;
  created_at: string;
}
