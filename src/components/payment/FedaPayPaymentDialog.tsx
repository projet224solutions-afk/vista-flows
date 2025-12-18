import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFedaPayPayment } from '@/hooks/useFedaPayPayment';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Smartphone, Loader2 } from 'lucide-react';

interface FedaPayPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmount?: number;
  description?: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (transactionId: string) => void;
}

export function FedaPayPaymentDialog({
  open,
  onOpenChange,
  defaultAmount = 10000,
  description = 'Paiement via FedaPay',
  metadata,
  onSuccess,
}: FedaPayPaymentDialogProps) {
  const { user, profile } = useAuth();
  const { initializePayment, isLoading } = useFedaPayPayment();
  const [amount, setAmount] = useState(defaultAmount);
  const [phone, setPhone] = useState('');

  const handlePayment = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (amount < 100) {
      toast.error('Le montant minimum est de 100 GNF');
      return;
    }

    const result = await initializePayment({
      amount,
      currency: 'GNF',
      description,
      customerEmail: user.email || undefined,
      customerPhone: phone || undefined,
      customerName: (profile as any)?.full_name || user.email?.split('@')[0] || 'Client',
      returnUrl: window.location.href,
    });

    if (result.success && result.paymentUrl) {
      window.open(result.paymentUrl, '_blank');
      onSuccess?.(result.transactionId || '');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            Paiement FedaPay
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Montant (GNF)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Entrez le montant"
              min={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Téléphone (optionnel)</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 620000000"
              maxLength={9}
            />
            <p className="text-xs text-muted-foreground">
              Numéro pour recevoir les notifications de paiement
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Label className="w-full">Montants rapides</Label>
            {[5000, 10000, 25000, 50000, 100000].map((quickAmount) => (
              <Button
                key={quickAmount}
                variant={amount === quickAmount ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAmount(quickAmount)}
              >
                {quickAmount.toLocaleString('fr-FR')} GNF
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handlePayment} disabled={isLoading || amount < 100} className="bg-green-600 hover:bg-green-700">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Chargement...
              </>
            ) : (
              <>Payer {amount.toLocaleString('fr-FR')} GNF</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
