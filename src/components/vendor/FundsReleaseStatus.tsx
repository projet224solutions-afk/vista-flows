/**
 * COMPOSANT: Statut de libération des fonds (Vendeur)
 * 224SOLUTIONS - Affichage transparent du statut des fonds en attente
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Shield,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FundsRelease {
  id: string;
  transaction_id: string;
  amount_to_release: number;
  held_at: string;
  scheduled_release_at: string;
  released_at: string | null;
  status: 'PENDING' | 'SCHEDULED' | 'RELEASED' | 'REJECTED' | 'DISPUTED';
  release_type: string;
  stripe_transaction: {
    stripe_payment_intent_id: string;
    amount: number;
    buyer_id: string;
  };
  payment_risk_assessment: {
    trust_score: number;
    risk_level: string;
    decision: string;
    random_review: boolean;
  };
}

interface WalletBalance {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
}

export function FundsReleaseStatus() {
  const [releases, setReleases] = useState<FundsRelease[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
    
    // Rafraîchir toutes les minutes
    const interval = setInterval(fetchUserData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      // Récupérer le wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('available_balance, pending_balance, total_earned')
        .eq('user_id', user.id)
        .single();

      if (walletError) throw walletError;
      setWalletBalance(wallet);

      // Récupérer les libérations en cours
      const { data: releasesData, error: releasesError } = await supabase
        .from('funds_release_schedule')
        .select(`
          *,
          stripe_transaction:stripe_transactions!transaction_id (
            stripe_payment_intent_id,
            amount,
            buyer_id
          ),
          payment_risk_assessment:payment_risk_assessments!transaction_id (
            trust_score,
            risk_level,
            decision,
            random_review
          )
        `)
        .eq('wallet_id', wallet.id)
        .in('status', ['PENDING', 'SCHEDULED'])
        .order('held_at', { ascending: false });

      if (releasesError) throw releasesError;
      
      setReleases(releasesData || []);
    } catch (error) {
      console.error('Error fetching funds release status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      PENDING: { variant: 'secondary', label: 'En révision', icon: AlertTriangle },
      SCHEDULED: { variant: 'default', label: 'Planifié', icon: Clock },
      RELEASED: { variant: 'default', label: 'Libéré', icon: CheckCircle },
      REJECTED: { variant: 'destructive', label: 'Rejeté', icon: AlertTriangle },
      DISPUTED: { variant: 'destructive', label: 'En litige', icon: AlertTriangle },
    };

    const config = variants[status] || variants.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const calculateProgress = (heldAt: string, scheduledAt: string) => {
    const now = new Date();
    const held = new Date(heldAt);
    const scheduled = new Date(scheduledAt);

    const totalMinutes = differenceInMinutes(scheduled, held);
    const elapsedMinutes = differenceInMinutes(now, held);

    return Math.min(Math.max((elapsedMinutes / totalMinutes) * 100, 0), 100);
  };

  const getRemainingTime = (scheduledAt: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const remainingMinutes = differenceInMinutes(scheduled, now);

    if (remainingMinutes <= 0) {
      return 'Bientôt disponible';
    }

    if (remainingMinutes < 60) {
      return `${remainingMinutes} min`;
    }

    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    return `${hours}h ${minutes}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Solde disponible
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((walletBalance?.available_balance || 0) / 100).toFixed(2)} XOF
            </div>
            <p className="text-xs text-muted-foreground">
              Utilisable immédiatement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Fonds en attente
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {((walletBalance?.pending_balance || 0) / 100).toFixed(2)} XOF
            </div>
            <p className="text-xs text-muted-foreground">
              {releases.length} paiement{releases.length > 1 ? 's' : ''} en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total gagné
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {((walletBalance?.total_earned || 0) / 100).toFixed(2)} XOF
            </div>
            <p className="text-xs text-muted-foreground">
              Toutes périodes confondues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Releases List */}
      {releases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Libérations en cours
            </CardTitle>
            <CardDescription>
              Vos paiements en cours de validation et de libération
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {releases.map((release) => {
              const assessment = Array.isArray(release.payment_risk_assessment)
                ? release.payment_risk_assessment[0]
                : release.payment_risk_assessment;

              const isScheduled = release.status === 'SCHEDULED';
              const isPending = release.status === 'PENDING';
              const progress = isScheduled 
                ? calculateProgress(release.held_at, release.scheduled_release_at)
                : 0;

              return (
                <Card key={release.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl font-bold">
                              {(release.amount_to_release / 100).toFixed(2)} XOF
                            </span>
                            {getStatusBadge(release.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Reçu {formatDistanceToNow(new Date(release.held_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>

                        {assessment && (
                          <div className="text-right">
                            <div className="flex items-center gap-1 mb-1">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Trust Score</span>
                            </div>
                            <div className="text-2xl font-bold">
                              {assessment.trust_score}/100
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar (for SCHEDULED) */}
                      {isScheduled && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Libération dans: {getRemainingTime(release.scheduled_release_at)}
                            </span>
                            <span className="font-medium">{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      {/* Pending Admin Review */}
                      {isPending && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-yellow-900">
                                Révision en cours
                              </p>
                              <p className="text-sm text-yellow-700 mt-1">
                                {assessment?.random_review
                                  ? 'Ce paiement fait l\'objet d\'un contrôle de routine aléatoire. Les fonds seront libérés après validation.'
                                  : 'Votre paiement nécessite une validation manuelle par notre équipe. Cela peut prendre jusqu\'à 24 heures.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Transaction:</span>
                          <p className="font-mono text-xs mt-1">
                            {Array.isArray(release.stripe_transaction)
                              ? release.stripe_transaction[0]?.stripe_payment_intent_id?.slice(0, 20)
                              : release.stripe_transaction?.stripe_payment_intent_id?.slice(0, 20)}
                            ...
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-medium mt-1">
                            {release.release_type === 'AUTO' ? 'Automatique' : 'Manuel'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-blue-900">
                Système de protection des paiements
              </p>
              <p className="text-sm text-blue-700">
                Pour votre sécurité, tous les paiements font l'objet d'une vérification automatique 
                avant libération des fonds. Les paiements à faible risque sont libérés automatiquement 
                après un délai de 30 minutes à 2 heures.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
