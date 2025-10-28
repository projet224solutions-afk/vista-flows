import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { rateLimiter } from '@/lib/rateLimiter';

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  notes?: string;
  priority: number;
  created_at: string;
  // Joined data
  product?: {
    name: string;
    price: number;
    image_url?: string;
    stock?: number;
  };
}

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWishlist([]);
        return;
      }

      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          product:products(name, price, image_url, stock)
        `)
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWishlist(data || []);
    } catch (error: any) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (productId: string, notes?: string, priority: number = 3) => {
    // Rate limiting
    if (!rateLimiter.check('add-wishlist', { maxRequests: 30, windowMs: 60000 })) {
      toast.error('Trop de requêtes. Veuillez patienter.');
      return false;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return false;
      }

      const { error } = await supabase
        .from('wishlists')
        .insert({
          user_id: user.id,
          product_id: productId,
          notes,
          priority
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Ce produit est déjà dans votre liste de souhaits');
        } else {
          throw error;
        }
      } else {
        toast.success('Ajouté à la liste de souhaits');
      }

      await loadWishlist();
      return true;
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      toast.error('Erreur lors de l\'ajout');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Retiré de la liste de souhaits');
      await loadWishlist();
      return true;
    } catch (error: any) {
      console.error('Error removing from wishlist:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const isInWishlist = (productId: string): boolean => {
    return wishlist.some(item => item.product_id === productId);
  };

  useEffect(() => {
    loadWishlist();

    // Subscribe to realtime updates
    const { data: { user } } = supabase.auth.getUser();
    if (!user) return;

    const channel = supabase
      .channel('wishlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlists',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadWishlist();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    wishlist,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    reload: loadWishlist
  };
};
