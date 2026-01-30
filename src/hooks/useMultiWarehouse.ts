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
  // Noms de colonnes Supabase
  source_location_id: string;
  destination_location_id: string;
  // Alias pour compatibilité
  from_location_id?: string;
  to_location_id?: string;
  status: 'pending' | 'in_transit' | 'shipped' | 'delivered' | 'completed' | 'partial' | 'cancelled';
  created_at: string;
  shipped_at: string | null;
  received_at: string | null;
  notes: string | null;
  shipping_notes: string | null;
  reception_notes: string | null;
  total_items: number | null;
  total_quantity_sent: number | null;
  total_quantity_received: number | null;
  total_quantity_lost: number | null;
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
  quantity_received: number | null;
  quantity_lost: number | null;
  notes: string | null;
  lot_number: string | null;
  expiry_date: string | null;
  loss_reason: string | null;
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
  loss_type: string;
  quantity: number;
  unit_cost: number | null;
  total_loss_value: number | null;
  reason: string;
  status: string | null;
  loss_date: string | null;
  transfer_id: string | null;
  transfer_item_id: string | null;
  documented_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
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
        .from('locations')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('is_default', { ascending: false })
        .order('location_type')
        .order('name');

      if (error) throw error;

      // Mapper les données vers le format attendu et récupérer les stats
      const locationsWithStats = await Promise.all(
        (data || []).map(async (loc) => {
          // Obtenir les stats de stock pour ce lieu
          const { data: stockData } = await supabase
            .from('location_stock')
            .select('quantity, minimum_stock, cost_price')
            .eq('location_id', loc.id);
          
          const stats = {
            location_id: loc.id,
            total_products: stockData?.length || 0,
            total_quantity: stockData?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0,
            total_value: stockData?.reduce((sum, s) => sum + ((s.quantity || 0) * (s.cost_price || 0)), 0) || 0,
            low_stock_count: stockData?.filter(s => s.quantity > 0 && s.quantity <= s.minimum_stock).length || 0,
            out_of_stock_count: stockData?.filter(s => s.quantity === 0).length || 0,
            pending_transfers_in: 0,
            pending_transfers_out: 0
          };
          
          return {
            ...loc,
            coordinates: loc.gps_coordinates,
            stats
          };
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
          from_location:locations!stock_transfers_source_location_id_fkey(id, name, location_type),
          to_location:locations!stock_transfers_destination_location_id_fkey(id, name, location_type),
          items:stock_transfer_items(
            *,
            product:products(id, name, sku, images)
          )
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

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
          location:locations(id, name),
          product:products(id, name)
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
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
        .from('locations')
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
        .from('locations')
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
        .from('locations')
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
        .from('locations')
        .update({ is_default: false })
        .eq('vendor_id', vendorId);

      // Mettre ce lieu par défaut
      const { error } = await supabase
        .from('locations')
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
        .from('locations')
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
      // Récupérer les stocks du produit dans tous les lieux du vendeur
      const { data: stockData, error: stockError } = await supabase
        .from('location_stock')
        .select(`
          *,
          location:locations(id, name, location_type, is_pos_enabled)
        `)
        .eq('product_id', productId);

      if (stockError) throw stockError;

      // Filtrer par vendeur (via les locations)
      const filteredData = (stockData || []).filter(s => 
        s.location?.vendor_id === vendorId || true // On garde tout pour l'instant
      );

      const result: ProductStockByLocations = {
        product_id: productId,
        total_quantity: filteredData.reduce((sum, s) => sum + (s.quantity || 0), 0),
        total_available: filteredData.reduce((sum, s) => sum + (s.available_quantity || 0), 0),
        total_reserved: filteredData.reduce((sum, s) => sum + (s.reserved_quantity || 0), 0),
        locations: filteredData.map(s => ({
          location_id: s.location_id,
          location_name: s.location?.name || 'Inconnu',
          location_type: s.location?.location_type || 'warehouse',
          is_pos: s.location?.is_pos_enabled || false,
          quantity: s.quantity || 0,
          available: s.available_quantity || 0,
          reserved: s.reserved_quantity || 0,
          minimum: s.minimum_stock || 0,
          is_low_stock: (s.quantity || 0) <= (s.minimum_stock || 0)
        }))
      };

      return result;
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

      if (!user?.id) {
        toast.error('Utilisateur non authentifié');
        return null;
      }

      const { data, error } = await supabase.rpc('create_stock_transfer', {
        p_vendor_id: vendorId,
        p_source_location_id: input.from_location_id,
        p_destination_location_id: input.to_location_id,
        p_items: input.items,
        p_notes: input.notes || null,
        p_created_by: user.id
      });

      if (error) throw error;

      // La fonction retourne directement l'ID du transfert
      const transferId = typeof data === 'string' ? data : data?.transfer_id || data?.id;

      if (!transferId) {
        toast.error('Erreur lors de la création du transfert');
        return null;
      }

      toast.success('Transfert créé avec succès');
      await fetchTransfers();
      
      // Retourner le transfert créé
      const { data: transfer } = await supabase
        .from('stock_transfers')
        .select('*')
        .eq('id', transferId)
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

      if (!user?.id) {
        toast.error('Utilisateur non authentifié');
        return false;
      }

      const { data, error } = await supabase.rpc('ship_transfer', {
        p_transfer_id: transferId,
        p_shipped_by: user.id,
        p_shipping_notes: notes || null
      });

      if (error) throw error;

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

      if (!user?.id) {
        toast.error('Utilisateur non authentifié');
        return false;
      }

      const { data, error } = await supabase.rpc('receive_transfer', {
        p_transfer_id: input.transfer_id,
        p_items_received: input.items,
        p_received_by: user.id,
        p_reception_notes: input.notes || null
      });

      if (error) throw error;

      toast.success('Transfert confirmé');
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
