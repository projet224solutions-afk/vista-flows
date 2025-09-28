import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupportTickets } from "@/hooks/useVendorData";
import { MessageSquare, AlertCircle, Clock, CheckCircle, User, Package, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const statusColors = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_customer: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
};

const priorityLabels = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente'
};

const statusLabels = {
  open: 'Ouvert',
  in_progress: 'En cours',
  waiting_customer: 'Attente client',
  resolved: 'Résolu',
  closed: 'Fermé'
};

export default function SupportTickets() {
  const { tickets, loading, error, updateTicketStatus } = useSupportTickets();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolution, setResolution] = useState('');

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
    const matchesSearch = !searchTerm ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const openTickets = tickets.filter(t => t.status === 'open');
  const urgentTickets = tickets.filter(t => t.priority === 'urgent');
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress');
  const resolvedToday = tickets.filter(t =>
    t.status === 'resolved' &&
    new Date(t.created_at).toDateString() === new Date().toDateString()
  );

  const handleStatusUpdate = async (ticketId: string, newStatus: unknown) => {
    try {
      await updateTicketStatus(ticketId, newStatus);
      toast({
        title: "Statut mis à jour",
        description: "Le statut du ticket a été mis à jour avec succès."
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket || !resolution.trim()) return;

    try {
      // This would need a separate API call to update resolution
      await handleStatusUpdate(selectedTicket.id, 'resolved');
      toast({
        title: "Ticket résolu",
        description: "Le ticket a été marqué comme résolu."
      });
      setSelectedTicket(null);
      setResolution('');
    } catch (error) {
      // Error handled above
    }
  };

  if (loading) return <div className="p-4">Chargement des tickets de support...</div>;
  if (error) return <div className="p-4 text-red-600">Erreur: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Support Client</h2>
          <p className="text-muted-foreground">Gérez les demandes et réclamations de vos clients</p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Tickets ouverts</p>
                <p className="text-2xl font-bold">{openTickets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold">{inProgressTickets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-600 rounded-full animate-pulse" />
              <div>
                <p className="text-sm text-muted-foreground">Urgents</p>
                <p className="text-2xl font-bold text-red-600">{urgentTickets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Résolus aujourd'hui</p>
                <p className="text-2xl font-bold">{resolvedToday.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center flex-wrap">
            <Input
              placeholder="Rechercher un ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="open">Ouverts</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="waiting_customer">Attente client</SelectItem>
                <SelectItem value="resolved">Résolus</SelectItem>
                <SelectItem value="closed">Fermés</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="low">Faible</SelectItem>
              </SelectContent>
            </Select>
            <Filter className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Liste des tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Tickets de support ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{ticket.subject}</h4>
                      <Badge className={priorityColors[ticket.priority]}>
                        {priorityLabels[ticket.priority]}
                      </Badge>
                      <Badge className={statusColors[ticket.status]}>
                        {statusLabels[ticket.status]}
                      </Badge>
                    </div>
                    {ticket.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {ticket.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Client: {ticket.customer?.user_id || 'N/A'}
                      </span>
                      {ticket.product && (
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {ticket.product.name}
                        </span>
                      )}
                      <span>
                        {new Date(ticket.created_at).toLocaleDateString('fr-FR')} à {new Date(ticket.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {ticket.status === 'open' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(ticket.id, 'in_progress')}
                      >
                        Prendre en charge
                      </Button>
                    )}
                    {ticket.status === 'in_progress' && (
                      <>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTicket(ticket)}
                            >
                              Résoudre
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Résoudre le ticket</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">{ticket.subject}</h4>
                                <p className="text-sm text-muted-foreground">{ticket.description}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Solution apportée</label>
                                <Textarea
                                  value={resolution}
                                  onChange={(e) => setResolution(e.target.value)}
                                  placeholder="Décrivez la solution apportée au problème..."
                                  rows={4}
                                  className="mt-1"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleResolveTicket} className="flex-1">
                                  Marquer comme résolu
                                </Button>
                                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(ticket.id, 'waiting_customer')}
                        >
                          Attente client
                        </Button>
                      </>
                    )}
                    {ticket.status === 'waiting_customer' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(ticket.id, 'in_progress')}
                      >
                        Reprendre
                      </Button>
                    )}
                    {ticket.status === 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(ticket.id, 'closed')}
                      >
                        Fermer
                      </Button>
                    )}
                  </div>
                </div>

                {ticket.resolution && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <p className="text-sm"><strong>Solution:</strong> {ticket.resolution}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredTickets.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun ticket trouvé</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'Aucun ticket ne correspond aux critères de recherche.'
                  : 'Aucun ticket de support pour le moment. Excellent travail !'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}