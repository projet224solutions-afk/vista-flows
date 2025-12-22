import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Wallet, 
  CreditCard, 
  Smartphone, 
  Truck, 
  Shield,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethodType = 'wallet' | 'card' | 'orange_money' | 'mtn_money' | 'cash_on_delivery';

interface PaymentMethodOption {
  id: PaymentMethodType;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  available: boolean;
  requiresPhone?: boolean;
}

interface PaymentMethodSelectionProps {
  walletBalance: number;
  amount: number;
  recipientId?: string;
  onMethodSelected: (method: PaymentMethodType, phoneNumber?: string) => void;
  onCancel: () => void;
  processing?: boolean;
  isEscrow?: boolean;
}

export function PaymentMethodSelection({
  walletBalance,
  amount,
  recipientId,
  onMethodSelected,
  onCancel,
  processing = false,
  isEscrow = true
}: PaymentMethodSelectionProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('wallet');
  const [phoneNumber, setPhoneNumber] = useState('');

  const isWalletSufficient = walletBalance >= amount;

  const paymentMethods: PaymentMethodOption[] = [
    {
      id: 'wallet',
      name: 'Wallet 224Solutions',
      description: 'Paiement instantané depuis votre wallet',
      icon: <Wallet className="h-5 w-5 text-primary" />,
      iconBg: 'bg-primary/10',
      available: isWalletSufficient
    },
    {
      id: 'orange_money',
      name: 'Orange Money',
      description: 'Payer avec votre compte Orange Money',
      icon: <Smartphone className="h-5 w-5 text-orange-500" />,
      iconBg: 'bg-orange-100',
      available: true,
      requiresPhone: true
    },
    {
      id: 'mtn_money',
      name: 'MTN Mobile Money',
      description: 'Payer avec votre compte MTN MoMo',
      icon: <Smartphone className="h-5 w-5 text-yellow-600" />,
      iconBg: 'bg-yellow-100',
      available: true,
      requiresPhone: true
    },
    {
      id: 'card',
      name: 'Carte bancaire',
      description: 'Visa, Mastercard, etc.',
      icon: <CreditCard className="h-5 w-5 text-blue-500" />,
      iconBg: 'bg-blue-100',
      available: true
    },
    {
      id: 'cash_on_delivery',
      name: 'Paiement à la livraison',
      description: 'Payez en espèces à la réception',
      icon: <Truck className="h-5 w-5 text-green-600" />,
      iconBg: 'bg-green-100',
      available: true
    }
  ];

  const selectedOption = paymentMethods.find(m => m.id === selectedMethod);
  const requiresPhone = selectedOption?.requiresPhone && (selectedMethod === 'orange_money' || selectedMethod === 'mtn_money');

  const handleConfirm = () => {
    if (!selectedMethod) return;
    if (requiresPhone && !phoneNumber) return;
    onMethodSelected(selectedMethod, requiresPhone ? phoneNumber : undefined);
  };

  const isConfirmDisabled = !selectedMethod || 
    (requiresPhone && !phoneNumber) || 
    (selectedMethod === 'wallet' && !isWalletSufficient) ||
    processing;

  return (
    <div className="flex flex-col h-[70vh] max-h-[70vh] min-h-0">
      {/* Header fixe */}
      <div className="space-y-3 pb-3">
        {/* Message Escrow */}
        {isEscrow && (
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-700">
              Vos fonds sont protégés par notre système Escrow jusqu'à la livraison
            </p>
          </div>
        )}

        {/* Solde et ID Vendeur */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm">
            Solde disponible: <span className="font-bold text-foreground">{walletBalance.toLocaleString('fr-GN')} GNF</span>
          </div>
          {recipientId && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <Wallet className="h-4 w-4 text-green-600" />
              <span className="text-sm">ID Vendeur:</span>
              <span className="font-bold text-green-700">{recipientId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Zone scrollable pour les méthodes de paiement */}
      <ScrollArea className="flex-1 min-h-0 pr-2">
          <div className="pb-40">
          <RadioGroup
            value={selectedMethod || ''}
            onValueChange={(value) => setSelectedMethod(value as PaymentMethodType)}
            className="space-y-2"
          >
            {paymentMethods.map((method) => (
              <div key={method.id}>
                <Label
                  htmlFor={method.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    selectedMethod === method.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/30",
                    !method.available && method.id === 'wallet' && "opacity-60"
                  )}
                >
                  <RadioGroupItem 
                    value={method.id} 
                    id={method.id}
                    disabled={!method.available && method.id === 'wallet'}
                    className="border-2"
                  />
                  
                  <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg", method.iconBg)}>
                    {method.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block text-sm">{method.name}</span>
                    <span className="text-xs text-muted-foreground truncate block">{method.description}</span>
                    {method.id === 'wallet' && !isWalletSufficient && (
                      <span className="text-xs text-destructive block">Solde insuffisant</span>
                    )}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Champ téléphone pour mobile money */}
          {requiresPhone && (
            <div className="space-y-2 p-3 mt-2 bg-muted/50 rounded-lg border animate-in slide-in-from-top-2">
              <Label htmlFor="phone-number" className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4" />
                Numéro {selectedMethod === 'orange_money' ? 'Orange' : 'MTN'}
              </Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder={selectedMethod === 'orange_money' ? '620 XX XX XX' : '660 XX XX XX'}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          )}

          {/* Avertissement paiement à la livraison */}
          {selectedMethod === 'cash_on_delivery' && (
            <div className="flex items-start gap-2 p-3 mt-2 bg-amber-50 border border-amber-200 rounded-lg animate-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Préparez le montant exact en espèces pour la livraison.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Boutons d'action fixes en bas */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5rem)] sm:bottom-0 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur border-t pt-4 mt-2 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
            disabled={processing}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="flex-1"
          >
            {processing ? 'Traitement...' : 'Payer maintenant'}
          </Button>
        </div>
      </div>
    </div>
  );
}
