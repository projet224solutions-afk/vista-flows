import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, MessageCircle, Star, Truck, Shield, X, Plus, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import ProductReviewsSection from "./ProductReviewsSection";
import { ShareButton } from "@/components/shared/ShareButton";
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
    shop_slug?: string;
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
  const { addToCart } = useCart();

  useEffect(() => {
    if (productId && open) {
      loadProduct();
    }
  }, [productId, open]);

  const loadProduct = async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      // D'abord essayer de charger depuis products (produits physiques)
      const { data: physicalProduct, error: physicalError } = await supabase
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
            user_id,
            shop_slug
          )
        `)
        .eq('id', productId)
        .maybeSingle();

      if (physicalProduct) {
        setProduct(physicalProduct);
        setSelectedImage(0);
        return;
      }

      // Si pas trouvé, essayer service_products (produits numériques)
      const { data: digitalProduct, error: digitalError } = await supabase
        .from('service_products')
        .select(`
          id,
          name,
          price,
          description,
          images,
          professional_service_id,
          professional_services (
            business_name,
            user_id
          )
        `)
        .eq('id', productId)
        .maybeSingle();

      if (digitalProduct) {
        const proService = digitalProduct.professional_services as any;
        setProduct({
          id: digitalProduct.id,
          name: digitalProduct.name,
          price: digitalProduct.price,
          description: digitalProduct.description,
          images: Array.isArray(digitalProduct.images) ? digitalProduct.images as string[] : [],
          vendor_id: digitalProduct.professional_service_id,
          category_id: undefined,
          is_active: true,
          vendors: proService ? {
            business_name: proService.business_name || 'Vendeur',
            user_id: proService.user_id,
            shop_slug: undefined
          } : undefined
        });
        setSelectedImage(0);
        return;
      }

      // Aucun produit trouvé
      throw new Error('Produit introuvable');
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

  const handleAddToCart = () => {
    if (!product) return;

    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0],
        vendor_id: product.vendor_id,
        vendor_name: product.vendors?.business_name
      });
    }
    
    toast.success(`${quantity} produit(s) ajouté(s) au panier`);
    onClose();
  };

  const handleContact = async () => {
    if (!product?.vendors?.user_id) {
      toast.error('Informations du vendeur non disponibles');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Veuillez vous connecter pour contacter le vendeur');
        navigate('/auth');
        return;
      }

      // Vérifier que l'utilisateur a un profil, sinon le créer
      const { data: senderProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!senderProfile) {
        // Créer le profil automatiquement
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilisateur'
          });
        
        if (createError) {
          console.error('Erreur création profil:', createError);
          toast.error('Impossible de configurer votre profil. Veuillez réessayer.');
          return;
        }
      }

      // Vérifier que le vendeur a un profil, sinon le créer automatiquement
      let { data: recipientProfile, error: recipientError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', product.vendors.user_id)
        .maybeSingle();

      if (!recipientProfile) {
        console.log('Profil vendeur non trouvé, création automatique pour:', product.vendors.user_id);
        
        // ✅ Utiliser les infos du vendeur disponibles (pas besoin d'appel admin)
        const vendorName = product.vendors.business_name || 'Vendeur';
        // Générer un email placeholder basé sur l'ID vendeur (sera mis à jour plus tard)
        const vendorEmail = `vendeur_${product.vendors.user_id.slice(0, 8)}@224solution.net`;
        
        const { data: createdProfile, error: createVendorError } = await supabase
          .from('profiles')
          .insert({
            id: product.vendors.user_id,
            email: vendorEmail,
            full_name: vendorName
          })
          .select('id, full_name')
          .single();

        if (createVendorError) {
          console.error('Erreur création profil vendeur:', createVendorError);
          // Si erreur de conflit (profil existe déjà), réessayer de récupérer
          if (createVendorError.code === '23505') {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', product.vendors.user_id)
              .maybeSingle();
            recipientProfile = existingProfile;
          } else {
            // ✅ Continuer quand même - le message peut fonctionner sans profil vendeur complet
            console.warn('Profil vendeur non créé, mais on continue avec le message');
          }
        } else {
          recipientProfile = createdProfile;
        }
      }

      // Créer un message initial
      const initialMessage = `Bonjour, je suis intéressé par votre produit "${product.name}". Pouvez-vous me donner plus d'informations ?`;
      
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: product.vendors.user_id,
          content: initialMessage,
          type: 'text'
        });

      if (messageError) {
        console.error('Erreur création message:', messageError);
        throw messageError;
      }

      toast.success('Message envoyé au vendeur!');
      
      // Rediriger vers la page de messagerie
      setTimeout(() => {
        onClose();
        navigate(`/messages?recipientId=${product.vendors.user_id}`);
      }, 1000);
      
    } catch (error) {
      console.error('Erreur lors du contact:', error);
      toast.error('Impossible de contacter le vendeur. Veuillez réessayer.');
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
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <ScrollArea className="h-[85vh] pr-4">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{product.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="details">Détails du produit</TabsTrigger>
            <TabsTrigger value="reviews">Avis clients</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="grid md:grid-cols-2 gap-6">
          {/* Images */}
          <div className="space-y-4">
            <div className="relative h-[600px] rounded-lg overflow-hidden bg-white flex items-center justify-center p-3 border border-border/20">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="max-w-full max-h-full w-auto h-auto object-contain"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
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
                    <img loading="lazy" src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-contain" />
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
                  {product.price.toLocaleString()} GNF
                </span>
                <Badge variant="secondary">En stock</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground min-w-0">
                  Vendu par{" "}
                  {product.vendors?.business_name ? (
                    <Link
                      to={`/boutique/${product.vendors.shop_slug || product.vendor_id}`}
                      className="font-medium text-foreground hover:text-primary inline-flex items-center gap-1"
                    >
                      <span className="truncate">{product.vendors.business_name}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">Vendeur</span>
                  )}
                </p>

                <ShareButton
                  title={product.vendors?.business_name || "Boutique"}
                  text={`Découvrez la boutique ${product.vendors?.business_name || ""} sur 224 Solutions`}
                  url={`${window.location.origin}/boutique/${product.vendors?.shop_slug || product.vendor_id}`}
                  variant="outline"
                  size="icon"
                  useShortUrl={true}
                />
              </div>
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
                <span className="text-accent-foreground">Total</span>
                <span className="text-accent-foreground">{(product.price * quantity).toLocaleString()} GNF</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={handleBuy}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Acheter maintenant
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleAddToCart}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter au panier ({quantity})
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={handleContact}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contacter
                </Button>
                <ShareButton
                  title={product.name}
                  text={`Découvrez ${product.name} à ${product.price.toLocaleString()} GNF sur 224 Solutions`}
                  url={`${window.location.origin}/product/${product.id}`}
                  variant="outline"
                  size="icon"
                  resourceType="product"
                  resourceId={product.id}
                  useShortUrl={false}
                />
              </div>
            </div>

            {/* Garanties */}
            <div className="space-y-2 pt-4 pb-6">
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
      </TabsContent>

      <TabsContent value="reviews">
        <ProductReviewsSection 
          productId={product.id}
          productName={product.name}
        />
      </TabsContent>
        </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
