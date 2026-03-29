/**
 * Header dédié pour le vendeur digital
 */

import { memo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Laptop, LogOut, Settings } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

const QuickTransferButton = lazy(() =>
  import('@/components/wallet/QuickTransferButton').then(m => ({ default: m.QuickTransferButton }))
);
const WalletBalanceWidget = lazy(() =>
  import('@/components/wallet/WalletBalanceWidget').then(m => ({ default: m.WalletBalanceWidget }))
);

interface DigitalVendorHeaderProps {
  displayName: string;
  onSignOut: () => Promise<void>;
}

const DigitalVendorHeader = memo(function DigitalVendorHeader({
  displayName,
  onSignOut,
}: DigitalVendorHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="min-h-14 md:min-h-16 bg-white/95 dark:bg-background/95 backdrop-blur-lg border-b border-border/50 sticky top-0 z-40 shadow-sm px-2 sm:px-3 md:px-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center w-full min-w-0 gap-2 py-2 md:py-0">
        {/* Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger
            className="h-[60px] w-[60px] sm:h-10 sm:w-10 md:h-8 md:w-8 sm:mr-2 [&_svg]:h-8 [&_svg]:w-8 sm:[&_svg]:h-5 sm:[&_svg]:w-5"
            aria-label="Ouvrir/Fermer le menu"
          />
          <img src="/logo-224solutions.png" alt="224Solutions" className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-contain" />
          <h1 className="text-sm md:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-700 bg-clip-text text-transparent whitespace-nowrap">
            Digital Store
          </h1>
        </div>

        {/* User + Actions */}
        <div className="flex items-center justify-between w-full min-w-0 gap-2">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 min-w-0">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[200px]">{displayName}</span>
            </p>
          </div>

          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <Suspense fallback={null}>
              <QuickTransferButton variant="ghost" size="icon" showText={false} className="h-8 w-8 md:h-10 md:w-10" />
            </Suspense>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() => navigate('/vendeur-digital/settings')}
              aria-label="Paramètres"
            >
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              className="h-8 w-8 md:h-10 md:w-10"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Wallet compact - desktop */}
      <div className="hidden xl:block pb-2">
        <Suspense fallback={null}>
          <WalletBalanceWidget className="max-w-[250px]" showTransferButton={false} />
        </Suspense>
      </div>
    </header>
  );
});

export { DigitalVendorHeader };
export default DigitalVendorHeader;
