// @ts-nocheck
/**
 * Hook de gestion multi-entrepôts et multi-POS
 * 224SOLUTIONS - Système professionnel
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import { toast } from 'sonner';

// Types
export interface VendorLocation {
  id: string;
  vendor_id: string;
  name: string;
  code: string | null;
  description: string | null;
  location_type: 'warehouse' | 'pos';
  is_pos_enabled: boolean;
  address: string | null;
  city: string | null;
  country: string;
  coordinates: { lat: number; lng: number } | null;
  manager_name: string | null;
  manager_phone: string | null;
  manager_email: string | null;
  is_active: boolean;
  is_default: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Computed
  stats?: LocationStats;
}

export interface LocationStock {
  id: string;
  location_id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  minimum_stock: number;
  maximum_stock: number | null;
  reorder_point: number;
  reorder_quantity: number;
  bin_location: string | null;
  lot_number: string | null;
  expiry_date: string | null;
  cost_price: number;
  last_purchase_price: number | null;
  last_stock_update: string;
  last_sale_at: string | null;
  product?: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    price: number;
    images: string[] | null;
  };
  location?: VendorLocation;
}

export interface StockTransfer {
  id: string;
  vendor_id: string;
  transfer_number: string;
  from_location_id: string;
  to_location_id: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'completed' | 'partial' | 'cancelled';
  initiated_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  confirmed_at: string | null;
  initiated_by: string | null;
  shipped_by: string | null;
  received_by: string | null;
  confirmed_by: string | null;
  notes: string | null;
  shipping_notes: string | null;
  reception_notes: string | null;
  total_items_sent: number;
  total_items_received: number;
  total_items_missing: number;
  total_value: number;
  // Relations
  from_location?: VendorLocation;
  to_location?: VendorLocation;
  items?: StockTransferItem[];
}

export interface StockTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity_sent: number;
  quantity_received: number;
  quantity_missing: number;
  unit_cost: number;
  total_value: number;
  notes: string | null;
  reception_notes: string | null;
  missing_reason: string | null;
  product?: {
    id: string;
    name: string;
    sku: string | null;
    images: string[] | null;
  };
}

export interface StockLoss {
  id: string;
  vendor_id: string;
  loss_number: string;
  location_id: string;
  product_id: string;
  source_type: 'transfer' | 'inventory' | 'damage' | 'expiry' | 'theft' | 'other';
  source_reference_id: string | null;
  quantity: number;
  unit_cost: number;
  total_loss_value: number;
  reason: string | null;
  notes: string | null;
  is_validated: boolean;
  validated_by: string | null;
  validated_at: string | null;
  reported_by: string | null;
  reported_at: string;
  location?: VendorLocation;
  product?: {
    id: string;
    name: string;
  };
}

export interface LocationStats {
  location_id: string;
  total_products: number;
  total_quantity: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  pending_transfers_in: number;
  pending_transfers_out: number;
}

export interface ProductStockByLocations {
  product_id: string;
  total_quantity: number;
  total_available: number;
  total_reserved: number;
  locations: {
    location_id: string;
    location_name: string;
    location_type: string;
    is_pos: boolean;
    quantity: number;
    available: number;
    reserved: number;
    minimum: number;
    is_low_stock: boolean;
  }[];
}

export interface CreateLocationInput {
  name: string;
  code?: string;
  description?: string;
  location_type?: 'warehouse' | 'pos';
  is_pos_enabled?: boolean;
  address?: string;
  city?: string;
  country?: string;
  manager_name?: string;
  manager_phone?: string;
  manager_email?: string;
  is_default?: boolean;
}

export interface CreateTransferInput {
  from_location_id: string;
  to_location_id: string;
  items: {
    product_id: string;
    quantity: number;
    unit_cost?: number;
  }[];
  notes?: string;
}

export interface ConfirmReceptionInput {
  transfer_id: string;
  items: {
    product_id: string;
    quantity_received: number;
    notes?: string;
    missing_reason?: 'damaged' | 'lost' | 'stolen' | 'counting_error' | 'other';
  }[];
  notes?: string;
}

export function useMultiWarehouse() {
  const { vendorId, loading: vendorLoading } = useCurrentVendor();
  
  const [locations, setLocations] = useState<VendorLocation[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [losses, setLosses] = useState<StockLoss[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =============================================
  // FETCH FUNCTIONS
  // =============================================

  const fetchLocations = useCallback(async () => {
    if (!vendorId) return;

    try {
      const { data, error } = await supabase
        .from('vendor_locations')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('is_default', { ascending: false })
        .order('location_type')
        .order('name');

      if (error) throw error;

      // Récupérer les stats pour chaque lieu
      const locationsWithStats = await Promise.all(
        (data || []).map(async (loc) => {
          const { data: statsData } = await supabase
            .rpc('get_location_stats', { p_location_id: loc.id });
          return { ...loc, stats: statsData };
        })
      );

      setLocations(locationsWithStats);
    } catch (err: any) {
      console.error('Erreur chargement lieux:', err);
      setError(err.message);
    }
  }, [vendorId]);

  const fetchTransfers = useCallback(async (status?: string) => {
    if (!vendorId) return;

    try {
      let query = supabase
        .from('stock_transfers')
        .select(`
          *,
          from_location:vendor_locations!stock_transfers_from_location_id_fkey(id, name, location_type),
          to_location:vendor_locations!stock_transfers_to_location_id_fkey(id, name, location_type),
          items:stock_transfer_items(
            *,
            product:products(id, name, sku, images)
          )
        `)
        .eq('vendor_id', vendorId)
        .order('initiated_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setTransfers(data || []);
    } catch (err: any) {
      console.error('Erreur chargement transferts:', err);
      setError(err.message);
    }
  }, [vendorId]);

  const fetchLosses = useCallback(async () => {
    if (!vendorId) return;

    try {
      const { data, error } = await supabase
        .from('stock_losses')
        .select(`
          *,
          location:vendor_locations(id, name),
          product:products(id, name)
        `)
        .eq('vendor_id', vendorId)
        .order('reported_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLosses(data || []);
    } catch (err: any) {
      console.error('Erreur chargement pertes:', err);
      setError(err.message);
    }
  }, [vendorId]);

  // =============================================
  // LOCATION MANAGEMENT
  // =============================================

  const createLocation = async (input: CreateLocationInput): Promise<VendorLocation | null> => {
    if (!vendorId) {
      toast.error('Vendeur non identifié');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('vendor_locations')
        .insert({
          vendor_id: vendorId,
          ...input,
          location_type: input.location_type || 'warehouse',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`${input.location_type === 'pos' ? 'Point de vente' : 'Entrepôt'} créé avec succès`);
      await fetchLocations();
      return data;
    } catch (err: any) {
      console.error('Erreur création lieu:', err);
      toast.error(err.message || 'Erreur lors de la création');
      return null;
    }
  };

  const updateLocation = async (locationId: string, updates: Partial<CreateLocationInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('vendor_locations')
        .update(updates)
        .eq('id', locationId);

      if (error) throw error;

      toast.success('Lieu mis à jour');
      await fetchLocations();
      return true;
    } catch (err: any) {
      console.error('Erreur mise à jour lieu:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour');
      return false;
    }
  };

  const togglePOS = async (locationId: string, enable: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('vendor_locations')
        .update({ 
          is_pos_enabled: enable,
          location_type: enable ? 'pos' : 'warehouse'
        })
        .eq('id', locationId);

      if (error) throw error;

      toast.success(enable ? 'POS activé' : 'POS désactivé');
      await fetchLocations();
      return true;
    } catch (err: any) {
      console.error('Erreur toggle POS:', err);
      toast.error(err.message);
      return false;
    }
  };

  const setDefaultLocation = async (locationId: string): Promise<boolean> => {
    if (!vendorId) return false;

    try {
      // Retirer le défaut de tous les autres
      await supabase
        .from('vendor_locations')
        .update({ is_default: false })
        .eq('vendor_id', vendorId);

      // Mettre ce lieu par défaut
      const { error } = await supabase
        .from('vendor_locations')
        .update({ is_default: true })
        .eq('id', locationId);

      if (error) throw error;

      toast.success('Lieu par défaut mis à jour');
      await fetchLocations();
      return true;
    } catch (err: any) {
      console.error('Erreur mise à jour défaut:', err);
      toast.error(err.message);
      return false;
    }
  };

  const deleteLocation = async (locationId: string): Promise<boolean> => {
    try {
      // Vérifier qu'il n'y a pas de stock
      const { data: stocks } = await supabase
        .from('location_stock')
        .select('id')
        .eq('location_id', locationId)
        .gt('quantity', 0)
        .limit(1);

      if (stocks && stocks.length > 0) {
        toast.error('Impossible de supprimer: ce lieu contient du stock');
        return false;
      }

      const { error } = await supabase
        .from('vendor_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      toast.success('Lieu supprimé');
      await fetchLocations();
      return true;
    } catch (err: any) {
      console.error('Erreur suppression lieu:', err);
      toast.error(err.message);
      return false;
    }
  };

  // =============================================
  // STOCK MANAGEMENT
  // =============================================

  const getLocationStock = async (locationId: string): Promise<LocationStock[]> => {
    try {
      const { data, error } = await supabase
        .from('location_stock')
        .select(`
          *,
          product:products(id, name, sku, barcode, price, images)
        `)
        .eq('location_id', locationId)
        .order('product(name)');

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Erreur chargement stock:', err);
      return [];
    }
  };

  const getProductStockByLocations = async (productId: string): Promise<ProductStockByLocations | null> => {
    if (!vendorId) return null;

    try {
      const { data, error } = await supabase
        .rpc('get_product_stock_by_locations', {
          p_product_id: productId,
          p_vendor_id: vendorId
        });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Erreur chargement stock produit:', err);
      return null;
    }
  };

  const adjustStock = async (
    locationId: string,
    productId: string,
    newQuantity: number,
    reason: string
  ): Promise<boolean> => {
    try {
      // Récupérer le stock actuel
      const { data: current } = await supabase
        .from('location_stock')
        .select('quantity')
        .eq('location_id', locationId)
        .eq('product_id', productId)
        .single();

      const previousQty = current?.quantity || 0;
      const change = newQuantity - previousQty;

      // Upsert le stock
      const { error: stockError } = await supabase
        .from('location_stock')
        .upsert({
          location_id: locationId,
          product_id: productId,
          quantity: newQuantity,
          last_stock_update: new Date().toISOString()
        }, {
          onConflict: 'location_id,product_id'
        });

      if (stockError) throw stockError;

      // Enregistrer dans l'historique
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('location_stock_history')
        .insert({
          location_id: locationId,
          product_id: productId,
          movement_type: 'adjustment',
          quantity_before: previousQty,
          quantity_change: change,
          quantity_after: newQuantity,
          performed_by: user?.id,
          notes: reason
        });

      toast.success('Stock ajusté');
      return true;
    } catch (err: any) {
      console.error('Erreur ajustement stock:', err);
      toast.error(err.message);
      return false;
    }
  };

  // =============================================
  // TRANSFER MANAGEMENT
  // =============================================

  const createTransfer = async (input: CreateTransferInput): Promise<StockTransfer | null> => {
    if (!vendorId) {
      toast.error('Vendeur non identifié');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('create_stock_transfer', {
        p_vendor_id: vendorId,
        p_from_location_id: input.from_location_id,
        p_to_location_id: input.to_location_id,
        p_items: input.items,
        p_notes: input.notes || null,
        p_user_id: user?.id || null
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Erreur lors de la création du transfert');
        return null;
      }

      toast.success(`Transfert ${data.transfer_number} créé`);
      await fetchTransfers();
      
      // Retourner le transfert créé
      const { data: transfer } = await supabase
        .from('stock_transfers')
        .select('*')
        .eq('id', data.transfer_id)
        .single();
      
      return transfer;
    } catch (err: any) {
      console.error('Erreur création transfert:', err);
      toast.error(err.message);
      return null;
    }
  };

  const shipTransfer = async (transferId: string, notes?: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('ship_transfer', {
        p_transfer_id: transferId,
        p_user_id: user?.id || null,
        p_notes: notes || null
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Erreur lors de l\'expédition');
        return false;
      }

      toast.success('Transfert expédié - En transit');
      await fetchTransfers();
      return true;
    } catch (err: any) {
      console.error('Erreur expédition transfert:', err);
      toast.error(err.message);
      return false;
    }
  };

  const confirmTransferReception = async (input: ConfirmReceptionInput): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('confirm_transfer_reception', {
        p_transfer_id: input.transfer_id,
        p_received_items: input.items,
        p_user_id: user?.id || null,
        p_notes: input.notes || null
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Erreur lors de la confirmation');
        return false;
      }

      if (data.total_missing > 0) {
        toast.warning(`Transfert confirmé avec ${data.total_missing} article(s) manquant(s)`);
      } else {
        toast.success('Transfert confirmé - Complet');
      }

      await fetchTransfers();
      await fetchLosses();
      return true;
    } catch (err: any) {
      console.error('Erreur confirmation transfert:', err);
      toast.error(err.message);
      return false;
    }
  };

  const cancelTransfer = async (transferId: string): Promise<boolean> => {
    try {
      // Vérifier que le transfert n'est pas déjà expédié
      const { data: transfer } = await supabase
        .from('stock_transfers')
        .select('status')
        .eq('id', transferId)
        .single();

      if (transfer?.status !== 'pending') {
        toast.error('Seuls les transferts en attente peuvent être annulés');
        return false;
      }

      const { error } = await supabase
        .from('stock_transfers')
        .update({ status: 'cancelled' })
        .eq('id', transferId);

      if (error) throw error;

      toast.success('Transfert annulé');
      await fetchTransfers();
      return true;
    } catch (err: any) {
      console.error('Erreur annulation transfert:', err);
      toast.error(err.message);
      return false;
    }
  };

  // =============================================
  // COMPUTED VALUES
  // =============================================

  const warehouses = locations.filter(l => l.location_type === 'warehouse' && !l.is_pos_enabled);
  const posLocations = locations.filter(l => l.is_pos_enabled);
  const activeLocations = locations.filter(l => l.is_active);
  const defaultLocation = locations.find(l => l.is_default);

  const pendingTransfers = transfers.filter(t => t.status === 'pending');
  const inTransitTransfers = transfers.filter(t => t.status === 'in_transit');
  const completedTransfers = transfers.filter(t => t.status === 'completed' || t.status === 'partial');

  const totalLossValue = losses.reduce((sum, l) => sum + (l.total_loss_value || 0), 0);

  // =============================================
  // EFFECTS
  // =============================================

  useEffect(() => {
    if (!vendorLoading && vendorId) {
      setLoading(true);
      Promise.all([
        fetchLocations(),
        fetchTransfers(),
        fetchLosses()
      ]).finally(() => setLoading(false));
    }
  }, [vendorId, vendorLoading, fetchLocations, fetchTransfers, fetchLosses]);

  return {
    // Data
    locations,
    warehouses,
    posLocations,
    activeLocations,
    defaultLocation,
    transfers,
    pendingTransfers,
    inTransitTransfers,
    completedTransfers,
    losses,
    totalLossValue,
    
    // State
    loading,
    error,
    
    // Location Actions
    createLocation,
    updateLocation,
    deleteLocation,
    togglePOS,
    setDefaultLocation,
    
    // Stock Actions
    getLocationStock,
    getProductStockByLocations,
    adjustStock,
    
    // Transfer Actions
    createTransfer,
    shipTransfer,
    confirmTransferReception,
    cancelTransfer,
    
    // Refresh
    refresh: () => Promise.all([fetchLocations(), fetchTransfers(), fetchLosses()]),
    refreshLocations: fetchLocations,
    refreshTransfers: fetchTransfers,
    refreshLosses: fetchLosses,
  };
}
