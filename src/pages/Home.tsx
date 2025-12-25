/**
 * HOME PAGE - Ultra Professional Design
 * 224Solutions - Marketplace Landing Page
 * Premium design inspired by Apple, Stripe, Linear
 * OPTIMISÉ pour les performances
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';
import { useUniversalProducts } from '@/hooks/useUniversalProducts';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { toast } from 'sonner';

// Premium Home Components
import {
  HomeHeader,
  HomeSearchBar,
  HeroSection,
  BottomNavigation,
  NearbyServicesSection,
  LatestProductsSection,
  NearbyVendorsModal,
  NearbyTaxiModal,
  NearbyDeliveryModal,
} from '@/components/home';

interface ServiceStatsData {
  boutiques: number;
  taxi: number;
  livraison: number;
}

// Cache des stats avec TTL
const statsCache = {
  data: null as ServiceStatsData | null,
  timestamp: 0,
  TTL: 60000, // 1 minute
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, getCartCount } = useCart();
  const isLoadingStats = useRef(false);
  const hasMounted = useRef(false);

  // Redirect authenticated users to appropriate dashboard
  useRoleRedirect();

  const [searchQuery, setSearchQuery] = useState('');
  const [showVendorsModal, setShowVendorsModal] = useState(false);
  const [showTaxiModal, setShowTaxiModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [serviceStats, setServiceStats] = useState<ServiceStatsData>(() => 
    statsCache.data || { boutiques: 0, taxi: 0, livraison: 0 }
  );
  const [notificationCount, setNotificationCount] = useState(0);

  // Universal products hook - memoized options
  const productOptions = useMemo(() => ({
    limit: 6,
    sortBy: 'newest' as const,
    autoLoad: true,
  }), []);
  
  const { products: universalProducts, loading: productsLoading } = useUniversalProducts(productOptions);

  // Load service statistics - optimisé avec cache et debounce
  const loadServiceStats = useCallback(async () => {
    // Vérifier le cache
    if (statsCache.data && Date.now() - statsCache.timestamp < statsCache.TTL) {
      setServiceStats(statsCache.data);
      return;
    }

    // Éviter les appels multiples
    if (isLoadingStats.current) return;
    isLoadingStats.current = true;

    try {
      // Une seule requête combinée au lieu de 3
      const [vendorsResult, taxiResult, livreurResult] = await Promise.all([
        supabase.from('vendors').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'taxi'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'livreur'),
      ]);

      const newStats = {
        boutiques: vendorsResult.count || 0,
        taxi: taxiResult.count || 0,
        livraison: livreurResult.count || 0,
      };

      // Mettre en cache
      statsCache.data = newStats;
      statsCache.timestamp = Date.now();
      
      setServiceStats(newStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      isLoadingStats.current = false;
    }
  }, []);

  // Charger les stats une seule fois au montage
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      loadServiceStats();
    }
  }, [loadServiceStats]);

  // Refresh stats toutes les 60 secondes (au lieu de 30)
  useEffect(() => {
    const interval = setInterval(loadServiceStats, 60000);
    return () => clearInterval(interval);
  }, [loadServiceStats]);

  // Load notifications - seulement si user existe
  useEffect(() => {
    if (!user?.id) return;
    
    const loadNotifications = async () => {
      try {
        const { count } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);

        setNotificationCount(count || 0);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };
    
    loadNotifications();
  }, [user?.id]);

  const handleProductClick = useCallback((productId: string) => {
    navigate(`/marketplace?product=${productId}`);
  }, [navigate]);

  const handleServiceClick = useCallback((serviceId: string) => {
    switch (serviceId) {
      case 'boutiques':
        setShowVendorsModal(true);
        break;
      case 'taxi':
        setShowTaxiModal(true);
        break;
      case 'livraison':
        setShowDeliveryModal(true);
        break;
    }
  }, []);

  const handleAddToCart = useCallback((product: any) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: typeof product.images === 'string' ? product.images : product.images?.[0],
      vendor_id: product.vendor_id,
      vendor_name: product.vendor_name,
    });
    toast.success('Produit ajouté au panier');
  }, [addToCart]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Premium Header */}
      <HomeHeader
        cartCount={user ? getCartCount() : 0}
        notificationCount={notificationCount}
        location="Conakry, Guinée"
      />

      {/* Premium Search Bar */}
      <HomeSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Rechercher des produits, services..."
        showFilter
      />

      {/* Hero Section - Create Service */}
      <HeroSection />

      {/* Nearby Services */}
      <NearbyServicesSection
        stats={serviceStats}
        onServiceClick={handleServiceClick}
      />

      {/* Latest Products */}
      <LatestProductsSection
        products={universalProducts}
        loading={productsLoading}
        onProductClick={handleProductClick}
        onAddToCart={handleAddToCart}
      />

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Modals */}
      <NearbyVendorsModal 
        open={showVendorsModal} 
        onOpenChange={setShowVendorsModal} 
      />
      <NearbyTaxiModal 
        open={showTaxiModal} 
        onOpenChange={setShowTaxiModal} 
      />
      <NearbyDeliveryModal 
        open={showDeliveryModal} 
        onOpenChange={setShowDeliveryModal} 
      />
    </div>
  );
}
