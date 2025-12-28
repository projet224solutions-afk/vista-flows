import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, User, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TransferMoneyProps {
  walletId: string;
  currentBalance: number;
  currency: string;
  onTransferComplete?: () => void;
  senderUserId?: string; // User ID de l'agent pour les transferts
}

interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  type: 'bureau' | 'agent' | 'vendor' | 'user' | 'driver';
  wallet_id?: string;
  user_id?: string; // Pour les agents, on stocke aussi le user_id
}

export default function TransferMoney({ walletId, currentBalance, currency, onTransferComplete, senderUserId }: TransferMoneyProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [searching, setSearching] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const searchUsers = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      toast.error('Entrez au moins 2 caractères pour rechercher');
      return;
    }

    setSearching(true);
    const results: UserSearchResult[] = [];
    const query = searchQuery.trim();
    const queryUpper = query.toUpperCase();

    console.log('🔍 Recherche agent transfert:', query, queryUpper);

    try {
      // 1. RECHERCHE PAR ID DANS user_ids (VND..., CLT..., DRV..., PDG..., etc.)
      const { data: userIds, error: userIdsError } = await supabase
        .from('user_ids')
        .select('user_id, custom_id')
        .ilike('custom_id', `%${queryUpper}%`)
        .limit(15);

      console.log('📋 user_ids résultat:', userIds, userIdsError);

      if (userIds && userIds.length > 0) {
        for (const uid of userIds) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('id', uid.user_id)
            .maybeSingle();

          if (profile) {
            const { data: userWallet } = await supabase
              .from('wallets')
              .select('id')
              .eq('user_id', profile.id)
              .maybeSingle();

            if (userWallet) {
              results.push({
                id: profile.id,
                name: `${uid.custom_id} - ${profile.full_name || 'Utilisateur'}`,
                email: profile.email || '',
                type: profile.role === 'vendeur' ? 'vendor' : profile.role === 'livreur' ? 'driver' : 'user',
                wallet_id: userWallet.id
              });
            }
          }
        }
      }

      // 2. RECHERCHE PAR CODE BUREAU (BST...)
      const { data: bureaux, error: bureauError } = await supabase
        .from('bureaus')
        .select('id, bureau_code, prefecture, commune')
        .ilike('bureau_code', `%${queryUpper}%`)
        .limit(10);

      console.log('📋 Bureaux résultat:', bureaux, bureauError);

      if (bureaux && bureaux.length > 0) {
        for (const bureau of bureaux) {
          const { data: bureauWallet } = await supabase
            .from('bureau_wallets')
            .select('id')
            .eq('bureau_id', bureau.id)
            .maybeSingle();

          if (bureauWallet) {
            results.push({
              id: bureau.id,
              name: `${bureau.bureau_code} - ${bureau.prefecture || bureau.commune || 'Bureau'}`,
              email: bureau.commune || '',
              type: 'bureau',
              wallet_id: bureauWallet.id
            });
          }
        }
      }

      // 3. RECHERCHE PAR CODE AGENT (AGT...) - Utiliser wallets au lieu de agent_wallets
      const { data: agents, error: agentError } = await supabase
        .from('agents_management')
        .select('id, name, email, agent_code, user_id')
        .ilike('agent_code', `%${queryUpper}%`)
        .limit(10);

      console.log('📋 Agents résultat:', agents, agentError);

      if (agents && agents.length > 0) {
        for (const agent of agents) {
          if (!agent.user_id) continue; // Skip agents sans user_id
          
          // Chercher le wallet dans la table wallets standard
          const { data: agentWallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', agent.user_id)
            .maybeSingle();

          if (agentWallet && agentWallet.id !== walletId && !results.find(r => r.wallet_id === agentWallet.id)) {
            results.push({
              id: agent.id,
              name: `${agent.agent_code} - ${agent.name}`,
              email: agent.email || '',
              type: 'agent',
              wallet_id: agentWallet.id,
              user_id: agent.user_id // Stocker le user_id pour le transfert
            });
          }
        }
      }

      // 4. RECHERCHE PAR NOM/EMAIL/TELEPHONE dans profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (profiles && profiles.length > 0) {
        for (const profile of profiles) {
          if (!results.find(r => r.id === profile.id)) {
            const { data: wallet } = await supabase
              .from('wallets')
              .select('id')
              .eq('user_id', profile.id)
              .maybeSingle();

            if (wallet) {
              const { data: userId } = await supabase
                .from('user_ids')
                .select('custom_id')
                .eq('user_id', profile.id)
                .maybeSingle();

              results.push({
                id: profile.id,
                name: userId?.custom_id 
                  ? `${userId.custom_id} - ${profile.full_name || 'Utilisateur'}`
                  : profile.full_name || 'Utilisateur',
                email: profile.email || profile.phone || '',
                type: profile.role === 'vendeur' ? 'vendor' : profile.role === 'livreur' ? 'driver' : 'user',
                wallet_id: wallet.id
              });
            }
          }
        }
      }

      // 5. RECHERCHE DANS VENDORS par nom
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, business_name, email, user_id')
        .or(`business_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (vendors && vendors.length > 0) {
        for (const vendor of vendors) {
          if (!results.find(r => r.id === vendor.user_id)) {
            const { data: vendorWallet } = await supabase
              .from('wallets')
              .select('id')
              .eq('user_id', vendor.user_id)
              .maybeSingle();

            if (vendorWallet && !results.find(r => r.wallet_id === vendorWallet.id)) {
              results.push({
                id: vendor.user_id, // CORRECTION: utiliser user_id pas vendor.id
                name: vendor.business_name || 'Vendeur',
                email: vendor.email || '',
                type: 'vendor',
                wallet_id: vendorWallet.id
              });
            }
          }
        }
      }

      // 6. RECHERCHE PAR NOM AGENT (fallback si pas trouvé par code) - Utiliser wallets
      if (results.filter(r => r.type === 'agent').length === 0) {
        const { data: agentsByName } = await supabase
          .from('agents_management')
          .select('id, name, email, agent_code, user_id')
          .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(10);

        if (agentsByName && agentsByName.length > 0) {
          for (const agent of agentsByName) {
            if (!agent.user_id) continue; // Skip agents sans user_id
            
            const { data: agentWallet } = await supabase
              .from('wallets')
              .select('id')
              .eq('user_id', agent.user_id)
              .maybeSingle();

            if (agentWallet && agentWallet.id !== walletId && !results.find(r => r.wallet_id === agentWallet.id)) {
              results.push({
                id: agent.id,
                name: `${agent.agent_code} - ${agent.name}`,
                email: agent.email || '',
                type: 'agent',
                wallet_id: agentWallet.id,
                user_id: agent.user_id
              });
            }
          }
        }
      }

      // Supprimer les doublons par wallet_id
      const uniqueResults = results.filter((result, index, self) =>
        index === self.findIndex(r => r.wallet_id === result.wallet_id)
      );

      console.log('✅ Résultats finaux:', uniqueResults.length, uniqueResults);

      setSearchResults(uniqueResults);
      if (uniqueResults.length === 0) {
        toast.info('Aucun utilisateur trouvé avec cet ID ou nom');
      } else {
        toast.success(`${uniqueResults.length} résultat(s) trouvé(s)`);
      }
    } catch (error: any) {
      console.error('❌ Erreur recherche:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUser || !selectedUser.wallet_id) {
      toast.error('Sélectionnez un destinataire');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (transferAmount > currentBalance) {
      toast.error('Solde insuffisant');
      return;
    }

    setTransferring(true);
    try {
      // Déterminer le sender_id : utiliser senderUserId si fourni, sinon récupérer depuis le wallet
      let senderId = senderUserId;
      
      if (!senderId) {
        // Fallback: récupérer le user_id depuis le wallet
        const { data: walletData } = await supabase
          .from('wallets')
          .select('user_id')
          .eq('id', walletId)
          .single();

        if (!walletData?.user_id) {
          throw new Error('Wallet non trouvé ou non lié à un utilisateur');
        }
        senderId = walletData.user_id;
      }

      // Déterminer le receiver_id selon le type
      let receiverId: string;
      let receiverType: 'bureau' | 'user' = 'user';
      
      if (selectedUser.type === 'bureau') {
        // Pour les bureaux, on utilise directement l'ID du bureau
        receiverId = selectedUser.id;
        receiverType = 'bureau';
      } else if (selectedUser.type === 'agent') {
        // Pour les agents, utiliser le user_id stocké ou le récupérer
        if (selectedUser.user_id) {
          receiverId = selectedUser.user_id;
        } else {
          const { data: recipientAgent } = await supabase
            .from('agents_management')
            .select('user_id')
            .eq('id', selectedUser.id)
            .single();
          
          if (!recipientAgent?.user_id) {
            throw new Error('Agent destinataire non lié à un utilisateur');
          }
          receiverId = recipientAgent.user_id;
        }
        receiverType = 'user'; // Les agents utilisent la table wallets standard
      } else {
        // Pour les autres types (vendor, user, driver), utiliser directement l'ID
        receiverId = selectedUser.id;
        receiverType = 'user';
      }

      console.log('📤 Transfert unifié:', {
        sender: senderId,
        receiver: receiverId,
        senderType: 'user',
        receiverType,
        amount: transferAmount
      });

      // Utiliser la fonction RPC sécurisée
      const { data, error } = await supabase.rpc('process_secure_wallet_transfer', {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_amount: transferAmount,
        p_description: description || `Transfert vers ${selectedUser.name}`,
        p_sender_type: 'user', // Tous les utilisateurs (y compris agents) utilisent 'user'
        p_receiver_type: receiverType
      });

      if (error) {
        console.error('❌ Erreur RPC transfert:', error);
        throw error;
      }

      // Vérifier le résultat de la transaction
      const result = data as { 
        success: boolean; 
        error?: string; 
        transaction_id?: string;
        sender_balance_after?: number;
        receiver_balance_after?: number;
      };
      
      if (!result.success) {
        throw new Error(result.error || 'Échec de la transaction');
      }

      console.log('✅ Transfert agent réussi:', result);
      console.log('📊 Solde expéditeur après:', result.sender_balance_after);
      console.log('📊 Solde destinataire après:', result.receiver_balance_after);

      toast.success(`Transfert de ${transferAmount.toLocaleString()} ${currency} effectué avec succès`);
      setAmount('');
      setDescription('');
      setSelectedUser(null);
      setSearchResults([]);
      setSearchQuery('');
      setShowConfirm(false);
      
      if (onTransferComplete) {
        onTransferComplete();
      }

      window.dispatchEvent(new CustomEvent('wallet-updated'));
    } catch (error: any) {
      console.error('Erreur transfert:', error);
      toast.error(`Erreur lors du transfert: ${error.message}`);
    } finally {
      setTransferring(false);
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'bureau':
        return '🏢 Bureau Syndicat';
      case 'driver':
        return '🏍️ Chauffeur';
      case 'agent':
        return '👤 Agent';
      case 'vendor':
        return '🏪 Vendeur';
      case 'user':
        return '👥 Client';
      default:
        return '👤 Utilisateur';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="w-5 h-5" />
          Transférer de l'argent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recherche d'utilisateur */}
        <div className="space-y-2">
          <Label>Rechercher un destinataire</Label>
          <div className="flex gap-2">
            <Input
              placeholder="ID (CLT..., VND..., BST..., AGT...) ou nom, téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            />
            <Button onClick={searchUsers} disabled={searching}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Résultats de recherche */}
        {searchResults.length > 0 && !selectedUser && (
          <div className="space-y-2">
            <Label>Sélectionnez un destinataire</Label>
            <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
              {searchResults.map((user) => (
                <button
                  key={`${user.type}-${user.id}`}
                  onClick={() => {
                    setSelectedUser(user);
                    setSearchResults([]);
                  }}
                  className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="text-xs">{getUserTypeLabel(user.type)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Utilisateur sélectionné */}
        {selectedUser && (
          <div className="p-3 bg-accent rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {selectedUser.name}
                </p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                <p className="text-xs mt-1">{getUserTypeLabel(selectedUser.type)}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedUser(null);
                  setSearchResults([]);
                }}
              >
                Changer
              </Button>
            </div>
          </div>
        )}

        {/* Montant et description */}
        {selectedUser && (
          <>
            <div className="space-y-2">
              <Label htmlFor="agent-transfer-amount">Montant ({currency})</Label>
              <Input
                id="agent-transfer-amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                max={currentBalance}
              />
              <p className="text-xs text-muted-foreground">
                Solde disponible: {currentBalance.toLocaleString()} {currency}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-transfer-description">Description (optionnelle)</Label>
              <Input
                id="agent-transfer-description"
                placeholder="Ex: Paiement pour service..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => setShowConfirm(true)}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > currentBalance || transferring}
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer {amount ? `${parseFloat(amount).toLocaleString()} ${currency}` : ''}
            </Button>
          </>
        )}

        {/* Dialog de confirmation */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer le transfert</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-2 my-4">
                  <p>Vous allez transférer:</p>
                  <p className="text-lg font-bold text-foreground">
                    {parseFloat(amount || '0').toLocaleString()} {currency}
                  </p>
                  <p>À:</p>
                  <p className="font-semibold text-foreground">
                    {selectedUser?.name} ({getUserTypeLabel(selectedUser?.type || '')})
                  </p>
                  {description && (
                    <>
                      <p>Motif:</p>
                      <p className="text-foreground italic">{description}</p>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Cette action est irréversible. Assurez-vous que les informations sont correctes.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={transferring}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleTransfer} disabled={transferring}>
                {transferring ? 'Transfert en cours...' : 'Confirmer le transfert'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
