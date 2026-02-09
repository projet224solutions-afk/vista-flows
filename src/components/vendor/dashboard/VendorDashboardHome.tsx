/**
 * VENDOR DASHBOARD HOME
 * Composant mémoïsé pour la page d'accueil du dashboard vendeur
 * 224Solutions - Optimisation Performance
 */

import { memo, Suspense, useCallback, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  ChevronRight,
  DollarSign,
  ShoppingCart,
  Package,
  Lock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { GlobalLoader, SectionLoader } from '@/components/ui/GlobalLoader';
import type { RecentOrder } from '@/types/vendor-dashboard';

// Lazy loaded components
const VendorSubscriptionBanner = lazy(() =>
  import('@/components/vendor/VendorSubscriptionBanner').then(m => ({ default: m.VendorSubscriptionBanner }))
);
const VendorAnalyticsDashboard = lazy(() =>
  import('@/components/vendor/VendorAnalyticsDashboard').then(m => ({ default: m.VendorAnalyticsDashboard }))
);
const UniversalWalletTransactions = lazy(() =>
  import('@/components/wallet/UniversalWalletTransactions')
);
const VendorNotificationsPanel = lazy(() =>
  import('@/components/vendor/VendorNotificationsPanel').then(m => ({ default: m.VendorNotificationsPanel }))
);

// ============================================================================
// Types
// ============================================================================

interface VendorDashboardHomeProps {
  recentOrders: RecentOrder[];
  showAllOrders: boolean;
  onToggleShowAllOrders: () => void;
  canAccessPOS: boolean;
}

// ============================================================================
// Sous-composants mémoïsés
// ============================================================================

/**
 * Carte de commande récente
 */
const OrderCard = memo(function OrderCard({ order }: { order: RecentOrder }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div
          className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm sm:text-base truncate">
            {t('vendor.orders')} #{order.order_number}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {order.customer_label}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
          {order.total_amount.toLocaleString()} GNF
        </span>
        <Badge variant="secondary" className="text-[10px] sm:text-xs">
          {order.status}
        </Badge>
      </div>
    </div>
  );
});

/**
 * Section des commandes récentes
 */
const RecentOrdersSection = memo(function RecentOrdersSection({
  orders,
  showAll,
  onToggleShowAll,
}: {
  orders: RecentOrder[];
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const { t } = useTranslation();
  const displayedOrders = showAll ? orders : orders.slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg">{t('vendor.recentOrders')}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Vos 2 dernières commandes
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 sm:space-y-4">
          {displayedOrders.map((order) => (
            <OrderCard key={order.order_number} order={order} />
          ))}

          {orders.length === 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('vendor.noRecentOrders')}
            </p>
          )}

          {orders.length > 2 && (
            <Button
              variant="ghost"
              className="w-full text-primary text-xs sm:text-sm"
              onClick={onToggleShowAll}
              aria-expanded={showAll}
              aria-label={showAll ? 'Voir moins de commandes' : `Voir ${orders.length - 2} commandes supplémentaires`}
            >
              {showAll ? 'Voir moins' : `Voir plus (${orders.length - 2} autres)`}
              <ChevronRight
                className={`ml-1 h-3 w-3 sm:h-4 sm:w-4 transition-transform ${showAll ? 'rotate-90' : ''}`}
                aria-hidden="true"
              />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Section des actions rapides
 */
const QuickActionsSection = memo(function QuickActionsSection({
  canAccessPOS,
}: {
  canAccessPOS: boolean;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePOSClick = useCallback(() => {
    if (!canAccessPOS) {
      toast({
        title: 'POS verrouillé',
        description: "Le POS est désactivé pour les vendeurs 'En ligne uniquement'.",
        variant: 'destructive',
      });
      return;
    }
    navigate('/vendeur/pos');
  }, [canAccessPOS, navigate, toast]);

  const handleNavigate = useCallback(
    (path: string) => () => navigate(path),
    [navigate]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('vendor.quickActions')}</CardTitle>
        <CardDescription>{t('vendor.quickActionsDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* POS Button */}
          <Button
            variant="outline"
            className={`h-auto py-6 flex-col gap-2 ${!canAccessPOS ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={handlePOSClick}
            aria-label={canAccessPOS ? t('vendor.pos') : `${t('vendor.pos')} (verrouillé)`}
            aria-disabled={!canAccessPOS}
          >
            {!canAccessPOS ? (
              <Lock className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Activity className="w-6 h-6" aria-hidden="true" />
            )}
            <span className="text-sm font-medium">
              {t('vendor.pos')}
              {!canAccessPOS ? ' (verrouillé)' : ''}
            </span>
          </Button>

          {/* Products Button */}
          <Button
            variant="outline"
            className="h-auto py-6 flex-col gap-2"
            onClick={handleNavigate('/vendeur/products')}
            aria-label={t('vendor.products')}
          >
            <Package className="w-6 h-6" aria-hidden="true" />
            <span className="text-sm font-medium">{t('vendor.products')}</span>
          </Button>

          {/* Orders Button */}
          <Button
            variant="outline"
            className="h-auto py-6 flex-col gap-2"
            onClick={handleNavigate('/vendeur/orders')}
            aria-label={t('vendor.orders')}
          >
            <ShoppingCart className="w-6 h-6" aria-hidden="true" />
            <span className="text-sm font-medium">{t('vendor.orders')}</span>
          </Button>

          {/* Wallet Button */}
          <Button
            variant="outline"
            className="h-auto py-6 flex-col gap-2"
            onClick={handleNavigate('/vendeur/wallet')}
            aria-label={t('vendor.wallet')}
          >
            <DollarSign className="w-6 h-6" aria-hidden="true" />
            <span className="text-sm font-medium">{t('vendor.wallet')}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Composant principal
// ============================================================================

const VendorDashboardHome = memo(function VendorDashboardHome({
  recentOrders,
  showAllOrders,
  onToggleShowAllOrders,
  canAccessPOS,
}: VendorDashboardHomeProps) {
  return (
    <Suspense fallback={<SectionLoader text="Chargement du dashboard..." />}>
      <div className="space-y-6">
        {/* Banner d'abonnement */}
        <Suspense fallback={null}>
          <VendorSubscriptionBanner />
        </Suspense>

        {/* Analytics Dashboard intégré */}
        <Suspense fallback={<SectionLoader text="Chargement des analytics..." />}>
          <VendorAnalyticsDashboard />
        </Suspense>

        {/* Activité récente */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Wallet universel */}
          <Suspense fallback={<SectionLoader />}>
            <div>
              <UniversalWalletTransactions />
            </div>
          </Suspense>

          {/* Commandes + Notifications en 2 colonnes en paysage */}
          <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 lg:grid-cols-1 gap-4 lg:contents">
            <RecentOrdersSection
              orders={recentOrders}
              showAll={showAllOrders}
              onToggleShowAll={onToggleShowAllOrders}
            />

            {/* Notifications intégrées */}
            <Suspense fallback={<GlobalLoader size="sm" />}>
              <div>
                <VendorNotificationsPanel />
              </div>
            </Suspense>
          </div>
        </div>

        {/* Actions rapides */}
        <QuickActionsSection canAccessPOS={canAccessPOS} />
      </div>
    </Suspense>
  );
});

export { VendorDashboardHome };
export default VendorDashboardHome;
