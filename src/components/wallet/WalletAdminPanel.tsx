/**
 * 🔐 PANNEAU ADMINISTRATION WALLET - PDG
 * Vue complète sur tous les wallets et contrôle admin
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PublicIdBadge } from '@/components/PublicIdBadge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Wallet,
  Lock,
  Unlock,
  Search,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Shield,
  RefreshCw
} from 'lucide-react';

interface WalletAdminData {
  id: string;
  public_id: string | null;
  user_id: string;
  balance: number;
  currency: string;
  wallet_status: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  total_received: number;
  total_sent: number;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AdminStats {
  total_wallets: number;
  active_wallets: number;
  blocked_wallets: number;
  total_balance: number;
  average_balance: number;
}

export function WalletAdminPanel() {
  const [wallets, setWallets] = useState<WalletAdminData[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<WalletAdminData | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  useEffect(() => {
    loadWallets();
    loadStats();
  }, []);

  const loadWallets = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrichir avec données profiles
      const enriched = await Promise.all(
        (data || []).map(async (wallet) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', wallet.user_id)
            .single();

          return { ...wallet, profiles: profile };
        })
      );

      setWallets(enriched as any);

    } catch (error: any) {
      console.error('❌ Erreur loadWallets:', error);
      toast.error('Erreur chargement wallets');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_admin_stats')
        .select('*')
        .single();

      if (error) throw error;
      setStats(data);

    } catch (error) {
      console.error('❌ Erreur loadStats:', error);
    }
  };

  const handleBlockWallet = async () => {
    if (!selectedWallet || !blockReason) {
      toast.error('Raison de blocage requise');
      return;
    }

    try {
      const { error } = await supabase
        .from('wallets')
        .update({
          is_blocked: true,
          blocked_reason: blockReason,
          blocked_at: new Date().toISOString(),
          wallet_status: 'blocked'
        })
        .eq('id', selectedWallet.id);

      if (error) throw error;

      toast.success('Wallet bloqué avec succès');
      setBlockDialogOpen(false);
      setBlockReason('');
      setSelectedWallet(null);
      await loadWallets();

    } catch (error: any) {
      toast.error('Erreur blocage wallet');
    }
  };

  const handleUnblockWallet = async (walletId: string) => {
    try {
      const { error } = await supabase
        .from('wallets')
        .update({
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null,
          wallet_status: 'active'
        })
        .eq('id', walletId);

      if (error) throw error;

      toast.success('Wallet débloqué avec succès');
      await loadWallets();

    } catch (error: any) {
      toast.error('Erreur déblocage wallet');
    }
  };

  const filteredWallets = wallets.filter(w => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      w.public_id?.toLowerCase().includes(term) ||
      w.profiles?.email?.toLowerCase().includes(term) ||
      w.profiles?.first_name?.toLowerCase().includes(term) ||
      w.profiles?.last_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_wallets}</p>
                  <p className="text-sm text-muted-foreground">Total Wallets</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active_wallets}</p>
                  <p className="text-sm text-muted-foreground">Actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.blocked_wallets}</p>
                  <p className="text-sm text-muted-foreground">Bloqués</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {Math.round(stats.total_balance).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Solde Total GNF</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste des wallets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Gestion des Wallets
              </CardTitle>
              <CardDescription>
                Vue complète et contrôle de tous les wallets du système
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadWallets();
                loadStats();
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Recherche */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par ID, nom, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tableau wallets */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p>Aucun wallet trouvé</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {/* ID et utilisateur */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {wallet.public_id && (
                        <PublicIdBadge
                          publicId={wallet.public_id}
                          variant="secondary"
                          size="sm"
                        />
                      )}
                      <p className="font-medium truncate">
                        {wallet.profiles?.first_name} {wallet.profiles?.last_name}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {wallet.profiles?.email}
                    </p>
                  </div>

                  {/* Solde */}
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {wallet.balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {wallet.currency}
                    </p>
                  </div>

                  {/* Statut */}
                  <div className="w-24">
                    {wallet.is_blocked ? (
                      <Badge variant="destructive" className="gap-1 w-full justify-center">
                        <Lock className="w-3 h-3" />
                        Bloqué
                      </Badge>
                    ) : (
                      <Badge variant="default" className="gap-1 w-full justify-center bg-green-600">
                        Actif
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {wallet.is_blocked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblockWallet(wallet.id)}
                        className="gap-2"
                      >
                        <Unlock className="w-4 h-4" />
                        Débloquer
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWallet(wallet);
                          setBlockDialogOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Bloquer
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog blocage */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquer le wallet</DialogTitle>
            <DialogDescription>
              Cette action bloquera toutes les opérations sur ce wallet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedWallet && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  {selectedWallet.public_id && (
                    <PublicIdBadge publicId={selectedWallet.public_id} size="sm" />
                  )}
                  <p className="font-medium">
                    {selectedWallet.profiles?.first_name} {selectedWallet.profiles?.last_name}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Solde: {selectedWallet.balance.toLocaleString()} {selectedWallet.currency}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Raison du blocage *</label>
              <Input
                placeholder="Ex: Activité suspecte, fraude détectée..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setBlockDialogOpen(false);
                  setBlockReason('');
                  setSelectedWallet(null);
                }}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={handleBlockWallet}
                disabled={!blockReason}
              >
                <Lock className="w-4 h-4" />
                Confirmer le blocage
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WalletAdminPanel;
