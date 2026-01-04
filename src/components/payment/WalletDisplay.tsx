/**
 * WALLET DISPLAY COMPONENT
 * Affichage du solde du portefeuille
 * 224SOLUTIONS
 */

import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useWallet } from '@/hooks/useWallet';
import { formatAmount, getWalletStatusColor, getWalletStatusLabel } from '@/types/stripePayment';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Lock, 
  RefreshCw,
  Eye,
  EyeOff,
  ArrowUpRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { WalletStatus } from '@/types/stripePayment';

interface WalletDisplayProps {
  userId: string;
  showActions?: boolean;
  onWithdraw?: () => void;
  compact?: boolean;
}

export function WalletDisplay({ 
  userId, 
  showActions = true,
  onWithdraw,
  compact = false 
}: WalletDisplayProps) {
  const { 
    wallet, 
    loading, 
    error,
    fetchWallet,
    getAvailableBalance,
    getTotalBalance,
    subscribeToWallet
  } = useWallet({ userId, autoFetch: true });

  const [showBalance, setShowBalance] = React.useState(true);

  // S'abonner aux mises à jour en temps réel
  useEffect(() => {
    const unsubscribe = subscribeToWallet(userId);
    return unsubscribe;
  }, [userId, subscribeToWallet]);

  const handleRefresh = async () => {
    await fetchWallet(userId);
  };

  if (loading && !wallet) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !wallet) {
    return (
      <Card className="w-full border-destructive">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            {error || 'Impossible de charger le portefeuille'}
          </p>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const availableBalance = getAvailableBalance();
  const totalBalance = getTotalBalance();
  const statusColor = getWalletStatusColor(wallet.status as WalletStatus);
  const statusLabel = getWalletStatusLabel(wallet.status as WalletStatus);

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Solde disponible</p>
            <p className="text-2xl font-bold">
              {showBalance ? formatAmount(availableBalance, wallet.currency) : '••••••'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowBalance(!showBalance)}
        >
          {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="w-5 h-5" />
              <span>Mon Portefeuille</span>
            </CardTitle>
            <CardDescription>
              Gérez vos fonds et transactions
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={statusColor as any}>
              {statusLabel}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Solde principal */}
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <h3 className="text-4xl font-bold tracking-tight">
              {showBalance ? formatAmount(availableBalance, wallet.currency) : '••••••'}
            </h3>
            <span className="text-sm text-muted-foreground">
              {wallet.currency.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Solde disponible</p>
        </div>

        <Separator />

        {/* Détails des soldes */}
        <div className="grid grid-cols-3 gap-4">
          {/* En attente */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-xs">En attente</span>
            </div>
            <p className="text-lg font-semibold">
              {showBalance ? formatAmount(wallet.pending_balance, wallet.currency) : '•••'}
            </p>
          </div>

          {/* Bloqué */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span className="text-xs">Bloqué</span>
            </div>
            <p className="text-lg font-semibold">
              {showBalance ? formatAmount(wallet.frozen_balance, wallet.currency) : '•••'}
            </p>
          </div>

          {/* Total */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Total</span>
            </div>
            <p className="text-lg font-semibold">
              {showBalance ? formatAmount(totalBalance, wallet.currency) : '•••'}
            </p>
          </div>
        </div>

        {/* Statut de vérification */}
        {!wallet.is_verified && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              ⚠️ Votre portefeuille n'est pas encore vérifié. Certaines fonctionnalités sont limitées.
            </p>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex space-x-2 pt-2">
            <Button 
              onClick={onWithdraw}
              disabled={availableBalance === 0 || wallet.status !== 'ACTIVE'}
              className="flex-1"
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Retirer
            </Button>
            <Button 
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}

        {/* Dernière mise à jour */}
        <p className="text-xs text-muted-foreground text-center">
          Dernière mise à jour : {new Date(wallet.updated_at).toLocaleString('fr-FR')}
        </p>
      </CardContent>
    </Card>
  );
}
