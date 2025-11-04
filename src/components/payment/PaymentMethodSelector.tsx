/**
 * SÉLECTEUR DE MÉTHODE DE PAIEMENT 224SOLUTIONS
 * Portefeuille + Orange Money + MTN + Cash
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wallet, Smartphone, Banknote, Check, AlertCircle } from 'lucide-react';
import { Payment224Service, type PaymentMethod } from '@/services/payment/Payment224Service';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PaymentMethodSelectorProps {
  amount: number;
  onPaymentMethodSelected: (methodId: string, methodType: string) => void;
  onCancel: () => void;
}

export function PaymentMethodSelector({
  amount,
  onPaymentMethodSelected,
  onCancel,
}: PaymentMethodSelectorProps) {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadPaymentMethods();
      loadWalletBalance();
    }
  }, [user]);

  const loadPaymentMethods = async () => {
    if (!user) return;
    const methods = await Payment224Service.getUserPaymentMethods(user.id);
    setPaymentMethods(methods);
    
    // Sélectionner la méthode par défaut
    const defaultMethod = methods.find(m => m.is_default);
    if (defaultMethod) {
      setSelectedMethod(defaultMethod.id);
    }
  };

  const loadWalletBalance = async () => {
    if (!user) return;
    const balance = await Payment224Service.getWalletBalance(user.id);
    setWalletBalance(balance);
  };

  const handleConfirm = () => {
    if (!selectedMethod && selectedMethod !== 'new_cash') {
      toast.error('Veuillez sélectionner une méthode de paiement');
      return;
    }

    if (selectedMethod === 'new_orange' || selectedMethod === 'new_mtn') {
      if (!phoneNumber || phoneNumber.length < 9) {
        toast.error('Numéro de téléphone invalide');
        return;
      }
    }

    onPaymentMethodSelected(selectedMethod, phoneNumber);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Méthode de paiement</CardTitle>
        <div className="text-center mt-2">
          <p className="text-3xl font-bold text-primary">
            {amount.toLocaleString()} GNF
          </p>
          <p className="text-sm text-muted-foreground">Montant à payer</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
          {/* Portefeuille 224Solutions */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Portefeuille 224Solutions
            </Label>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="wallet_224" id="wallet_224" />
              <Label htmlFor="wallet_224" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span>Solde: {walletBalance.toLocaleString()} GNF</span>
                  {walletBalance >= amount ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Suffisant
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Insuffisant
                    </Badge>
                  )}
                </div>
              </Label>
            </div>
          </div>

          {/* Orange Money */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Smartphone className="h-5 w-5" style={{ color: '#FF6B00' }} />
              Orange Money
            </Label>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
              style={{ borderColor: selectedMethod === 'new_orange' ? '#FF6B00' : undefined }}>
              <RadioGroupItem value="new_orange" id="new_orange" />
              <Label htmlFor="new_orange" className="flex-1 cursor-pointer">
                Payer avec Orange Money
              </Label>
            </div>
            {selectedMethod === 'new_orange' && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="phone_orange">Numéro Orange Money</Label>
                <Input
                  id="phone_orange"
                  placeholder="+224 XXX XX XX XX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* MTN Mobile Money */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Smartphone className="h-5 w-5" style={{ color: '#FFCC00' }} />
              MTN Mobile Money
            </Label>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
              style={{ borderColor: selectedMethod === 'new_mtn' ? '#FFCC00' : undefined }}>
              <RadioGroupItem value="new_mtn" id="new_mtn" />
              <Label htmlFor="new_mtn" className="flex-1 cursor-pointer">
                Payer avec MTN Money
              </Label>
            </div>
            {selectedMethod === 'new_mtn' && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="phone_mtn">Numéro MTN Money</Label>
                <Input
                  id="phone_mtn"
                  placeholder="+224 XXX XX XX XX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Paiement en espèces */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              Espèces
            </Label>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="new_cash" id="new_cash" />
              <Label htmlFor="new_cash" className="flex-1 cursor-pointer">
                Payer en espèces à la livraison
              </Label>
            </div>
          </div>
        </RadioGroup>

        <div className="pt-4 flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedMethod || loading}
            className="flex-1"
            style={{ 
              background: 'linear-gradient(135deg, hsl(25 98% 55%), hsl(145 65% 35%))',
              color: 'white'
            }}
          >
            {loading ? 'Traitement...' : 'Confirmer le paiement'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
