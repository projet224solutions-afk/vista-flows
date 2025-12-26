import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Star, Phone, Mail, MessageCircle, Package, Clock, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShareButton } from "@/components/shared/ShareButton";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import QuickFooter from "@/components/QuickFooter";

interface Vendor {
  id: string;
  business_name: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  rating?: number;
  total_orders?: number;
  business_type?: string;
  service_type?: string;
  service_types?: string[];
  opening_hours?: string;
  is_active: boolean;
  user_id: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
  is_active: boolean;
  stock_quantity?: number;
  category_id?: string;
  categories?: {
    name: string;
  };
}

export default function VendorShop() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vendorId) {
      loadVendorData();
    }
  }, [vendorId]);

  const loadVendorData = async () => {
    try {
      setLoading(true);
      
      // Charger les infos du vendeur
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (vendorError) throw vendorError;
      
      if (!vendorData || !vendorData.is_active) {
        toast.error('Cette boutique n\'existe pas ou n\'est plus active');
        navigate('/marketplace');
        return;
      }

      setVendor(vendorData);

      // Charger les produits du vendeur
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          images,
          is_active,
          stock_quantity,
          category_id,
          categories:category_id(name)
        `)
        .eq('vendor_id', vendorId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

    } catch (error) {
      console.error('Erreur chargement boutique:', error);
      toast.error('Impossible de charger la boutique');
    } finally {
      setLoading(false);
    }
  };

  const handleContactVendor = async () => {
    if (!vendor) return;

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
          recipient_id: vendor.user_id,
          content: `Bonjour, je visite votre boutique "${vendor.business_name}" et j'aimerais en savoir plus sur vos produits.`,
          type: 'text'
        });

      if (error) throw error;
      toast.success('Message envoyé au vendeur');
      navigate(`/messages?recipientId=${vendor.user_id}`);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de la boutique...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-4">Boutique introuvable</h2>
          <p className="text-muted-foreground mb-6">Cette boutique n'existe pas ou n'est plus active.</p>
          <Button onClick={() => navigate('/marketplace')}>Retour au marketplace</Button>
        </Card>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-4 h-4 ${
              i < Math.floor(rating) 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-muted-foreground/30'
            }`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/marketplace')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Boutique</h1>
          </div>
          <ShareButton
            title={vendor.business_name}
            text={`Découvrez la boutique ${vendor.business_name} sur 224 Solutions`}
            url={`${window.location.origin}/shop/${vendor.id}`}
            variant="outline"
            size="sm"
          />
        </div>
      </header>

      {/* Cover Image / Header */}
      <div className="relative h-48 bg-gradient-to-r from-primary/20 to-primary/5">
        {vendor.cover_image_url && (
          <img 
            src={vendor.cover_image_url} 
            alt={`Bannière ${vendor.business_name}`}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Logo vendeur */}
        <div className="absolute -bottom-12 left-4">
          <div className="w-24 h-24 rounded-xl bg-card border-4 border-background shadow-lg overflow-hidden">
            {vendor.logo_url ? (
              <img 
                src={vendor.logo_url} 
                alt={vendor.business_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">
                  {vendor.business_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Info */}
      <div className="px-4 pt-16 pb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-1">{vendor.business_name}</h2>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {vendor.business_type && (
                <Badge variant="secondary">
                  <Store className="w-3 h-3 mr-1" />
                  {vendor.business_type === 'physical' ? 'Boutique physique' : 
                   vendor.business_type === 'digital' ? 'En ligne' : 
                   vendor.business_type === 'hybrid' ? 'Physique + En ligne' : vendor.business_type}
                </Badge>
              )}
              {vendor.service_type && (
                <Badge variant="outline">
                  <Truck className="w-3 h-3 mr-1" />
                  {vendor.service_type === 'retail' ? 'Vente au détail' :
                   vendor.service_type === 'wholesale' ? 'Vente en gros' :
                   vendor.service_type === 'mixed' ? 'Détail + Gros' :
                   vendor.service_type === 'services' ? 'Services' : vendor.service_type}
                </Badge>
              )}
            </div>

            {vendor.rating !== undefined && vendor.rating > 0 && (
              <div className="flex items-center gap-2 mb-2">
                {renderStars(vendor.rating)}
                <span className="text-sm text-muted-foreground">
                  {vendor.rating.toFixed(1)} ({vendor.total_orders || 0} ventes)
                </span>
              </div>
            )}

            {vendor.description && (
              <p className="text-muted-foreground mb-4">{vendor.description}</p>
            )}

            {/* Informations de contact et localisation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {(vendor.city || vendor.neighborhood || vendor.address) && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    {vendor.address && <p>{vendor.address}</p>}
                    {(vendor.neighborhood || vendor.city) && (
                      <p>{[vendor.neighborhood, vendor.city].filter(Boolean).join(', ')}</p>
                    )}
                  </div>
                </div>
              )}
              
              {vendor.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <a href={`tel:${vendor.phone}`} className="hover:text-primary transition-colors">
                    {vendor.phone}
                  </a>
                </div>
              )}

              {vendor.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <a href={`mailto:${vendor.email}`} className="hover:text-primary transition-colors truncate">
                    {vendor.email}
                  </a>
                </div>
              )}

              {vendor.opening_hours && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>{vendor.opening_hours}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:self-start">
            {vendor.phone && (
              <Button variant="outline" asChild>
                <a href={`tel:${vendor.phone}`}>
                  <Phone className="w-4 h-4 mr-2" />
                  Appeler
                </a>
              </Button>
            )}
            <Button onClick={handleContactVendor}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <ShareButton
              title={vendor.business_name}
              text={`Découvrez la boutique ${vendor.business_name} sur 224 Solutions`}
              url={`${window.location.origin}/shop/${vendor.id}`}
              variant="outline"
              size="icon"
            />
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            <Package className="w-5 h-5 inline mr-2" />
            Produits ({products.length})
          </h3>
        </div>

        {products.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ce vendeur n'a pas encore de produits disponibles.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <MarketplaceProductCard
                key={product.id}
                id={product.id}
                image={product.images || []}
                title={product.name}
                price={product.price}
                vendor={vendor.business_name}
                vendorId={vendor.id}
                rating={vendor.rating || 0}
                reviewCount={vendor.total_orders || 0}
                stock={product.stock_quantity}
                category={product.categories?.name}
                onBuy={() => handleProductClick(product.id)}
                onAddToCart={() => {
                  toast.success('Produit ajouté au panier');
                }}
                onContact={handleContactVendor}
              />
            ))}
          </div>
        )}
      </div>

      <QuickFooter />
    </div>
  );
}
