// @ts-nocheck
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
          images,
          category_id,
          discount,
          stock,
          created_at,
          is_active,
          vendors!inner(business_name)
        `)
        .eq('is_active', true)
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
        image: (Array.isArray(product.images) && product.images.length > 0) ? product.images[0] : '/placeholder.svg',
        rating: 0,
        reviews: 0,
        category: product.category_id || 'general',
        discount: product.discount || 0,
        inStock: (product.stock || 0) > 0,
        seller: (product.vendors as unknown)?.business_name || 'Vendeur',
        brand: (product.vendors as unknown)?.business_name || 'Marque',
        isHot: false,
        isNew: new Date(product.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        isFreeShipping: false
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
        .select('id, name, description, image_url')
        .eq('is_active', true)
        .order('name');

      if (categoriesError) {
        console.error('❌ Erreur chargement catégories:', categoriesError);
        throw categoriesError;
      }

      // Compter les produits par catégorie
      const categoriesWithCount = await Promise.all(
        (categoriesData || []).map(async (category) => {
           const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('is_active', true);

          return {
            id: category.id,
            name: category.name,
            icon: null,
            color: 'bg-blue-500',
            itemCount: count || 0
          };
        })
      );

      setCategories(categoriesWithCount);

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
          vendor_id
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (ordersError) {
        console.error('❌ Erreur chargement commandes:', ordersError);
        throw ordersError;
      }

      // Récupérer les détails des commandes avec les items
      const formattedOrders: Order[] = await Promise.all(
        (ordersData || []).map(async (order) => {
          // Récupérer les items de la commande
          const { data: items } = await supabase
            .from('order_items')
            .select(`
              product_id,
              products(name)
            `)
            .eq('order_id', order.id)
            .limit(1)
            .single();

          // Récupérer le vendeur
          const { data: vendor } = await supabase
            .from('vendors')
            .select('business_name')
            .eq('id', order.vendor_id)
            .single();

          return {
            id: order.id,
            productName: (items?.products as any)?.name || 'Commande',
            status: order.status,
            total: order.total_amount,
            date: new Date(order.created_at).toLocaleDateString('fr-FR'),
            seller: vendor?.business_name || 'Vendeur'
          };
        })
      );

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
      
      // Récupérer le customer_id à partir de l'user_id
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!customer) {
        throw new Error('Client introuvable');
      }

      // Créer la commande
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customer.id,
          vendor_id: cartItems[0]?.seller, // Utiliser le vendeur du premier item
          total_amount: totalAmount,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (orderError) {
        throw orderError;
      }

      // Créer les items de commande
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(
          cartItems.map(item => ({
            order_id: orderData.id,
            product_id: item.id,
            quantity: 1,
            unit_price: item.price,
            total_price: item.price
          }))
        );

      if (itemsError) {
        throw itemsError;
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
