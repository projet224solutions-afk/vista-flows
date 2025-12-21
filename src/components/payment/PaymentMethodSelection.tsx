import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  CreditCard, 
  Smartphone, 
  Truck, 
  Check,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethodType = 'wallet' | 'card' | 'orange_money' | 'mtn_money' | 'cash_on_delivery';

interface PaymentMethodOption {
  id: PaymentMethodType;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  requiresPhone?: boolean;
  badge?: string;
}

interface PaymentMethodSelectionProps {
  walletBalance: number;
  amount: number;
  onMethodSelected: (method: PaymentMethodType, phoneNumber?: string) => void;
  onCancel: () => void;
  processing?: boolean;
}

export function PaymentMethodSelection({
  walletBalance,
  amount,
  onMethodSelected,
  onCancel,
  processing = false
}: PaymentMethodSelectionProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  const isWalletSufficient = walletBalance >= amount;

  const paymentMethods: PaymentMethodOption[] = [
    {
      id: 'wallet',
      name: 'Wallet 224SOLUTIONS',
      description: isWalletSufficient 
        ? `Solde: ${walletBalance.toLocaleString('fr-GN')} GNF`
        : `Solde insuffisant: ${walletBalance.toLocaleString('fr-GN')} GNF`,
      icon: <Wallet className="h-6 w-6" />,
      available: isWalletSufficient,
      badge: isWalletSufficient ? 'Recommandé' : 'Insuffisant'
    },
    {
      id: 'orange_money',
      name: 'Orange Money',
      description: 'Payer avec votre compte Orange Money',
      icon: <Smartphone className="h-6 w-6 text-orange-500" />,
      available: true,
      requiresPhone: true
    },
    {
      id: 'mtn_money',
      name: 'MTN Mobile Money',
      description: 'Payer avec votre compte MTN MoMo',
      icon: <Smartphone className="h-6 w-6 text-yellow-500" />,
      available: true,
      requiresPhone: true
    },
    {
      id: 'card',
      name: 'Carte bancaire',
      description: 'Visa, Mastercard, etc.',
      icon: <CreditCard className="h-6 w-6 text-blue-500" />,
      available: true
    },
    {
      id: 'cash_on_delivery',
      name: 'Paiement à la livraison',
      description: 'Payez en espèces lors de la réception',
      icon: <Truck className="h-6 w-6 text-green-500" />,
      available: true,
      badge: 'Cash'
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
    <div className="space-y-4">
      {/* Montant à payer */}
      <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
        <p className="text-sm text-muted-foreground">Montant à payer</p>
        <p className="text-2xl font-bold text-primary">
          {amount.toLocaleString('fr-GN')} GNF
        </p>
      </div>

      {/* Sélection de méthode */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Choisissez votre mode de paiement</Label>
        
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
                  "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  selectedMethod === method.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50",
                  !method.available && "opacity-50 cursor-not-allowed"
                )}
              >
                <RadioGroupItem 
                  value={method.id} 
                  id={method.id}
                  disabled={!method.available}
                  className="sr-only"
                />
                
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full",
                  selectedMethod === method.id ? "bg-primary/20" : "bg-muted"
                )}>
                  {method.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{method.name}</span>
                    {method.badge && (
                      <Badge 
                        variant={
                          method.badge === 'Recommandé' ? 'default' : 
                          method.badge === 'Insuffisant' ? 'destructive' : 
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {method.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
                
                {selectedMethod === method.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Champ téléphone pour mobile money */}
      {requiresPhone && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg border animate-in slide-in-from-top-2">
          <Label htmlFor="phone-number" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Numéro de téléphone {selectedMethod === 'orange_money' ? 'Orange' : 'MTN'}
          </Label>
          <Input
            id="phone-number"
            type="tel"
            placeholder={selectedMethod === 'orange_money' ? '620 XX XX XX' : '660 XX XX XX'}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="text-lg"
          />
          <p className="text-xs text-muted-foreground">
            Vous recevrez une demande de confirmation sur ce numéro
          </p>
        </div>
      )}

      {/* Avertissement paiement à la livraison */}
      {selectedMethod === 'cash_on_delivery' && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-600">Paiement à la livraison</p>
            <p className="text-muted-foreground">
              Préparez le montant exact en espèces. Le livreur ne rend pas la monnaie.
            </p>
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-3 pt-4">
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
          className="flex-1 gap-2"
        >
          {processing ? (
            'Traitement...'
          ) : (
            <>
              Confirmer
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
