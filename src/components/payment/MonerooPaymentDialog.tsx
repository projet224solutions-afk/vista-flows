import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMonerooPayment } from '@/hooks/useMonerooPayment';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'orange_gn', name: 'Orange Money', logo: '🟠' },
  { id: 'mtn_gn', name: 'MTN Mobile Money', logo: '🟡' },
];

interface MonerooPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmount?: number;
  description: string;
  metadata?: Record<string, any>;
  onSuccess?: (paymentId: string) => void;
}

export function MonerooPaymentDialog({
  open,
  onOpenChange,
  defaultAmount = 0,
  description,
  metadata,
  onSuccess,
}: MonerooPaymentDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { initializePayment, loading } = useMonerooPayment();
  const [amount, setAmount] = useState(defaultAmount);
  const [selectedMethod, setSelectedMethod] = useState<string>('orange_gn');

  const handlePayment = async () => {
    if (!user || !profile) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté',
        variant: 'destructive',
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: 'Erreur',
        description: 'Le montant doit être supérieur à 0',
        variant: 'destructive',
      });
      return;
    }

    const result = await initializePayment({
      amount,
      currency: 'GNF',
      description,
      customer: {
        email: profile.email || user.email || '',
        first_name: profile.first_name || 'Utilisateur',
        last_name: profile.last_name || '',
      },
      methods: [selectedMethod],
      metadata,
    });

    if (result && result.checkout_url) {
      // Open Moneroo checkout in new window
      window.open(result.checkout_url, '_blank');
      
      toast({
        title: 'Redirection',
        description: 'Vous allez être redirigé vers la page de paiement',
      });

      if (onSuccess) {
        onSuccess(result.payment_id);
      }

      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Paiement Moneroo</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh] pr-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant (GNF)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Entrez le montant"
              min={0}
            />
          </div>

          <div className="space-y-3">
            <Label>Méthode de paiement</Label>
            <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
              {PAYMENT_METHODS.map((method) => (
                <div key={method.id} className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label htmlFor={method.id} className="flex items-center gap-2 cursor-pointer flex-1">
                    <span className="text-2xl">{method.logo}</span>
                    <span>{method.name}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={profile?.email || user?.email || ''}
              disabled
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input
                value={profile?.first_name || ''}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={profile?.last_name || ''}
                disabled
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0 pt-4 border-t">
          <Button
            onClick={handlePayment}
            disabled={loading || amount <= 0}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Payer {amount.toLocaleString('fr-FR')} GNF
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
