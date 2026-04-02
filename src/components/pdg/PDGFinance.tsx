// @ts-nocheck
import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Wallet, Download, Clock, BarChart3, RefreshCw, User, Mail, Phone, CreditCard, Calendar, Crown, Shield, Bike, Sparkles, Building2, ArrowUpDown, AlertTriangle, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useFinanceData } from '@/hooks/useFinanceData';
import { backendFetch } from '@/services/backendApi';
import PlatformRevenueOverview from './PlatformRevenueOverview';

const PDGRevenueAnalytics = lazy(() => import('./PDGRevenueAnalytics'));
const SubscriptionManagement = lazy(() => import('./SubscriptionManagement'));
const PDGEscrowManagement = lazy(() => import('./PDGEscrowManagement'));
const DriverSubscriptionManagement = lazy(() => import('./DriverSubscriptionManagement'));
const PDGServiceSubscriptions = lazy(() => import('./PDGServiceSubscriptions'));
const PDGTransferLimits = lazy(() => import('./PDGTransferLimits'));

export default function PDGFinance() {
  const { stats, transactions, wallets, loading, refetch } = useFinanceData(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [showWalletsDialog, setShowWalletsDialog] = useState(false);
  const [fxHealth, setFxHealth] = useState<any>(null);
  const [fxLoading, setFxLoading] = useState(false);
  const [showConversionStatsDialog, setShowConversionStatsDialog] = useState(false);
  const [conversionStats, setConversionStats] = useState<any>(null);
  const [conversionStatsLoading, setConversionStatsLoading] = useState(false);
  const [alertCheckLoading, setAlertCheckLoading] = useState(false);
  const [marginUpdateLoading, setMarginUpdateLoading] = useState(false);
  const [showMarginDialog, setShowMarginDialog] = useState(false);
  const [marginPercentInput, setMarginPercentInput] = useState('3');
  const [clockMs, setClockMs] = useState(Date.now());
  const [fxFetchedAtMs, setFxFetchedAtMs] = useState<number | null>(null);

  const formatConakryTime = (iso: string | null | undefined): string => {
    if (!iso) return 'Heure N/A';
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Africa/Conakry',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(iso));
    } catch {
      return 'Heure N/A';
    }
  };

  const formatRateAgeCountdown = (ageSeconds: number | null | undefined): string => {
    if (typeof ageSeconds !== 'number' || ageSeconds < 0) return 'N/A';
    // Affiche l'âge du taux écoulé (MM:SS format)
    const minutes = Math.floor(ageSeconds / 60);
    const seconds = ageSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const visibleBankSources = (() => {
    if (Array.isArray(fxHealth?.bank_sources) && fxHealth.bank_sources.length > 0) {
      return fxHealth.bank_sources;
    }
    if (!Array.isArray(fxHealth?.today_history)) {
      return [];
    }

    const byUrl = new Map<string, { source: string | null; source_type: string | null; source_url: string | null; last_seen_at: string | null }>();
    for (const rate of fxHealth.today_history) {
      const url = rate?.source_url;
      if (!url) continue;
      if (!byUrl.has(url)) {
        byUrl.set(url, {
          source: null,
          source_type: rate?.source_type || null,
          source_url: url,
          last_seen_at: rate?.retrieved_at || null,
        });
      }
    }
    return Array.from(byUrl.values());
  })();

  // Auto-rafraîchir les données au montage du composant
  useEffect(() => {
    console.log('🔄 PDGFinance monté - rafraîchissement des données');
    refetch();
  }, []);

  // Log des stats pour debug
  useEffect(() => {
    if (!loading) {
      console.log('📊 Stats Finance PDG:', {
        total_revenue: stats.total_revenue,
        total_commission: stats.total_commission,
        pending_payments: stats.pending_payments,
        active_wallets: stats.active_wallets,
        transactions_count: transactions?.length || 0
      });
    }
  }, [loading, stats, transactions]);

  const loadFxHealth = async () => {
    try {
      setFxLoading(true);
      const response = await backendFetch('/api/v2/wallet/admin/fx-health', { method: 'GET' });
      if (!response.success) {
        throw new Error(response.error || 'Impossible de récupérer les données FX');
      }
      setFxHealth(response.data || null);
      setFxFetchedAtMs(Date.now());
    } catch (error) {
      console.error('Erreur chargement FX health:', error);
      setFxHealth(null);
    } finally {
      setFxLoading(false);
    }
  };

  useEffect(() => {
    loadFxHealth();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setClockMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadConversionStats = async () => {
    try {
      setConversionStatsLoading(true);
      const response = await backendFetch('/api/v2/wallet/admin/fx-conversion-stats', { method: 'GET' });
      if (!response.success) {
        throw new Error(response.error || 'Impossible de charger les stats de conversion');
      }
      setConversionStats(response.data || null);
      setShowConversionStatsDialog(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erreur stats de conversion');
    } finally {
      setConversionStatsLoading(false);
    }
  };

  const checkRateChangeAlert = async () => {
    try {
      setAlertCheckLoading(true);
      const response = await backendFetch('/api/v2/wallet/admin/fx-rate-alert-check', { method: 'POST' });
      if (!response.success) {
        throw new Error(response.error || 'Impossible de verifier les alertes FX');
      }

      if (response.data?.changed_under_one_hour) {
        toast.warning(`Changement de taux detecte en ${response.data?.minutes_between || 'N/A'} min.${response.data?.alert_created ? ' Alerte enregistree.' : ' Alerte deja active.'}`);
      } else {
        toast.success('Aucun changement de taux en moins d\'1 heure.');
      }
      await loadFxHealth();
    } catch (error: any) {
      toast.error(error?.message || 'Erreur verification alerte FX');
    } finally {
      setAlertCheckLoading(false);
    }
  };

  const openFxMarginDialog = () => {
    setMarginPercentInput(String(Math.round((fxHealth?.current_rate?.margin || 0.03) * 100)));
    setShowMarginDialog(true);
  };

  const updateFxMargin = async () => {
    const marginPercent = Number(String(marginPercentInput).replace(',', '.'));
    if (!Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent > 30) {
      toast.error('Commission invalide. Entrez un pourcentage entre 0 et 30.');
      return;
    }

    try {
      setMarginUpdateLoading(true);
      const response = await backendFetch('/api/v2/wallet/admin/fx-margin', {
        method: 'POST',
        body: JSON.stringify({ margin_percent: marginPercent }),
      });

      if (!response.success) {
        throw new Error(response.error || 'Mise a jour de la commission FX impossible');
      }

      toast.success(`Commission FX mise a jour: ${marginPercent}%`);
      setShowMarginDialog(false);
      await loadFxHealth();
    } catch (error: any) {
      toast.error(error?.message || 'Erreur mise a jour commission FX');
    } finally {
      setMarginUpdateLoading(false);
    }
  };

  const chartConfig = {
    amount: { label: "Montant", color: "hsl(var(--primary))" },
    commission: { label: "Commission", color: "hsl(var(--chart-2))" }
  };

  const exportData = async () => {
    try {
      const csvData = (transactions || []).map(t => {
        return {
          'ID Transaction': t.id,
          'Type': t.transaction_type || 'N/A',
          'Montant': t.amount,
          'Statut': t.status,
          'Date': new Date(t.created_at).toLocaleDateString('fr-FR'),
          'Description': t.description || 'N/A',
          'Devise': t.currency || 'GNF'
        };
      });

      const csvContent = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export réussi');
    } catch (error) {
      console.error('Erreur export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const chartData = (transactions || []).slice(0, 10).reverse().map(t => ({
    date: new Date(t.created_at).toLocaleDateString(),
    amount: Number(t.amount),
    commission: Number(t.fee)
  }));

  const liveRateAgeSeconds = (() => {
    const retrievedAt = fxHealth?.current_rate?.retrieved_at;
    if (!retrievedAt) {
      if (typeof fxHealth?.age_minutes !== 'number') return null;
      const baseAgeSeconds = Math.max(0, fxHealth.age_minutes * 60);
      if (!fxFetchedAtMs) return baseAgeSeconds;
      const elapsedSinceFetchSeconds = Math.max(0, Math.floor((clockMs - fxFetchedAtMs) / 1000));
      return baseAgeSeconds + elapsedSinceFetchSeconds;
    }

    const parsed = new Date(retrievedAt).getTime();
    if (!Number.isFinite(parsed)) {
      return typeof fxHealth?.age_minutes === 'number' ? Math.max(0, fxHealth.age_minutes * 60) : null;
    }

    return Math.max(0, Math.floor((clockMs - parsed) / 1000));
  })();

  return (
    <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
      {/* Mobile: Horizontal scrollable tabs */}
      <div className="overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
        <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-8 gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Revenus</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="transfer-limits" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Limites</span>
          </TabsTrigger>
          <TabsTrigger value="pdg-revenue" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>PDG</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Abonnements</span>
          </TabsTrigger>
          <TabsTrigger value="service-subscriptions" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Services</span>
          </TabsTrigger>
          <TabsTrigger value="escrow" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Escrow</span>
          </TabsTrigger>
          <TabsTrigger value="driver-subscriptions" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Drivers</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <PlatformRevenueOverview />
      </TabsContent>

      <TabsContent value="transfer-limits" className="space-y-6">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <PDGTransferLimits />
        </Suspense>
      </TabsContent>

      <TabsContent value="pdg-revenue" className="space-y-6">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <PDGRevenueAnalytics />
        </Suspense>
      </TabsContent>

      <TabsContent value="subscriptions" className="space-y-6">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <SubscriptionManagement />
        </Suspense>
      </TabsContent>

      <TabsContent value="service-subscriptions" className="space-y-6">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <PDGServiceSubscriptions />
        </Suspense>
      </TabsContent>

      <TabsContent value="escrow" className="space-y-6">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <PDGEscrowManagement />
        </Suspense>
      </TabsContent>

      <TabsContent value="driver-subscriptions" className="space-y-6">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <DriverSubscriptionManagement />
        </Suspense>
      </TabsContent>

      <TabsContent value="transactions" className="space-y-8">
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="w-5 h-5 text-primary" />
            Santé FX (devises)
          </CardTitle>
          <CardDescription>Taux actuel, historique du jour et sources consultées</CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="outline" className="gap-2" onClick={loadConversionStats} disabled={conversionStatsLoading}>
              <Globe2 className="w-4 h-4" />
              {conversionStatsLoading ? 'Chargement...' : 'Voir conversions par pays'}
            </Button>
            <Button type="button" variant="secondary" className="gap-2" onClick={checkRateChangeAlert} disabled={alertCheckLoading}>
              <AlertTriangle className="w-4 h-4" />
              {alertCheckLoading ? 'Verification...' : 'Alerte changement < 1h'}
            </Button>
            <Button type="button" variant="default" className="gap-2" onClick={openFxMarginDialog} disabled={marginUpdateLoading}>
              <DollarSign className="w-4 h-4" />
              {marginUpdateLoading ? 'Mise a jour...' : 'Ajouter commission au taux'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fxLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Chargement des données FX...
            </div>
          ) : !fxHealth ? (
            <p className="text-sm text-muted-foreground">Données FX indisponibles pour le moment.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Taux actuel</p>
                  <p className="text-lg font-semibold">
                    {typeof fxHealth.current_rate?.rate === 'number'
                      ? fxHealth.current_rate.rate.toLocaleString(undefined, { maximumFractionDigits: 6 })
                      : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fxHealth.current_rate
                      ? `${fxHealth.current_rate.from_currency}/${fxHealth.current_rate.to_currency}`
                      : 'Paire indisponible'}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Âge du taux</p>
                  <p className="text-lg font-semibold">
                    {formatRateAgeCountdown(liveRateAgeSeconds)}
                  </p>
                  <Badge variant={fxHealth.is_stale ? 'destructive' : 'secondary'} className="mt-1">
                    {fxHealth.is_stale ? 'Stale' : 'Fresh'}
                  </Badge>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Sources bancaires visitées</p>
                  <p className="text-lg font-semibold">{visibleBankSources.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Collecte du backend</p>
                </div>
              </div>

              <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                Fuseau horaire système: <span className="font-medium text-foreground">{fxHealth.timezone || 'Africa/Conakry'}</span>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium mb-2">Sources bancaires visitées (URLs)</p>
                {visibleBankSources.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune source bancaire trouvée.</p>
                ) : (
                  <div className="max-h-44 overflow-auto space-y-1">
                    {visibleBankSources.slice(0, 12).map((source, idx) => (
                      <div key={`${source.source_url || 'na'}-${idx}`} className="text-xs rounded border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{source.source || source.source_type || 'Source bancaire'}</span>
                          <span className="text-muted-foreground">
                            {formatConakryTime(source.last_seen_at)}
                          </span>
                        </div>
                        <div className="mt-1 text-muted-foreground break-all">
                          {source.source_url || source.source || source.source_type || 'Source indisponible'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium mb-2">Historique devise Guinée (GNF)</p>
                {!Array.isArray(fxHealth.gnf_today_history) || fxHealth.gnf_today_history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun taux GNF collecté aujourd'hui.</p>
                ) : (
                  <div className="max-h-40 overflow-auto space-y-1">
                    {fxHealth.gnf_today_history.slice(0, 20).map((rate: any, idx: number) => (
                      <div key={`gnf-${rate.retrieved_at || 'na'}-${idx}`} className="text-xs rounded border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{rate.from_currency}/{rate.to_currency}</span>
                          <span>{typeof rate.rate === 'number' ? rate.rate.toLocaleString(undefined, { maximumFractionDigits: 6 }) : 'N/A'}</span>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {formatConakryTime(rate.retrieved_at)} {' • '} {rate.source_url || rate.source_type || 'Source N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium mb-2">Historique du taux (aujourd'hui)</p>
                {!fxHealth.today_history || fxHealth.today_history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun taux collecté aujourd'hui.</p>
                ) : (
                  <div className="max-h-64 overflow-auto space-y-1">
                    {fxHealth.today_history.slice(0, 20).map((rate, idx) => (
                      <div key={`${rate.retrieved_at || 'na'}-${idx}`} className="text-xs rounded border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{rate.from_currency}/{rate.to_currency}</span>
                          <span>
                            {typeof rate.rate === 'number'
                              ? rate.rate.toLocaleString(undefined, { maximumFractionDigits: 6 })
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {formatConakryTime(rate.retrieved_at)}
                          {' • '}
                          {rate.source_url || rate.source_type || 'Source N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              Revenus Totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {(stats.total_revenue || 0).toLocaleString()} GNF
              </p>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12.5% ce mois
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {(stats.total_commission || 0).toLocaleString()} GNF
              </p>
              <p className="text-xs text-muted-foreground">
                  Sur {transactions?.length || 0} transactions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              Paiements en Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {(stats.pending_payments || 0).toLocaleString()} GNF
              </p>
              <p className="text-xs text-muted-foreground">
                {transactions?.filter(t => t.status === 'pending').length || 0} transactions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group cursor-pointer"
          onClick={() => setShowWalletsDialog(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-purple-500" />
              </div>
              Wallets Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {stats.active_wallets || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                Cliquez pour voir les détails
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Évolution des Transactions
            </CardTitle>
            <CardDescription>Volume des 10 dernières transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/20" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Répartition des Commissions
            </CardTitle>
            <CardDescription>Par transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/20" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="commission" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Export Section */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Export des Données</CardTitle>
          <CardDescription>Télécharger les rapports financiers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="bg-background"
            />
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="bg-background"
            />
            <Button onClick={exportData} className="gap-2 shadow-lg">
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
            <Button onClick={refetch} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">Transactions Récentes</CardTitle>
          <CardDescription>Les 10 dernières opérations financières</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(transactions || []).slice(0, 10).map((trans, index) => (
              <div
                key={trans.id}
                className="group p-4 rounded-xl border border-border/40 bg-muted/30 hover:bg-muted/50 hover:border-border/60 transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                      trans.status === 'completed' ? 'bg-green-500/10' : 
                      trans.status === 'pending' ? 'bg-orange-500/10' : 
                      'bg-red-500/10'
                    }`}>
                      <DollarSign className={`w-6 h-6 ${
                        trans.status === 'completed' ? 'text-green-500' : 
                        trans.status === 'pending' ? 'text-orange-500' : 
                        'text-red-500'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {trans.transaction_type?.toUpperCase() || 'TRANSACTION'} #{trans.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(trans.created_at).toLocaleDateString('fr-FR', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {trans.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {trans.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="text-xl font-bold">
                      {Number(trans.amount).toLocaleString()} GNF
                    </p>
                    <Badge variant="outline" className={
                      trans.status === 'completed' ? 'border-green-500/50 bg-green-500/10 text-green-500' :
                      trans.status === 'pending' ? 'border-orange-500/50 bg-orange-500/10 text-orange-500' :
                      'border-red-500/50 bg-red-500/10 text-red-500'
                    }>
                      {trans.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showMarginDialog} onOpenChange={setShowMarginDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter commission FX</DialogTitle>
            <DialogDescription>
              Définir la commission (%) appliquée sur le taux de change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Commission en pourcentage</p>
              <Input
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={marginPercentInput}
                onChange={(e) => setMarginPercentInput(e.target.value)}
                placeholder="Ex: 3"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowMarginDialog(false)} disabled={marginUpdateLoading}>
                Annuler
              </Button>
              <Button type="button" onClick={updateFxMargin} disabled={marginUpdateLoading}>
                {marginUpdateLoading ? 'Mise a jour...' : 'Appliquer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal des Wallets */}
      <Dialog open={showConversionStatsDialog} onOpenChange={setShowConversionStatsDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Globe2 className="w-6 h-6 text-primary" />
              Conversions utilisateurs par pays
            </DialogTitle>
            <DialogDescription>
              Volume de conversions (fenetre glissante {conversionStats?.window_hours || 24}h), pays origine/destination
            </DialogDescription>
          </DialogHeader>

          {!conversionStats ? (
            <p className="text-sm text-muted-foreground">Aucune statistique disponible.</p>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Conversions totales</p>
                    <p className="text-2xl font-bold">{conversionStats.total_conversions || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Conversions internationales</p>
                    <p className="text-2xl font-bold">{conversionStats.international_conversions || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Pays actifs</p>
                    <p className="text-2xl font-bold">{Array.isArray(conversionStats.by_country) ? conversionStats.by_country.length : 0}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Corridors pays vers pays</CardTitle>
                </CardHeader>
                <CardContent>
                  {!Array.isArray(conversionStats.country_corridors) || conversionStats.country_corridors.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun corridor détecté.</p>
                  ) : (
                    <div className="max-h-56 overflow-auto space-y-1">
                      {conversionStats.country_corridors.slice(0, 30).map((row: any, idx: number) => (
                        <div key={`${row.from_country}-${row.to_country}-${idx}`} className="text-xs rounded border p-2 flex items-center justify-between gap-2">
                          <span className="font-medium">{row.from_country} -> {row.to_country}</span>
                          <span>{row.conversions_count} conversions</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top utilisateurs (conversions)</CardTitle>
                </CardHeader>
                <CardContent>
                  {!Array.isArray(conversionStats.by_user) || conversionStats.by_user.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun utilisateur détecté.</p>
                  ) : (
                    <div className="max-h-56 overflow-auto space-y-1">
                      {conversionStats.by_user.slice(0, 30).map((row: any, idx: number) => (
                        <div key={`${row.user_id}-${idx}`} className="text-xs rounded border p-2 flex items-center justify-between gap-2">
                          <span className="truncate">{row.user_label} ({row.country || 'Inconnu'})</span>
                          <span>{row.conversions_count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal des Wallets */}
      <Dialog open={showWalletsDialog} onOpenChange={setShowWalletsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Wallet className="w-6 h-6 text-primary" />
              Détails des Wallets ({wallets?.length || 0})
            </DialogTitle>
            <DialogDescription>
              Liste complète de tous les wallets avec leurs informations détaillées
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {!wallets || wallets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun wallet trouvé
              </div>
            ) : (
              wallets.map((wallet) => (
                <Card key={wallet.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Informations utilisateur */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {`${wallet.profiles?.first_name || ''} ${wallet.profiles?.last_name || ''}`.trim() ||
                               'Utilisateur'}
                            </h3>
                            <Badge variant="outline" className="mt-1">
                              {wallet.profiles?.role || 'N/A'}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {wallet.profiles?.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Email:</span>
                              <span className="font-medium">{wallet.profiles.email}</span>
                            </div>
                          )}
                          
                          {wallet.profiles?.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Téléphone:</span>
                              <span className="font-medium">{wallet.profiles.phone}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Code ID:</span>
                            <span className="font-mono text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold">
                              {wallet.custom_id || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Informations wallet */}
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
                          <p className="text-sm text-muted-foreground mb-1">Solde</p>
                          <p className="text-3xl font-bold text-green-600">
                            {Number(wallet.balance).toLocaleString()} {wallet.currency}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Statut:</span>
                            <Badge 
                              variant={wallet.wallet_status === 'active' ? 'default' : 'secondary'}
                              className={wallet.wallet_status === 'active' ? 'bg-green-500' : ''}
                            >
                              {wallet.wallet_status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Créé le:</span>
                            <span className="font-medium">
                              {new Date(wallet.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Mis à jour:</span>
                            <span className="font-medium">
                              {new Date(wallet.updated_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      </TabsContent>
    </Tabs>
  );
}
