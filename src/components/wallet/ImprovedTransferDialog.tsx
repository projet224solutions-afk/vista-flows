import { useState, startTransition, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserSearchInput } from './UserSearchInput';
import { useAuth } from '@/hooks/useAuth';
import { previewWalletTransfer, transferToWallet } from '@/services/walletBackendService';
import { toast } from 'sonner';
import { SecureButton } from '@/components/ui/SecureButton';
import { InternationalTransferConfirmation, type InternationalPreviewData } from './InternationalTransferConfirmation';
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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [intlPreview, setIntlPreview] = useState<InternationalPreviewData | null>(null);
  const [showIntlConfirm, setShowIntlConfirm] = useState(false);
  const [executing, setExecuting] = useState(false);

  const handleUserSelect = (userId: string) => {
    setRecipientUserId(userId);
  };

  // Step 1: Preview the transfer to detect international
  const handlePreviewAndTransfer = useCallback(async () => {
    if (!user?.id || !recipientCode || !amount || !description) {
      toast.error('Veuillez remplir tous les champs');
      throw new Error('Champs manquants');
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error('Montant invalide');
      throw new Error('Montant invalide');
    }

    if (transferAmount > currentBalance) {
      toast.error('Solde insuffisant');
      throw new Error('Solde insuffisant');
    }

    // First, call backend preview to detect international transfers
    setPreviewLoading(true);
    try {
      // Resolve recipient ID first
      const resolvedRecipient = recipientUserId || recipientCode;

      const previewResponse = await previewWalletTransfer(resolvedRecipient, transferAmount);
      if (!previewResponse.success) {
        throw new Error(previewResponse.error || 'Erreur de prévisualisation');
      }
      const previewData = previewResponse.data;

      if (previewData.is_international) {
        // Show international confirmation dialog
        setIntlPreview(previewData as InternationalPreviewData);
        setShowIntlConfirm(true);
        onOpenChange(false); // Close main dialog
        return;
      }

      // Local transfer: execute directly
      await executeLocalTransfer(transferAmount, resolvedRecipient);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur';
      toast.error(message);
      throw err;
    } finally {
      setPreviewLoading(false);
    }
  }, [user?.id, recipientCode, recipientUserId, amount, description, currentBalance, onOpenChange]);

  // Execute local transfer (no international fees)
  const executeLocalTransfer = async (transferAmount: number, resolvedRecipient: string) => {
    const result = await transferToWallet(
      resolvedRecipient,
      transferAmount,
      description
    );

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors du transfert');
    }

    toast.success(`Transfert de ${transferAmount.toLocaleString()} réussi !`);
    resetForm();
    onOpenChange(false);
    onSuccess?.();
    window.dispatchEvent(new CustomEvent('wallet-updated'));
  };

  // Execute international transfer via backend wallet API
  const executeInternationalTransfer = useCallback(async () => {
    if (!intlPreview) return;

    setExecuting(true);
    try {
      const resolvedRecipient = recipientUserId || recipientCode;

      const result = await transferToWallet(
        resolvedRecipient,
        intlPreview.amount_sent,
        description
      );

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors du transfert');
      }

      toast.success(
        '🌍 Transfert international réussi !',
        { duration: 5000 }
      );

      resetForm();
      setShowIntlConfirm(false);
      setIntlPreview(null);
      onSuccess?.();
      window.dispatchEvent(new CustomEvent('wallet-updated'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de transfert';
      toast.error(message);
    } finally {
      setExecuting(false);
    }
  }, [intlPreview, recipientCode, recipientUserId, description, onSuccess]);

  const resetForm = () => {
    setRecipientCode('');
    setRecipientUserId(null);
    setAmount('');
    setDescription('');
    setIntlPreview(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Effectuer un transfert</DialogTitle>
            <DialogDescription>
              Transférez des fonds à un autre utilisateur — local ou international 🌍
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <UserSearchInput
              value={recipientCode}
              onChange={setRecipientCode}
              onUserSelect={handleUserSelect}
              label="Destinataire"
              placeholder="ID, email ou téléphone"
            />

            <div className="space-y-2">
              <Label htmlFor="amount">Montant</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Ex: 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Solde disponible: {currentBalance.toLocaleString()} GNF
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Motif du transfert</Label>
              <Input
                id="description"
                placeholder="Ex: Paiement produit, Remboursement..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <SecureButton
              onSecureClick={handlePreviewAndTransfer}
              disabled={!recipientCode || !amount || !description || previewLoading}
              className="w-full bg-primary hover:bg-primary/90"
              loadingText="Vérification en cours..."
              debounceMs={1000}
            >
              {previewLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                'Confirmer le transfert'
              )}
            </SecureButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* International confirmation with rate-lock timer */}
      <InternationalTransferConfirmation
        open={showIntlConfirm}
        onOpenChange={(val) => {
          setShowIntlConfirm(val);
          if (!val) setIntlPreview(null);
        }}
        preview={intlPreview}
        onConfirm={executeInternationalTransfer}
        loading={executing}
      />
    </>
  );
};
