/**
 * FAVORITE BUTTON - Bouton favori réutilisable
 * Petit cœur discret à placer sur les cartes produit/vendeur
 */
import { Heart } from "lucide-react";
import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  size?: "sm" | "md";
}

function FavoriteButtonComponent({ productId, className, size = "sm" }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || !productId) return;
    let cancelled = false;

    supabase
      .from('wishlists')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .then(({ count }) => {
        if (!cancelled) setIsFav((count || 0) > 0);
      });

    return () => { cancelled = true; };
  }, [user?.id, productId]);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user?.id) {
      toast.error('Connectez-vous pour ajouter aux favoris');
      return;
    }
    setLoading(true);
    try {
      if (isFav) {
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
        setIsFav(false);
        toast.success('Retiré des favoris');
      } else {
        const { error } = await supabase
          .from('wishlists')
          .insert({ user_id: user.id, product_id: productId });
        if (error?.code === '23505') {
          setIsFav(true);
          return;
        }
        if (error) throw error;
        setIsFav(true);
        toast.success('Ajouté aux favoris ❤️');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  }, [user?.id, productId, isFav]);

  const sizeClasses = size === "sm"
    ? "w-7 h-7"
    : "w-8 h-8";

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "rounded-full flex items-center justify-center",
        "transition-all duration-200",
        "backdrop-blur-sm shadow-sm",
        "hover:scale-110 active:scale-95",
        "disabled:opacity-50",
        isFav
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-background/80 text-muted-foreground hover:text-red-500 hover:bg-background border border-border/50",
        sizeClasses,
        className
      )}
    >
      <Heart className={cn(iconSize, isFav && "fill-current")} />
    </button>
  );
}

export const FavoriteButton = memo(FavoriteButtonComponent);
export default FavoriteButton;
