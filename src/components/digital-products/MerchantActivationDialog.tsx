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
import { supabase } from '@/integrations/supabase/client';
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
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Mettre à jour le rôle en vendeur
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'vendeur' })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Créer une entrée vendor si elle n'existe pas
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!existingVendor) {
        const { error: vendorError } = await supabase
          .from('vendors')
          .insert({
            user_id: user.id,
            business_name: `Boutique de ${user.email?.split('@')[0] || 'Vendeur'}`,
            status: 'active',
            is_verified: false
          });

        if (vendorError) throw vendorError;
      }

      // Rafraîchir le profil
      await refreshProfile();
      
      toast.success('Statut Marchand activé avec succès!');
      onSuccess();
    } catch (error) {
      console.error('Erreur activation marchand:', error);
      toast.error('Erreur lors de l\'activation du statut Marchand');
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
            Activer le statut Marchand
          </DialogTitle>
          <DialogDescription>
            Pour créer et vendre des produits numériques sur le marketplace, 
            vous devez activer votre statut de Marchand.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-foreground">
              Avantages du statut Marchand :
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
                Activation gratuite et instantanée
              </li>
            </ul>
          </div>

          <Button
            onClick={handleActivate}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activation en cours...
              </>
            ) : (
              <>
                <Store className="w-4 h-4 mr-2" />
                Activer maintenant
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
