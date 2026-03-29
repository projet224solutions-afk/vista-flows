/**
 * Dialog d'activation du statut Marchand
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Store, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MerchantActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MerchantActivationDialog({
  open,
  onOpenChange,
  onSuccess
}: MerchantActivationDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Rediriger vers la page d'inscription pour crÃ©er un compte marchand sÃ©parÃ©
      // On passe l'email actuel pour Ã©viter qu'il soit rÃ©utilisÃ©
      const currentEmail = user.email || '';
      
      toast.info('Vous allez Ãªtre redirigÃ© vers la page d\'inscription pour crÃ©er un compte marchand sÃ©parÃ©');
      
      // Attendre un peu pour que l'utilisateur lise le message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Rediriger vers la page d'auth avec les paramÃ¨tres nÃ©cessaires
      window.location.href = `/auth?mode=signup&role=merchant&currentEmail=${encodeURIComponent(currentEmail)}`;
      
      onSuccess();
    } catch (error) {
      console.error('Erreur redirection marchand:', error);
      toast.error('Erreur lors de la redirection');
    } finally {
      setLoading(false);
    }
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
            Pour vendre vos produits numÃ©riques sur le marketplace, vous devez crÃ©er un <strong>compte marchand sÃ©parÃ©</strong> avec une adresse email diffÃ©rente de votre compte client actuel. Cela permet de bien sÃ©parer vos activitÃ©s d'achat et de vente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
              <Store className="w-4 h-4" />
              Compte Marchand SÃ©parÃ© Requis
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-200">
              âš ï¸ Vous devez crÃ©er un nouveau compte avec une <strong>adresse email diffÃ©rente</strong> de celle de votre compte client actuel ({user?.email}). 
              Les deux comptes resteront indÃ©pendants.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-foreground">
              Avantages du compte Marchand :
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-orange-500 shrink-0" />
                Vendre vos propres produits numÃ©riques
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-orange-500 shrink-0" />
                CrÃ©er des formations, eBooks, logiciels, etc.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-orange-500 shrink-0" />
                VisibilitÃ© sur le marketplace public
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-orange-500 shrink-0" />
                Recevoir des paiements directs sur votre wallet
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-orange-500 shrink-0" />
                Statistiques de vente en temps rÃ©el
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-orange-500 shrink-0" />
                Compte 100% gratuit et activation instantanÃ©e
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              â„¹ï¸ <strong>Note :</strong> Votre compte client actuel restera actif. Vous pourrez continuer Ã  acheter avec ce compte et vendre avec votre nouveau compte marchand.
            </p>
          </div>

          <Button
            onClick={handleActivate}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirection en cours...
              </>
            ) : (
              <>
                <Store className="w-4 h-4 mr-2" />
                CrÃ©er mon compte marchand
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
