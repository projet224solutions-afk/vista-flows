import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, MessageCircle, Star, Truck, Shield, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  images?: string[];
  vendor_id: string;
  category_id?: string;
  is_active: boolean;
  vendors?: {
    business_name: string;
    user_id: string;
  };
}

interface ProductDetailModalProps {
  productId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function ProductDetailModal({ productId, open, onClose }: ProductDetailModalProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    if (productId && open) {
      loadProduct();
    }
  }, [productId, open]);

  const loadProduct = async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          description,
          images,
          vendor_id,
          category_id,
          is_active,
          vendors (
            business_name,
            user_id
          )
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      setProduct(data);
      setSelectedImage(0);
    } catch (error) {
      console.error('Erreur chargement produit:', error);
      toast.error('Impossible de charger le produit');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!product) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Veuillez vous connecter pour acheter');
        navigate('/auth');
        return;
      }

      // Créer un lien de paiement
      const totalAmount = product.price * quantity;
      
      toast.success('Redirection vers le paiement...');
      navigate(`/payment`, { 
        state: { 
          productId: product.id,
          productName: product.name,
          amount: totalAmount,
          quantity,
          vendorId: product.vendor_id
        } 
      });
    } catch (error) {
      console.error('Erreur lors de l\'achat:', error);
      toast.error('Erreur lors de la création du paiement');
    }
  };

  const handleContact = async () => {
    if (!product?.vendors?.user_id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Veuillez vous connecter pour contacter le vendeur');
        navigate('/auth');
        return;
      }

      // Créer une conversation ou naviguer vers la messagerie
      toast.info('Fonctionnalité de messagerie en développement');
      // TODO: Implémenter la navigation vers la messagerie avec le vendeur
    } catch (error) {
      console.error('Erreur lors du contact:', error);
      toast.error('Impossible de contacter le vendeur');
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) return null;

  const images = product.images && product.images.length > 0 
    ? product.images 
    : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Images */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-accent">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                      selectedImage === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Détails */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold text-primary">
                  {product.price.toLocaleString('fr-GN')} GNF
                </span>
                <Badge variant="secondary">En stock</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Vendu par <span className="font-medium text-foreground">{product.vendors?.business_name || 'Vendeur'}</span>
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {product.description || 'Aucune description disponible'}
              </p>
            </div>

            <Separator />

            {/* Quantité */}
            <div>
              <label className="text-sm font-medium mb-2 block">Quantité</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </Button>
                <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            <Separator />

            {/* Total */}
            <div className="bg-accent p-4 rounded-lg">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-primary">{(product.price * quantity).toLocaleString('fr-GN')} GNF</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleBuy}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Acheter maintenant
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={handleContact}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Contacter le vendeur
              </Button>
            </div>

            {/* Garanties */}
            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Paiement sécurisé</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="w-4 h-4" />
                <span>Livraison rapide disponible</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
