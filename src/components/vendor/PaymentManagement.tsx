import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePaymentLinks } from "@/hooks/usePaymentLinks";
import { CreditCard, AlertTriangle, CheckCircle, Clock, Filter, Download } from "lucide-react";
import { useState, useMemo } from "react";
import EscrowManagementDialog from "./EscrowManagementDialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  success: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-gray-100 text-gray-800',
  failed: 'bg-red-100 text-red-800'
};

const statusLabels = {
  pending: 'En attente',
  success: 'Payé',
  overdue: 'En retard',
  expired: 'Expiré',
  cancelled: 'Annulé',
  failed: 'Échoué'
};

export default function PaymentManagement() {
  const { paymentLinks, loading, stats } = usePaymentLinks();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [escrowDialogOpen, setEscrowDialogOpen] = useState(false);

  // Calculer les statuts dynamiques basés sur le temps
  const linksWithStatus = useMemo(() => {
    return paymentLinks.map(link => {
      if (link.status === 'pending') {
        const createdAt = new Date(link.created_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        // Si plus de 24h, considérer comme en retard
        if (hoursDiff > 24) {
          return { ...link, displayStatus: 'overdue' as const };
        }
      }
      return { ...link, displayStatus: link.status };
    });
  }, [paymentLinks]);

  const filteredLinks = linksWithStatus.filter(link => {
    const matchesStatus = filterStatus === 'all' || link.displayStatus === filterStatus;
    const matchesSearch = !searchTerm || 
      link.produit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const overdueCount = linksWithStatus.filter(l => l.displayStatus === 'overdue').length;
  const pendingCount = linksWithStatus.filter(l => l.displayStatus === 'pending').length;
  const successCount = linksWithStatus.filter(l => l.displayStatus === 'success').length;
  const totalRevenue = linksWithStatus
    .filter(l => l.displayStatus === 'success')
    .reduce((sum, l) => sum + l.montant, 0); // Utiliser montant au lieu de total

  const overdueAmount = linksWithStatus
    .filter(l => l.displayStatus === 'overdue')
    .reduce((sum, l) => sum + l.montant, 0);
  const pendingAmount = linksWithStatus
    .filter(l => l.displayStatus === 'pending')
    .reduce((sum, l) => sum + l.montant, 0);

  if (loading) {
    return <div className="p-4">Chargement des données de paiement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Paiements</h2>
          <p className="text-muted-foreground">Suivez vos liens de paiement et leur statut</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button onClick={() => setEscrowDialogOpen(true)}>Escrow</Button>
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
                <p className="text-2xl font-bold">{overdueCount}</p>
                <p className="text-sm text-red-600">{overdueAmount.toFixed(0)} GNF</p>
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
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-orange-600">{pendingAmount.toFixed(0)} GNF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Paiements réussis</p>
                <p className="text-2xl font-bold">{successCount}</p>
                <p className="text-sm text-green-600">Total payé</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Revenu total</p>
                <p className="text-2xl font-bold">{totalRevenue.toFixed(0)}</p>
                <p className="text-sm text-blue-600">GNF</p>
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
              placeholder="Rechercher un paiement..."
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
              <option value="success">Payés</option>
              <option value="expired">Expirés</option>
              <option value="cancelled">Annulés</option>
            </select>
            <Filter className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Liste des paiements */}
      <Card>
        <CardHeader>
          <CardTitle>Liens de paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLinks.map((link) => (
              <Card key={link.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium">
                        {link.produit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {link.payment_id}
                      </p>
                      {link.client && (
                        <p className="text-xs text-muted-foreground">
                          Client: {link.client.name} ({link.client.email})
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[link.displayStatus]}>
                          {statusLabels[link.displayStatus]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Créé {formatDistanceToNow(new Date(link.created_at), { 
                            addSuffix: true,
                            locale: fr 
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-lg font-bold">{link.montant.toFixed(0)} GNF</p>
                      <p className="text-xs text-muted-foreground">
                        Montant du produit
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredLinks.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Aucun paiement trouvé
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <EscrowManagementDialog 
        open={escrowDialogOpen} 
        onOpenChange={setEscrowDialogOpen} 
      />
    </div>
  );
}
