import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgentWalletDiagnosticProps {
  agentId: string;
  agentCode: string;
}

export function AgentWalletDiagnostic({ agentId, agentCode }: AgentWalletDiagnosticProps) {
  const [diagnosticStatus, setDiagnosticStatus] = useState<{
    agentExists: boolean;
    walletExists: boolean;
    walletId: string | null;
    balance: number | null;
    checking: boolean;
  }>({
    agentExists: false,
    walletExists: false,
    walletId: null,
    balance: null,
    checking: true
  });
  const [fixing, setFixing] = useState(false);

  const runDiagnostic = async () => {
    try {
      setDiagnosticStatus(prev => ({ ...prev, checking: true }));

      // VÃ©rifier si l'agent existe
      const { error: agentError } = await supabase
        .from('agents_management')
        .select('id, agent_code')
        .eq('id', agentId)
        .single();

      if (agentError) {
        console.error('Erreur agent:', agentError);
        setDiagnosticStatus(prev => ({ 
          ...prev, 
          agentExists: false, 
          checking: false 
        }));
        return;
      }

      // VÃ©rifier si le wallet existe
      const { data: wallet, error: walletError } = await supabase
        .from('agent_wallets')
        .select('id, balance, currency')
        .eq('agent_id', agentId)
        .single();

      if (walletError || !wallet) {
        console.error('Erreur wallet:', walletError);
        setDiagnosticStatus({
          agentExists: true,
          walletExists: false,
          walletId: null,
          balance: null,
          checking: false
        });
        return;
      }

      setDiagnosticStatus({
        agentExists: true,
        walletExists: true,
        walletId: wallet.id,
        balance: wallet.balance,
        checking: false
      });
    } catch (error) {
      console.error('Erreur diagnostic:', error);
      setDiagnosticStatus(prev => ({ ...prev, checking: false }));
    }
  };

  const fixWallet = async () => {
    try {
      setFixing(true);
      toast.info('Tentative de crÃ©ation du wallet...');

      // CrÃ©er le wallet manuellement
      const { data, error } = await supabase
        .from('agent_wallets')
        .insert({
          agent_id: agentId,
          balance: 10000,
          currency: 'GNF',
          wallet_status: 'active'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Le wallet existe dÃ©jÃ , juste recharger
          toast.info('Le wallet existe dÃ©jÃ , rechargement...');
          await runDiagnostic();
          return;
        }
        throw error;
      }

      toast.success('âœ… Wallet crÃ©Ã© avec succÃ¨s !');
      await runDiagnostic();
    } catch (error: any) {
      console.error('Erreur crÃ©ation wallet:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };

  useEffect(() => {
    if (agentId) {
      runDiagnostic();
    }
  }, [agentId]);

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          Diagnostic Wallet Agent {agentCode}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {diagnosticStatus.checking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            VÃ©rification en cours...
          </div>
        ) : (
          <>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {diagnosticStatus.agentExists ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-primary-orange-600" />
                    <span>Agent trouvÃ© âœ“</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Agent introuvable âœ—</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {diagnosticStatus.walletExists ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-primary-orange-600" />
                    <span>Wallet trouvÃ© âœ“ (Balance: {diagnosticStatus.balance} GNF)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="font-medium">Wallet manquant âœ—</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runDiagnostic}
                disabled={diagnosticStatus.checking}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                RevÃ©rifier
              </Button>

              {!diagnosticStatus.walletExists && diagnosticStatus.agentExists && (
                <Button
                  size="sm"
                  onClick={fixWallet}
                  disabled={fixing}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {fixing ? 'CrÃ©ation...' : 'CrÃ©er le Wallet'}
                </Button>
              )}
            </div>

            {!diagnosticStatus.walletExists && (
              <p className="text-xs text-red-600 mt-2">
                âš ï¸ Le wallet n'existe pas. Cliquez sur "CrÃ©er le Wallet" pour le crÃ©er avec un solde initial de 10,000 GNF.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
