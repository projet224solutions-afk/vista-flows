import { memo } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CopiloteChat from '@/components/copilot/CopiloteChat';

const DigitalVendorCopilot = memo(function DigitalVendorCopilot() {
  return (
    <section className="space-y-5 animate-fade-in">
      <header className="overflow-hidden rounded-[28px] border border-[#dce7fb] bg-[linear-gradient(135deg,rgba(4,67,158,0.08),rgba(255,255,255,0.98)_42%,rgba(255,64,0,0.05)_100%)] p-5 shadow-[0_22px_55px_rgba(4,67,158,0.08)] sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#04439e_0%,#0d5ed2_100%)] text-white shadow-[0_12px_28px_rgba(4,67,158,0.24)]">
            <Bot className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-[0.01em] text-[#0b1b33] sm:text-2xl">Copilote IA Vendeur</h1>
              <Badge className="border-0 bg-[#ff4000]/12 text-xs font-semibold text-[#ff4000] shadow-none">
                Priorités business
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Analyse ventes, produits et performances, puis vous propose des actions concrètes.
            </p>
          </div>
          <Badge variant="outline" className="border-[#d9e5fb] bg-white/80 text-xs text-[#04439e]">
            <Sparkles className="h-3 w-3 mr-1" />
            Enterprise
          </Badge>
        </div>
      </header>

      <CopiloteChat userRole="vendeur" height="calc(100vh - 280px)" />
    </section>
  );
});

export default DigitalVendorCopilot;
