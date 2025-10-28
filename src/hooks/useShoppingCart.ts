import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateInput, amountSchema } from '@/lib/inputValidation';
import { rateLimiter } from '@/lib/rateLimiter';

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  price_at_addition: number;
  selected_options?: any;
  created_at: string;
  // Joined data
  product?: {
    name: string;
    image_url?: string;
    stock?: number;
  };
}

export interface ShoppingCart {
  id: string;
  user_id: string;
  items: CartItem[];
  total: number;
  itemCount: number;
}

export const useShoppingCart = () => {
  const [cart, setCart] = useState<ShoppingCart | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCart = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCart(null);
        return;
      }

      // Récupérer ou créer le panier
      let { data: cartData, error: cartError } = await supabase
        .from('shopping_carts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (cartError && cartError.code === 'PGRST116') {
        // Créer un nouveau panier
        const { data: newCart, error: createError } = await supabase
          .from('shopping_carts')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        cartData = newCart;
      } else if (cartError) {
        throw cartError;
      }

      // Charger les items
      const { data: items, error: itemsError } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(name, image_url, stock)
        `)
        .eq('cart_id', cartData!.id);

      if (itemsError) throw itemsError;

      const total = items?.reduce((sum, item) => sum + (item.price_at_addition * item.quantity), 0) || 0;
      const itemCount = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      setCart({
        ...cartData!,
        items: items || [],
        total,
        itemCount
      });
    } catch (error: any) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: string, quantity: number = 1, price: number, options?: any) => {
    // Rate limiting
    if (!rateLimiter.check('add-to-cart', { maxRequests: 20, windowMs: 60000 })) {
      toast.error('Trop de requêtes. Veuillez patienter.');
      return false;
    }

    // Validation
    const validation = validateInput(amountSchema, price);
    if (!validation.success) {
      toast.error(validation.errors?.[0] || 'Prix invalide');
      return false;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return false;
      }

      // Récupérer le panier
      let { data: cartData } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!cartData) {
        const { data: newCart, error: createError } = await supabase
          .from('shopping_carts')
          .insert({ user_id: user.id })
          .select('id')
          .single();

        if (createError) throw createError;
        cartData = newCart;
      }

      // Vérifier si le produit existe déjà
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cartData.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existingItem) {
        // Mettre à jour la quantité
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;
      } else {
        // Ajouter un nouvel item
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cartData.id,
            product_id: productId,
            quantity,
            price_at_addition: price,
            selected_options: options
          });

        if (insertError) throw insertError;
      }

      toast.success('Produit ajouté au panier');
      await loadCart();
      return true;
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast.error('Erreur lors de l\'ajout au panier');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      return removeFromCart(itemId);
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;
      await loadCart();
      return true;
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Produit retiré du panier');
      await loadCart();
      return true;
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    if (!cart) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);

      if (error) throw error;

      toast.success('Panier vidé');
      await loadCart();
      return true;
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      toast.error('Erreur lors du vidage du panier');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();

    // Subscribe to realtime updates
    const { data: { user } } = supabase.auth.getUser();
    if (!user) return;

    const channel = supabase
      .channel('cart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
        },
        () => {
          loadCart();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    cart,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    reload: loadCart
  };
};
