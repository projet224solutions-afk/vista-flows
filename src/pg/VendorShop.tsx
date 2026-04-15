import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { ArrowLeft, MapPin, Star, Phone, Mail, MessageCircle, Package, Clock, Store, Truck, AlertTriangle, Laptop, ExternalLink, CheckCircle2, RefreshCw, WifiOff, SearchX, ShieldOff } from "lucide-react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShareButton } from "@/components/shared/ShareButton";
import RecentlyViewedProducts from "@/components/shared/RecentlyViewedProducts";
import { TranslatedProductCard } from "@/components/marketplace/TranslatedProductCard";
import QuickFooter from "@/components/QuickFooter";
import { useAuth } from "@/hooks/useAuth";
import { useVendorDigitalProducts } from "@/hooks/useHasDigitalProducts";
import { trackShopVisit } from "@/services/analyticsTrackingService";
import SEOHead from "@/components/SEOHead";
import { getCurrencyForCountry } from "@/data/countryMappings";
import { useVendorCertificationCached } from "@/hooks/useVendorCertificationCache";
import { CertifiedVendorBadge } from "@/components/vendor/CertifiedVendorBadge";

// Mini composant pour afficher le badge de certification d'un vendeur
function VendorCertBadgeInline({ vendorId }: { vendorId: string }) {
  const { isCertified } = useVendorCertificationCached(vendorId);
  if (!isCertified) return null;
  return <CertifiedVendorBadge status="CERTIFIE" />;
}

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
  country?: string;
  rating?: number;
  total_orders?: number;
  business_type?: string;
  service_type?: string;
  service_types?: string[];
  opening_hours?: string;
  is_active: boolean;
  user_id: string;
  shop_slug?: string;
  public_id?: string;
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

type ShopErrorType = 'none' | 'vendor_not_found' | 'shop_inactive' | 'network_error' | 'timeout' | 'products_error';

const isMobile = () => /Mobi|Android/i.test(navigator.userAgent);

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
  const [errorType, setErrorType] = useState<ShopErrorType>('none');
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // R├®cup├®rer les produits num├®riques du vendeur
  const { products: digitalProducts, loading: digitalProductsLoading } = useVendorDigitalProducts(vendor?.id);
  const identifier = params.slug || params.vendorId;

  // ÔöÇÔöÇ Structured log helper ÔöÇÔöÇ
  const log = useCallback((tag: string, data?: Record<string, unknown>) => {
    console.log(`­ƒÅ¬ [VendorShop] ${tag}`, data ?? '');
  }, []);

  // ÔöÇÔöÇ Mount log ÔöÇÔöÇ
  useEffect(() => {
    log('SHOP PAGE START', {
      vendorId: params.vendorId,
      slug: params.slug,
      identifier,
      pathname: window.location.pathname,
      mobile: isMobile(),
    });
  }, []);

  // ÔöÇÔöÇ Timeout management ÔöÇÔöÇ
  const startTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const ms = isMobile() ? 15000 : 10000;
    timeoutRef.current = setTimeout(() => {
      log('SHOP TIMEOUT TRIGGERED', { ms, mobile: isMobile() });
      setLoadingTimedOut(true);
    }, ms);
  }, [log]);

  const clearShopTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    clearShopTimeout();
    abortRef.current?.abort();
  }, [clearShopTimeout]);

  // ÔöÇÔöÇ Load vendor data ÔöÇÔöÇ
  const loadVendorData = useCallback(async () => {
    const id = identifier;
    if (!id) {
      log('SHOP IDENTIFIER MISSING');
      toast.error('Identifiant boutique manquant');
      navigate('/marketplace');
      return;
    }

    // Abort previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setLoadingTimedOut(false);
    setErrorType('none');
    startTimeout();

    log('SHOP IDENTIFIER DETECTED', { id, mobile: isMobile() });

    try {
      // ÔöÇÔöÇ Fetch vendor ÔöÇÔöÇ
      log('SHOP VENDOR FETCH START', { id });
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let vendorData: Vendor | null = null;

      if (isUUID) {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        vendorData = data;
      } else {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('shop_slug', id)
          .maybeSingle();
        if (error) throw error;
        vendorData = data;
      }

      // Check abort
      if (controller.signal.aborted) return;

      if (!vendorData) {
        log('SHOP VENDOR FETCH FAIL', { reason: 'not_found', id });
        setVendor(null);
        setProducts([]);
        setErrorType('vendor_not_found');
        return;
      }

      log('SHOP VENDOR FETCH SUCCESS', { vendorId: vendorData.id, name: vendorData.business_name });

      const vendorIsOwned = user?.id && vendorData.user_id === user.id;
      setIsOwner(!!vendorIsOwned);

      // Redirect to slug URL if needed
      if (isUUID && vendorData.shop_slug && params.vendorId) {
        log('SHOP REDIRECT TO SLUG', { slug: vendorData.shop_slug });
        navigate(`/boutique/${vendorData.shop_slug}`, { replace: true });
        return;
      }

      // Fetch public_id from profile
      let vendorPublicId: string | undefined;
      if (vendorData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('public_id')
          .eq('id', vendorData.user_id)
          .maybeSingle();
        vendorPublicId = profileData?.public_id || undefined;
      }

      if (controller.signal.aborted) return;

      setVendor({ ...vendorData, public_id: vendorPublicId });

      // Inactive shop ÔÇô show page but no products for clients
      if (!vendorData.is_active && !vendorIsOwned) {
        log('SHOP INACTIVE', { vendorId: vendorData.id });
        setProducts([]);
        setErrorType('none'); // Not an error, just inactive ÔÇô handled in UI
        return;
      }

      // ÔöÇÔöÇ Fetch products ÔöÇÔöÇ
      log('SHOP PRODUCTS FETCH START', { vendorId: vendorData.id });
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          images,
          promotional_videos,
          is_active,
          stock_quantity,
          category_id,
          categories:category_id(name)
        `)
        .eq('vendor_id', vendorData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (controller.signal.aborted) return;

      if (productsError) {
        log('SHOP PRODUCTS FETCH FAIL', { error: productsError.message });
        setProducts([]);
        setErrorType('products_error');
        return;
      }

      setProducts(productsData || []);
      log('SHOP PRODUCTS FETCH SUCCESS', { count: productsData?.length || 0 });
      setErrorType('none');

    } catch (error: any) {
      if (controller.signal.aborted) return;

      const isNetwork =
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('NetworkError') ||
        error?.message?.includes('fetch') ||
        !navigator.onLine;

      log('SHOP VENDOR FETCH FAIL', {
        message: error?.message,
        code: error?.code,
        isNetwork,
        online: navigator.onLine,
      });

      setErrorType(isNetwork ? 'network_error' : 'vendor_not_found');
    } finally {
      clearShopTimeout();
      setLoading(false);
    }
  }, [identifier, user?.id, navigate, log, startTimeout, clearShopTimeout, params.vendorId]);

  // ÔöÇÔöÇ Trigger load ÔöÇÔöÇ
  useEffect(() => {
    if (identifier) {
      loadVendorData();
    }
  }, [identifier, user?.id]);

  // ÔöÇÔöÇ Track visit ÔöÇÔöÇ
  useEffect(() => {
    if (vendor && vendor.id && !hasTrackedVisit.current && !isOwner) {
      hasTrackedVisit.current = true;
      trackShopVisit(vendor.id);
    }
  }, [vendor, isOwner]);

  // ÔöÇÔöÇ Timeout effect (separate from loadVendorData for the case where loading stays true) ÔöÇÔöÇ
  useEffect(() => {
    if (!loading) {
      setLoadingTimedOut(false);
    }
  }, [loading]);

  // ÔöÇÔöÇ Retry handler ÔöÇÔöÇ
  const handleRetry = useCallback(() => {
    log('SHOP RETRY TRIGGERED');
    setLoadingTimedOut(false);
    setErrorType('none');
    loadVendorData();
  }, [loadVendorData, log]);

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  //  RENDER: Loading state
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  if (loading && !loadingTimedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de la boutique...</p>
        </div>
      </div>
    );
  }

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  //  RENDER: Timeout state
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  if (loading && loadingTimedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <WifiOff className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-foreground">Connexion lente</h2>
          <p className="text-muted-foreground mb-6">
            La boutique met trop de temps ├á charger. Votre connexion est peut-├¬tre instable.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              R├®essayer
            </Button>
            <Button variant="outline" onClick={() => navigate('/marketplace')} className="w-full">
              Retour au marketplace
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  //  RENDER: Error states (differentiated)
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  if (errorType === 'network_error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <WifiOff className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-foreground">Erreur de connexion</h2>
          <p className="text-muted-foreground mb-6">
            Impossible de contacter le serveur. V├®rifiez votre connexion Internet.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              R├®essayer
            </Button>
            <Button variant="outline" onClick={() => navigate('/marketplace')} className="w-full">
              Retour au marketplace
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (errorType === 'products_error' && vendor) {
    // Vendor loaded but products failed ÔÇô show vendor info + error for products section
    // Fall through to normal render below, products section will show inline error
  }

  if (errorType === 'vendor_not_found' || (!vendor && !loading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <SearchX className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-foreground">Boutique introuvable</h2>
          <p className="text-muted-foreground mb-6">
            Cette boutique n'existe pas ou a ├®t├® supprim├®e.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} className="w-full" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              R├®essayer
            </Button>
            <Button onClick={() => navigate('/marketplace')} className="w-full">
              Retour au marketplace
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!vendor) {
    return null; // Should not happen, safety guard
  }

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  //  HELPERS
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  const handleContactVendor = async () => {
    if (!vendor) return;

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error('Veuillez vous connecter pour contacter le vendeur');
      navigate('/auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          recipient_id: vendor.user_id,
          content: `Bonjour, je visite votre boutique "${vendor.business_name}" et j'aimerais en savoir plus sur vos produits.`,
          type: 'text'
        });

      if (error) throw error;
      toast.success('Message envoy├® au vendeur');
      navigate(`/messages?recipientId=${vendor.user_id}`);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error("Erreur lors de l'envoi du message");
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const renderStars = (rating: number) => (
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

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  //  RENDER: Main shop page
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* SEO Meta Tags */}
      <SEOHead
        title={vendor.business_name}
        description={vendor.description || `D├®couvrez la boutique ${vendor.business_name} sur 224Solutions`}
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
                  Activez-la dans vos param├¿tres vendeur
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
            text={`D├®couvrez la boutique ${vendor.business_name} sur 224 Solutions`}
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
            alt={`Banni├¿re ${vendor.business_name}`}
            className="w-full h-full object-cover"
            loading="lazy"
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
                loading="lazy"
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
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-foreground">{vendor.business_name}</h2>
              <VendorCertBadgeInline vendorId={vendor.user_id} />
            </div>

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
                  {vendor.service_type === 'retail' ? 'Vente au d├®tail' :
                   vendor.service_type === 'wholesale' ? 'Vente en gros' :
                   vendor.service_type === 'mixed' ? 'D├®tail + Gros' :
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

            {/* Favori vendeur */}
            <FavoriteButton vendorId={vendor.id} size="md" className="shrink-0" />

            <Button onClick={handleContactVendor}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <ShareButton
              title={vendor.business_name}
              text={`D├®couvrez la boutique ${vendor.business_name} sur 224 Solutions`}
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

      {/* Products section ÔÇô with inline error if products failed */}
      <div className="px-4">
        <div className="mb-4">
          <RecentlyViewedProducts maxItems={6} />
        </div>

        {errorType === 'products_error' && (
          <Card className="p-6 text-center mb-4 border-destructive/30">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">Impossible de charger les produits</p>
            <p className="text-sm text-muted-foreground mb-4">
              Le vendeur existe mais ses produits n'ont pas pu ├¬tre r├®cup├®r├®s.
            </p>
            <Button onClick={handleRetry} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              R├®essayer
            </Button>
          </Card>
        )}

        {errorType !== 'products_error' && (
          <>
            {/* Tabs pour produits physiques et num├®riques */}
            {digitalProducts.length > 0 ? (
              <Tabs value={vendor?.business_type === 'digital' ? 'digital' : activeTab} onValueChange={setActiveTab} className="w-full">
                {vendor?.business_type !== 'digital' && (
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="physical" className="gap-2">
                      <Package className="w-4 h-4" />
                      Produits ({products.length})
                    </TabsTrigger>
                    <TabsTrigger value="digital" className="gap-2">
                      <Laptop className="w-4 h-4" />
                      Num├®riques ({digitalProducts.length})
                    </TabsTrigger>
                  </TabsList>
                )}
                {vendor?.business_type === 'digital' && (
                  <div className="flex items-center gap-2 mb-4">
                    <Laptop className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Produits num├®riques ({digitalProducts.length})</h3>
                  </div>
                )}

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
                          promotionalVideos={product.promotional_videos || []}
                          title={product.name}
                          price={product.price}
                          currency={vendor.country ? getCurrencyForCountry(vendor.country) : 'GNF'}
                          vendor={vendor.business_name}
                          vendorId={vendor.id}
                          vendorPublicId={vendor.public_id}
                          rating={vendor.rating || 0}
                          reviewCount={vendor.total_orders || 0}
                          stock={product.stock_quantity}
                          category={product.categories?.name}
                          onBuy={() => handleProductClick(product.id)}
                          onAddToCart={() => {
                            toast.success('Produit ajout├® au panier');
                          }}
                          onContact={handleContactVendor}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Produits num├®riques */}
                <TabsContent value="digital">
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 mobile-landscape-grid">
                    {digitalProducts.map((product: any) => (
                      <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/digital-product/${product.id}`)}>
                        <div className="relative h-40 bg-muted">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          ) : product.video_url ? (
                            <video
                              src={product.video_url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src="/placeholder.svg"
                              alt={product.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-accent text-accent-foreground">
                              <Laptop className="w-3 h-3 mr-1" />
                              {product.category}
                            </Badge>
                          </div>
                          {product.video_url && (
                            <div className="absolute bottom-2 left-2">
                              <Badge className="bg-black/70 text-white hover:bg-black/70">
                                Vidéo
                              </Badge>
                            </div>
                          )}
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
                              Voir d├®tails
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              // Affichage simple si pas de produits num├®riques
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
                        promotionalVideos={product.promotional_videos || []}
                        title={product.name}
                        price={product.price}
                        currency={vendor.country ? getCurrencyForCountry(vendor.country) : 'GNF'}
                        vendor={vendor.business_name}
                        vendorId={vendor.id}
                        vendorPublicId={vendor.public_id}
                        rating={vendor.rating || 0}
                        reviewCount={vendor.total_orders || 0}
                        stock={product.stock_quantity}
                        category={product.categories?.name}
                        onBuy={() => handleProductClick(product.id)}
                        onAddToCart={() => {
                          toast.success('Produit ajout├® au panier');
                        }}
                        onContact={handleContactVendor}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <QuickFooter />
    </div>
  );
}
