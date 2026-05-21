import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Headphones, Search, Filter, Send, Clock, CheckCircle2,
  AlertTriangle, XCircle, MessageSquare, User, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  ticket_number: string | null;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  requester_id: string;
  vendor_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  is_internal: boolean;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  in_progress: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  waiting_response: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  closed: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  urgent: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const statusLabels: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  waiting_response: 'En attente',
  resolved: 'Résolu',
  closed: 'Fermé',
};

const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

const categoryLabels: Record<string, string> = {
  technique: 'Technique',
  facturation: 'Facturation',
  produit: 'Produit',
  livraison: 'Livraison',
  autre: 'Autre',
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'open') return <AlertTriangle className="w-4 h-4 text-blue-500" />;
  if (status === 'in_progress') return <Clock className="w-4 h-4 text-yellow-500" />;
  if (status === 'resolved') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === 'closed') return <XCircle className="w-4 h-4 text-gray-400" />;
  return <Clock className="w-4 h-4 text-orange-500" />;
};

export default function PDGSupportTechnique() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      console.error('Erreur chargement tickets PDG:', err);
      toast.error('Impossible de charger les tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      console.error('Erreur chargement messages:', err);
    }
  };

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setMessages([]);
    loadMessages(ticket.id);
    setDialogOpen(true);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket || !user) return;
    setSendingReply(true);
    try {
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          message: reply.trim(),
          is_internal: false,
        });

      if (error) throw error;

      // Passer en "in_progress" automatiquement si le ticket est ouvert
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', selectedTicket.id);
        setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: 'in_progress' } : t));
      }

      setReply('');
      loadMessages(selectedTicket.id);
      toast.success('Réponse envoyée');
    } catch (err: any) {
      toast.error('Erreur envoi réponse');
    } finally {
      setSendingReply(false);
    }
  };

  const changeStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    try {
      const extra: Record<string, string> = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'resolved') extra.resolved_at = new Date().toISOString();
      if (newStatus === 'closed') extra.closed_at = new Date().toISOString();

      const { error } = await supabase
        .from('support_tickets')
        .update(extra)
        .eq('id', selectedTicket.id);

      if (error) throw error;

      const updated = { ...selectedTicket, ...extra };
      setSelectedTicket(updated);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, ...extra } : t));
      toast.success(`Statut mis à jour : ${statusLabels[newStatus]}`);
    } catch (err: any) {
      toast.error('Erreur mise à jour statut');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filtered = tickets.filter(t => {
    const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
      (t.ticket_number || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  // Compteurs par statut
  const counts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    waiting: tickets.filter(t => t.status === 'waiting_response').length,
    urgent: tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed' && t.status !== 'resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-red-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Headphones className="w-6 h-6 text-orange-500" />
              </div>
              Centre d'Assistance Technique
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadTickets} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{counts.open}</p>
              <p className="text-xs text-blue-600/70 font-medium">Ouverts</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{counts.in_progress}</p>
              <p className="text-xs text-yellow-600/70 font-medium">En cours</p>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{counts.waiting}</p>
              <p className="text-xs text-orange-600/70 font-medium">En attente</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{counts.urgent}</p>
              <p className="text-xs text-red-600/70 font-medium">Urgents</p>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par sujet ou numéro..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(statusLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                {Object.entries(priorityLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des tickets */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-muted-foreground" />
            <span className="text-muted-foreground">Chargement des tickets...</span>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Headphones className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Aucun ticket trouvé</p>
            <p className="text-muted-foreground text-sm">
              {tickets.length === 0
                ? 'Aucun ticket de support créé pour le moment'
                : 'Modifiez vos filtres pour voir plus de tickets'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(ticket => (
            <Card
              key={ticket.id}
              className={cn(
                'cursor-pointer hover:shadow-md transition-all duration-200 border',
                ticket.priority === 'urgent' && ticket.status !== 'closed' && ticket.status !== 'resolved'
                  ? 'border-red-500/40 bg-red-500/5'
                  : 'hover:border-primary/30'
              )}
              onClick={() => openTicket(ticket)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <StatusIcon status={ticket.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold truncate">{ticket.subject}</span>
                        <Badge variant="outline" className={statusColors[ticket.status]}>
                          {statusLabels[ticket.status]}
                        </Badge>
                        <Badge variant="outline" className={priorityColors[ticket.priority]}>
                          {priorityLabels[ticket.priority]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="font-mono">{ticket.ticket_number || '—'}</span>
                        <span>{categoryLabels[ticket.category] || ticket.category}</span>
                        <span>{format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                      </div>
                    </div>
                  </div>
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog détail ticket */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Headphones className="w-5 h-5 text-orange-500" />
              <span>{selectedTicket?.ticket_number} — {selectedTicket?.subject}</span>
            </DialogTitle>
            {selectedTicket && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <Badge variant="outline" className={statusColors[selectedTicket.status]}>
                  {statusLabels[selectedTicket.status]}
                </Badge>
                <Badge variant="outline" className={priorityColors[selectedTicket.priority]}>
                  {priorityLabels[selectedTicket.priority]}
                </Badge>
                <Badge variant="outline">
                  {categoryLabels[selectedTicket.category] || selectedTicket.category}
                </Badge>
              </div>
            )}
          </DialogHeader>

          {selectedTicket && (
            <div className="flex flex-col flex-1 overflow-hidden gap-4">
              {/* Description du ticket */}
              <div className="bg-muted/30 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span className="text-xs">
                    Créé le {format(new Date(selectedTicket.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </span>
                </div>
                <p>{selectedTicket.description}</p>
              </div>

              {/* Changement de statut */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Changer le statut :</span>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(statusLabels)
                    .filter(([v]) => v !== selectedTicket.status)
                    .map(([v, l]) => (
                      <Button
                        key={v}
                        size="sm"
                        variant="outline"
                        className={cn('text-xs h-7', statusColors[v])}
                        onClick={() => changeStatus(v)}
                        disabled={updatingStatus}
                      >
                        {l}
                      </Button>
                    ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 px-1 min-h-[200px] max-h-[300px] bg-muted/20 rounded-lg p-3">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Aucun message pour ce ticket
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.sender_id === user?.id ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] rounded-lg p-3 text-sm',
                          msg.sender_id === user?.id
                            ? 'bg-orange-500 text-white'
                            : 'bg-background border'
                        )}
                      >
                        <p>{msg.message}</p>
                        <p className="text-xs opacity-60 mt-1">
                          {format(new Date(msg.created_at), 'dd MMM à HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Champ de réponse — masqué si ticket fermé */}
              {selectedTicket.status !== 'closed' && (
                <div className="flex gap-2">
                  <Textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Votre réponse au vendeur..."
                    rows={3}
                    className="flex-1"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                  <Button
                    onClick={sendReply}
                    disabled={!reply.trim() || sendingReply}
                    className="h-auto bg-orange-500 hover:bg-orange-600"
                  >
                    {sendingReply ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
