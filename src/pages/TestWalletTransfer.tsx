/**
 * PAGE DE TEST WALLET TRANSFER
 * Test complet du système de transfert avec custom_id (3 lettres + 4 chiffres)
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowRight, RefreshCw, Wallet } from 'lucide-react';

interface UserWallet {
  custom_id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  wallet_balance: number;
  wallet_id: string;
}

export default function TestWalletTransfer() {
  const [users, setUsers] = useState<UserWallet[]>([]);
  const [currentUser, setCurrentUser] = useState<UserWallet | null>(null);
  const [recipientCode, setRecipientCode] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Charger tous les utilisateurs avec leurs wallets
  const loadUsers = async () => {
    try {
      // Récupérer tous les user_ids avec custom_id
      const { data: userIdsData, error: userIdsError } = await supabase
        .from('user_ids')
        .select('custom_id, user_id');

      if (userIdsError) throw userIdsError;

      // Pour chaque user_id, récupérer les infos du profil et du wallet
      const usersPromises = (userIdsData || []).map(async (userIdRow) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', userIdRow.user_id)
          .single();

        const { data: wallet } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', userIdRow.user_id)
          .single();

        return {
          custom_id: userIdRow.custom_id,
          user_id: userIdRow.user_id,
          email: profile?.email || '',
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          wallet_balance: wallet?.balance || 0,
          wallet_id: wallet?.id || ''
        };
      });

      const usersData = await Promise.all(usersPromises);
      const sortedUsers = usersData.sort((a, b) => a.custom_id.localeCompare(b.custom_id));
      
      setUsers(sortedUsers);

      // Identifier l'utilisateur connecté
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const current = sortedUsers.find((u: UserWallet) => u.user_id === userData.user.id);
        setCurrentUser(current || null);
      }
    } catch (error) {
      console.error('❌ Erreur chargement utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  // Effectuer un transfert
  const handleTransfer = async () => {
    if (!currentUser) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (!recipientCode || !amount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }

    if (transferAmount > currentUser.wallet_balance) {
      toast.error('Solde insuffisant');
      return;
    }

    try {
      setLoading(true);

      console.log('🚀 Lancement du transfert:', {
        sender: currentUser.custom_id,
        recipient: recipientCode,
        amount: transferAmount
      });

      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'transfer',
          amount: transferAmount,
          recipient_id: recipientCode.toUpperCase(),
          description: description || 'Test de transfert'
        }
      });

      console.log('📥 Réponse:', { data, error });

      if (error) {
        throw new Error(error.message || 'Erreur lors du transfert');
      }

      if (data && !data.success && data.error) {
        throw new Error(data.error);
      }

      toast.success(`Transfert de ${transferAmount.toLocaleString()} GNF réussi !`);
      setRecipientCode('');
      setAmount('');
      setDescription('');
      
      // Recharger les utilisateurs
      await loadUsers();
    } catch (error: any) {
      console.error('❌ Erreur transfert:', error);
      const errorMessage = error.message || error.error || 'Erreur lors du transfert';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              Test Wallet Transfer - Format ID: 3 Lettres + 4 Chiffres
            </CardTitle>
            <CardDescription>
              Testez les transferts entre utilisateurs avec le format custom_id universel
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Utilisateur connecté */}
        {currentUser && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Votre compte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Code ID:</span>
                  <Badge variant="default" className="font-mono text-lg">
                    {currentUser.custom_id}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nom:</span>
                  <span className="font-medium">
                    {currentUser.first_name} {currentUser.last_name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="font-medium">{currentUser.email}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-semibold">Solde:</span>
                  <span className="text-2xl font-bold text-primary">
                    {currentUser.wallet_balance.toLocaleString()} GNF
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulaire de transfert */}
        <Card>
          <CardHeader>
            <CardTitle>Effectuer un transfert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Code du destinataire (format: ABC1234)</Label>
              <Input
                id="recipient"
                placeholder="Ex: GAD6447"
                value={recipientCode}
                onChange={(e) => setRecipientCode(e.target.value.toUpperCase())}
                className="font-mono text-lg"
                maxLength={7}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant (GNF)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Ex: 1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Input
                id="description"
                placeholder="Ex: Remboursement"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button
              onClick={handleTransfer}
              disabled={loading || !currentUser}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Transfert en cours...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Envoyer le transfert
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Liste de tous les utilisateurs */}
        <Card>
          <CardHeader>
            <CardTitle>Tous les utilisateurs disponibles</CardTitle>
            <CardDescription>
              Utilisez ces codes pour tester les transferts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {users.map((user) => (
                <Card
                  key={user.user_id}
                  className={currentUser?.user_id === user.user_id ? 'border-primary' : ''}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-lg font-bold text-primary">
                          {user.custom_id}
                        </span>
                        {currentUser?.user_id === user.user_id && (
                          <Badge variant="default">Vous</Badge>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Solde:</span>
                        <span className="ml-2 font-bold">
                          {user.wallet_balance.toLocaleString()} GNF
                        </span>
                      </div>
                      {currentUser?.user_id !== user.user_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecipientCode(user.custom_id)}
                          className="w-full mt-2"
                        >
                          Utiliser ce code
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Connectez-vous avec un compte qui a du solde (ex: USR1482 a 299,750 GNF)</p>
            <p>2. Sélectionnez un destinataire dans la liste ci-dessus</p>
            <p>3. Entrez un montant et cliquez sur "Envoyer le transfert"</p>
            <p>4. Le transfert devrait fonctionner immédiatement</p>
            <p className="pt-2 font-medium text-primary">
              ⚠️ Important: Utilisez uniquement les codes affichés dans la liste ci-dessus !
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
