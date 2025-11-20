/**
 * DÉTAILS DU DEVIS - MODAL
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuoteDetailsProps {
  quote: {
    id: string;
    ref: string;
    vendor_id: string;
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
    client_address: string | null;
    items: any[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    status: string;
    valid_until: string;
    pdf_url: string | null;
    notes: string | null;
    created_at: string;
  } | null;
  open: boolean;
  onClose: () => void;
  onConvert: () => void;
  vendorId: string;
}

export default function QuoteDetails({ quote, open, onClose, onConvert }: QuoteDetailsProps) {
  if (!quote) return null;

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'En attente', variant: 'secondary' as const, icon: Clock },
      accepted: { label: 'Accepté', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Refusé', variant: 'destructive' as const, icon: XCircle },
      expired: { label: 'Expiré', variant: 'outline' as const, icon: Clock }
    };
    
    const { label, variant, icon: Icon } = config[status as keyof typeof config] || config.pending;
    
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const downloadPDF = async (pdfUrl: string, ref: string) => {
    try {
      // Récupérer le fichier via fetch pour contourner les bloqueurs
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      
      // Créer un lien de téléchargement temporaire
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ref}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Téléchargement démarré');
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const generatePDF = async () => {
    try {
      toast.info('Génération du PDF en cours...');

      // Récupérer les données les plus récentes du devis
      const { data: freshQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quote.id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase.functions.invoke('generate-quote-pdf', {
        body: {
          quote_id: freshQuote.id,
          ref: freshQuote.ref,
          vendor_id: freshQuote.vendor_id,
          client_name: freshQuote.client_name,
          client_email: freshQuote.client_email,
          client_phone: freshQuote.client_phone,
          client_address: freshQuote.client_address,
          items: freshQuote.items,
          subtotal: freshQuote.subtotal,
          discount: freshQuote.discount,
          tax: freshQuote.tax,
          total: freshQuote.total,
          valid_until: freshQuote.valid_until,
          notes: freshQuote.notes
        }
      });

      if (error) throw error;

      toast.success('PDF généré avec succès !');
      
      if (data?.pdf_url) {
        // Télécharger automatiquement le PDF généré
        await downloadPDF(data.pdf_url, freshQuote.ref);
      }
    } catch (error: any) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>Détails du Devis {quote.ref}</span>
            </div>
            {getStatusBadge(quote.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations client */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Client</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Nom :</span> {quote.client_name}
              </div>
              {quote.client_email && (
                <div>
                  <span className="font-medium">Email :</span> {quote.client_email}
                </div>
              )}
              {quote.client_phone && (
                <div>
                  <span className="font-medium">Téléphone :</span> {quote.client_phone}
                </div>
              )}
              {quote.client_address && (
                <div>
                  <span className="font-medium">Adresse :</span> {quote.client_address}
                </div>
              )}
            </div>
          </div>

          {/* Articles */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Articles</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Produit/Service</th>
                    <th className="text-center p-2">Quantité</th>
                    <th className="text-right p-2">Prix unitaire</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{item.name}</td>
                      <td className="text-center p-2">{item.qty}</td>
                      <td className="text-right p-2">{item.price.toLocaleString()} GNF</td>
                      <td className="text-right p-2">{(item.qty * item.price).toLocaleString()} GNF</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Montants */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Montants</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Sous-total :</span>
                <span>{quote.subtotal.toLocaleString()} GNF</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Remise :</span>
                  <span>-{quote.discount.toLocaleString()} GNF</span>
                </div>
              )}
              {quote.tax > 0 && (
                <div className="flex justify-between">
                  <span>Taxe :</span>
                  <span>+{quote.tax.toLocaleString()} GNF</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>TOTAL :</span>
                <span className="text-primary">{quote.total.toLocaleString()} GNF</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Notes / Conditions</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Informations supplémentaires */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Créé le :</span>{' '}
                {new Date(quote.created_at).toLocaleDateString('fr-FR')} à{' '}
                {new Date(quote.created_at).toLocaleTimeString('fr-FR')}
              </div>
              <div>
                <span className="font-medium">Valide jusqu'au :</span>{' '}
                {new Date(quote.valid_until).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            
            <Button
              variant="outline"
              onClick={generatePDF}
            >
              <Download className="w-4 h-4 mr-2" />
              Générer PDF A4
            </Button>

            {quote.pdf_url && (
              <Button
                variant="outline"
                onClick={() => downloadPDF(quote.pdf_url!, quote.ref)}
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </Button>
            )}

            {quote.status === 'pending' && (
              <Button onClick={onConvert}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Convertir en Facture
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
