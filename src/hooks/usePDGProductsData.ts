import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  is_active: boolean;
  category_id?: string;
  images?: string[];
  created_at: string;
  updated_at?: string;
  stock_info?: {
    quantity: number;
    warehouse_id?: number;
    lot_number?: string;
  }[];
}

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  lowStock: number;
  totalValue: number;
  totalStock: number;
}

export interface VendorInfo {
  id: string;
  user_id: string;
}

export function usePDGProductsData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProductStats>({
    total: 0,
    active: 0,
    inactive: 0,
    lowStock: 0,
    totalValue: 0,
    totalStock: 0
  });

  // Charger les produits
  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const productsData = data || [];
      setProducts(productsData);

      // Calculer les statistiques
      const activeProducts = productsData.filter(p => p.is_active);
      const totalValue = productsData.reduce((sum, p) => sum + (p.price || 0), 0);

      setStats({
        total: productsData.length,
        active: activeProducts.length,
        inactive: productsData.length - activeProducts.length,
        lowStock: 0, // À calculer si la table stock existe
        totalValue,
        totalStock: productsData.length // Nombre de produits = stock (catalogue)
      });
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  // Charger les vendeurs
  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, user_id')
        .order('user_id', { ascending: true });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Erreur chargement vendeurs:', error);
    }
  };

  // Bloquer/Débloquer un produit
  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;

      toast.success(`Produit ${!currentStatus ? 'activé' : 'désactivé'} avec succès`);
      await loadProducts();
    } catch (error) {
      console.error('Erreur modification statut:', error);
      toast.error('Erreur lors de la modification du statut');
    }
  };

  // Supprimer un produit
  const deleteProduct = async (productId: string) => {
    try {
      // Supprimer le produit directement (les cascades doivent être gérées au niveau de la DB)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('Produit supprimé avec succès');
      await loadProducts();
    } catch (error) {
      console.error('Erreur suppression produit:', error);
      toast.error('Erreur lors de la suppression du produit');
    }
  };

  // Mettre à jour un produit
  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Produit mis à jour avec succès');
      await loadProducts();
      return true;
    } catch (error) {
      console.error('Erreur mise à jour produit:', error);
      toast.error('Erreur lors de la mise à jour du produit');
      return false;
    }
  };

  // Obtenir les détails d'un produit avec les infos du vendeur
  const getProductWithVendor = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          vendors (
            id,
            user_id
          )
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur chargement détails produit:', error);
      return null;
    }
  };

  useEffect(() => {
    loadProducts();
    loadVendors();
  }, []);

  return {
    products,
    vendors,
    loading,
    stats,
    loadProducts,
    toggleProductStatus,
    deleteProduct,
    updateProduct,
    getProductWithVendor
  };
}
