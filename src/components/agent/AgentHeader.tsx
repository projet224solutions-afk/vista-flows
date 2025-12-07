/**
 * HEADER AGENT - 224SOLUTIONS
 */

import { AgentIdDisplay } from '@/components/agent/AgentIdDisplay';
import { WalletBalanceDisplay } from '@/components/wallet/WalletBalanceDisplay';

interface AgentHeaderProps {
  agentCode: string;
  pdgUserId: string | null;
  sectionTitle: string;
}

export default function AgentHeader({ agentCode, pdgUserId, sectionTitle }: AgentHeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30">
      <div className="px-4 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{sectionTitle}</h1>
            <p className="text-sm text-muted-foreground">Interface Agent 224Solutions</p>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <AgentIdDisplay agentCode={agentCode} />
            {pdgUserId && (
              <WalletBalanceDisplay userId={pdgUserId} compact={true} className="max-w-xs" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
