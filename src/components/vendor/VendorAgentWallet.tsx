import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, AlertCircle, Info } from 'lucide-react';

interface VendorAgentWalletProps {
  vendorId: string;
  agentName: string;
}

export function VendorAgentWallet({ vendorId, agentName }: VendorAgentWalletProps) {
  const [vendorWallet, setVendorWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendorWallet();
  }, [vendorId]);

  const loadVendorWallet = async () => {
    if (!vendorId) return;

    try {
      // Récupérer le user_id du vendeur
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('user_id')
        .eq('id', vendorId)
        .single();

      if (vendorError) throw vendorError;

      if (vendorData?.user_id) {
        // Récupérer le wallet du vendeur
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('balance, currency')
          .eq('user_id', vendorData.user_id)
          .single();

        if (walletError) throw walletError;
        setVendorWallet(walletData);
      }
    } catch (error) {
      console.error('Erreur chargement wallet vendeur:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Agent */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          En tant qu'agent, vous utilisez le <strong>wallet partagé du vendeur</strong> pour effectuer des transactions.
          Toutes les opérations financières sont liées au compte principal du vendeur.
        </AlertDescription>
      </Alert>

      {/* Solde du vendeur (lecture seule) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wallet du Vendeur
                </CardTitle>
                <p className="text-3xl font-bold text-primary mt-1">
                  {vendorWallet ? `${formatAmount(vendorWallet.balance)} ${vendorWallet.currency}` : 'N/A'}
                </p>
              </div>
            </div>
            <Badge variant="secondary">Lecture seule</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Agent:</strong> {agentName}
            </p>
            <p>
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Les transactions financières doivent être effectuées via le compte principal du vendeur.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info sur les permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accès Wallet</CardTitle>
          <CardDescription>
            Permissions et limitations de l'agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">✓</Badge>
              <span>Consultation du solde du vendeur</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-50">✗</Badge>
              <span>Transactions directes (réservées au vendeur)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-50">✗</Badge>
              <span>Retraits et dépôts (réservés au vendeur)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">✓</Badge>
              <span>Génération de liens de paiement</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VendorAgentWallet;
