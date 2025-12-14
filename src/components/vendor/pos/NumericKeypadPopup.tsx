import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calculator, 
  Trash2, 
  CheckSquare,
  X
} from 'lucide-react';

interface NumericKeypadPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numericInput: string;
  onNumericInput: (input: string) => void;
  receivedAmount: number;
  total: number;
  change: number;
  currency: string;
}

export function NumericKeypadPopup({
  open,
  onOpenChange,
  numericInput,
  onNumericInput,
  receivedAmount,
  total,
  change,
  currency
}: NumericKeypadPopupProps) {
  
  const handleInput = (input: string) => {
    onNumericInput(input);
    if (input === 'enter') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-0 overflow-hidden">
        {/* Header stylisé */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <Calculator className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Pavé numérique</h3>
                <p className="text-xs text-muted-foreground">Saisie du montant</p>
              </div>
            </div>
            <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Affichage montant */}
          <div className="space-y-2">
            <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Montant à payer</p>
              <p className="text-lg font-bold text-primary">{total.toLocaleString()} {currency}</p>
            </div>
            
            <Input
              type="text"
              value={numericInput || ''}
              readOnly
              placeholder="0"
              className="text-right text-2xl font-mono font-bold h-14 bg-background border-2 border-primary/30 focus:border-primary"
            />
            
            {receivedAmount > 0 && (
              <div className={`text-sm font-medium px-3 py-2 rounded-lg ${
                change >= 0 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                Rendu: {change.toLocaleString()} {currency}
              </div>
            )}
          </div>

          {/* Grille numérique */}
          <div className="grid grid-cols-3 gap-2">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((num) => (
              <Button
                key={num}
                variant="outline"
                onClick={() => handleInput(num)}
                className="h-14 text-xl font-bold bg-background/80 hover:bg-primary/10 hover:border-primary/50 hover:scale-105 active:scale-95 transition-all duration-150 shadow-sm hover:shadow-md"
              >
                {num}
              </Button>
            ))}
          </div>
          
          {/* Ligne 0, 00, point */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() => handleInput('0')}
              className="h-14 text-xl font-bold bg-background/80 hover:bg-primary/10 hover:border-primary/50 hover:scale-105 active:scale-95 transition-all duration-150 shadow-sm"
            >
              0
            </Button>
            <Button
              variant="outline"
              onClick={() => handleInput('00')}
              className="h-14 text-xl font-bold bg-background/80 hover:bg-primary/10 hover:border-primary/50 hover:scale-105 active:scale-95 transition-all duration-150 shadow-sm"
            >
              00
            </Button>
            <Button
              variant="outline"
              onClick={() => handleInput('.')}
              className="h-14 text-2xl font-bold bg-background/80 hover:bg-primary/10 hover:border-primary/50 hover:scale-105 active:scale-95 transition-all duration-150 shadow-sm"
            >
              •
            </Button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => handleInput('clear')}
              className="h-12 font-semibold border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive transition-all"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Effacer
            </Button>
            <Button
              onClick={() => handleInput('enter')}
              className="h-12 font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Valider
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
