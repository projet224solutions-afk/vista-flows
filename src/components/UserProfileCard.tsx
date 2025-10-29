import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  IdCard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Send
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
  
  // États pour les opérations wallet
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [processing, setProcessing] = useState(false);

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

  // Fonction pour effectuer un dépôt
  const handleDeposit = async () => {
    if (!user?.id || !depositAmount) {
      toast.error('Veuillez entrer un montant');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    setProcessing(true);
    console.log('🔄 Dépôt en cours:', { amount, userId: user.id });
    
    try {
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'deposit',
          amount: amount,
          description: 'Dépôt sur le wallet'
        }
      });

      console.log('✅ Réponse dépôt:', { data, error });

      if (error) {
        console.error('❌ Erreur dépôt:', error);
        throw error;
      }

      toast.success(`Dépôt de ${formatPrice(amount)} effectué avec succès !`);
      setDepositAmount('');
      setDepositOpen(false);
      
      // Recharger les données
      await loadUserInfo();
      
      // Mettre à jour le wallet balance localement
      if (userInfo.wallet) {
        setUserInfo(prev => ({
          ...prev,
          wallet: prev.wallet ? {
            ...prev.wallet,
            balance: prev.wallet.balance + amount
          } : null
        }));
      }
    } catch (error) {
      console.error('❌ Erreur dépôt:', error);
      toast.error(error.message || 'Erreur lors du dépôt');
    } finally {
      setProcessing(false);
    }
  };

  // Fonction pour effectuer un retrait
  const handleWithdraw = async () => {
    if (!user?.id || !withdrawAmount) {
      toast.error('Veuillez entrer un montant');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (amount > (userInfo.wallet?.balance || 0)) {
      toast.error('Solde insuffisant');
      return;
    }

    setProcessing(true);
    console.log('🔄 Retrait en cours:', { amount, userId: user.id });
    
    try {
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'withdraw',
          amount: amount,
          description: 'Retrait du wallet'
        }
      });

      console.log('✅ Réponse retrait:', { data, error });

      if (error) {
        console.error('❌ Erreur retrait:', error);
        throw error;
      }

      toast.success(`Retrait de ${formatPrice(amount)} effectué avec succès !`);
      setWithdrawAmount('');
      setWithdrawOpen(false);
      
      // Recharger les données
      await loadUserInfo();
      
      // Mettre à jour le wallet balance localement
      if (userInfo.wallet) {
        setUserInfo(prev => ({
          ...prev,
          wallet: prev.wallet ? {
            ...prev.wallet,
            balance: prev.wallet.balance - amount
          } : null
        }));
      }
    } catch (error) {
      console.error('❌ Erreur retrait:', error);
      toast.error(error.message || 'Erreur lors du retrait');
    } finally {
      setProcessing(false);
    }
  };

  // Fonction pour effectuer un transfert
  const handleTransfer = async () => {
    if (!user?.id || !transferAmount || !recipientId) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (amount > (userInfo.wallet?.balance || 0)) {
      toast.error('Solde insuffisant');
      return;
    }

    if (recipientId === user.id) {
      toast.error('Vous ne pouvez pas transférer à vous-même');
      return;
    }

    setProcessing(true);
    console.log('🔄 Transfert en cours:', { amount, recipientId, userId: user.id });
    
    try {
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'transfer',
          amount: amount,
          recipient_id: recipientId,
          description: 'Transfert entre wallets'
        }
      });

      console.log('✅ Réponse transfert:', { data, error });

      if (error) {
        console.error('❌ Erreur transfert:', error);
        throw error;
      }

      toast.success(`Transfert de ${formatPrice(amount)} effectué avec succès !`);
      setTransferAmount('');
      setRecipientId('');
      setTransferOpen(false);
      
      // Recharger les données
      await loadUserInfo();
      
      // Mettre à jour le wallet balance localement
      if (userInfo.wallet) {
        setUserInfo(prev => ({
          ...prev,
          wallet: prev.wallet ? {
            ...prev.wallet,
            balance: prev.wallet.balance - amount
          } : null
        }));
      }
    } catch (error) {
      console.error('❌ Erreur transfert:', error);
      toast.error(error.message || 'Erreur lors du transfert');
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' GNF';
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
            <p className="text-2xl font-bold text-green-600 mb-3">
              {userInfo.wallet ? 
                `${userInfo.wallet.balance.toLocaleString()} ${userInfo.wallet.currency}` : 
                'Initialisation...'
              }
            </p>
            {!userInfo.wallet && (
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Wallet en cours de création automatique...
              </p>
            )}
            
            {/* Boutons d'opérations */}
            {userInfo.wallet && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {/* Bouton Dépôt */}
                <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="flex flex-col h-auto py-2">
                      <ArrowDownToLine className="w-4 h-4 mb-1 text-green-600" />
                      <span className="text-xs">Dépôt</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Effectuer un dépôt</DialogTitle>
                      <DialogDescription>
                        Ajoutez des fonds à votre wallet
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="deposit-amount">Montant (GNF)</Label>
                        <Input
                          id="deposit-amount"
                          type="number"
                          placeholder="10000"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={handleDeposit} 
                        disabled={processing || !depositAmount}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {processing ? 'Traitement...' : 'Confirmer le dépôt'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Bouton Retrait */}
                <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="flex flex-col h-auto py-2">
                      <ArrowUpFromLine className="w-4 h-4 mb-1 text-orange-600" />
                      <span className="text-xs">Retrait</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Effectuer un retrait</DialogTitle>
                      <DialogDescription>
                        Retirez des fonds de votre wallet
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="withdraw-amount">Montant (GNF)</Label>
                        <Input
                          id="withdraw-amount"
                          type="number"
                          placeholder="10000"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Solde disponible: {userInfo.wallet.balance.toLocaleString()} GNF
                        </p>
                      </div>
                      <Button 
                        onClick={handleWithdraw} 
                        disabled={processing || !withdrawAmount}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                      >
                        {processing ? 'Traitement...' : 'Confirmer le retrait'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Bouton Transfert */}
                <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="flex flex-col h-auto py-2">
                      <Send className="w-4 h-4 mb-1 text-blue-600" />
                      <span className="text-xs">Transfert</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Effectuer un transfert</DialogTitle>
                      <DialogDescription>
                        Transférez des fonds à un autre utilisateur
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="recipient-id">ID du destinataire</Label>
                        <Input
                          id="recipient-id"
                          placeholder="UUID du destinataire"
                          value={recipientId}
                          onChange={(e) => setRecipientId(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="transfer-amount">Montant (GNF)</Label>
                        <Input
                          id="transfer-amount"
                          type="number"
                          placeholder="10000"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Solde disponible: {userInfo.wallet.balance.toLocaleString()} GNF
                        </p>
                      </div>
                      <Button 
                        onClick={handleTransfer} 
                        disabled={processing || !transferAmount || !recipientId}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {processing ? 'Traitement...' : 'Confirmer le transfert'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
