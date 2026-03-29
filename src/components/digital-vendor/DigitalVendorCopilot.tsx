import { memo } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CopiloteChat from '@/components/copilot/CopiloteChat';

const DigitalVendorCopilot = memo(function DigitalVendorCopilot() {
  return (
    <section className="space-y-4 animate-fade-in">
      <header className="rounded-xl border border-border/50 bg-card/80 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="text-base sm:text-lg font-semibold text-foreground">Copilote IA Vendeur</h1>
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Enterprise
          </Badge>
        </div>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          Analyse ventes, produits et performances, puis vous propose des actions concrètes.
        </p>
      </header>

      <CopiloteChat userRole="vendeur" height="calc(100vh - 280px)" />
    </section>
  );
});

export default DigitalVendorCopilot;
