import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, MapPin, Star, Phone, Mail, MessageCircle, Package, Clock, Store, Truck, AlertTriangle, Laptop, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShareButton } from "@/components/shared/ShareButton";
import { TranslatedProductCard } from "@/components/marketplace/TranslatedProductCard";
import QuickFooter from "@/components/QuickFooter";
import { useAuth } from "@/hooks/useAuth";
import { useVendorDigitalProducts } from "@/hooks/useHasDigitalProducts";
import { trackShopVisit } from "@/services/analyticsTrackingService";
import SEOHead from "@/components/SEOHead";
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
  shop_slug?: string;
  public_id?: string; // public_id du vendeur depuis profiles
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
  const params = useParams<{ vendorId?: string; slug?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState("physical");
  const hasTrackedVisit = useRef(false);

  // Récupérer les produits numériques du vendeur
  const { products: digitalProducts, loading: digitalProductsLoading } = useVendorDigitalProducts(vendor?.id);
  // Le paramètre peut être 'slug' ou 'vendorId' selon la route utilisée
  const identifier = params.slug || params.vendorId;

  // Debug: Log quand le composant se charge
  useEffect(() => {
    console.log('🏪 [VendorShop] Component mounted with:', {
      vendorId: params.vendorId,
      slug: params.slug,
      identifier,
      pathname: window.location.pathname,
      fullUrl: window.location.href
    });
  }, []);

  useEffect(() => {
    if (identifier) {
      console.log('🏪 [VendorShop] Loading vendor data for identifier:', identifier);
      loadVendorData();
    } else {
      console.error('🏪 [VendorShop] No identifier found! This should not happen.');
    }
  }, [identifier, user?.id]);

  // Tracker la visite de la boutique une seule fois
  useEffect(() => {
    if (vendor && vendor.id && !hasTrackedVisit.current && !isOwner) {
      hasTrackedVisit.current = true;
      trackShopVisit(vendor.id);
    }
  }, [vendor, isOwner]);

  const loadVendorData = async () => {
    try {
      setLoading(true);
      
      let vendorData: Vendor | null = null;
      
      // Le paramètre peut être un slug ou un ID
      const id = identifier;
      
      if (!id) {
        toast.error('Identifiant boutique manquant');
        navigate('/marketplace');
        return;
      }
      
      // Vérifier si c'est un UUID valide
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUUID) {
        // Recherche par ID
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (error) throw error;
        vendorData = data;
      } else {
        // Recherche par slug
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('shop_slug', id)
          .maybeSingle();
        
        if (error) throw error;
        vendorData = data;
      }
      
      // Vérifier si l'utilisateur connecté est le propriétaire
      const vendorIsOwned = vendorData && user?.id && vendorData.user_id === user.id;
      setIsOwner(!!vendorIsOwned);
      
      // Si la boutique n'existe pas, afficher le message d'erreur
      if (!vendorData) {
        setVendor(null);
        setProducts([]);
        return;
      }

      // Rediriger vers l'URL avec slug si on est venu via ID et qu'un slug existe
      if (isUUID && vendorData.shop_slug && params.vendorId) {
        navigate(`/boutique/${vendorData.shop_slug}`, { replace: true });
        return;
      }

      // Récupérer le public_id depuis profiles
      let vendorPublicId: string | undefined;
      if (vendorData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('public_id')
          .eq('id', vendorData.user_id)
          .maybeSingle();
        vendorPublicId = profileData?.public_id || undefined;
      }

      setVendor({ ...vendorData, public_id: vendorPublicId });

      // Boutique inactive: on affiche la page mais on ne charge pas les produits pour les clients
      if (!vendorData.is_active && !vendorIsOwned) {
        setProducts([]);
        return;
      }

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
        .eq('vendor_id', vendorData.id)
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
    <div className="min-h-screen bg-background pb-24">
      {/* SEO Meta Tags */}
      <SEOHead
        title={vendor.business_name}
        description={vendor.description || `Découvrez la boutique ${vendor.business_name} sur 224Solutions`}
        image={vendor.cover_image_url || vendor.logo_url}
        type="website"
      />
      
      {/* Alertes boutique inactive */}
      {!vendor.is_active && (
        <Alert className="m-4 border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Boutique inactive</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            {isOwner ? (
              <>
                Votre boutique n'est pas visible par les clients.
                <Button
                  variant="link"
                  className="p-0 h-auto text-primary ml-1"
                  onClick={() => navigate('/vendeur')}
                >
                  Activez-la dans vos paramètres vendeur
                </Button>
              </>
            ) : (
              <>
                Cette boutique est temporairement indisponible.
                <Button
                  variant="link"
                  className="p-0 h-auto text-primary ml-1"
                  onClick={() => navigate('/marketplace')}
                >
                  Retour au marketplace
                </Button>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/marketplace')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Boutique</h1>
            {!vendor.is_active && (
              <Badge variant="outline" className="border-orange-500/50 text-orange-500">
                Inactive
              </Badge>
            )}
          </div>
          <ShareButton
            title={vendor.business_name}
            text={`Découvrez la boutique ${vendor.business_name} sur 224 Solutions`}
            url={`${window.location.origin}/boutique/${vendor.shop_slug || vendor.id}`}
            variant="outline"
            size="sm"
            resourceType="shop"
            resourceId={vendor.id}
            useShortUrl={true}
            ogType="shop"
            imageUrl={vendor.cover_image_url || vendor.logo_url}
            description={vendor.description}
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
              url={`${window.location.origin}/boutique/${vendor.shop_slug || vendor.id}`}
              variant="outline"
              size="icon"
              resourceType="shop"
              resourceId={vendor.id}
              useShortUrl={true}
              ogType="shop"
              imageUrl={vendor.cover_image_url || vendor.logo_url}
              description={vendor.description}
            />
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="px-4">
        {/* Tabs pour produits physiques et numériques */}
        {digitalProducts.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="physical" className="gap-2">
                <Package className="w-4 h-4" />
                Produits ({products.length})
              </TabsTrigger>
              <TabsTrigger value="digital" className="gap-2">
                <Laptop className="w-4 h-4" />
                Numériques ({digitalProducts.length})
              </TabsTrigger>
            </TabsList>

            {/* Produits physiques */}
            <TabsContent value="physical">
              {products.length === 0 ? (
                <Card className="p-8 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Ce vendeur n'a pas encore de produits physiques disponibles.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mobile-landscape-grid mobile-portrait-grid">
                  {products.map((product) => (
                    <TranslatedProductCard
                      key={product.id}
                      id={product.id}
                      image={product.images || []}
                      title={product.name}
                      price={product.price}
                      currency="GNF"
                      vendor={vendor.business_name}
                      vendorId={vendor.id}
                      vendorPublicId={vendor.public_id}
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
            </TabsContent>

            {/* Produits numériques */}
            <TabsContent value="digital">
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 mobile-landscape-grid">
                {digitalProducts.map((product: any) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/digital-product/${product.id}`)}>
                    <div className="relative h-40 bg-muted">
                      <img
                        src={product.images?.[0] || '/placeholder.svg'}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-accent text-accent-foreground">
                          <Laptop className="w-3 h-3 mr-1" />
                          {product.category}
                        </Badge>
                      </div>
                      {product.product_mode === 'affiliate' && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="outline" className="bg-white/90">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Affiliation
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground line-clamp-1 mb-1">
                        {product.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {product.short_description || product.description || 'Aucune description'}
                      </p>
                      <div className="flex items-center justify-between">
                        {product.price > 0 ? (
                          <span className="font-bold text-lg text-primary">
                            {(() => {
                              const currency = product.currency || 'GNF';
                              const noDecimalCurrencies = ['GNF', 'XOF', 'XAF', 'JPY'];
                              const decimals = noDecimalCurrencies.includes(currency) ? 0 : 2;
                              const formattedAmount = Number(product.price).toLocaleString('fr-FR', {
                                minimumFractionDigits: decimals,
                                maximumFractionDigits: decimals,
                              });
                              return `${formattedAmount} ${currency}`;
                            })()}
                          </span>
                        ) : (
                          <span className="font-bold text-lg text-green-600">Gratuit</span>
                        )}
                        <Button size="sm" variant="outline">
                          Voir détails
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          // Affichage simple si pas de produits numériques
          <>
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mobile-landscape-grid mobile-portrait-grid">
                {products.map((product) => (
                  <TranslatedProductCard
                    key={product.id}
                    id={product.id}
                    image={product.images || []}
                    title={product.name}
                    price={product.price}
                    currency="GNF"
                    vendor={vendor.business_name}
                    vendorId={vendor.id}
                    vendorPublicId={vendor.public_id}
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
          </>
        )}
      </div>

      <QuickFooter />
    </div>
  );
}
