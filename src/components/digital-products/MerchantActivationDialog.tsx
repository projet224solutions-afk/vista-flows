/**
 * Dialog d'activation du statut Marchand
 * Redirige vers la création d'un compte marchand séparé
 */

import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Store, CheckCircle, AlertCircle } from 'lucide-react';

interface MerchantActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MerchantActivationDialog({
  open,
  onOpenChange,
}: MerchantActivationDialogProps) {
  const navigate = useNavigate();

  const handleCreateMerchantAccount = () => {
    onOpenChange(false);
    // Rediriger vers la page de connexion avec le mode marchand pré-sélectionné
    navigate('/auth?role=vendeur&action=signup');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Devenir Marchand
          </DialogTitle>
          <DialogDescription>
            Pour vendre des produits numériques sur le marketplace, 
            vous devez créer un compte Marchand distinct.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Important</p>
                <p>Vous devez créer un compte Marchand avec une adresse email différente de votre compte client actuel.</p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-foreground">
              Avantages du compte Marchand :
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Créer des produits numériques
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Vendre sur le marketplace public
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Recevoir des paiements sur votre wallet
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Accéder aux statistiques de vente
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Inscription gratuite
              </li>
            </ul>
          </div>

          <Button
            onClick={handleCreateMerchantAccount}
            className="w-full"
          >
            <Store className="w-4 h-4 mr-2" />
            Créer mon compte Marchand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
