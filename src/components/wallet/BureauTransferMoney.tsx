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

interface BureauTransferMoneyProps {
  bureauWalletId: string;
  currentBalance: number;
  currency: string;
  onTransferComplete?: () => void;
}

interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  type: 'bureau' | 'agent' | 'vendor' | 'user' | 'driver';
  wallet_id?: string;
}

export default function BureauTransferMoney({ bureauWalletId, currentBalance, currency, onTransferComplete }: BureauTransferMoneyProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [searching, setSearching] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const searchUsers = async () => {
    if (!searchQuery || searchQuery.length < 3) {
      toast.error('Entrez au moins 3 caractères pour rechercher');
      return;
    }

    setSearching(true);
    try {
      const results: UserSearchResult[] = [];

      // Rechercher dans autres bureaux syndicats
      const { data: bureaux } = await supabase
        .from('bureau_syndicat')
        .select('id, bureau_code, prefecture, commune')
        .or(`bureau_code.ilike.%${searchQuery}%,prefecture.ilike.%${searchQuery}%,commune.ilike.%${searchQuery}%`)
        .limit(10);

      if (bureaux) {
        for (const bureau of bureaux) {
          const { data: bureauWallet } = await supabase
            .from('bureau_wallets')
            .select('id')
            .eq('bureau_id', bureau.id)
            .maybeSingle();

          if (bureauWallet && bureauWallet.id !== bureauWalletId) {
            results.push({
              id: bureau.id,
              name: `${bureau.bureau_code} - ${bureau.prefecture}`,
              email: bureau.commune || '',
              type: 'bureau',
              wallet_id: bureauWallet.id
            });
          }
        }
      }

      // Rechercher dans chauffeurs taxi-moto
      const { data: drivers } = await supabase
        .from('taxi_moto_drivers')
        .select('id, first_name, last_name, phone, user_id')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(10);

      if (drivers) {
        for (const driver of drivers) {
          const { data: driverWallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', driver.user_id)
            .maybeSingle();

          if (driverWallet) {
            results.push({
              id: driver.id,
              name: `${driver.first_name} ${driver.last_name}`,
              email: driver.phone || '',
              type: 'driver',
              wallet_id: driverWallet.id
            });
          }
        }
      }

      // Rechercher dans agents
      const { data: agents } = await supabase
        .from('agents_management')
        .select('id, name, email, agent_code')
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,agent_code.ilike.%${searchQuery}%`)
        .limit(10);

      if (agents) {
        for (const agent of agents) {
          const { data: agentWallet } = await supabase
            .from('agent_wallets')
            .select('id')
            .eq('agent_id', agent.id)
            .maybeSingle();

          if (agentWallet) {
            results.push({
              id: agent.id,
              name: agent.name,
              email: agent.email,
              type: 'agent',
              wallet_id: agentWallet.id
            });
          }
        }
      }

      // Rechercher dans vendors
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, business_name, email, user_id')
        .or(`business_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (vendors) {
        for (const vendor of vendors) {
          const { data: vendorWallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', vendor.user_id)
            .maybeSingle();

          if (vendorWallet) {
            results.push({
              id: vendor.id,
              name: vendor.business_name,
              email: vendor.email,
              type: 'vendor',
              wallet_id: vendorWallet.id
            });
          }
        }
      }

      setSearchResults(results);
      if (results.length === 0) {
        toast.info('Aucun utilisateur trouvé');
      }
    } catch (error: any) {
      console.error('Erreur recherche utilisateurs:', error);
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
      const referenceNumber = `BUR-TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Créer la transaction de transfert (débit pour le bureau expéditeur)
      const { error: debitError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: `${referenceNumber}-OUT`,
          transaction_type: 'transfer_out',
          amount: -transferAmount,
          net_amount: -transferAmount,
          fee: 0,
          currency: currency,
          status: 'completed',
          description: description || `Transfert vers ${selectedUser.name}`,
          sender_wallet_id: bureauWalletId,
          receiver_wallet_id: selectedUser.wallet_id,
          metadata: {
            recipient_name: selectedUser.name,
            recipient_email: selectedUser.email,
            recipient_type: selectedUser.type,
            sender_type: 'bureau'
          }
        });

      if (debitError) throw debitError;

      // Créer la transaction de réception (crédit pour le destinataire)
      const { error: creditError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: `${referenceNumber}-IN`,
          transaction_type: 'transfer_in',
          amount: transferAmount,
          net_amount: transferAmount,
          fee: 0,
          currency: currency,
          status: 'completed',
          description: description || `Transfert reçu d'un bureau`,
          sender_wallet_id: bureauWalletId,
          receiver_wallet_id: selectedUser.wallet_id,
          metadata: {
            sender_type: 'bureau'
          }
        });

      if (creditError) throw creditError;

      // Mettre à jour le solde du bureau expéditeur
      const { error: updateSenderError } = await supabase
        .from('bureau_wallets')
        .update({
          balance: currentBalance - transferAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', bureauWalletId);

      if (updateSenderError) throw updateSenderError;

      // Mettre à jour le solde du destinataire selon le type
      if (selectedUser.type === 'bureau') {
        const { data: recipientWallet } = await supabase
          .from('bureau_wallets')
          .select('balance')
          .eq('id', selectedUser.wallet_id)
          .single();

        if (recipientWallet) {
          await supabase
            .from('bureau_wallets')
            .update({
              balance: recipientWallet.balance + transferAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedUser.wallet_id);
        }
      } else if (selectedUser.type === 'agent') {
        const { data: recipientWallet } = await supabase
          .from('agent_wallets')
          .select('balance')
          .eq('id', selectedUser.wallet_id)
          .single();

        if (recipientWallet) {
          await supabase
            .from('agent_wallets')
            .update({
              balance: recipientWallet.balance + transferAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedUser.wallet_id);
        }
      } else {
        // Vendeur, chauffeur ou utilisateur standard
        const { data: recipientWallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('id', selectedUser.wallet_id)
          .single();

        if (recipientWallet) {
          await supabase
            .from('wallets')
            .update({
              balance: recipientWallet.balance + transferAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedUser.wallet_id);
        }
      }

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
              placeholder="Nom, code bureau, téléphone..."
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
                  key={user.id}
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
              <Label htmlFor="bureau-transfer-amount">Montant ({currency})</Label>
              <Input
                id="bureau-transfer-amount"
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
              <Label htmlFor="bureau-transfer-description">Description (optionnelle)</Label>
              <Input
                id="bureau-transfer-description"
                placeholder="Ex: Paiement chauffeur, aide financière..."
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
