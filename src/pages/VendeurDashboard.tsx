/**
 * DASHBOARD VENDEUR PROFESSIONNEL - 224SOLUTIONS
 * Interface complète avec sidebar et tous les modules
 *
 * @version 2.0.0 - Refactoring complet
 * @updated 2025-02-09
 *
 * Optimisations appliquées:
 * ✅ Types stricts (plus de `any`)
 * ✅ Composants extraits et mémoïsés (VendorHeader, VendorRoutes, VendorDashboardHome)
 * ✅ Chunking intelligent des imports lazy par catégorie
 * ✅ GlobalLoader unifié pour tous les Suspense
 * ✅ Aria-labels pour l'accessibilité
 * ✅ Hooks stabilisés avec useCallback
 * ✅ Gestion d'erreurs centralisée
 */

import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { SidebarProvider } from '@/components/ui/sidebar';
import { VendorSidebar } from '@/components/vendor/VendorSidebar';
import { useVendorStats } from '@/hooks/useVendorData';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useVendorErrorBoundary } from '@/hooks/useVendorErrorBoundary';
import { PageLoader } from '@/components/ui/GlobalLoader';
import { VendorHeader, VendorRoutes } from '@/components/vendor/dashboard';
import { useOfflineInitialization } from '@/hooks/useOfflineInitialization';
import type { RecentOrder, OrderFromSupabase } from '@/types/vendor-dashboard';

// Lazy loaded components pour le layout
const SubscriptionExpiryBanner = lazy(() =>
  import('@/components/vendor/SubscriptionExpiryBanner').then(m => ({ default: m.SubscriptionExpiryBanner }))
);
const CommunicationWidget = lazy(() =>
  import('@/components/communication/CommunicationWidget')
);
const OfflineBanner = lazy(() =>
  import('@/components/vendor/OfflineBanner')
);

// ============================================================================
// Hook personnalisé pour charger les commandes récentes
// ============================================================================

function useRecentOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const loadRecentOrders = async () => {
      setLoading(true);
      try {
        // 1. Récupérer le vendor
        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (vendorError) {
          console.warn('Erreur chargement vendeur:', vendorError);
          return;
        }

        if (!vendor) {
          console.info('Aucun vendeur pour cet utilisateur');
          return;
        }

        // 2. Récupérer les commandes
        const { data, error } = await supabase
          .from('orders')
          .select(`
            order_number,
            total_amount,
            status,
            created_at,
            customer:customers!inner(user_id)
          `)
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Erreur chargement commandes:', error);
          return;
        }

        // 3. Transformer les données avec types stricts
        const formatted: RecentOrder[] = (data || []).map((order: OrderFromSupabase) => ({
          order_number: order.order_number,
          customer_label: order.customer?.user_id
            ? `Client ${order.customer.user_id.slice(0, 6)}`
            : 'Client',
          status: (order.status as RecentOrder['status']) || 'pending',
          total_amount: order.total_amount || 0,
          created_at: order.created_at,
        }));

        setOrders(formatted);
      } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentOrders();
  }, [userId]);

  return { orders, loading };
}

// ============================================================================
// Composants d'état (Offline, Error, Loading)
// ============================================================================

function OfflineState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Mode hors ligne</CardTitle>
          <CardDescription>
            Vous êtes actuellement hors ligne. Veuillez vous connecter à Internet
            pour charger vos données vendeur pour la première fois.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Une fois connecté une première fois, vos données seront mises en cache
            pour fonctionner hors ligne.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full"
            aria-label="Réessayer le chargement"
          >
            Réessayer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function VendorMissingState({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Accès vendeur indisponible</CardTitle>
          <CardDescription>
            Ce compte n'est pas rattaché à une boutique vendeur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Retournez à l'accueil pour utiliser votre compte utilisateur.
          </p>
          <Button onClick={onGoHome} className="w-full" aria-label="Aller à l'accueil">
            Aller à l'accueil
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorState({
  onGoHome,
  onReload,
  t,
}: {
  onGoHome: () => void;
  onReload: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-destructive">{t('vendor.loadError')}</CardTitle>
          <CardDescription>{t('vendor.loadErrorDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('vendor.checkConnection')}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={onGoHome} className="w-full" aria-label="Aller à l'accueil">
              Aller à l'accueil
            </Button>
            <Button
              onClick={onReload}
              variant="outline"
              className="w-full"
              aria-label="Recharger la page"
            >
              {t('common.reloadPage')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Composant principal
// ============================================================================

export default function VendeurDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  useRoleRedirect();

  // 🔄 Initialisation automatique du mode offline (cache catalogue, stock, sync)
  const { isInitialized: offlineReady, isInitializing: offlineLoading, reinitialize: reinitOffline } = useOfflineInitialization();

  // Business type pour règles POS
  const { canAccessPOS } = useCurrentVendor();

  // Stats vendeur
  const { stats, loading: statsLoading, error: statsError } = useVendorStats();

  // Gestion des erreurs centralisée
  const { error, clearError } = useVendorErrorBoundary();

  // Commandes récentes (hook personnalisé)
  const { orders: recentOrders } = useRecentOrders(user?.id);
  const [showAllOrders, setShowAllOrders] = useState(false);

  // Toggle pour afficher plus/moins de commandes
  const handleToggleShowAllOrders = useCallback(() => {
    setShowAllOrders(prev => !prev);
  }, []);

  // Redirection vers dashboard par défaut ou vers l'interface digitale
  useEffect(() => {
    const path = location.pathname;
    if (path === '/vendeur' || path === '/vendeur/') {
      navigate('/vendeur/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⚡ Si le vendeur est de type digital ou service, rediriger IMMÉDIATEMENT vers l'interface dédiée
  useEffect(() => {
    if (!user?.id) return;
    const checkBusinessType = async () => {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('business_type')
        .eq('user_id', user.id)
        .maybeSingle();
      if (vendor?.business_type === 'digital') {
        const subPath = location.pathname.replace('/vendeur', '');
        navigate(`/vendeur-digital${subPath || '/dashboard'}`, { replace: true });
      } else if (vendor?.business_type === 'service') {
        const { data: proService } = await supabase
          .from('professional_services')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (proService) {
          navigate(`/dashboard/service/${proService.id}`, { replace: true });
        }
      }
    };
    checkBusinessType();
  }, [user?.id, navigate, location.pathname]);

  // Handler de déconnexion stabilisé
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast({
        title: t('common.signOutSuccess'),
        description: t('common.signOutSuccess'),
      });
      navigate('/');
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err);
      toast({
        title: t('common.error'),
        description: t('error.generic'),
        variant: 'destructive',
      });
    }
  }, [signOut, toast, navigate, t]);

  // Navigation handlers
  const handleGoHome = useCallback(() => navigate('/'), [navigate]);
  const handleReload = useCallback(() => window.location.reload(), []);

  // ═══════════════════════════════════════════════════════════════════════════
  // États de chargement et d'erreur
  // ═══════════════════════════════════════════════════════════════════════════

  const isLoading = !user || statsLoading;

  // État: Stats non chargées (après le loading)
  if (!isLoading && stats === null) {
    const isVendorMissing = statsError === 'Vendor profile not found';
    const isOffline = !navigator.onLine;

    if (isOffline) {
      return <OfflineState />;
    }

    if (isVendorMissing) {
      return <VendorMissingState onGoHome={handleGoHome} />;
    }

    return <ErrorState onGoHome={handleGoHome} onReload={handleReload} t={t} />;
  }

  // État: Chargement
  if (isLoading) {
    return <PageLoader text={t('vendor.loadingSpace')} />;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendu principal
  // ═══════════════════════════════════════════════════════════════════════════

  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'Vendeur';
  const vendorId = stats?.vendorId || '';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-x-hidden">
        {/* Sidebar */}
        <VendorSidebar />

        <div className="flex-1 flex flex-col w-full min-w-0 max-w-full overflow-x-hidden">
          {/* Header */}
          <VendorHeader displayName={displayName} onSignOut={handleSignOut} />

          {/* Banner d'expiration d'abonnement */}
          <Suspense fallback={null}>
            <SubscriptionExpiryBanner />
          </Suspense>

          {/* Error Banner */}
          {error && (
            <div className="px-6 pt-2">
              <ErrorBanner
                message={error.message}
                actionLabel="Fermer"
                onAction={clearError}
              />
            </div>
          )}

          {/* Contenu principal */}
          <main
            className="flex-1 p-2 sm:p-3 md:p-6 overflow-x-auto overflow-y-auto pt-4 pb-24 md:pb-8 w-full max-w-full"
            role="main"
            aria-label="Contenu principal du dashboard vendeur"
          >
            <VendorRoutes
              recentOrders={recentOrders}
              showAllOrders={showAllOrders}
              onToggleShowAllOrders={handleToggleShowAllOrders}
              canAccessPOS={canAccessPOS}
              vendorId={vendorId}
            />
          </main>
        </div>
      </div>

      {/* Widget de communication flottant */}
      <Suspense fallback={null}>
        <CommunicationWidget position="bottom-right" showNotifications={true} />
      </Suspense>

      {/* Bannière offline */}
      <Suspense fallback={null}>
        <OfflineBanner showSyncInfo={true} />
      </Suspense>
    </SidebarProvider>
  );
}
