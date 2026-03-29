/**
 * LISTE DES FACTURES - INTERFACE VENDEUR
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVendorId } from '@/hooks/useVendorId';

interface Invoice {
  id: string;
  ref: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  total: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  pdf_url: string | null;
  created_at: string;
}

export default function InvoicesList() {
  const { vendorId } = useVendorId();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInvoices = async () => {
    if (!vendorId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data as any[]) || []);
    } catch (error: any) {
      console.error('Erreur chargement factures:', error);
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [vendorId]);

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'En attente', variant: 'secondary' as const, icon: Clock },
      paid: { label: 'PayÃ©e', variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: 'AnnulÃ©e', variant: 'destructive' as const, icon: XCircle },
      overdue: { label: 'En retard', variant: 'destructive' as const, icon: Clock }
    };
    
    const { label, variant, icon: Icon } = config[status as keyof typeof config];
    
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const markAsPaid = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) throw error;
      
      toast.success('Facture marquÃ©e comme payÃ©e');
      loadInvoices();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise Ã  jour');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Mes Factures</CardTitle>
          <Button onClick={loadInvoices} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune facture crÃ©Ã©e</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="border rounded-lg p-4 hover:bg-muted/50 transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-primary">{invoice.ref}</span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="font-semibold">{invoice.client_name}</p>
                    {invoice.client_email && (
                      <p className="text-sm text-muted-foreground">{invoice.client_email}</p>
                    )}
                    {invoice.client_phone && (
                      <p className="text-sm text-muted-foreground">{invoice.client_phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {(invoice.total || 0).toLocaleString()} GNF
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ã‰chÃ©ance: {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                    </p>
                    {invoice.paid_at && (
                      <p className="text-xs text-primary-orange-600">
                        PayÃ©e le {new Date(invoice.paid_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!invoice.pdf_url) {
                        // GÃ©nÃ©rer le PDF si non disponible
                        try {
                          const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
                            body: {
                              invoice_id: invoice.id,
                              ref: invoice.ref,
                              vendor_id: vendorId
                            }
                          });

                          if (error) throw error;
                          
                          toast.success('PDF gÃ©nÃ©rÃ© avec succÃ¨s');
                          loadInvoices();
                        } catch (error: any) {
                          console.error('Erreur gÃ©nÃ©ration PDF:', error);
                          toast.error('Erreur lors de la gÃ©nÃ©ration du PDF');
                        }
                        return;
                      }

                      // TÃ©lÃ©charger le PDF
                      try {
                        const response = await fetch(invoice.pdf_url);
                        if (!response.ok) {
                          throw new Error(`HTTP ${response.status}`);
                        }
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${invoice.ref}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        toast.success('TÃ©lÃ©chargement dÃ©marrÃ©');
                      } catch (error) {
                        console.error('Erreur tÃ©lÃ©chargement:', error);
                        const opened = window.open(invoice.pdf_url, '_blank', 'noopener,noreferrer');
                        if (opened) {
                          toast.success('PDF ouvert dans un nouvel onglet');
                        } else {
                          toast.error("TÃ©lÃ©chargement bloquÃ©: autorisez les popups puis rÃ©essayez.");
                        }
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {invoice.pdf_url ? 'TÃ©lÃ©charger PDF' : 'GÃ©nÃ©rer PDF'}
                  </Button>
                  {invoice.status === 'pending' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => markAsPaid(invoice.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marquer comme payÃ©e
                    </Button>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    CrÃ©Ã©e le {new Date(invoice.created_at).toLocaleDateString('fr-FR')} Ã {' '}
                    {new Date(invoice.created_at).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}