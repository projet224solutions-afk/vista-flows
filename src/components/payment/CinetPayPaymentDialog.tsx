import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, Smartphone } from 'lucide-react';

interface CinetPayPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmount?: number;
  description?: string;
  onSuccess?: (transactionId: string, paymentUrl: string) => void;
}

export function CinetPayPaymentDialog({
  open,
  onOpenChange,
  defaultAmount = 10000,
  description = 'Rechargez votre wallet via CinetPay',
  onSuccess,
}: CinetPayPaymentDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState(defaultAmount);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user || !profile) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté',
        variant: 'destructive',
      });
      return;
    }

    if (amount < 100) {
      toast({
        title: 'Erreur',
        description: 'Le montant minimum est de 100 GNF',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Initialisation paiement CinetPay:', { amount });

      const { data, error } = await supabase.functions.invoke('cinetpay-initialize-payment', {
        body: {
          amount,
          currency: 'GNF',
          description: description || `Recharge wallet - ${profile.first_name || 'Utilisateur'}`,
          customer_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Client',
          customer_email: profile.email || user.email || '',
          customer_phone: profile.phone || '',
        },
      });

      if (error) {
        console.error('❌ Erreur CinetPay:', error);
        throw new Error(error.message || 'Erreur lors de l\'initialisation du paiement');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Échec de l\'initialisation du paiement');
      }

      console.log('✅ Paiement CinetPay initialisé:', data);

      // Ouvrir la page de paiement CinetPay
      if (data.payment_url) {
        window.open(data.payment_url, '_blank');
        
        toast({
          title: 'Redirection vers CinetPay',
          description: 'Complétez le paiement dans la fenêtre qui s\'est ouverte',
        });

        if (onSuccess) {
          onSuccess(data.transaction_id, data.payment_url);
        }

        onOpenChange(false);
      } else {
        throw new Error('URL de paiement non reçue');
      }

    } catch (error: any) {
      console.error('❌ Erreur paiement CinetPay:', error);
      toast({
        title: 'Erreur de paiement',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [5000, 10000, 25000, 50000, 100000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Paiement CinetPay
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Montant */}
          <div className="space-y-2">
            <Label htmlFor="amount">Montant (GNF)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Entrez le montant"
              min={100}
            />
          </div>

          {/* Montants rapides */}
          <div className="space-y-2">
            <Label>Montants rapides</Label>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount) => (
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

          {/* Info utilisateur */}
          <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Email:</strong> {profile?.email || user?.email || 'Non défini'}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Nom:</strong> {`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Non défini'}
            </p>
          </div>

          {/* Note CinetPay */}
          <div className="bg-primary/10 p-3 rounded-lg text-sm">
            <p className="font-medium text-primary">💳 CinetPay</p>
            <p className="text-muted-foreground mt-1">
              Paiement sécurisé via Mobile Money (Orange, MTN, Moov) ou carte bancaire.
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button
            onClick={handlePayment}
            disabled={loading || amount < 100}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Traitement...' : `Payer ${amount.toLocaleString('fr-FR')} GNF`}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
