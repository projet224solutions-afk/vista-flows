import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, MessageCircle, Star, Truck, Shield, X, Plus, ExternalLink, Play, Pause } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import ProductReviewsSection from "./ProductReviewsSection";
import { ShareButton } from "@/components/shared/ShareButton";
import { useAutoCarousel } from "@/hooks/useAutoCarousel";
import { trackProductView } from "@/services/analyticsTrackingService";
import { LocalPrice } from "@/components/ui/LocalPrice";
interface Product {
  id: string;
  name: string;
  price: number;
  currency?: string; // Devise du produit
  description?: string;
  images?: string[];
  promotional_videos?: string[];
  vendor_id: string;
  category_id?: string;
  is_active: boolean;
  vendors?: {
    business_name: string;
    user_id: string;
    shop_slug?: string;
  };
  // ✅ Champs pour les produits d'affiliation
  is_affiliate?: boolean;
  affiliate_url?: string;
  product_mode?: string;
}

interface ProductDetailModalProps {
  productId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function ProductDetailModal({ productId, open, onClose }: ProductDetailModalProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const hasTrackedView = useRef(false);
  const lastTrackedProductId = useRef<string | null>(null);

  // Mémoriser les vidéos et images pour le carrousel
  const videos = useMemo(() => product?.promotional_videos || [], [product?.promotional_videos]);
  const images = useMemo(() => 
    product?.images && product.images.length > 0 
      ? product.images 
      : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop'],
    [product?.images]
  );

  // Hook de carrousel automatique
  const {
    currentVideoIndex,
    currentImageIndex,
    isPlayingVideo,
    isAutoPlaying,
    videoRef,
    goToVideo,
    goToImage,
    toggleAutoPlay
  } = useAutoCarousel({
    videos,
    images,
    imageDisplayDuration: 3000,
    enabled: open
  });

  useEffect(() => {
    if (productId && open) {
      loadProduct();
    }
    // Reset tracking when modal closes or product changes
    if (!open) {
      hasTrackedView.current = false;
    }
  }, [productId, open]);

  // Tracker la vue du produit une seule fois par produit
  useEffect(() => {
    if (product && product.vendor_id && open && lastTrackedProductId.current !== product.id) {
      lastTrackedProductId.current = product.id;
      trackProductView(product.id, product.vendor_id);
    }
  }, [product, open]);

  const loadProduct = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      // 1) Produits physiques (products)
      const { data: physicalProduct, error: physicalError } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          price,
          description,
          images,
          promotional_videos,
          vendor_id,
          category_id,
          is_active,
          vendors (
            business_name,
            user_id,
            shop_slug
          )
        `
        )
        .eq("id", productId)
        .maybeSingle();

      if (physicalError) throw physicalError;
      if (physicalProduct) {
        setProduct(physicalProduct);
        return;
      }

      // 2) Ancien flux "service_products" (legacy)
      const { data: serviceProduct, error: serviceError } = await supabase
        .from("service_products")
        .select(
          `
          id,
          name,
          price,
          description,
          images,
          professional_service_id,
          professional_services (
            business_name,
            user_id,
            status
          )
        `
        )
        .eq("id", productId)
        .maybeSingle();

      if (serviceError) throw serviceError;

      if (serviceProduct) {
        const proService = serviceProduct.professional_services as any;

        // Ne pas afficher si le service n'est plus actif
        if (!proService || proService.status !== "active") {
          throw new Error("Produit introuvable");
        }

        setProduct({
          id: serviceProduct.id,
          name: serviceProduct.name,
          price: serviceProduct.price,
          description: serviceProduct.description,
          images: Array.isArray(serviceProduct.images) ? (serviceProduct.images as string[]) : [],
          promotional_videos: [],
          vendor_id: serviceProduct.professional_service_id,
          category_id: undefined,
          is_active: true,
          vendors: {
            business_name: proService.business_name || "Vendeur",
            user_id: proService.user_id,
            shop_slug: undefined,
          },
        });
        return;
      }

      // 3) Produits numériques (digital_products) ✅
      const { data: digitalProduct, error: digitalError } = await supabase
        .from("digital_products")
        .select(
          `
          id,
          title,
          price,
          currency,
          description,
          images,
          status,
          vendor_id,
          merchant_id,
          product_mode,
          affiliate_url,
          vendors:vendors!digital_products_vendor_id_fkey (
            business_name,
            user_id,
            shop_slug
          )
        `
        )
        .eq("id", productId)
        .maybeSingle();

      if (digitalError) throw digitalError;

      if (digitalProduct) {
        if (digitalProduct.status !== "published") {
          throw new Error("Produit introuvable");
        }

        const v = (digitalProduct.vendors as any) || null;

        setProduct({
          id: digitalProduct.id,
          name: digitalProduct.title,
          price: digitalProduct.price || 0,
          currency: digitalProduct.currency || 'GNF', // Devise du produit
          description: digitalProduct.description || undefined,
          images: Array.isArray(digitalProduct.images) ? (digitalProduct.images as string[]) : [],
          promotional_videos: [],
          vendor_id: digitalProduct.vendor_id || digitalProduct.merchant_id,
          category_id: undefined,
          is_active: true,
          vendors: {
            business_name: v?.business_name || "Vendeur",
            user_id: v?.user_id || digitalProduct.merchant_id,
            shop_slug: v?.shop_slug || undefined,
          },
          // ✅ Champs affiliation
          is_affiliate: digitalProduct.product_mode === "affiliate",
          affiliate_url: digitalProduct.affiliate_url || undefined,
          product_mode: digitalProduct.product_mode || undefined,
        });
        return;
      }

      throw new Error("Produit introuvable");
    } catch (error) {
      console.error("Erreur chargement produit:", error);
      toast.error("Impossible de charger le produit");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!product) return;

    // ✅ Si c'est un produit d'affiliation, rediriger vers le fournisseur
    if (product.is_affiliate && product.affiliate_url) {
      toast.success("Redirection vers le fournisseur...", {
        description: "Vous allez être redirigé vers la page de paiement du partenaire",
        duration: 2000,
      });
      
      // Ouvrir dans un nouvel onglet après un court délai
      setTimeout(() => {
        window.open(product.affiliate_url, "_blank", "noopener,noreferrer");
      }, 500);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Veuillez vous connecter pour acheter');
        navigate('/auth');
        return;
      }

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
          <DialogHeader>
            <DialogTitle className="sr-only">Chargement du produit</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) return null;

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
          {/* Images & Video Carousel */}
          <div className="space-y-4">
            <div className="relative h-[600px] rounded-lg overflow-hidden bg-white flex items-center justify-center p-3 border border-border/20">
              {/* Bouton Play/Pause */}
              <button
                onClick={toggleAutoPlay}
                className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
              >
                {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              {isPlayingVideo && videos.length > 0 ? (
                <video
                  ref={videoRef}
                  src={videos[currentVideoIndex]}
                  controls
                  autoPlay
                  muted
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : (
                <img
                  src={images[currentImageIndex]}
                  alt={product.name}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              )}

              {/* Indicateur de progression */}
              {!isPlayingVideo && images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        currentImageIndex === idx ? 'bg-primary' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Thumbnails - Videos + Images */}
            <div className="grid grid-cols-6 gap-2">
              {/* Video thumbnails */}
              {videos.map((_, index) => (
                <button
                  key={`video-${index}`}
                  onClick={() => goToVideo(index)}
                  className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all bg-black flex items-center justify-center ${
                    isPlayingVideo && currentVideoIndex === index ? 'border-primary' : 'border-transparent hover:border-primary/50'
                  }`}
                >
                  <Play className="w-6 h-6 text-white" />
                  <span className="absolute bottom-0.5 left-0.5 text-[8px] text-white bg-black/60 px-1 rounded">
                    {index + 1}
                  </span>
                </button>
              ))}
              
              {/* Image thumbnails */}
              {images.map((img, index) => (
                <button
                  key={`img-${index}`}
                  onClick={() => goToImage(index)}
                  className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                    !isPlayingVideo && currentImageIndex === index ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img loading="lazy" src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          </div>

          {/* Détails */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <LocalPrice 
                  amount={product.price} 
                  currency={product.currency || 'GNF'} 
                  size="xl"
                  showOriginal={true}
                  className="text-primary"
                />
                {product.is_affiliate ? (
                  <Badge className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white border-0">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Affiliation
                  </Badge>
                ) : (
                  <Badge variant="secondary">En stock</Badge>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground min-w-0">
                  Vendu par{" "}
                  {product.vendors?.business_name ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                        navigate(`/boutique/${product.vendors?.shop_slug || product.vendor_id}`);
                      }}
                      className="font-medium text-foreground hover:text-primary inline-flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                    >
                      <span className="truncate">{product.vendors.business_name}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </button>
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

            {/* Quantité - masquer pour les affiliations */}
            {!product.is_affiliate && (
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
            )}

            {!product.is_affiliate && <Separator />}

            {/* Total - masquer pour les affiliations */}
            {!product.is_affiliate && (
              <div className="bg-accent p-4 rounded-lg">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span className="text-accent-foreground">Total</span>
                  <LocalPrice 
                    amount={product.price * quantity} 
                    currency={product.currency || 'GNF'} 
                    size="lg"
                    className="text-accent-foreground"
                  />
                </div>
              </div>
            )}

            {/* Notice affiliation */}
            {product.is_affiliate && (
              <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <ExternalLink className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">Produit partenaire</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                      En cliquant sur "Acheter", vous serez redirigé vers le site du fournisseur pour finaliser votre achat en toute sécurité.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <Button 
                className={`w-full ${product.is_affiliate ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700' : ''}`}
                onClick={handleBuy}
              >
                {product.is_affiliate ? (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Acheter chez le partenaire
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Acheter maintenant
                  </>
                )}
              </Button>
              {!product.is_affiliate && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleAddToCart}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter au panier ({quantity})
                </Button>
              )}
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
                <span>{product.is_affiliate ? 'Achat sécurisé chez le partenaire' : 'Paiement sécurisé'}</span>
              </div>
              {!product.is_affiliate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="w-4 h-4" />
                  <span>Livraison rapide disponible</span>
                </div>
              )}
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
