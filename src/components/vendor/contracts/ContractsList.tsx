import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Contract {
  id: string;
  contract_type: string;
  client_name: string;
  amount: number | null;
  status: string;
  created_at: string;
  pdf_url: string | null;
}

interface ContractsListProps {
  refresh: number;
}

const CONTRACT_LABELS: Record<string, string> = {
  vente_ai: '🤖 Contrat de vente (IA)',
  livraison_ai: '🤖 Contrat de livraison (IA)',
  prestation_ai: '🤖 Contrat de prestation (IA)',
  agent_ai: '🤖 Contrat agent (IA)',
  partenariat_ai: '🤖 Entreprise partenaire (IA)',
  vente_achat: 'Vente/Achat',
  livraison: 'Livraison',
  prestation: 'Prestation',
  agent_sous_agent: 'Agent/Sous-agent',
  service: 'Service',
  entreprise_partenaire: 'Partenariat',
};

const STATUS_LABELS: Record<string, string> = {
  created: 'Créé',
  finalized: 'Finalisé',
  sent: 'Envoyé',
  signed: 'Signé',
  archived: 'Archivé',
};

export default function ContractsList({ refresh }: ContractsListProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadContracts();
  }, [refresh]);

  const loadContracts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContracts(data || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async (contractId: string) => {
    try {
      setGeneratingPdf(contractId);

      const { data, error } = await supabase.functions.invoke('generate-contract-pdf', {
        body: { contract_id: contractId },
      });

      if (error) throw error;

      toast({
        title: 'PDF généré',
        description: 'Le PDF du contrat a été généré avec succès',
      });

      // Open PDF in new tab
      if (data.html) {
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }

      loadContracts();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGeneratingPdf(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun contrat créé pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {contracts.map(contract => (
        <Card key={contract.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {CONTRACT_LABELS[contract.contract_type] || contract.contract_type}
              </CardTitle>
              <Badge variant={contract.status === 'signed' ? 'default' : 'secondary'}>
                {STATUS_LABELS[contract.status] || contract.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{contract.client_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Montant</p>
                <p className="font-medium">
                  {contract.amount ? `${new Intl.NumberFormat('fr-GN').format(contract.amount)} GNF` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date de création</p>
                <p className="font-medium">
                  {format(new Date(contract.created_at), 'dd MMM yyyy', { locale: fr })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Référence</p>
                <p className="font-medium font-mono text-sm">
                  {contract.id.substring(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGeneratePdf(contract.id)}
                disabled={generatingPdf === contract.id}
              >
                {generatingPdf === contract.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Générer PDF
              </Button>
              {contract.pdf_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(contract.pdf_url!, '_blank')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
