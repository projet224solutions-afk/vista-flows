/**
 * HOME PAGE - Ultra Professional Design
 * 224Solutions - Marketplace Landing Page
 * Premium design inspired by Apple, Stripe, Linear
 * OPTIMISÉ pour les performances
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';
import { useUniversalProducts } from '@/hooks/useUniversalProducts';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useNearbyServiceStats } from '@/hooks/useNearbyServiceStats';
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

export default function Home() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  const { addToCart, getCartCount } = useCart();

  // Rediriger les utilisateurs connectés vers leur dashboard approprié
  useRoleRedirect();

  // Stats des services à proximité (filtrés par distance 20km)
  const { stats: serviceStats } = useNearbyServiceStats();

  const [searchQuery, setSearchQuery] = useState('');
  const [showVendorsModal, setShowVendorsModal] = useState(false);
  const [showTaxiModal, setShowTaxiModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Universal products hook - memoized options
  const productOptions = useMemo(() => ({
    limit: 6,
    sortBy: 'newest' as const,
    autoLoad: true,
  }), []);
  
  const { products: universalProducts, loading: productsLoading } = useUniversalProducts(productOptions);

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

  const handleProductClick = useCallback(
    (productId: string) => {
      navigate(`/marketplace?product=${productId}`);
    },
    [navigate]
  );

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

  const handleAddToCart = useCallback(
    (product: any) => {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: typeof product.images === 'string' ? product.images : product.images?.[0],
        vendor_id: product.vendor_id,
        vendor_name: product.vendor_name,
      });
      toast.success('Produit ajouté au panier');
    },
    [addToCart]
  );

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
