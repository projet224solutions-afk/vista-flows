import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  Save, 
  Download, 
  Send, 
  Edit, 
  Eye, 
  FileText,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AIContractEditorProps {
  contract: {
    id: string;
    contract_type: string;
    client_name: string;
    client_phone: string | null;
    client_info: string | null;
    contract_content: string;
    custom_fields: any;
    created_at: string;
    status: string;
  };
  onSaved: () => void;
  onClose: () => void;
}

export default function AIContractEditor({ contract, onSaved, onClose }: AIContractEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [clientName, setClientName] = useState(contract.client_name);
  const [clientPhone, setClientPhone] = useState(contract.client_phone || '');
  const [clientAddress, setClientAddress] = useState(contract.client_info || '');
  const [contractContent, setContractContent] = useState(contract.contract_content);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('contracts')
        .update({
          client_name: clientName,
          client_phone: clientPhone,
          client_info: clientAddress,
          contract_content: contractContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id);

      if (error) throw error;

      toast({
        title: 'Contrat enregistré',
        description: 'Les modifications ont été enregistrées avec succès',
      });

      setIsEditing(false);
      onSaved();
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

  const handleFinalize = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'finalized',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id);

      if (error) throw error;

      toast({
        title: 'Contrat finalisé',
        description: 'Le contrat est maintenant final et prêt à être envoyé',
      });

      onSaved();
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

  const handleGeneratePdf = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('generate-contract-pdf', {
        body: { contract_id: contract.id },
      });

      if (error) throw error;

      toast({
        title: 'PDF généré',
        description: 'Le PDF du contrat a été généré',
      });

      if (data.html) {
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
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

  const summary = contract.custom_fields?.summary || '';
  const contractNumber = contract.custom_fields?.contract_number || 'N/A';
  const isFinalized = contract.status === 'finalized';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle>Contrat de vente généré par IA</CardTitle>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span className="font-mono">{contractNumber}</span>
                </div>
                <div>
                  Créé le {format(new Date(contract.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </div>
              </div>
            </div>
            <Badge variant={isFinalized ? 'default' : 'secondary'} className="gap-1">
              {isFinalized ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Finalisé
                </>
              ) : (
                'Brouillon'
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Résumé du contrat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Client Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Informations du client</CardTitle>
            {!isFinalized && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Aperçu
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label>Nom du client</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nom complet"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+224 XXX XX XX XX"
                />
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Adresse complète"
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-medium">{clientName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Téléphone</p>
                <p className="font-medium">{clientPhone || 'Non renseigné'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adresse</p>
                <p className="font-medium">{clientAddress || 'Non renseignée'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contenu du contrat</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={contractContent}
              onChange={(e) => setContractContent(e.target.value)}
              className="min-h-[500px] font-mono text-sm"
              placeholder="Contenu du contrat..."
            />
          ) : (
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-muted/30 p-6 rounded-lg">
                {contractContent}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {isEditing ? (
              <>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Enregistrer les modifications
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Annuler
                </Button>
              </>
            ) : (
              <>
                {!isFinalized && (
                  <>
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier le contrat
                    </Button>
                    <Button onClick={handleFinalize} disabled={loading} variant="default">
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Finaliser le contrat
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={handleGeneratePdf}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Télécharger PDF
                </Button>
                {isFinalized && (
                  <Button variant="outline" disabled={loading}>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer au client
                  </Button>
                )}
                <Button variant="ghost" onClick={onClose}>
                  Retour à la liste
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
