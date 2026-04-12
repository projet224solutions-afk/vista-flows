/**
 * DASHBOARD VENDEUR PROFESSIONNEL - 224SOLUTIONS
 * Interface compl├¿te avec sidebar et tous les modules
 *
 * @version 2.0.0 - Refactoring complet
 * @updated 2025-02-09
 *
 * Optimisations appliqu├®es:
 * Ô£à Types stricts (plus de `any`)
 * Ô£à Composants extraits et m├®mo├»s├®s (VendorHeader, VendorRoutes, VendorDashboardHome)
 * Ô£à Chunking intelligent des imports lazy par cat├®gorie
 * Ô£à GlobalLoader unifi├® pour tous les Suspense
 * Ô£à Aria-labels pour l'accessibilit├®
 * Ô£à Hooks stabilis├®s avec useCallback
 * Ô£à Gestion d'erreurs centralis├®e
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
import { DataLoadTimeoutState } from '@/components/ui/DataLoadTimeoutState';
import { VendorHeader, VendorRoutes } from '@/components/vendor/dashboard';
import { useOfflineInitialization } from '@/hooks/useOfflineInitialization';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import type { RecentOrder, OrderFromSupabase } from '@/types/vendor-dashboard';

// Lazy loaded components pour le layout
const SubscriptionExpiryBanner = lazy(() =>
  import('@/components/vendor/SubscriptionExpiryBanner').then(m => ({ default: m.SubscriptionExpiryBanner }))
);

// ============================================================================
// Hook personnalis├® pour charger les commandes r├®centes
// ============================================================================

function useRecentOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const loadRecentOrders = async () => {
      setLoading(true);
      try {
        // 1. R├®cup├®rer le vendor
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

        // 2. R├®cup├®rer les commandes avec profil client
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

        // 3. R├®cup├®rer les profils des clients pour afficher leurs noms
        const userIds = (data || [])
          .map((o: OrderFromSupabase) => o.customer?.user_id)
          .filter(Boolean) as string[];

        const profilesMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);

          if (profiles) {
            for (const p of profiles) {
              const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
              profilesMap[p.id] = name || '';
            }
          }
        }

        // 4. Transformer les donn├®es avec noms clients r├®els
        const formatted: RecentOrder[] = (data || []).map((order: OrderFromSupabase) => {
          const orderUserId = order.customer?.user_id;
          const clientName = orderUserId && profilesMap[orderUserId]
            ? profilesMap[orderUserId]
            : orderUserId
              ? `Client #${orderUserId.slice(0, 6)}`
              : 'Client';

          return {
            order_number: order.order_number,
            customer_label: clientName,
            status: (order.status as RecentOrder['status']) || 'pending',
            total_amount: order.total_amount || 0,
            created_at: order.created_at,
          };
        });

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
// Composants d'├®tat (Offline, Error, Loading)
// ============================================================================

function OfflineState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Mode hors ligne</CardTitle>
          <CardDescription>
            Vous ├¬tes actuellement hors ligne. Veuillez vous connecter ├á Internet
            pour charger vos donn├®es vendeur pour la premi├¿re fois.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Une fois connect├® une premi├¿re fois, vos donn├®es seront mises en cache
            pour fonctionner hors ligne.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full"
            aria-label="R├®essayer le chargement"
          >
            R├®essayer
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
          <CardTitle>Acc├¿s vendeur indisponible</CardTitle>
          <CardDescription>
            Ce compte n'est pas rattach├® ├á une boutique vendeur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Retournez ├á l'accueil pour utiliser votre compte utilisateur.
          </p>
          <Button onClick={onGoHome} className="w-full" aria-label="Aller ├á l'accueil">
            Aller ├á l'accueil
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
            <Button onClick={onGoHome} className="w-full" aria-label="Aller ├á l'accueil">
              Aller ├á l'accueil
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
  const { user, profile, signOut, loading: authLoading, profileLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  useRoleRedirect();

  // ­ƒöä Initialisation automatique du mode offline (cache catalogue, stock, sync)
  const { reinitialize: reinitOffline } = useOfflineInitialization();

  // Business type pour r├¿gles POS
  const { canAccessPOS } = useCurrentVendor();

  // Stats vendeur
  const { stats, loading: statsLoading, error: statsError } = useVendorStats();

  // Gestion des erreurs centralis├®e
  const { error, clearError } = useVendorErrorBoundary();

  // Commandes r├®centes (hook personnalis├®)
  const { orders: recentOrders } = useRecentOrders(user?.id);
  const [showAllOrders, setShowAllOrders] = useState(false);

  const isLoading = authLoading || profileLoading || statsLoading;
  // Mobile: 15s timeout (slow networks), Desktop: 10s
  const isMobileDevice = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
  const { timedOut: loadingTimedOut, resetTimeout } = useLoadingTimeout(isLoading, isMobileDevice ? 15000 : 10000);

  useEffect(() => {
    if (loadingTimedOut) {
      console.error('[TIMEOUT TRIGGERED]', {
        scope: 'VendeurDashboard',
        authLoading,
        profileLoading,
        statsLoading,
        isMobile: isMobileDevice,
      });
    }
  }, [loadingTimedOut, authLoading, profileLoading, statsLoading, isMobileDevice]);

  // Toggle pour afficher plus/moins de commandes
  const handleToggleShowAllOrders = useCallback(() => {
    setShowAllOrders(prev => !prev);
  }, []);

  // Redirection vers dashboard par d├®faut ou vers l'interface digitale
  useEffect(() => {
    const path = location.pathname;
    if (path === '/vendeur' || path === '/vendeur/') {
      navigate('/vendeur/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ÔÜí Si le vendeur est de type digital ou service, rediriger IMM├ëDIATEMENT vers l'interface d├®di├®e
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
        } else {
          console.warn('Vendeur de type service sans professional_service associ├®');
          toast({
            title: 'Configuration incompl├¿te',
            description: 'Votre profil de service n\'est pas encore configur├®. Contactez le support.',
            variant: 'destructive',
          });
        }
      }
    };
    void checkBusinessType();
  }, [user?.id, navigate, location.pathname, toast]);

  // Handler de d├®connexion stabilis├®
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast({
        title: t('common.signOutSuccess'),
        description: t('common.signOutSuccess'),
      });
      navigate('/');
    } catch (err) {
      console.error('Erreur lors de la d├®connexion:', err);
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
  const handleRetryAfterTimeout = useCallback(() => {
    resetTimeout();
    void reinitOffline();
  }, [resetTimeout, reinitOffline]);

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // ├ëtats de chargement et d'erreur
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

  if (loadingTimedOut) {
    return (
      <DataLoadTimeoutState
        title="Impossible de charger les donn├®es vendeur"
        description="Le chargement a d├®pass├® le d├®lai attendu. V├®rifiez votre connexion puis r├®essayez."
        onRetry={handleRetryAfterTimeout}
        onReload={handleReload}
      />
    );
  }

  if (!isLoading && !user) {
    return <ErrorState onGoHome={handleGoHome} onReload={handleReload} t={t} />;
  }

  // ├ëtat: Stats non charg├®es (apr├¿s le loading)
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

  // ├ëtat: Chargement
  if (isLoading) {
    return <PageLoader text={t('vendor.loadingSpace')} />;
  }

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Rendu principal
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'Vendeur';
  const vendorId = stats?.vendorId || '';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex bg-gradient-to-br from-muted/30 via-background to-primary/5 overflow-x-hidden">
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
            className="flex-1 p-2 sm:p-3 md:p-6 overflow-x-auto overflow-y-auto pt-4 pb-28 lg:pb-12 w-full max-w-full"
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

      {/* CommunicationWidget retir├® - le composant global retourne null, ├®vite le lazy load inutile */}
    </SidebarProvider>
  );
}
