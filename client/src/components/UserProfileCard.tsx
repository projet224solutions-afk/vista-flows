import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Wallet, 
  Plus, 
  Eye, 
  EyeOff, 
  Copy,
  User,
  IdCard
} from 'lucide-react';

interface UserInfo {
  customId: string | null;
  wallet: {
    id: string;
    balance: number;
    currency: string;
  } | null;
  virtualCard: {
    id: string;
    card_number: string;
    expiry_date: string;
    status: string;
  } | null;
}

interface UserProfileCardProps {
  className?: string;
  showWalletDetails?: boolean;
}

export const UserProfileCard = ({ className = '', showWalletDetails = true }: UserProfileCardProps) => {
  const { user, profile } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo>({
    customId: null,
    wallet: null,
    virtualCard: null
  });
  const [loading, setLoading] = useState(true);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [creatingCard, setCreatingCard] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserInfo();
    }
  }, [user]);

  const loadUserInfo = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Récupérer l'ID utilisateur
      const { data: userIdData } = await supabase
        .from('user_ids')
        .select('custom_id')
        .eq('user_id', user.id)
        .single();

      // Récupérer le wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id, balance, currency')
        .eq('user_id', user.id)
        .maybeSingle();

      // Récupérer la carte virtuelle
      const { data: cardData } = await supabase
        .from('virtual_cards')
        .select('id, card_number, expiry_date, status')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserInfo({
        customId: userIdData?.custom_id || null,
        wallet: walletData || null,
        virtualCard: cardData || null
      });

    } catch (error) {
      console.error('Erreur chargement infos utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const createVirtualCard = async () => {
    if (!user || !userInfo.wallet) {
      toast.error('Wallet requis pour créer une carte virtuelle');
      return;
    }

    setCreatingCard(true);
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
          cardholder_name: cardHolderName,
          expiry_date: expiryDate.toISOString(),
          cvv: cvv,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Carte virtuelle créée avec succès !');
      await loadUserInfo(); // Recharger les données

    } catch (error) {
      console.error('Erreur création carte virtuelle:', error);
      toast.error('Erreur lors de la création de la carte virtuelle');
    } finally {
      setCreatingCard(false);
    }
  };

  const copyCardNumber = () => {
    if (userInfo.virtualCard) {
      navigator.clipboard.writeText(userInfo.virtualCard.card_number);
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
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.email?.split('@')[0] || 'Utilisateur';

  return (
    <Card className={`${className} border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50`}>
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16 border-2 border-blue-200">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg font-bold">
              {profile?.first_name?.[0]}{profile?.last_name?.[0] || user?.email?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-xl text-gray-800">{displayName}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <IdCard className="w-4 h-4 text-blue-600" />
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                ID: {userInfo.customId || 'En cours...'}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">{profile?.role || 'client'}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Wallet Info - Toujours affiché */}
        {showWalletDetails && (
          <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-800">Wallet</span>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700">
                {userInfo.wallet ? 'Actif' : 'Création...'}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {userInfo.wallet ? 
                `${userInfo.wallet.balance.toLocaleString()} ${userInfo.wallet.currency}` : 
                'Initialisation...'
              }
            </p>
            {!userInfo.wallet && (
              <p className="text-xs text-gray-500 mt-1">
                Wallet en cours de création automatique...
              </p>
            )}
          </div>
        )}

        {/* Carte Virtuelle */}
        <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-800">Carte Virtuelle</span>
            </div>
            {userInfo.virtualCard && (
              <Badge variant="outline" className="bg-purple-100 text-purple-700">
                {userInfo.virtualCard.status}
              </Badge>
            )}
          </div>

          {userInfo.virtualCard ? (
            <div className="space-y-3">
              {/* Numéro de carte */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm opacity-90">224SOLUTIONS</span>
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
                <p className="text-lg font-mono tracking-wider">
                  {showCardNumber 
                    ? formatCardNumber(userInfo.virtualCard.card_number)
                    : maskCardNumber(userInfo.virtualCard.card_number)
                  }
                </p>
                <div className="flex justify-between items-center mt-3">
                  <div>
                    <p className="text-xs opacity-75">TITULAIRE</p>
                    <p className="text-sm font-semibold">{profile?.first_name} {profile?.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75">EXPIRE</p>
                    <p className="text-sm font-semibold">
                      {new Date(userInfo.virtualCard.expiry_date).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">Aucune carte virtuelle</p>
              <Button 
                onClick={createVirtualCard}
                disabled={creatingCard || !userInfo.wallet}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {creatingCard ? 'Création...' : 'Créer une carte virtuelle'}
              </Button>
              {!userInfo.wallet && (
                <p className="text-xs text-red-500 mt-2">Wallet requis pour créer une carte</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;
