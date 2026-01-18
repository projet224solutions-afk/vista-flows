/**
 * 🔍 HOOK: SUIVI COMPLET DES ACTIVITÉS UTILISATEUR
 * Récupère TOUTES les activités d'un utilisateur depuis son inscription
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

// Helper pour déterminer le role_type à partir du custom_id
function getRoleTypeFromCustomId(customId: string): string | null {
  const prefix = customId.substring(0, 3).toUpperCase();
  const prefixMap: Record<string, string> = {
    'VND': 'vendor',
    'CLT': 'client',
    'DRV': 'driver',
    'AGT': 'agent',
    'PDG': 'pdg',
    'TRS': 'transitaire',
    'WRK': 'worker',
    'BST': 'bureau'
  };
  return prefixMap[prefix] || null;
}

export function useUserActivityTracker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<UserActivitySummary | null>(null);

  /**
   * Rechercher un utilisateur par son ID public (VND0001, CLT0002, etc.)
   */
  const searchUserById = useCallback(async (publicId: string): Promise<UserActivitySummary | null> => {
    setLoading(true);
    setError(null);

    try {
      const trimmedId = publicId.trim().toUpperCase();

      // 1. Trouver l'utilisateur dans user_ids
      const { data: userIdData, error: userIdError } = await supabase
        .from('user_ids')
        .select('*')
        .eq('custom_id', trimmedId)
        .maybeSingle();

      if (userIdError) throw userIdError;

      if (!userIdData) {
        throw new Error(`Aucun utilisateur trouvé avec l'ID: ${trimmedId}`);
      }

      const userId = userIdData.user_id;
      const roleType = getRoleTypeFromCustomId(trimmedId);

      // 2. Récupérer le profil complet
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      // 3. Récupérer le wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // 4. Récupérer les transactions (envoyées et reçues)
      const { data: sentTransactions } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('sender_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: receivedTransactions } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('receiver_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      // 5. Récupérer les commandes
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      // 6. Récupérer l'historique de connexion
      const { data: loginHistory } = await supabase
        .from('auth_attempts_log')
        .select('*')
        .eq('identifier', profile?.email || '')
        .order('attempted_at', { ascending: false })
        .limit(50);

      // 7. Récupérer les logs d'audit
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('actor_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      // 8. Récupérer les messages envoyés
      const { data: messages } = await supabase
        .from('messages')
        .select('id, recipient_id, content, type, status, created_at')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // 9. Récupérer les livraisons (client_id dans deliveries)
      const { data: deliveriesAsClient } = await supabase
        .from('deliveries')
        .select('id, status, pickup_address, delivery_address, price, created_at')
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(25);

      const { data: deliveriesAsDriver } = await supabase
        .from('deliveries')
        .select('id, status, pickup_address, delivery_address, price, created_at')
        .eq('driver_id', userId)
        .order('created_at', { ascending: false })
        .limit(25);

      // Combiner et typer les résultats
      type DeliveryRow = { id: string; status: string; pickup_address: any; delivery_address: any; price: number; created_at: string };
      const deliveries: DeliveryRow[] = [
        ...((deliveriesAsClient || []) as DeliveryRow[]), 
        ...((deliveriesAsDriver || []) as DeliveryRow[])
      ];

      // 10. Récupérer les courses (rides)
      const { data: ridesAsCustomer } = await supabase
        .from('rides')
        .select('id, status, pickup_address, destination_address, actual_fare, estimated_fare, created_at')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(25);

      const { data: ridesAsDriver } = await supabase
        .from('rides')
        .select('id, status, pickup_address, destination_address, actual_fare, estimated_fare, created_at')
        .eq('driver_id', userId)
        .order('created_at', { ascending: false })
        .limit(25);

      // Combiner et typer les résultats
      type RideRow = { id: string; status: string; pickup_address: any; destination_address: any; actual_fare: number; estimated_fare: number; created_at: string };
      const rides: RideRow[] = [
        ...((ridesAsCustomer || []) as RideRow[]), 
        ...((ridesAsDriver || []) as RideRow[])
      ];

      // 11. Récupérer les avis
      const { data: reviews } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // 12. Info vendeur (si applicable)
      let vendorInfo: VendorInfo | null = null;
      if (roleType === 'vendor') {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (vendor) {
          // Compter les produits
          const { count: productCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id);

          vendorInfo = {
            id: vendor.id,
            business_name: vendor.business_name,
            business_type: vendor.business_type,
            is_active: vendor.is_active,
            total_products: productCount || 0,
            created_at: vendor.created_at
          };
        }
      }

      // 13. Info chauffeur (si applicable)
      let driverInfo: DriverInfo | null = null;
      if (roleType === 'driver') {
        const { data: driver } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (driver) {
          driverInfo = {
            id: driver.id,
            vehicle_type: driver.vehicle_type,
            license_number: driver.license_number,
            status: driver.status,
            total_deliveries: driver.total_deliveries,
            rating: driver.rating,
            created_at: driver.created_at
          };
        }
      }

      // Calculer les statistiques
      const allTransactions = [
        ...(sentTransactions || []).map(t => ({ ...t, direction: 'sent' as const })),
        ...(receivedTransactions || []).map(t => ({ ...t, direction: 'received' as const }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const totalSpent = (sentTransactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalReceived = (receivedTransactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalOrdersAmount = (orders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      
      const reviewRatings = (reviews || []).map(r => r.rating).filter(Boolean);
      const averageRating = reviewRatings.length > 0 
        ? reviewRatings.reduce((a, b) => a + b, 0) / reviewRatings.length 
        : 0;

      const registrationDate = profile?.created_at || userIdData.created_at;
      const accountAge = registrationDate 
        ? Math.floor((Date.now() - new Date(registrationDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Trouver la dernière activité
      const allDates = [
        ...(allTransactions.map(t => t.created_at)),
        ...(orders || []).map(o => o.created_at),
        ...(messages || []).map(m => m.created_at),
        ...(auditLogs || []).map(a => a.created_at)
      ].filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      const summary: UserActivitySummary = {
        profile: profile as UserFullProfile,
        customId: trimmedId,
        roleType,
        
        wallet: wallet ? {
          id: String(wallet.id),
          balance: Number(wallet.balance) || 0,
          currency: wallet.currency || 'GNF',
          status: wallet.wallet_status || 'active',
          created_at: wallet.created_at
        } : null,
        
        transactions: allTransactions.slice(0, 100).map(t => ({
          id: String(t.id),
          type: t.transaction_type || 'transfer',
          amount: Number(t.amount) || 0,
          currency: t.currency || 'GNF',
          status: t.status || 'completed',
          description: t.description,
          sender_user_id: t.sender_user_id,
          receiver_user_id: t.receiver_user_id,
          created_at: t.created_at,
          metadata: t.metadata
        })),
        totalTransactions: allTransactions.length,
        totalSpent,
        totalReceived,
        
        orders: (orders || []).map(o => ({
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          total_amount: Number(o.total_amount) || 0,
          created_at: o.created_at,
          updated_at: o.updated_at
        })),
        totalOrders: (orders || []).length,
        totalOrdersAmount,
        
        loginHistory: (loginHistory || []).map(l => ({
          id: l.id,
          ip_address: l.ip_address,
          user_agent: l.user_agent,
          success: l.success ?? false,
          attempted_at: l.attempted_at,
          role: l.role
        })),
        totalLogins: (loginHistory || []).filter(l => l.success).length,
        lastLogin: (loginHistory || [])[0]?.attempted_at || null,
        
        auditLogs: (auditLogs || []).map(a => ({
          id: a.id,
          action: a.action,
          target_type: a.target_type,
          target_id: a.target_id,
          ip_address: a.ip_address,
          user_agent: a.user_agent,
          data_json: a.data_json,
          created_at: a.created_at
        })),
        totalAuditEvents: (auditLogs || []).length,
        
        messages: (messages || []).map(m => ({
          id: m.id,
          recipient_id: m.recipient_id,
          content_preview: ((m.content as string) || '').substring(0, 50) + '...',
          type: m.type as string,
          status: m.status as string,
          created_at: m.created_at
        })),
        totalMessages: (messages || []).length,
        
        deliveries: deliveries.map(d => ({
          id: d.id,
          status: d.status,
          pickup_address: typeof d.pickup_address === 'object' ? JSON.stringify(d.pickup_address) : String(d.pickup_address || ''),
          delivery_address: typeof d.delivery_address === 'object' ? JSON.stringify(d.delivery_address) : String(d.delivery_address || ''),
          price: Number(d.price) || 0,
          created_at: d.created_at
        })),
        
        rides: rides.map(r => ({
          id: r.id,
          status: r.status,
          pickup_address: typeof r.pickup_address === 'object' ? JSON.stringify(r.pickup_address) : String(r.pickup_address || ''),
          destination_address: typeof r.destination_address === 'object' ? JSON.stringify(r.destination_address) : String(r.destination_address || ''),
          fare: Number(r.actual_fare || r.estimated_fare) || 0,
          created_at: r.created_at
        })),
        
        reviews: (reviews || []).map(r => ({
          id: r.id,
          rating: r.rating,
          content: r.content,
          product_id: r.product_id,
          created_at: r.created_at
        })),
        totalReviews: (reviews || []).length,
        averageRating,
        
        vendorInfo,
        driverInfo,
        
        accountAge,
        registrationDate,
        lastActivity: allDates[0] || null
      };

      setActivityData(summary);
      toast.success('Données utilisateur chargées', {
        description: `${summary.totalAuditEvents} événements trouvés`
      });

      return summary;

    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la recherche';
      setError(errorMessage);
      toast.error('Recherche échouée', { description: errorMessage });
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
    link.download = `user_activity_${activityData.customId}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    toast.success('Export JSON réussi');
  }, [activityData]);

  return {
    searchUserById,
    activityData,
    loading,
    error,
    exportToJson,
    reset: () => {
      setActivityData(null);
      setError(null);
    }
  };
}
