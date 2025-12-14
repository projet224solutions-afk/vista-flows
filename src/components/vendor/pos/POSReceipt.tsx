import React, { useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Printer, 
  Check, 
  Store,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  X
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface POSReceiptProps {
  open: boolean;
  onClose: () => void;
  orderData: {
    orderNumber: string;
    items: CartItem[];
    subtotal: number;
    tax: number;
    taxRate: number;
    taxEnabled: boolean;
    discount: number;
    total: number;
    paymentMethod: 'cash' | 'card' | 'mobile';
    receivedAmount: number;
    change: number;
    currency: string;
    companyName: string;
    receiptFooter?: string;
  };
}

export function POSReceipt({ open, onClose, orderData }: POSReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, canvas.height * 80 / canvas.width + 20],
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 5, 5, 70, (canvas.height * 70) / canvas.width);
      pdf.save(`recu-${orderData.orderNumber}.pdf`);
      
      toast.success('Reçu téléchargé avec succès');
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const printReceipt = () => {
    if (!receiptRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Reçu - ${orderData.orderNumber}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
              .item { display: flex; justify-content: space-between; margin: 5px 0; }
              .total { border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; font-weight: bold; }
              .footer { text-align: center; border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; font-size: 10px; }
            </style>
          </head>
          <body>
            ${receiptRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getPaymentIcon = () => {
    switch (orderData.paymentMethod) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'mobile': return <Smartphone className="h-4 w-4" />;
    }
  };

  const getPaymentLabel = () => {
    switch (orderData.paymentMethod) {
      case 'cash': return 'Espèces';
      case 'card': return 'Carte bancaire';
      case 'mobile': return 'Paiement mobile';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto p-0">
        {/* Header avec actions */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-green-500 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Paiement réussi!</h2>
                <p className="text-sm text-white/80">Commande #{orderData.orderNumber}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Reçu imprimable */}
        <div className="p-4">
          <div 
            ref={receiptRef} 
            className="bg-white border-2 border-dashed border-border rounded-lg p-4 font-mono text-sm"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {/* En-tête reçu */}
            <div className="text-center border-b border-dashed border-muted-foreground/30 pb-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <Store className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{orderData.companyName}</h3>
              <p className="text-xs text-muted-foreground mt-1">REÇU DE CAISSE</p>
              <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date().toLocaleString('fr-FR')}</span>
              </div>
            </div>

            {/* Numéro de commande */}
            <div className="bg-muted/30 rounded-lg p-3 mb-4 text-center">
              <p className="text-xs text-muted-foreground">N° Commande</p>
              <p className="text-lg font-bold text-primary">#{orderData.orderNumber}</p>
            </div>

            {/* Articles */}
            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Articles</p>
              {orderData.items.map((item, index) => (
                <div key={item.id} className="flex justify-between items-start py-1">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {item.price.toLocaleString()} {orderData.currency}
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">
                    {item.total.toLocaleString()} {orderData.currency}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Totaux */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{orderData.subtotal.toLocaleString()} {orderData.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  TVA ({orderData.taxEnabled ? `${(orderData.taxRate * 100).toFixed(1)}%` : 'désactivée'})
                </span>
                <span>{orderData.tax.toLocaleString()} {orderData.currency}</span>
              </div>
              {orderData.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Remise ({orderData.discount}%)</span>
                  <span>-{((orderData.subtotal + orderData.tax) * orderData.discount / 100).toLocaleString()} {orderData.currency}</span>
                </div>
              )}
              
              <div className="flex justify-between text-xl font-bold pt-2 border-t-2 border-foreground">
                <span>TOTAL</span>
                <span className="text-primary">{orderData.total.toLocaleString()} {orderData.currency}</span>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Mode de paiement */}
            <div className="bg-muted/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getPaymentIcon()}
                  <span className="font-medium">{getPaymentLabel()}</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Payé
                </Badge>
              </div>
              
              {orderData.paymentMethod === 'cash' && orderData.receivedAmount > 0 && (
                <div className="mt-2 pt-2 border-t border-muted-foreground/20 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reçu</span>
                    <span>{orderData.receivedAmount.toLocaleString()} {orderData.currency}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-600">
                    <span>Rendu</span>
                    <span>{orderData.change.toLocaleString()} {orderData.currency}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Pied de page */}
            <div className="text-center mt-6 pt-4 border-t border-dashed border-muted-foreground/30">
              <p className="text-xs text-muted-foreground">
                {orderData.receiptFooter || 'Merci pour votre achat!'}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                Powered by 224Solutions
              </p>
            </div>
          </div>

          {/* Actions téléchargement/impression */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button
              variant="outline"
              onClick={printReceipt}
              className="h-12 shadow-md"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            <Button
              onClick={downloadReceipt}
              className="h-12 bg-gradient-to-r from-primary to-primary/80 shadow-md"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger PDF
            </Button>
          </div>

          {/* Bouton fermer */}
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full mt-3 text-muted-foreground"
          >
            Nouvelle vente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
