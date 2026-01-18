/**
 * 🔐 OUTIL D'AUDIT WALLET COMPLET
 * Permet au PDG de diagnostiquer, vérifier et corriger les wallets
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Wallet, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wrench,
  Activity,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  Plus,
  FileText,
  Eye,
  Clock,
  AlertCircle,
  CreditCard,
  Key,
  Zap,
  BarChart3,
  Users,
  ListChecks
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WalletIssue {
  type: 'critical' | 'warning' | 'info';
  code: string;
  message: string;
  details?: any;
  canAutoFix: boolean;
}

interface ApiSignatureCheck {
  api: string;
  status: 'valid' | 'invalid' | 'unknown' | 'expired';
  lastChecked: string;
  details?: string;
}

interface AuditResult {
  success: boolean;
  walletFound: boolean;
  wallet: any;
  transactions: any[];
  issues: WalletIssue[];
  calculatedBalance: number;
  storedBalance: number;
  balanceDifference: number;
  isBalanceCorrect: boolean;
  apiSignatures: ApiSignatureCheck[];
  recommendations: string[];
  logs: any[];
  suspiciousActivities: any[];
  reconciliationHistory: any[];
  paymentMethods: any[];
  summary: {
    totalIncoming: number;
    totalOutgoing: number;
    expectedBalance: number;
    actualBalance: number;
    transactionCount: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    lastActivity: string | null;
    walletAge: number;
    healthScore: number;
  };
}

interface GlobalStats {
  totalUsers: number;
  totalWallets: number;
  usersWithoutWalletCount: number;
  problematicWalletsCount: number;
  unresolvedSuspiciousCount: number;
}

export function WalletAuditTool() {
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [usersWithoutWallet, setUsersWithoutWallet] = useState<any[]>([]);
  const [problematicWallets, setProblematicWallets] = useState<any[]>([]);
  const [apiSignatures, setApiSignatures] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('search');

  const formatAmount = (amount: number, currency = 'GNF') => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0
    }).format(amount) + ' ' + currency;
  };

  // Audit d'un wallet spécifique
  const auditWallet = useCallback(async (customId?: string) => {
    const idToUse = customId || searchId.trim().toUpperCase();
    if (!idToUse) {
      toast.error('Veuillez entrer un ID utilisateur');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-audit', {
        body: { action: 'audit', customId: idToUse }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAuditResult(data);
      toast.success(`Audit terminé pour ${idToUse}`);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'audit');
      console.error('Audit error:', err);
    } finally {
      setLoading(false);
    }
  }, [searchId]);

  // Charger les stats globales
  const loadGlobalStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-audit', {
        body: { action: 'get-all-wallets' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGlobalStats(data.stats);
      setUsersWithoutWallet(data.usersWithoutWallet || []);
      setProblematicWallets(data.problematicWallets || []);
      toast.success('Statistiques chargées');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  // Vérifier les signatures API
  const verifySignatures = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-audit', {
        body: { action: 'verify-signatures' }
      });

      if (error) throw error;
      setApiSignatures(data);
      toast.success('Signatures vérifiées');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  }, []);

  // Réconcilier le solde
  const reconcileBalance = useCallback(async () => {
    if (!auditResult?.wallet) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-audit', {
        body: { action: 'reconcile', userId: auditResult.wallet.user_id }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data.error);

      toast.success(`Solde réconcilié: ${formatAmount(data.oldBalance)} → ${formatAmount(data.newBalance)}`);
      // Recharger l'audit
      await auditWallet();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la réconciliation');
    } finally {
      setLoading(false);
    }
  }, [auditResult, auditWallet]);

  // Débloquer un wallet
  const unblockWallet = useCallback(async () => {
    if (!auditResult?.wallet) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-audit', {
        body: { action: 'fix', userId: auditResult.wallet.user_id, fixAction: 'unblock' }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data.error);

      toast.success('Wallet débloqué');
      await auditWallet();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du déblocage');
    } finally {
      setLoading(false);
    }
  }, [auditResult, auditWallet]);

  // Activer un wallet
  const activateWallet = useCallback(async () => {
    if (!auditResult?.wallet) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-audit', {
        body: { action: 'fix', userId: auditResult.wallet.user_id, fixAction: 'activate' }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data.error);

      toast.success('Wallet activé');
      await auditWallet();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'activation');
    } finally {
      setLoading(false);
    }
  }, [auditResult, auditWallet]);

  // Créer un wallet manquant
  const createWallet = useCallback(async (customId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-audit', {
        body: { action: 'create-wallet', customId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data.error);

      toast.success(`Wallet créé pour ${customId}`);
      await loadGlobalStats();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  }, [loadGlobalStats]);

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSignatureStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800';
      case 'invalid': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête et onglets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Audit & Diagnostic Wallet Complet
          </CardTitle>
          <CardDescription>
            Vérifiez, diagnostiquez et corrigez les problèmes de wallet des utilisateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="search" className="gap-1">
                <Search className="h-4 w-4" />
                Recherche
              </TabsTrigger>
              <TabsTrigger value="global" className="gap-1">
                <BarChart3 className="h-4 w-4" />
                Vue Globale
              </TabsTrigger>
              <TabsTrigger value="signatures" className="gap-1">
                <Key className="h-4 w-4" />
                API Signatures
              </TabsTrigger>
              <TabsTrigger value="issues" className="gap-1">
                <AlertTriangle className="h-4 w-4" />
                Problèmes
              </TabsTrigger>
            </TabsList>

            {/* Onglet Recherche */}
            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Entrez l'ID (ex: VND0001, CLT0002)..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && auditWallet()}
                  className="font-mono"
                />
                <Button onClick={() => auditWallet()} disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Auditer
                </Button>
              </div>

              {/* Résultats de l'audit */}
              {auditResult && (
                <div className="space-y-4">
                  {/* Score de santé */}
                  <Card className={`border-2 ${
                    auditResult.summary.healthScore >= 80 ? 'border-green-500' :
                    auditResult.summary.healthScore >= 50 ? 'border-yellow-500' : 'border-red-500'
                  }`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-full ${
                            auditResult.summary.healthScore >= 80 ? 'bg-green-100' :
                            auditResult.summary.healthScore >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                          }`}>
                            <Wallet className={`h-6 w-6 ${
                              auditResult.summary.healthScore >= 80 ? 'text-green-600' :
                              auditResult.summary.healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">Score de Santé: {auditResult.summary.healthScore}%</h3>
                            <p className="text-sm text-muted-foreground">
                              {auditResult.walletFound ? 'Wallet trouvé' : 'Aucun wallet'}
                            </p>
                          </div>
                        </div>
                        <Progress value={auditResult.summary.healthScore} className="w-32" />
                      </div>

                      {/* Stats rapides */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {formatAmount(auditResult.storedBalance)}
                          </p>
                          <p className="text-xs text-muted-foreground">Solde actuel</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">
                            {formatAmount(auditResult.calculatedBalance)}
                          </p>
                          <p className="text-xs text-muted-foreground">Solde calculé</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className={`text-2xl font-bold ${
                            auditResult.isBalanceCorrect ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {auditResult.isBalanceCorrect ? '✓' : formatAmount(auditResult.balanceDifference)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {auditResult.isBalanceCorrect ? 'Solde correct' : 'Divergence'}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">{auditResult.summary.transactionCount}</p>
                          <p className="text-xs text-muted-foreground">Transactions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Problèmes détectés */}
                  {auditResult.issues.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          Problèmes Détectés ({auditResult.issues.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {auditResult.issues.map((issue, idx) => (
                            <Alert key={idx} variant={issue.type === 'critical' ? 'destructive' : 'default'}>
                              <div className="flex items-start gap-2">
                                {getIssueIcon(issue.type)}
                                <div className="flex-1">
                                  <AlertTitle className="flex items-center gap-2">
                                    {issue.code}
                                    <Badge variant="outline" className="text-xs">
                                      {issue.type}
                                    </Badge>
                                  </AlertTitle>
                                  <AlertDescription>{issue.message}</AlertDescription>
                                  {issue.details && (
                                    <details className="mt-2">
                                      <summary className="text-xs cursor-pointer text-primary">Détails</summary>
                                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                        {JSON.stringify(issue.details, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                                {issue.canAutoFix && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      if (issue.code === 'BALANCE_MISMATCH') reconcileBalance();
                                      else if (issue.code === 'WALLET_BLOCKED') unblockWallet();
                                      else if (issue.code === 'WALLET_INACTIVE') activateWallet();
                                      else if (issue.code === 'WALLET_MISSING') createWallet(searchId);
                                    }}
                                    disabled={loading}
                                  >
                                    <Wrench className="h-3 w-3 mr-1" />
                                    Corriger
                                  </Button>
                                )}
                              </div>
                            </Alert>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions de correction */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Actions de Correction</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {!auditResult.isBalanceCorrect && auditResult.walletFound && (
                          <Button onClick={reconcileBalance} disabled={loading} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Réconcilier le solde
                          </Button>
                        )}
                        {auditResult.wallet?.is_blocked && (
                          <Button onClick={unblockWallet} disabled={loading} variant="outline">
                            <Unlock className="h-4 w-4 mr-2" />
                            Débloquer le wallet
                          </Button>
                        )}
                        {auditResult.wallet?.wallet_status !== 'active' && auditResult.walletFound && (
                          <Button onClick={activateWallet} disabled={loading} variant="outline">
                            <Zap className="h-4 w-4 mr-2" />
                            Activer le wallet
                          </Button>
                        )}
                        {!auditResult.walletFound && (
                          <Button onClick={() => createWallet(searchId)} disabled={loading}>
                            <Plus className="h-4 w-4 mr-2" />
                            Créer le wallet
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Transactions récentes */}
                  {auditResult.transactions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Transactions Récentes ({auditResult.transactions.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-2">
                            {auditResult.transactions.slice(0, 50).map((tx, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                <div className={`p-2 rounded-full ${
                                  tx._direction === 'received' ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                  {tx._direction === 'received' ? (
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-red-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {tx._source}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {tx.transaction_type || tx.type || 'transfer'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {tx.description || tx.id}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className={`font-bold ${
                                    tx._direction === 'received' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {tx._direction === 'received' ? '+' : '-'}
                                    {formatAmount(Number(tx.amount) || 0)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}
                                  </p>
                                </div>
                                <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                                  {tx.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {/* Historique de réconciliation */}
                  {auditResult.reconciliationHistory.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Historique de Réconciliation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {auditResult.reconciliationHistory.map((rec: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                  <p className="text-sm">
                                    {formatAmount(rec.stored_balance)} → {formatAmount(rec.calculated_balance)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Différence: {formatAmount(rec.difference)}
                                  </p>
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                  {format(new Date(rec.created_at), 'dd/MM/yyyy HH:mm')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {/* Activités suspectes */}
                  {auditResult.suspiciousActivities.length > 0 && (
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-5 w-5" />
                          Activités Suspectes ({auditResult.suspiciousActivities.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {auditResult.suspiciousActivities.map((activity: any, idx: number) => (
                              <Alert key={idx} variant="destructive">
                                <AlertTitle>{activity.activity_type}</AlertTitle>
                                <AlertDescription>
                                  Niveau de risque: {activity.risk_level} • 
                                  {activity.is_resolved ? ' Résolu' : ' Non résolu'}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Onglet Vue Globale */}
            <TabsContent value="global" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={loadGlobalStats} disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Charger les statistiques
                </Button>
              </div>

              {globalStats && (
                <>
                  {/* Stats globales */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">{globalStats.totalUsers}</p>
                        <p className="text-xs text-muted-foreground">Utilisateurs totaux</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Wallet className="h-8 w-8 mx-auto text-green-600 mb-2" />
                        <p className="text-2xl font-bold">{globalStats.totalWallets}</p>
                        <p className="text-xs text-muted-foreground">Wallets créés</p>
                      </CardContent>
                    </Card>
                    <Card className={globalStats.usersWithoutWalletCount > 0 ? 'border-yellow-500' : ''}>
                      <CardContent className="pt-6 text-center">
                        <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                        <p className="text-2xl font-bold">{globalStats.usersWithoutWalletCount}</p>
                        <p className="text-xs text-muted-foreground">Sans wallet</p>
                      </CardContent>
                    </Card>
                    <Card className={globalStats.problematicWalletsCount > 0 ? 'border-red-500' : ''}>
                      <CardContent className="pt-6 text-center">
                        <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                        <p className="text-2xl font-bold">{globalStats.problematicWalletsCount}</p>
                        <p className="text-xs text-muted-foreground">Wallets problématiques</p>
                      </CardContent>
                    </Card>
                    <Card className={globalStats.unresolvedSuspiciousCount > 0 ? 'border-red-500' : ''}>
                      <CardContent className="pt-6 text-center">
                        <Shield className="h-8 w-8 mx-auto text-red-500 mb-2" />
                        <p className="text-2xl font-bold">{globalStats.unresolvedSuspiciousCount}</p>
                        <p className="text-xs text-muted-foreground">Activités suspectes</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Utilisateurs sans wallet */}
                  {usersWithoutWallet.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Utilisateurs sans Wallet</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[250px]">
                          <div className="space-y-2">
                            {usersWithoutWallet.map((user, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono">
                                    {user.custom_id}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {user.user_id}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => createWallet(user.custom_id)}
                                  disabled={loading}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Créer
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {/* Wallets problématiques */}
                  {problematicWallets.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Wallets Problématiques</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[250px]">
                          <div className="space-y-2">
                            {problematicWallets.map((wallet, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                                <div>
                                  <div className="flex items-center gap-2">
                                    {wallet.is_blocked && <Lock className="h-4 w-4 text-red-500" />}
                                    <Badge variant={wallet.wallet_status === 'active' ? 'default' : 'destructive'}>
                                      {wallet.wallet_status}
                                    </Badge>
                                    <span className="font-mono text-xs">{wallet.id}</span>
                                  </div>
                                  <p className="text-sm">
                                    Solde: {formatAmount(Number(wallet.balance) || 0, wallet.currency)}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSearchId('');
                                    auditWallet();
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Auditer
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* Onglet Signatures API */}
            <TabsContent value="signatures" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={verifySignatures} disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  Vérifier les signatures
                </Button>
              </div>

              {apiSignatures && (
                <>
                  {/* Stats signatures */}
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold">{apiSignatures.stats.total}</p>
                        <p className="text-xs text-muted-foreground">Total APIs</p>
                      </CardContent>
                    </Card>
                    <Card className="border-green-500">
                      <CardContent className="pt-6 text-center">
                        <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-1" />
                        <p className="text-2xl font-bold text-green-600">{apiSignatures.stats.valid}</p>
                        <p className="text-xs text-muted-foreground">Valides</p>
                      </CardContent>
                    </Card>
                    <Card className={apiSignatures.stats.invalid > 0 ? 'border-red-500' : ''}>
                      <CardContent className="pt-6 text-center">
                        <XCircle className="h-6 w-6 mx-auto text-red-600 mb-1" />
                        <p className="text-2xl font-bold text-red-600">{apiSignatures.stats.invalid}</p>
                        <p className="text-xs text-muted-foreground">Invalides</p>
                      </CardContent>
                    </Card>
                    <Card className={apiSignatures.stats.expired > 0 ? 'border-yellow-500' : ''}>
                      <CardContent className="pt-6 text-center">
                        <Clock className="h-6 w-6 mx-auto text-yellow-600 mb-1" />
                        <p className="text-2xl font-bold text-yellow-600">{apiSignatures.stats.expired}</p>
                        <p className="text-xs text-muted-foreground">Expirées</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Liste des signatures */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">État des API de Paiement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {apiSignatures.signatures.map((sig: ApiSignatureCheck, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{sig.api}</p>
                                {sig.details && (
                                  <p className="text-xs text-muted-foreground">{sig.details}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getSignatureStatusColor(sig.status)}>
                                {sig.status === 'valid' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {sig.status === 'invalid' && <XCircle className="h-3 w-3 mr-1" />}
                                {sig.status === 'expired' && <Clock className="h-3 w-3 mr-1" />}
                                {sig.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {sig.lastChecked && format(new Date(sig.lastChecked), 'dd/MM HH:mm')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Webhooks récents */}
                  {apiSignatures.recentWebhooks && apiSignatures.recentWebhooks.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Webhooks Récents</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {apiSignatures.recentWebhooks.map((wh: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                                <Badge variant={wh.status_code < 400 ? 'default' : 'destructive'}>
                                  {wh.status_code}
                                </Badge>
                                <span className="text-sm truncate flex-1">{wh.endpoint}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(wh.created_at), 'dd/MM HH:mm')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* Onglet Problèmes */}
            <TabsContent value="issues" className="space-y-4">
              <Alert>
                <ListChecks className="h-4 w-4" />
                <AlertTitle>Checklist de Vérification</AlertTitle>
                <AlertDescription>
                  Utilisez cette section pour vérifier l'état global des wallets et identifier les problèmes à résoudre.
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vérifications Automatiques</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button className="w-full justify-start" variant="outline" onClick={loadGlobalStats}>
                        <Activity className="h-4 w-4 mr-2" />
                        Scanner tous les wallets
                      </Button>
                      <Button className="w-full justify-start" variant="outline" onClick={verifySignatures}>
                        <Key className="h-4 w-4 mr-2" />
                        Vérifier les clés API
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Actions Rapides</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button className="w-full justify-start" variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Réconcilier tous les soldes
                      </Button>
                      <Button className="w-full justify-start" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Créer wallets manquants
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
