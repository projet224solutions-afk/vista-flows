import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Plus, 
  Eye, 
  EyeOff, 
  Copy,
  Wallet,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface VirtualCardInfo {
  id: string;
  card_number: string;
  expiry_date: string;
  status: string;
  cvv?: string;
}

interface WalletInfo {
  id: string;
  balance: number;
  currency: string;
  status?: string;
}

interface VirtualCardButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export const VirtualCardButton = ({ 
  className = '', 
  variant = 'default',
  size = 'default'
}: VirtualCardButtonProps) => {
  const { user, profile } = useAuth();
  const [virtualCard, setVirtualCard] = useState<VirtualCardInfo | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Récupérer le wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id, balance, currency')
        .eq('user_id', user.id)
        .maybeSingle();

      setWallet(walletData);

      // Récupérer la carte virtuelle
      const { data: cardData } = await supabase
        .from('virtual_cards')
        .select('id, card_number, expiry_date, status, cvv')
        .eq('user_id', user.id)
        .maybeSingle();

      setVirtualCard(cardData);

    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const createVirtualCard = async () => {
    if (!user || !wallet) {
      toast.error('Wallet requis pour créer une carte virtuelle');
      return;
    }

    setCreating(true);
    try {
      // Générer les données de la carte
      const cardNumber = '2245' + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
      const cvv = Math.floor(Math.random() * 900 + 100).toString();
      const currentDate = new Date();
      const expiryDate = new Date(currentDate.getFullYear() + 3, currentDate.getMonth());
      
      const cardHolderName = profile?.first_name && profile?.last_name 
        ? `${profile.first_name} ${profile.last_name}`.toUpperCase()
        : user.email?.split('@')[0].toUpperCase() || 'UTILISATEUR 224SOLUTIONS';

      const { data, error } = await supabase
        .from('virtual_cards')
        .insert({
          user_id: user.id,
          card_number: cardNumber,
          holder_name: cardHolderName,
          expiry_date: expiryDate.toISOString(),
          cvv: cvv,
          daily_limit: 500000,
          monthly_limit: 2000000,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('🎉 Carte virtuelle créée avec succès !');
      await loadUserData(); // Recharger les données

    } catch (error) {
      console.error('Erreur création carte virtuelle:', error);
      toast.error('Erreur lors de la création de la carte virtuelle');
    } finally {
      setCreating(false);
    }
  };

  const copyCardNumber = () => {
    if (virtualCard) {
      navigator.clipboard.writeText(virtualCard.card_number);
      toast.success('Numéro de carte copié !');
    }
  };

  const formatCardNumber = (cardNumber: string) => {
    return cardNumber.replace(/(.{4})/g, '$1 ').trim();
  };

  const maskCardNumber = (cardNumber: string) => {
    return cardNumber.replace(/(.{4})(.{8})(.{4})/, '$1 **** **** $3');
  };

  if (loading) {
    return (
      <Button disabled className={className} variant={variant} size={size}>
        <CreditCard className="w-4 h-4 mr-2" />
        Chargement...
      </Button>
    );
  }

  // Si l'utilisateur a déjà une carte virtuelle
  if (virtualCard) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button className={className} variant={variant} size={size}>
            <CreditCard className="w-4 h-4 mr-2" />
            Ma Carte Virtuelle
            <CheckCircle className="w-4 h-4 ml-2 text-green-500" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Votre Carte Virtuelle
            </DialogTitle>
            <DialogDescription>
              Carte virtuelle 224Solutions active
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Carte visuelle */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm opacity-90">224SOLUTIONS</span>
                <Badge className="bg-white/20 text-white">
                  {virtualCard.status}
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs opacity-75 mb-1">NUMÉRO DE CARTE</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-mono tracking-wider">
                      {showCardNumber 
                        ? formatCardNumber(virtualCard.card_number)
                        : maskCardNumber(virtualCard.card_number)
                      }
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20 p-1"
                        onClick={() => setShowCardNumber(!showCardNumber)}
                      >
                        {showCardNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20 p-1"
                        onClick={copyCardNumber}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <div>
                    <p className="text-xs opacity-75">TITULAIRE</p>
                    <p className="text-sm font-semibold">{profile?.first_name} {profile?.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75">EXPIRE</p>
                    <p className="text-sm font-semibold">
                      {new Date(virtualCard.expiry_date).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  {showCardNumber && virtualCard.cvv && (
                    <div>
                      <p className="text-xs opacity-75">CVV</p>
                      <p className="text-sm font-semibold">{virtualCard.cvv}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Informations wallet */}
            {wallet && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-green-600" />
                  <span className="font-semibold">Wallet lié</span>
                </div>
                <p className="text-lg font-bold text-green-600">
                  {wallet.balance.toLocaleString()} {wallet.currency}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Si l'utilisateur n'a pas de carte virtuelle
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          className={className} 
          variant={variant} 
          size={size}
          disabled={!wallet}
        >
          <Plus className="w-4 h-4 mr-2" />
          Créer Carte Virtuelle
          {!wallet && <AlertCircle className="w-4 h-4 ml-2 text-orange-500" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            Créer une Carte Virtuelle
          </DialogTitle>
          <DialogDescription>
            Créez votre carte virtuelle 224Solutions pour effectuer des paiements en ligne
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!wallet ? (
            <div className="text-center py-6">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">Wallet requis</p>
              <p className="text-sm text-gray-500">
                Vous devez avoir un wallet actif pour créer une carte virtuelle
              </p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Avantages de la carte virtuelle :</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Paiements en ligne sécurisés</li>
                  <li>• Limite quotidienne : 500,000 GNF</li>
                  <li>• Limite mensuelle : 10,000,000 GNF</li>
                  <li>• Activation immédiate</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-green-600" />
                  <span className="font-semibold">Wallet source</span>
                </div>
                <p className="text-lg font-bold text-green-600">
                  {wallet.balance.toLocaleString()} {wallet.currency}
                </p>
              </div>

              <Button 
                onClick={createVirtualCard}
                disabled={creating}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {creating ? (
                  <>
                    <CreditCard className="w-4 h-4 mr-2 animate-pulse" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer ma carte virtuelle
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VirtualCardButton;
