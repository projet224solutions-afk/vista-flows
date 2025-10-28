// @ts-nocheck
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, TrendingUp, Wallet, Download, Clock, BarChart3, RefreshCw, User, Mail, Phone, CreditCard, Calendar } from 'lucide-react';
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

export default function PDGFinance() {
  const { stats, transactions, wallets, loading, refetch } = useFinanceData(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [showWalletsDialog, setShowWalletsDialog] = useState(false);

  const chartConfig = {
    amount: { label: "Montant", color: "hsl(var(--primary))" },
    commission: { label: "Commission", color: "hsl(var(--chart-2))" }
  };

  const exportData = async () => {
    try {
      const csvData = (transactions || []).map(t => {
        const senderProfile = t.sender_wallet?.profiles;
        const receiverProfile = t.receiver_wallet?.profiles;
        
        return {
          'ID Transaction': t.transaction_id,
          'Type': t.transaction_type || 'N/A',
          'Montant': t.amount,
          'Frais': t.fee,
          'Montant Net': t.net_amount,
          'Statut': t.status,
          'Expéditeur': senderProfile ? `${senderProfile?.first_name || ''} ${senderProfile?.last_name || ''}`.trim() || 'Système' : 'Système',
          'Destinataire': receiverProfile ? `${receiverProfile?.first_name || ''} ${receiverProfile?.last_name || ''}`.trim() || 'Système' : 'Système',
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

  return (
    <div className="space-y-8">
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
                        {trans.transaction_type?.toUpperCase() || 'TRANSACTION'} #{trans.transaction_id}
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
                            <span className="text-muted-foreground">User ID:</span>
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                              {wallet.user_id}
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
                            <Wallet className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Wallet ID:</span>
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                              {wallet.id}
                            </span>
                          </div>

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
    </div>
  );
}
