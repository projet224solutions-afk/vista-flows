import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Loader2, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickTransferButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
}

export function QuickTransferButton({
  variant = "default",
  size = "default",
  className = "",
  showText = true
}: QuickTransferButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [description, setDescription] = useState('');

  const handleTransfer = async () => {
    if (!user?.id || !amount || !recipientId || !description) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    setLoading(true);
    console.log('💸 Transfert rapide:', { amount: transferAmount, recipientId });

    try {
      // Récupérer notre propre custom_id pour la vérification
      const { data: senderIdData } = await supabase
        .from('user_ids')
        .select('custom_id')
        .eq('user_id', user.id)
        .single();

      if (senderIdData && recipientId === senderIdData.custom_id) {
        toast.error('Vous ne pouvez pas transférer à vous-même');
        setLoading(false);
        return;
      }

      // Convertir le custom_id en UUID réel
      const { data: recipientData, error: recipientError } = await supabase
        .from('user_ids')
        .select('user_id')
        .eq('custom_id', recipientId)
        .single();

      if (recipientError || !recipientData) {
        toast.error('Destinataire introuvable. Vérifiez le code.');
        setLoading(false);
        return;
      }

      const recipientUuid = recipientData.user_id;

      // Vérifier le solde
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (walletError) throw walletError;

      if (!walletData || walletData.balance < transferAmount) {
        toast.error('Solde insuffisant');
        setLoading(false);
        return;
      }

      // Effectuer le transfert via edge function avec l'UUID réel
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'transfer',
          amount: transferAmount,
          recipient_id: recipientUuid,
          description: description
        }
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors du transfert');
      }

      // Vérifier si la réponse contient une erreur
      if (data && !data.success && data.error) {
        throw new Error(data.error);
      }

      toast.success(`Transfert de ${transferAmount.toLocaleString()} GNF réussi vers ${recipientId} !`);
      setAmount('');
      setRecipientId('');
      setDescription('');
      setOpen(false);

      // Recharger la page pour mettre à jour le solde
      window.dispatchEvent(new CustomEvent('wallet-updated'));
    } catch (error: any) {
      console.error('❌ Erreur transfert:', error);
      const errorMessage = error.message || error.error || 'Erreur lors du transfert';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Send className="w-4 h-4" />
          {showText && <span className="ml-2">Transfert rapide</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            Transfert rapide
          </DialogTitle>
          <DialogDescription>
            Transférez des fonds rapidement à un autre utilisateur
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Code du destinataire</Label>
            <Input
              id="recipient"
              placeholder="Ex: ABC1234"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value.toUpperCase())}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Entrez le code d'identification de 7 caractères
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Montant (GNF)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Ex: 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Motif du transfert</Label>
            <Input
              id="description"
              placeholder="Ex: Paiement produit, Remboursement..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleTransfer}
            disabled={loading || !amount || !recipientId || !description}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Transfert en cours...' : 'Confirmer le transfert'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
