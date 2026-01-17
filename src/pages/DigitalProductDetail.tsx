/**
 * Page de détail d'un produit numérique
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Eye, Star, Shield, Download, ShoppingCart, MessageCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShareButton } from "@/components/shared/ShareButton";
import { LocalPrice } from "@/components/ui/LocalPrice";

interface DigitalProductWithVendor {
  id: string;
  merchant_id: string;
  vendor_id: string | null;
  title: string;
  description: string | null;
  short_description: string | null;
  images: string[];
  category: string;
  product_mode: string;
  price: number;
  original_price: number | null;
  commission_rate: number;
  currency: string;
  affiliate_url: string | null;
  affiliate_platform: string | null;
  file_urls: string[];
  file_type: string | null;
  tags: string[];
  status: string;
  views_count: number;
  sales_count: number;
  rating: number;
  reviews_count: number;
  created_at: string;
  vendors?: {
    id: string;
    business_name: string;
    shop_slug?: string;
    logo_url?: string;
  };
}

export default function DigitalProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<DigitalProductWithVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Utiliser l'ID depuis les params ou depuis le query string
  const productId = id || searchParams.get('id');

  useEffect(() => {
    if (productId) {
      loadProduct();
      incrementViews();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('digital_products')
        .select(`
          *,
          vendors:vendor_id(id, business_name, shop_slug, logo_url)
        `)
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;
      setProduct(data as DigitalProductWithVendor);
    } catch (error) {
      console.error('Erreur chargement produit:', error);
      toast.error('Impossible de charger le produit');
    } finally {
      setLoading(false);
    }
  };

  const incrementViews = async () => {
    try {
      // Récupérer le count actuel et incrémenter
      const { data } = await supabase
        .from('digital_products')
        .select('views_count')
        .eq('id', productId)
        .single();
      
      if (data) {
        await supabase
          .from('digital_products')
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq('id', productId);
      }
    } catch (error) {
      console.error('Erreur incrémentation vues:', error);
    }
  };

  // formatPrice conservé pour les cas simples sans conversion
  const formatPriceSimple = (price: number, currency: string = 'GNF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleBuy = async () => {
    if (!product) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Veuillez vous connecter pour acheter');
      navigate('/auth');
      return;
    }

    // Pour les produits affiliés, rediriger vers le lien
    if (product.product_mode === 'affiliate' && product.affiliate_url) {
      window.open(product.affiliate_url, '_blank');
      return;
    }

    // TODO: Implémenter le système de paiement pour produits numériques
    toast.info('Système de paiement en cours de développement');
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
          content: `Bonjour, je suis intéressé par votre produit numérique "${product.title}".`,
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
          <p className="text-muted-foreground mb-6">Ce produit numérique n'existe pas ou a été supprimé.</p>
          <Button onClick={() => navigate('/digital-products')}>Retour aux produits numériques</Button>
        </Card>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 
    ? product.images 
    : ['/placeholder.svg'];

  const vendor = product.vendors;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground flex-1">Produit numérique</h1>
          <ShareButton
            title={product.title}
            text={`Découvrez ${product.title} sur 224 Solutions`}
            url={`${window.location.origin}/product/${product.id}?type=digital`}
            resourceType="product"
            resourceId={product.id}
            useShortUrl={true}
          />
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Images */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img
                src={images[currentImageIndex]}
                alt={product.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              
              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                <Badge className="bg-primary text-primary-foreground">
                  {product.category}
                </Badge>
                {product.product_mode === 'affiliate' && (
                  <Badge variant="secondary">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Affiliation
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      currentImageIndex === idx ? 'border-primary' : 'border-transparent hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.title} ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{product.title}</h2>
              
              {product.short_description && (
                <p className="text-muted-foreground mb-4">{product.short_description}</p>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{product.views_count || 0} vues</span>
                </div>
                {product.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{product.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-4">
                {product.price > 0 ? (
                  <>
                    <LocalPrice 
                      amount={product.price} 
                      currency={product.currency || 'GNF'} 
                      size="xl"
                      showOriginal={true}
                      className="text-primary"
                    />
                    {product.original_price && product.original_price > product.price && (
                      <LocalPrice 
                        amount={product.original_price} 
                        currency={product.currency || 'GNF'} 
                        size="md"
                        className="text-muted-foreground line-through"
                      />
                    )}
                  </>
                ) : (
                  <span className="text-3xl font-bold text-green-600">Gratuit</span>
                )}
              </div>

              {product.product_mode === 'affiliate' && product.commission_rate > 0 && (
                <Badge variant="outline" className="mb-4">
                  Commission: {product.commission_rate}%
                </Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleBuy} className="flex-1" size="lg">
                {product.product_mode === 'affiliate' ? (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Voir l'offre
                  </>
                ) : product.price > 0 ? (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Acheter
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </>
                )}
              </Button>
              <Button onClick={handleContact} variant="outline" size="lg">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>

            {/* Vendor */}
            {vendor && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Vendu par</h3>
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to={`/boutique/${vendor.shop_slug || vendor.id}`}
                    className="flex items-center gap-3 group hover:text-primary transition-colors flex-1"
                  >
                    {vendor.logo_url ? (
                      <img
                        src={vendor.logo_url}
                        alt={vendor.business_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <span className="font-medium group-hover:text-primary">
                        {vendor.business_name}
                      </span>
                      <p className="text-xs text-muted-foreground">Cliquez pour voir la boutique</p>
                    </div>
                  </Link>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
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
                <Download className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">Accès immédiat</p>
                  <p className="text-xs text-muted-foreground">Téléchargement direct</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
