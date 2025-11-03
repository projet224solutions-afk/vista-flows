import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, DollarSign, Clock, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EscrowDashboardItem {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  available_to_release_at: string;
  commission_percent: number;
  commission_amount: number;
  payer_email: string;
  payer_name: string;
  receiver_email: string;
  receiver_name: string;
  log_count: number;
}

interface EscrowLog {
  id: string;
  action: string;
  performed_by: string | null;
  note: string | null;
  created_at: string;
}

export default function EscrowDashboard() {
  const [escrows, setEscrows] = useState<EscrowDashboardItem[]>([]);
  const [filteredEscrows, setFilteredEscrows] = useState<EscrowDashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowDashboardItem | null>(null);
  const [actionType, setActionType] = useState<'release' | 'refund' | 'hold' | null>(null);
  const [commissionPercent, setCommissionPercent] = useState<number>(2);
  const [refundReason, setRefundReason] = useState('');
  const [logs, setLogs] = useState<EscrowLog[]>([]);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);

  useEffect(() => {
    loadEscrows();
    const subscription = supabase
      .channel('escrow_dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_transactions' }, loadEscrows)
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let filtered = escrows;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.payer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.receiver_email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredEscrows(filtered);
  }, [escrows, statusFilter, searchQuery]);

  const loadEscrows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('escrow_dashboard').select('*');
      if (error) throw error;
      setEscrows((data || []) as EscrowDashboardItem[]);
    } catch (err: any) {
      toast.error('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (escrowId: string) => {
    try {
      const { data, error } = await supabase
        .from('escrow_logs')
        .select('*')
        .eq('escrow_id', escrowId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLogs((data || []) as EscrowLog[]);
      setLogsDialogOpen(true);
    } catch (err: any) {
      toast.error('Erreur lors du chargement des logs');
    }
  };

  const handleAction = async () => {
    if (!selectedEscrow || !actionType) return;
    
    try {
      if (actionType === 'release') {
        const { error } = await supabase.rpc('release_escrow', {
          p_escrow_id: selectedEscrow.id,
          p_commission_percent: commissionPercent
        });
        if (error) throw error;
        toast.success('Fonds libérés avec succès');
      } else if (actionType === 'refund') {
        const { error } = await supabase.rpc('refund_escrow', {
          p_escrow_id: selectedEscrow.id,
          p_reason: refundReason
        });
        if (error) throw error;
        toast.success('Remboursement effectué');
      } else if (actionType === 'hold') {
        const { error } = await supabase.rpc('dispute_escrow', {
          p_escrow_id: selectedEscrow.id
        });
        if (error) throw error;
        toast.success('Escrow mis en litige');
      }
      
      setSelectedEscrow(null);
      setActionType(null);
      setRefundReason('');
      await loadEscrows();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'action');
    }
  };

  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
    released: { label: 'Libéré', color: 'bg-green-500', icon: CheckCircle },
    refunded: { label: 'Remboursé', color: 'bg-blue-500', icon: XCircle },
    dispute: { label: 'Litige', color: 'bg-red-500', icon: AlertTriangle }
  };

  const stats = {
    total: escrows.length,
    pending: escrows.filter(e => e.status === 'pending').length,
    released: escrows.filter(e => e.status === 'released').length,
    totalAmount: escrows.reduce((sum, e) => sum + e.amount, 0),
    pendingAmount: escrows.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Escrow</h1>
          <p className="text-muted-foreground">Gérez toutes les transactions en séquestre</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Escrows</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString()} GNF</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente (montant)</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAmount.toLocaleString()} GNF</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Rechercher par commande, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="released">Libéré</SelectItem>
            <SelectItem value="refunded">Remboursé</SelectItem>
            <SelectItem value="dispute">Litige</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Escrows List */}
      <div className="grid gap-4">
        {filteredEscrows.map((escrow) => {
          const config = statusConfig[escrow.status as keyof typeof statusConfig];
          const StatusIcon = config.icon;
          
          return (
            <Card key={escrow.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Commande #{escrow.order_id}</CardTitle>
                    <CardDescription>
                      {escrow.payer_name} ({escrow.payer_email}) → {escrow.receiver_name} ({escrow.receiver_email})
                    </CardDescription>
                  </div>
                  <Badge className={`${config.color} text-white`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Montant</p>
                    <p className="font-semibold">{escrow.amount.toLocaleString()} {escrow.currency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Commission</p>
                    <p className="font-semibold">{escrow.commission_percent}% ({escrow.commission_amount} {escrow.currency})</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Créé</p>
                    <p className="font-semibold">
                      {formatDistanceToNow(new Date(escrow.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Libération auto</p>
                    <p className="font-semibold">
                      {escrow.available_to_release_at 
                        ? formatDistanceToNow(new Date(escrow.available_to_release_at), { addSuffix: true, locale: fr })
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadLogs(escrow.id)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Logs ({escrow.log_count})
                  </Button>
                  
                  {escrow.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setSelectedEscrow(escrow);
                          setActionType('release');
                        }}
                      >
                        Libérer
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedEscrow(escrow);
                          setActionType('refund');
                        }}
                      >
                        Rembourser
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedEscrow(escrow);
                          setActionType('hold');
                        }}
                      >
                        Litige
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!selectedEscrow && !!actionType} onOpenChange={() => {
        setSelectedEscrow(null);
        setActionType(null);
        setRefundReason('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'release' && 'Libérer les fonds'}
              {actionType === 'refund' && 'Rembourser'}
              {actionType === 'hold' && 'Mettre en litige'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {selectedEscrow && (
                <>
                  <p>Commande: #{selectedEscrow.order_id}</p>
                  <p>Montant: {selectedEscrow.amount.toLocaleString()} {selectedEscrow.currency}</p>
                  
                  {actionType === 'release' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Commission (%)</label>
                      <Input
                        type="number"
                        value={commissionPercent}
                        onChange={(e) => setCommissionPercent(Number(e.target.value))}
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Commission: {(selectedEscrow.amount * commissionPercent / 100).toLocaleString()} {selectedEscrow.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vendeur recevra: {(selectedEscrow.amount * (1 - commissionPercent / 100)).toLocaleString()} {selectedEscrow.currency}
                      </p>
                    </div>
                  )}
                  
                  {actionType === 'refund' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Raison du remboursement</label>
                      <Input
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="Expliquez la raison..."
                      />
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historique des actions</DialogTitle>
            <DialogDescription>Toutes les actions effectuées sur cet escrow</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold capitalize">{log.action.replace('_', ' ')}</p>
                        {log.note && <p className="text-sm text-muted-foreground">{log.note}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
