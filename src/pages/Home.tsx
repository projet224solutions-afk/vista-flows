/**
 * HOME PAGE - Ultra Professional Design
 * 224Solutions - Marketplace Landing Page
 * Premium design inspired by Apple, Stripe, Linear
 */

import { useState, useEffect } from 'react';
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
} from '@/components/home';

interface ServiceStatsData {
  boutiques: number;
  taxi: number;
  livraison: number;
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, getCartCount } = useCart();

  // Redirect authenticated users to appropriate dashboard
  useRoleRedirect();

  const [searchQuery, setSearchQuery] = useState('');
  const [showVendorsModal, setShowVendorsModal] = useState(false);
  const [showTaxiModal, setShowTaxiModal] = useState(false);
  const [serviceStats, setServiceStats] = useState<ServiceStatsData>({
    boutiques: 0,
    taxi: 0,
    livraison: 0,
  });
  const [notificationCount, setNotificationCount] = useState(0);

  // Universal products hook
  const { products: universalProducts, loading: productsLoading } = useUniversalProducts({
    limit: 6,
    sortBy: 'newest',
    autoLoad: true,
  });

  // Load service statistics
  useEffect(() => {
    loadServiceStats();
    const interval = setInterval(loadServiceStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time profile changes
  useEffect(() => {
    const profilesChannel = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          loadServiceStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  // Load notifications
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadServiceStats = async () => {
    try {
      const [vendorsResult, taxiResult, livreurResult] = await Promise.all([
        supabase.from('vendors').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'taxi'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'livreur'),
      ]);

      setServiceStats({
        boutiques: vendorsResult.count || 0,
        taxi: taxiResult.count || 0,
        livraison: livreurResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setServiceStats({ boutiques: 0, taxi: 0, livraison: 0 });
    }
  };

  const loadNotifications = async () => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotificationCount(count || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/marketplace?product=${productId}`);
  };

  const handleServiceClick = (serviceId: string) => {
    switch (serviceId) {
      case 'boutiques':
        setShowVendorsModal(true);
        break;
      case 'taxi':
        setShowTaxiModal(true);
        break;
      case 'livraison':
        navigate('/livreur');
        break;
    }
  };

  const handleAddToCart = (product: any) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: typeof product.images === 'string' ? product.images : product.images?.[0],
      vendor_id: product.vendor_id,
      vendor_name: product.vendor_name,
    });
    toast.success('Produit ajouté au panier');
  };

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
    </div>
  );
}
