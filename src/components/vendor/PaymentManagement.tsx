import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { initiateEscrow, releaseEscrow, refundEscrow } from '@/services/EscrowClient';
import { usePaymentSchedules, useCustomerCredits } from "@/hooks/useVendorData";
import { CreditCard, AlertTriangle, CheckCircle, Clock, Filter, Download } from "lucide-react";
import { useState } from "react";

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const statusLabels = {
  pending: 'En attente',
  paid: 'Payé',
  overdue: 'En retard',
  cancelled: 'Annulé'
};

export default function PaymentManagement() {
  const { schedules, loading: schedulesLoading, error: schedulesError } = usePaymentSchedules();
  const { credits, loading: creditsLoading, error: creditsError } = useCustomerCredits();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSchedules = schedules.filter(schedule => {
    const matchesStatus = filterStatus === 'all' || schedule.status === filterStatus;
    const matchesSearch = !searchTerm || 
      schedule.order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const overduepayments = schedules.filter(s => s.status === 'overdue');
  const pendingPayments = schedules.filter(s => s.status === 'pending');
  const totalOverdueAmount = overduepayments.reduce((acc, p) => acc + p.amount, 0);
  const totalPendingAmount = pendingPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalCreditUsed = credits.reduce((acc, c) => acc + c.current_balance, 0);
  const totalCreditLimit = credits.reduce((acc, c) => acc + c.credit_limit, 0);

  if (schedulesLoading || creditsLoading) {
    return <div className="p-4">Chargement des données de paiement...</div>;
  }

  if (schedulesError || creditsError) {
    return (
      <div className="p-4 text-red-600">
        Erreur: {schedulesError || creditsError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Paiements</h2>
          <p className="text-muted-foreground">Suivez les paiements, crédits clients et échéances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button onClick={() => toast.info('Utilisez les actions escrow sur les commandes')}>Escrow</Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Paiements en retard</p>
                <p className="text-2xl font-bold">{overduepayments.length}</p>
                <p className="text-sm text-red-600">{totalOverdueAmount.toLocaleString()} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{pendingPayments.length}</p>
                <p className="text-sm text-orange-600">{totalPendingAmount.toLocaleString()} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Crédit utilisé</p>
                <p className="text-2xl font-bold">{totalCreditUsed.toLocaleString()}</p>
                <p className="text-sm text-blue-600">sur {totalCreditLimit.toLocaleString()} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Clients avec crédit</p>
                <p className="text-2xl font-bold">{credits.length}</p>
                <p className="text-sm text-green-600">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Rechercher par numéro de commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="overdue">En retard</option>
              <option value="paid">Payés</option>
              <option value="cancelled">Annulés</option>
            </select>
            <Filter className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Échéances de paiement */}
      <Card>
        <CardHeader>
          <CardTitle>Échéances de paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSchedules.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">
                      {schedule.order?.order_number || 'N/A'}
                    </h4>
                    <Badge className={statusColors[schedule.status]}>
                      {statusLabels[schedule.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Échéance: {new Date(schedule.due_date).toLocaleDateString('fr-FR')}
                  </p>
                  {schedule.payment_method && (
                    <p className="text-xs text-muted-foreground">
                      Méthode: {schedule.payment_method}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">{schedule.amount.toLocaleString()} FCFA</p>
                  {schedule.status === 'overdue' && (
                    <p className="text-sm text-red-600">
                      Retard: {Math.floor((Date.now() - new Date(schedule.due_date).getTime()) / (1000 * 60 * 60 * 24))} jours
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  {schedule.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline">
                        Marquer payé
                      </Button>
                      <Button size="sm" variant="outline">
                        Relancer
                      </Button>
                    </>
                  )}
                  {schedule.status === 'overdue' && (
                    <Button size="sm" variant="destructive">
                      Relance urgente
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredSchedules.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun paiement trouvé</h3>
              <p className="text-muted-foreground">
                {filterStatus !== 'all' ? 'Aucun paiement ne correspond aux filtres sélectionnés.' : 'Aucune échéance de paiement programmée.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gestion des crédits clients */}
      <Card>
        <CardHeader>
          <CardTitle>Crédits clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {credits.map((credit) => (
              <div key={credit.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">Client ID: {credit.customer?.user_id || 'N/A'}</h4>
                  <p className="text-sm text-muted-foreground">
                    Conditions: {credit.payment_terms} jours
                  </p>
                  {credit.is_blocked && (
                    <Badge variant="destructive" className="mt-1">Bloqué</Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {credit.current_balance.toLocaleString()} / {credit.credit_limit.toLocaleString()} FCFA
                  </p>
                  <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full ${
                        (credit.current_balance / credit.credit_limit) > 0.8 ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min((credit.current_balance / credit.credit_limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="outline">
                    Modifier limite
                  </Button>
                  {credit.is_blocked ? (
                    <Button size="sm" variant="outline">
                      Débloquer
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive">
                      Bloquer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {credits.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun crédit client</h3>
              <p className="text-muted-foreground">
                Aucun client n'a de crédit configuré pour le moment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}