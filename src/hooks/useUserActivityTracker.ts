/**
 * 🔍 HOOK: SUIVI COMPLET DES ACTIVITÉS UTILISATEUR
 * Utilise une Edge Function pour bypasser les RLS et récupérer toutes les données
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types pour les différentes activités
export interface UserFullProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  public_id?: string;
  role?: string;
  address?: string;
  city?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
}

export interface WalletInfo {
  id: string;
  balance: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface TransactionActivity {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  sender_user_id?: string;
  receiver_user_id?: string;
  created_at: string;
  metadata?: any;
}

export interface OrderActivity {
  id: string;
  order_number?: string;
  status: string;
  total_amount: number;
  currency?: string;
  items_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface LoginActivity {
  id: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  attempted_at: string;
  role?: string;
}

export interface AuditActivity {
  id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  ip_address?: string;
  user_agent?: string;
  data_json?: any;
  created_at: string;
}

export interface MessageActivity {
  id: string;
  recipient_id: string;
  content_preview: string;
  type: string;
  status: string;
  created_at: string;
}

export interface DeliveryActivity {
  id: string;
  status: string;
  pickup_address?: string;
  delivery_address?: string;
  price?: number;
  created_at: string;
}

export interface RideActivity {
  id: string;
  status: string;
  pickup_address?: string;
  destination_address?: string;
  fare?: number;
  created_at: string;
}

export interface ReviewActivity {
  id: string;
  rating: number;
  content?: string;
  product_id?: string;
  created_at: string;
}

export interface VendorInfo {
  id: string;
  business_name?: string;
  business_type?: string;
  is_active?: boolean;
  total_products?: number;
  total_sales?: number;
  created_at?: string;
}

export interface DriverInfo {
  id: string;
  vehicle_type?: string;
  license_number?: string;
  status?: string;
  total_deliveries?: number;
  rating?: number;
  created_at?: string;
}

export interface UserActivitySummary {
  profile: UserFullProfile | null;
  customId: string | null;
  roleType: string | null;
  
  // Wallet & Finance
  wallet: WalletInfo | null;
  transactions: TransactionActivity[];
  totalTransactions: number;
  totalSpent: number;
  totalReceived: number;
  
  // Commerce
  orders: OrderActivity[];
  totalOrders: number;
  totalOrdersAmount: number;
  
  // Security & Auth
  loginHistory: LoginActivity[];
  totalLogins: number;
  lastLogin: string | null;
  
  // Audit Trail
  auditLogs: AuditActivity[];
  totalAuditEvents: number;
  
  // Communication
  messages: MessageActivity[];
  totalMessages: number;
  
  // Delivery & Rides
  deliveries: DeliveryActivity[];
  rides: RideActivity[];
  
  // Reviews
  reviews: ReviewActivity[];
  totalReviews: number;
  averageRating: number;
  
  // Role-specific
  vendorInfo: VendorInfo | null;
  driverInfo: DriverInfo | null;
  
  // Meta
  accountAge: number; // en jours
  registrationDate: string | null;
  lastActivity: string | null;
}

export function useUserActivityTracker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<UserActivitySummary | null>(null);

  /**
   * Rechercher un utilisateur par son ID public (VND0001, CLT0002, etc.)
   * Utilise l'Edge Function pour bypasser les RLS
   */
  const searchUserById = useCallback(async (publicId: string): Promise<UserActivitySummary | null> => {
    setLoading(true);
    setError(null);

    try {
      const trimmedId = publicId.trim().toUpperCase();

      // Appeler l'Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('get-user-activity', {
        body: { customId: trimmedId }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(fnError.message || 'Erreur lors de la recherche');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const summary: UserActivitySummary = {
        profile: data.profile as UserFullProfile,
        customId: data.customId,
        roleType: data.roleType,
        
        wallet: data.wallet,
        transactions: data.transactions || [],
        totalTransactions: data.totalTransactions || 0,
        totalSpent: data.totalSpent || 0,
        totalReceived: data.totalReceived || 0,
        
        orders: data.orders || [],
        totalOrders: data.totalOrders || 0,
        totalOrdersAmount: data.totalOrdersAmount || 0,
        
        loginHistory: data.loginHistory || [],
        totalLogins: data.totalLogins || 0,
        lastLogin: data.lastLogin,
        
        auditLogs: data.auditLogs || [],
        totalAuditEvents: data.totalAuditEvents || 0,
        
        messages: data.messages || [],
        totalMessages: data.totalMessages || 0,
        
        deliveries: data.deliveries || [],
        rides: data.rides || [],
        
        reviews: data.reviews || [],
        totalReviews: data.totalReviews || 0,
        averageRating: data.averageRating || 0,
        
        vendorInfo: data.vendorInfo,
        driverInfo: data.driverInfo,
        
        accountAge: data.accountAge || 0,
        registrationDate: data.registrationDate,
        lastActivity: data.lastActivity
      };

      setActivityData(summary);
      toast.success(`Données trouvées pour ${trimmedId}`);
      return summary;

    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la recherche';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Search error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Exporter les données en JSON
   */
  const exportToJson = useCallback(() => {
    if (!activityData) return;

    const dataStr = JSON.stringify(activityData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `activite_${activityData.customId}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Données exportées avec succès');
  }, [activityData]);

  /**
   * Réinitialiser les données
   */
  const reset = useCallback(() => {
    setActivityData(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    activityData,
    searchUserById,
    exportToJson,
    reset
  };
}
