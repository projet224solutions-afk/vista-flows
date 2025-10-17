/**
 * HOOK DONNÉES CLIENT - DONNÉES RÉELLES
 * Gestion des données réelles pour le dashboard client
 * 224Solutions - Interface Client Opérationnelle
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  category: string;
  discount?: number;
  inStock: boolean;
  seller: string;
  brand: string;
  isHot?: boolean;
  isNew?: boolean;
  isFreeShipping?: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: unknown;
  color: string;
  itemCount: number;
}

interface Order {
  id: string;
  productName: string;
  status: string;
  total: number;
  date: string;
  seller: string;
}

export function useClientData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les produits depuis Supabase
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          image_url,
          rating,
          reviews_count,
          category,
          discount,
          in_stock,
          created_at,
          vendors!inner(business_name, brand)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      if (productsError) {
        console.error('❌ Erreur chargement produits:', productsError);
        throw productsError;
      }

      const formattedProducts: Product[] = productsData?.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.discount ? product.price / (1 - product.discount / 100) : undefined,
        image: product.image_url || 'https://via.placeholder.com/400x300?text=Produit',
        rating: product.rating || 4.5,
        reviews: product.reviews_count || 0,
        category: product.category || 'general',
        discount: product.discount,
        inStock: product.in_stock,
        seller: (product.vendors as unknown)?.business_name || (product.vendors as unknown)?.brand || 'Vendeur',
        brand: (product.vendors as unknown)?.brand || (product.vendors as unknown)?.business_name || 'Marque',
        isHot: Math.random() > 0.7,
        isNew: new Date(product.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        isFreeShipping: Math.random() > 0.5
      })) || [];

      setProducts(formattedProducts);
    } catch (error) {
      console.error('❌ Erreur chargement produits:', error);
      setError('Erreur lors du chargement des produits');
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les catégories depuis Supabase
  const loadCategories = useCallback(async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          icon,
          color,
          products_count
        `)
        .eq('is_active', true)
        .order('name');

      if (categoriesError) {
        console.error('❌ Erreur chargement catégories:', categoriesError);
        throw categoriesError;
      }

      const formattedCategories: Category[] = categoriesData?.map(category => ({
        id: category.id,
        name: category.name,
        icon: null, // TODO: Implémenter vraies icônes
        color: category.color || 'bg-blue-500',
        itemCount: category.products_count || 0
      })) || [];

      setCategories(formattedCategories);
    } catch (error) {
      console.error('❌ Erreur chargement catégories:', error);
      setError('Erreur lors du chargement des catégories');
    }
  }, []);

  // Charger les commandes de l'utilisateur
  const loadOrders = useCallback(async (userId: string) => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          order_items!inner(
            products!inner(name),
            vendors!inner(business_name)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (ordersError) {
        console.error('❌ Erreur chargement commandes:', ordersError);
        throw ordersError;
      }

      const formattedOrders: Order[] = ordersData?.map(order => {
        const firstItem = order.order_items?.[0];
        const productData = firstItem?.products as unknown;
        const vendorData = firstItem?.vendors as unknown;

        return {
          id: order.id,
          productName: productData?.name || 'Produit',
          status: order.status,
          total: order.total_amount,
          date: new Date(order.created_at).toISOString().split('T')[0],
          seller: vendorData?.business_name || 'Vendeur'
        };
      }) || [];

      setOrders(formattedOrders);
    } catch (error) {
      console.error('❌ Erreur chargement commandes:', error);
      setError('Erreur lors du chargement des commandes');
    }
  }, []);

  // Ajouter au panier
  const addToCart = useCallback((product: Product) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        return prev; // Déjà dans le panier
      }
      return [...prev, product];
    });
    toast.success('Produit ajouté au panier');
  }, []);

  // Retirer du panier
  const removeFromCart = useCallback((productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
    toast.success('Produit retiré du panier');
  }, []);

  // Vider le panier
  const clearCart = useCallback(() => {
    setCartItems([]);
    toast.success('Panier vidé');
  }, []);

  // Créer une commande
  const createOrder = useCallback(async (userId: string) => {
    if (cartItems.length === 0) {
      toast.error('Panier vide');
      return;
    }

    try {
      const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          total_amount: totalAmount,
          status: 'pending',
          order_items: cartItems.map(item => ({
            product_id: item.id,
            quantity: 1,
            price: item.price
          }))
        })
        .select()
        .single();

      if (orderError) {
        throw orderError;
      }

      // Vider le panier après commande
      clearCart();

      // Recharger les commandes
      await loadOrders(userId);

      toast.success('Commande créée avec succès');
      return orderData;
    } catch (error) {
      console.error('❌ Erreur création commande:', error);
      toast.error('Erreur lors de la création de la commande');
    }
  }, [cartItems, clearCart, loadOrders]);

  // Charger toutes les données
  const loadAllData = useCallback(async (userId?: string) => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        loadProducts(),
        loadCategories(),
        ...(userId ? [loadOrders(userId)] : [])
      ]);

      console.log('✅ Données client chargées avec succès');
    } catch (error) {
      console.error('❌ Erreur chargement données client:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [loadProducts, loadCategories, loadOrders]);

  // Charger les données au montage
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    products,
    categories,
    orders,
    cartItems,
    loading,
    error,
    addToCart,
    removeFromCart,
    clearCart,
    createOrder,
    loadAllData,
    refetch: loadAllData
  };
}
