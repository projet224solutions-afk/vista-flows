import { useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AgentWalletDiagnosticTool from "./AgentWalletDiagnosticTool";
import UniversalWalletDashboard from "@/components/wallet/UniversalWalletDashboard";

interface AgentWalletManagementProps {
  agentId: string;
  agentCode?: string;
  showTransactions?: boolean;
}

/**
 * Composant de gestion du wallet agent
 * RÃ©utilise UniversalWalletDashboard pour Ã©viter la duplication de code
 * Le systÃ¨me de dÃ©pÃ´t/retrait est identique Ã  celui des vendeurs/clients
 */
export default function AgentWalletManagement({ 
  agentId, 
  agentCode,
  showTransactions = true 
}: AgentWalletManagementProps) {
  const [agentUserId, setAgentUserId] = useState<string | null>(null);
  const [agentUserCode, setAgentUserCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // RÃ©cupÃ©rer le user_id de l'agent depuis agents_management
  const loadAgentData = useCallback(async () => {
    if (!agentId) {
      setError('ID agent manquant');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('ðŸ” Chargement donnÃ©es agent:', agentId);

      // RÃ©cupÃ©rer le user_id de l'agent
      const { data: agentData, error: agentError } = await supabase
        .from('agents_management')
        .select('user_id, name, agent_code')
        .eq('id', agentId)
        .single();

      if (agentError || !agentData?.user_id) {
        console.error('âŒ Agent non trouvÃ© ou sans user_id:', agentError);
        setError('Agent non trouvÃ© ou non liÃ© Ã  un compte utilisateur');
        setLoading(false);
        return;
      }

      const userId = agentData.user_id;
      console.log('âœ… Agent trouvÃ©:', agentData.name, '| user_id:', userId);
      
      setAgentUserId(userId);
      setAgentUserCode(agentData.agent_code || agentCode || null);

      // VÃ©rifier/crÃ©er le wallet si nÃ©cessaire
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!walletData && !walletError) {
        // CrÃ©er le wallet automatiquement via RPC
        console.log('ðŸ’¡ Initialisation du wallet pour agent userId:', userId);
        const { error: initError } = await supabase
          .rpc('initialize_user_wallet', { p_user_id: userId });
        
        if (initError) {
          console.warn('âš ï¸ Initialisation wallet Ã©chouÃ©e:', initError);
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('âŒ Erreur chargement agent:', err);
      setError(err?.message || 'Erreur inconnue');
      setLoading(false);
    }
  }, [agentId, agentCode]);

  useEffect(() => {
    loadAgentData();
  }, [loadAgentData]);

  // Synchroniser agent_wallets quand le wallet principal est mis Ã  jour
  useEffect(() => {
    if (!agentUserId || !agentId) return;

    const handleWalletUpdate = async () => {
      try {
        // RÃ©cupÃ©rer le solde actuel du wallet principal
        const { data: walletData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', agentUserId)
          .single();

        if (walletData) {
          // Synchroniser avec agent_wallets
          await supabase
            .from('agent_wallets')
            .upsert({
              agent_id: agentId,
              balance: walletData.balance,
              currency: 'GNF',
              wallet_status: 'active',
              updated_at: new Date().toISOString()
            }, { onConflict: 'agent_id' });
        }
      } catch (err) {
        console.warn('âš ï¸ Sync agent_wallets Ã©chouÃ©e:', err);
      }
    };

    window.addEventListener('wallet-updated', handleWalletUpdate);
    return () => window.removeEventListener('wallet-updated', handleWalletUpdate);
  }, [agentUserId, agentId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement du wallet agent...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !agentUserId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-4">
              <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <div>
                <p className="text-lg font-semibold mb-2">
                  {error || 'Impossible de charger le wallet agent'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Agent ID: <code className="bg-muted px-2 py-1 rounded">{agentId}</code>
                </p>
              </div>
              <Button onClick={loadAgentData} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                RÃ©essayer
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <AgentWalletDiagnosticTool agentId={agentId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tÃªte Agent */}
      <Card className="bg-gradient-to-r from-primary-blue-500/10 to-primary-orange-500/10 border-primary-orange-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary-blue-600" />
            <span>Portefeuille Agent</span>
            {agentUserCode && (
              <Badge variant="outline" className="ml-auto bg-primary-blue-50 text-primary-blue-700 border-primary-orange-300">
                {agentUserCode}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            GÃ©rez vos fonds avec les mÃªmes outils que les vendeurs et clients.
          </p>
        </CardContent>
      </Card>

      {/* Utilisation du dashboard wallet universel - mÃªme systÃ¨me que vendeur/client */}
      <UniversalWalletDashboard
        userId={agentUserId}
        userCode={agentUserCode || agentCode}
        showTransactions={showTransactions}
      />
    </div>
  );
}
