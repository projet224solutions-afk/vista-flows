import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingCart, MessageCircle, Star, Shield, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  currency?: string;
  description?: string;
  images?: string[];
  stock_quantity?: number;
  vendor_id: string;
  vendors?: {
    business_name: string;
    id: string;
  };
  category_id?: string;
  categories?: {
    name: string;
  };
  rating?: number;
  reviews_count?: number;
  status?: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          vendors:vendor_id(business_name, id),
          categories:category_id(name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Erreur chargement produit:', error);
      toast.error('Impossible de charger le produit');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!product) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Veuillez vous connecter pour acheter');
      navigate('/auth');
      return;
    }

    navigate(`/payment?productId=${product.id}&quantity=${quantity}`);
  };

  const handleContact = async () => {
    if (!product?.vendor_id) {
      toast.error('Informations du vendeur non disponibles');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Veuillez vous connecter pour contacter le vendeur');
      navigate('/auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: product.vendor_id,
          content: `Bonjour, je suis intéressé par votre produit "${product.name}".`,
          type: 'text'
        });

      if (error) throw error;
      toast.success('Message envoyé au vendeur');
      navigate(`/messages?recipientId=${product.vendor_id}`);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-4">Produit introuvable</h2>
          <p className="text-muted-foreground mb-6">Ce produit n'existe pas ou a été supprimé.</p>
          <Button onClick={() => navigate('/marketplace')}>Retour au marketplace</Button>
        </Card>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 
    ? product.images 
    : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop'];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketplace')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Détails du produit</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-accent">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === idx ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-2xl font-bold text-foreground">{product.name}</h2>
                {product.status === 'active' && (
                  <Badge variant="default">Disponible</Badge>
                )}
              </div>
              
              {product.categories && (
                <Badge variant="secondary" className="mb-2">{product.categories.name}</Badge>
              )}

              {product.rating && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= (product.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({product.reviews_count || 0} avis)
                  </span>
                </div>
              )}

              <p className="text-3xl font-bold text-primary mb-4">
                {product.price.toLocaleString()} {product.currency || 'GNF'}
              </p>

              {product.description && (
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="font-medium">Quantité:</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={product.stock_quantity ? quantity >= product.stock_quantity : false}
                >
                  +
                </Button>
              </div>
              {product.stock_quantity && (
                <span className="text-sm text-muted-foreground">
                  ({product.stock_quantity} en stock)
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleBuy} className="flex-1">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Acheter
              </Button>
              <Button onClick={handleContact} variant="outline">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>

            {/* Vendor */}
            {product.vendors && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Vendu par</h3>
                <p className="text-foreground">{product.vendors.business_name}</p>
              </Card>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">Paiement sécurisé</p>
                  <p className="text-xs text-muted-foreground">100% protégé</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                <Truck className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">Livraison rapide</p>
                  <p className="text-xs text-muted-foreground">Sous 48h</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
