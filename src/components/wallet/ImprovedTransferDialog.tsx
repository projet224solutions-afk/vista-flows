import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserSearchInput } from './UserSearchInput';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ImprovedTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentBalance?: number;
}

export const ImprovedTransferDialog = ({
  open,
  onOpenChange,
  onSuccess,
  currentBalance = 0
}: ImprovedTransferDialogProps) => {
  const { user } = useAuth();
  const [recipientCode, setRecipientCode] = useState('');
  const [recipientUserId, setRecipientUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleUserSelect = (userId: string) => {
    setRecipientUserId(userId);
  };

  const handleTransfer = async () => {
    if (!user?.id || !recipientCode || !amount || !description) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (transferAmount > currentBalance) {
      toast.error('Solde insuffisant');
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'transfer',
          amount: transferAmount,
          recipient_id: recipientCode,
          description: description
        }
      });

      if (error) throw error;

      toast.success(`Transfert de ${transferAmount.toLocaleString()} GNF réussi !`);
      setRecipientCode('');
      setRecipientUserId(null);
      setAmount('');
      setDescription('');
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }

      // Déclencher l'événement de mise à jour
      window.dispatchEvent(new CustomEvent('wallet-updated'));
    } catch (error: any) {
      console.error('❌ Erreur transfert:', error);
      toast.error(error.message || 'Erreur lors du transfert');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Effectuer un transfert</DialogTitle>
          <DialogDescription>
            Transférez des fonds à un autre utilisateur avec son code d'identification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Recherche d'utilisateur avec auto-complétion */}
          <UserSearchInput
            value={recipientCode}
            onChange={setRecipientCode}
            onUserSelect={handleUserSelect}
            label="Code du destinataire"
            placeholder="Ex: ABC1234"
          />

          {/* Montant */}
          <div className="space-y-2">
            <Label htmlFor="amount">Montant (GNF)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Ex: 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={processing}
            />
            <p className="text-xs text-muted-foreground">
              Solde disponible: {currentBalance.toLocaleString()} GNF
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Motif du transfert</Label>
            <Input
              id="description"
              placeholder="Ex: Paiement produit, Remboursement..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={processing}
            />
          </div>

          {/* Bouton de confirmation */}
          <Button
            onClick={handleTransfer}
            disabled={processing || !recipientCode || !amount || !description}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {processing ? 'Transfert en cours...' : 'Confirmer le transfert'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
