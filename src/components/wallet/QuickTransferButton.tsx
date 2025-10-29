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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Loader2, Wallet, AlertCircle } from "lucide-react";
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
  const [showTransferPreview, setShowTransferPreview] = useState(false);
  const [transferPreview, setTransferPreview] = useState<any>(null);

  const handlePreviewTransfer = async () => {
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

      // Convertir le custom_id en UUID réel (format: AAA0001)
      let recipientData = await supabase
        .from('user_ids')
        .select('user_id')
        .eq('custom_id', recipientId.toUpperCase())
        .maybeSingle();

      // Si pas trouvé, chercher dans profiles en fallback
      let recipientUuid = null;
      if (!recipientData.data) {
        const profileData = await supabase
          .from('profiles')
          .select('id')
          .eq('custom_id', recipientId.toUpperCase())
          .maybeSingle();
        
        if (profileData.data) {
          recipientUuid = profileData.data.id;
        }
      } else {
        recipientUuid = recipientData.data.user_id;
      }

      if (!recipientUuid) {
        toast.error('Destinataire introuvable. Vérifiez le code.');
        setLoading(false);
        return;
      }

      // Récupérer les informations du destinataire
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone')
        .eq('id', recipientUuid)
        .single();

      if (profileError) {
        console.error('Erreur profil destinataire:', profileError);
      }

      const recipientFullName = recipientProfile 
        ? `${recipientProfile.first_name || ''} ${recipientProfile.last_name || ''}`.trim() || 'Non renseigné'
        : 'Non renseigné';

      // Appeler la fonction de prévisualisation
      const { data, error } = await supabase.rpc('preview_wallet_transfer', {
        p_sender_id: user.id,
        p_receiver_id: recipientUuid,
        p_amount: transferAmount,
        p_currency: 'GNF'
      });

      if (error) throw error;

      const previewData = data as any;

      if (!previewData.success) {
        toast.error(previewData.error);
        return;
      }

      setTransferPreview({ 
        ...previewData, 
        recipient_uuid: recipientUuid, 
        recipient_code: recipientId,
        recipient_name: recipientFullName,
        recipient_email: recipientProfile?.email || 'Non renseigné',
        recipient_phone: recipientProfile?.phone || 'Non renseigné'
      });
      setShowTransferPreview(true);
      setOpen(false);
    } catch (error: any) {
      console.error('❌ Erreur prévisualisation:', error);
      toast.error(error.message || 'Erreur lors de la prévisualisation');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!user?.id || !transferPreview) return;
    
    setLoading(true);
    setShowTransferPreview(false);
    
    try {
      // Exécuter le transfert avec la fonction RPC
      const { data, error } = await supabase.rpc('process_wallet_transaction', {
        p_sender_id: user.id,
        p_receiver_id: transferPreview.recipient_uuid,
        p_amount: transferPreview.amount,
        p_currency: 'GNF',
        p_description: description
      });

      if (error) throw error;

      toast.success(
        `✅ Transfert réussi vers ${transferPreview.recipient_code}\n💸 Frais : ${transferPreview.fee_amount.toLocaleString()} GNF\n💰 Montant : ${transferPreview.amount.toLocaleString()} GNF`,
        { duration: 5000 }
      );
      
      setAmount('');
      setRecipientId('');
      setDescription('');
      setTransferPreview(null);

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
            onClick={handlePreviewTransfer}
            disabled={loading || !amount || !recipientId || !description}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Chargement...' : 'Voir les frais et confirmer'}
          </Button>
        </div>
      </DialogContent>

      {/* Dialog de confirmation avec prévisualisation des frais */}
      <AlertDialog open={showTransferPreview} onOpenChange={setShowTransferPreview}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Confirmer le transfert
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 mt-4">
                {/* Informations du destinataire */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <h4 className="font-semibold text-blue-900 mb-2">👤 Informations du destinataire</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nom:</strong> {transferPreview?.recipient_name}</p>
                    <p><strong>Email:</strong> {transferPreview?.recipient_email}</p>
                    <p><strong>Téléphone:</strong> {transferPreview?.recipient_phone}</p>
                    <p><strong>ID:</strong> {transferPreview?.recipient_code}</p>
                  </div>
                </div>

                {/* Détails du transfert */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">💰 Montant à transférer</span>
                    <span className="text-lg font-bold">{transferPreview?.amount?.toLocaleString()} GNF</span>
                  </div>
                  <div className="flex justify-between items-center text-orange-600">
                    <span className="text-sm font-medium">💸 Frais de transfert ({transferPreview?.fee_percent}%)</span>
                    <span className="text-lg font-bold">{transferPreview?.fee_amount?.toLocaleString()} GNF</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-sm font-medium">📉 Total débité de votre compte</span>
                    <span className="text-xl font-bold text-red-600">{transferPreview?.total_debit?.toLocaleString()} GNF</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span className="text-sm font-medium">📈 Montant net reçu</span>
                    <span className="text-lg font-bold">{transferPreview?.amount_received?.toLocaleString()} GNF</span>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Solde actuel:</strong> {transferPreview?.current_balance?.toLocaleString()} GNF
                    <br />
                    <strong>Solde après transfert:</strong> {transferPreview?.balance_after?.toLocaleString()} GNF
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  Souhaitez-vous confirmer ce transfert ?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Non, annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransfer} disabled={loading}>
              Oui, confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
