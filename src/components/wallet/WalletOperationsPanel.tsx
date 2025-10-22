/**
 * 💳 PANNEAU OPÉRATIONS WALLET
 * Interface complète pour dépôt, retrait, transfert
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWallet } from '@/hooks/useWallet';
import { PublicIdInput } from '@/components/PublicIdInput';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  CreditCard,
  Smartphone,
  Wallet as WalletIcon,
  Banknote,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { value: 'card', label: 'Carte bancaire', icon: CreditCard, color: 'text-blue-600' },
  { value: 'orange_money', label: 'Orange Money', icon: Smartphone, color: 'text-orange-600' },
  { value: 'mtn_money', label: 'MTN Money', icon: Smartphone, color: 'text-yellow-600' },
  { value: 'moov_money', label: 'Moov Money', icon: Smartphone, color: 'text-blue-500' },
  { value: 'wallet_224', label: '224Sallet', icon: WalletIcon, color: 'text-purple-600' },
  { value: 'cash', label: 'Espèces', icon: Banknote, color: 'text-green-600' }
];

export function WalletOperationsPanel() {
  const { wallet, balance, currency, processing, deposit, withdraw, transfer } = useWallet();

  // États formulaires
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('card');
  
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('card');
  
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [transferDescription, setTransferDescription] = useState('');

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    const success = await deposit(amount, depositMethod, {
      description: `Dépôt via ${PAYMENT_METHODS.find(m => m.value === depositMethod)?.label}`
    });

    if (success) {
      setDepositAmount('');
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (amount > balance) {
      toast.error('Solde insuffisant');
      return;
    }

    const success = await withdraw(amount, withdrawMethod, {
      description: `Retrait via ${PAYMENT_METHODS.find(m => m.value === withdrawMethod)?.label}`
    });

    if (success) {
      setWithdrawAmount('');
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (!recipientId || recipientId.length < 8) {
      toast.error('ID destinataire invalide');
      return;
    }

    if (!transferDescription) {
      toast.error('Description requise');
      return;
    }

    const success = await transfer(recipientId, amount, transferDescription);

    if (success) {
      setTransferAmount('');
      setRecipientId('');
      setTransferDescription('');
    }
  };

  if (!wallet) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <WalletIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Wallet en cours de chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opérations Wallet</CardTitle>
        <CardDescription>
          Dépôt, retrait et transfert d'argent
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposit" className="gap-2">
              <ArrowDownToLine className="w-4 h-4" />
              Dépôt
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="gap-2">
              <ArrowUpFromLine className="w-4 h-4" />
              Retrait
            </TabsTrigger>
            <TabsTrigger value="transfer" className="gap-2">
              <Send className="w-4 h-4" />
              Transfert
            </TabsTrigger>
          </TabsList>

          {/* Dépôt */}
          <TabsContent value="deposit" className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                Solde actuel: <span className="font-bold">{balance.toLocaleString()} {currency}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="deposit-amount">Montant à déposer ({currency})</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="10000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="0"
                />
              </div>

              <div>
                <Label>Méthode de paiement</Label>
                <Select value={depositMethod} onValueChange={setDepositMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <method.icon className={`w-4 h-4 ${method.color}`} />
                          {method.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleDeposit}
                disabled={!depositAmount || processing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-4 h-4 mr-2" />
                    Confirmer le dépôt
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Retrait */}
          <TabsContent value="withdraw" className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800">
                Solde disponible: <span className="font-bold">{balance.toLocaleString()} {currency}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="withdraw-amount">Montant à retirer ({currency})</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="10000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="0"
                  max={balance}
                />
              </div>

              <div>
                <Label>Méthode de retrait</Label>
                <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <method.icon className={`w-4 h-4 ${method.color}`} />
                          {method.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || processing}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine className="w-4 h-4 mr-2" />
                    Confirmer le retrait
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Transfert */}
          <TabsContent value="transfer" className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                Solde disponible: <span className="font-bold">{balance.toLocaleString()} {currency}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>ID du destinataire</Label>
                <PublicIdInput
                  value={recipientId}
                  onChange={setRecipientId}
                  label=""
                  placeholder="ABC1234"
                  showValidation={true}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Entrez l'ID public du destinataire (format: LLLDDDD)
                </p>
              </div>

              <div>
                <Label htmlFor="transfer-amount">Montant à envoyer ({currency})</Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  placeholder="10000"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  min="0"
                  max={balance}
                />
              </div>

              <div>
                <Label htmlFor="transfer-description">Motif du transfert</Label>
                <Textarea
                  id="transfer-description"
                  placeholder="Ex: Paiement facture, Remboursement..."
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                onClick={handleTransfer}
                disabled={!transferAmount || !recipientId || !transferDescription || processing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Confirmer le transfert
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default WalletOperationsPanel;
