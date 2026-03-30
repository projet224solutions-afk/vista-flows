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
    <header className="sticky top-0 z-40 w-full bg-[linear-gradient(135deg,#04439e_0%,#0536a8_75%,#041f87_100%)] shadow-[0_4px_24px_rgba(4,67,158,0.38)]">
      <div className="flex w-full min-w-0 flex-col gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3 md:px-8">
        {/* Brand */}
        <div className="flex items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger
            className="h-10 w-10 rounded-2xl border border-white/20 bg-white/10 text-white shadow-none hover:bg-white/22 [&_svg]:h-4 [&_svg]:w-4 sm:h-11 sm:w-11 sm:[&_svg]:h-5 sm:[&_svg]:w-5"
            aria-label="Ouvrir/Fermer le menu"
          />
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 shadow-[0_6px_16px_rgba(0,0,0,0.20)] sm:h-12 sm:w-12">
              <img src="/logo-224solutions.png" alt="224Solutions" className="h-7 w-7 rounded-lg object-contain sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="whitespace-nowrap text-sm font-semibold tracking-[0.01em] text-white sm:text-base md:text-xl">
                  Digital Seller Studio
                </h1>
                <span className="hidden rounded-full bg-[#ff4000] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white sm:inline-flex">
                  Premium
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-xs text-white/55 md:text-sm">
                <span className="h-2 w-2 rounded-full bg-[#ff4000] shadow-[0_0_0_4px_rgba(255,64,0,0.28)]" />
                <span className="truncate max-w-[220px] sm:max-w-[340px]">{displayName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Suspense fallback={null}>
              <QuickTransferButton variant="ghost" size="icon" showText={false} className="h-9 w-9 rounded-2xl border border-white/20 bg-white/10 text-white hover:bg-white/23 sm:h-10 sm:w-10 md:h-11 md:w-11" />
            </Suspense>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-2xl border border-white/20 bg-white/10 text-white hover:bg-white/23 sm:h-10 sm:w-10 md:h-11 md:w-11"
              onClick={() => navigate('/vendeur-digital/settings')}
              aria-label="Paramètres"
            >
              <Settings className="h-4 w-4 md:h-5 md:w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              className="h-9 w-9 rounded-2xl border border-[#ff4000]/40 bg-[#ff4000]/18 text-[#ff8050] hover:bg-[#ff4000]/30 hover:text-white sm:h-10 sm:w-10 md:h-11 md:w-11"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Wallet compact - desktop */}
      <div className="hidden border-t border-white/12 px-5 py-3 xl:block md:px-8 bg-white/6">
        <Suspense fallback={null}>
          <WalletBalanceWidget className="max-w-[250px]" showTransferButton={false} />
        </Suspense>
      </div>
    </header>
  );
});

export { DigitalVendorHeader };
export default DigitalVendorHeader;
