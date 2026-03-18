/**
 * VENDOR HEADER COMPONENT
 * Header optimisé et mémoïsé pour le dashboard vendeur
 * 224Solutions - Optimisation Performance & Accessibilité
 */

import { memo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Activity, LogOut, Settings } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

// Lazy loaded header components (UI non-critique)
const NetworkStatusIndicator = lazy(() => import('@/components/vendor/NetworkStatusIndicator'));
const QuickTransferButton = lazy(() =>
  import('@/components/wallet/QuickTransferButton').then(m => ({ default: m.QuickTransferButton }))
);
const VendorSubscriptionButton = lazy(() =>
  import('@/components/vendor/VendorSubscriptionButton').then(m => ({ default: m.VendorSubscriptionButton }))
);
const PushNotificationButton = lazy(() =>
  import('@/components/vendor/PushNotificationButton').then(m => ({ default: m.PushNotificationButton }))
);
const VendorIdDisplay = lazy(() =>
  import('@/components/vendor/VendorIdDisplay').then(m => ({ default: m.VendorIdDisplay }))
);
const WalletBalanceWidget = lazy(() =>
  import('@/components/wallet/WalletBalanceWidget').then(m => ({ default: m.WalletBalanceWidget }))
);

// ============================================================================
// Types
// ============================================================================

interface VendorHeaderProps {
  /** Nom d'affichage de l'utilisateur */
  displayName: string;
  /** Callback de déconnexion */
  onSignOut: () => Promise<void>;
}

// ============================================================================
// Sous-composants mémoïsés
// ============================================================================

/**
 * Logo et titre de l'application
 */
const AppBranding = memo(function AppBranding() {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <SidebarTrigger
        className="h-[60px] w-[60px] sm:h-10 sm:w-10 md:h-8 md:w-8 sm:mr-2 md:mr-4 [&_svg]:h-8 [&_svg]:w-8 sm:[&_svg]:h-5 sm:[&_svg]:w-5"
        aria-label="Ouvrir/Fermer le menu"
      />

      <div
        className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0"
        aria-hidden="true"
      >
        <Activity className="w-4 h-4 md:w-6 md:h-6 text-white" />
      </div>

      <h1 className="text-sm md:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent whitespace-nowrap pr-1">
        224Solutions
      </h1>
    </div>
  );
});

/**
 * Indicateur de statut utilisateur
 */
const UserStatus = memo(function UserStatus({ displayName }: { displayName: string }) {
  return (
    <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
      <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 min-w-0">
        <span
          className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0"
          aria-label="En ligne"
        />
        <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
          {displayName}
        </span>
      </p>
      <Suspense fallback={null}>
        <VendorIdDisplay showName={false} />
      </Suspense>
    </div>
  );
});

/**
 * Actions du header (boutons)
 */
const HeaderActions = memo(function HeaderActions({
  onSignOut,
  onNavigateToSettings,
}: {
  onSignOut: () => Promise<void>;
  onNavigateToSettings: () => void;
}) {
  return (
    <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
      {/* Quick Transfer */}
      <Suspense fallback={null}>
        <QuickTransferButton
          variant="ghost"
          size="icon"
          showText={false}
          className="h-8 w-8 md:h-10 md:w-10"
        />
      </Suspense>

      {/* Subscription Button + Network Status côte à côte */}
      <div className="hidden sm:flex items-center gap-1">
        <Suspense fallback={null}>
          <VendorSubscriptionButton />
        </Suspense>
        <Suspense fallback={null}>
          <NetworkStatusIndicator />
        </Suspense>
      </div>

      {/* Network Status - Mobile only (quand subscription masqué) */}
      <div className="sm:hidden">
        <Suspense fallback={null}>
          <NetworkStatusIndicator />
        </Suspense>
      </div>

      {/* Push Notifications */}
      <Suspense fallback={null}>
        <PushNotificationButton className="h-8 w-8 md:h-10 md:w-10" />
      </Suspense>

      {/* Settings */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:h-10 md:w-10"
        onClick={onNavigateToSettings}
        aria-label="Paramètres"
        title="Paramètres"
      >
        <Settings className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
      </Button>

      {/* Sign Out */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onSignOut}
        className="h-8 w-8 md:h-10 md:w-10"
        aria-label="Se déconnecter"
        title="Se déconnecter"
      >
        <LogOut className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
      </Button>
    </div>
  );
});

// ============================================================================
// Composant principal
// ============================================================================

const VendorHeader = memo(function VendorHeader({
  displayName,
  onSignOut,
}: VendorHeaderProps) {
  const navigate = useNavigate();

  const handleNavigateToSettings = () => {
    navigate('/vendeur/settings');
  };

  return (
    <header className="min-h-14 md:min-h-16 bg-white/95 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-40 shadow-sm px-2 sm:px-3 md:px-6 w-full max-w-full overflow-visible">
      <div className="flex flex-col sm:flex-row sm:items-center w-full min-w-0 gap-2 py-2 md:py-0">
        {/* Ligne 1 (mobile): menu + logo + nom app */}
        <AppBranding />

        {/* Ligne 2 (mobile): user+ID à gauche, actions à droite */}
        <div className="flex items-center justify-between w-full min-w-0 gap-2">
          <UserStatus displayName={displayName} />
          <HeaderActions
            onSignOut={onSignOut}
            onNavigateToSettings={handleNavigateToSettings}
          />
        </div>
      </div>

      {/* Wallet compact - visible uniquement sur grands écrans */}
      <div className="hidden xl:block pb-2">
        <Suspense fallback={null}>
          <WalletBalanceWidget className="max-w-[250px]" showTransferButton={false} />
        </Suspense>
      </div>
    </header>
  );
});

export { VendorHeader };
export default VendorHeader;
