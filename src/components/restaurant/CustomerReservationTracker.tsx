/**
 * Suivi des rÃ©servations restaurant pour les clients
 * Permet de voir le statut, tÃ©lÃ©charger le reÃ§u et suivre la confirmation
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, Clock, Users, Check, X, AlertCircle, 
  Download, RefreshCw, MapPin, Phone, Receipt,
  CheckCircle2, Timer, Armchair, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Reservation {
  id: string;
  professional_service_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_number: string | null;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  special_requests: string | null;
  created_at: string;
  updated_at: string;
  payment_status?: string;
  payment_amount?: number;
  restaurant_name?: string;
}

interface CustomerReservationTrackerProps {
  reservationId?: string;
  customerEmail?: string;
  onClose?: () => void;
}

const statusConfig = {
  pending: {
    label: 'En attente',
    icon: Timer,
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    description: 'Votre rÃ©servation est en attente de confirmation par le restaurant'
  },
  confirmed: {
    label: 'ConfirmÃ©e',
    icon: CheckCircle2,
    color: 'text-primary-orange-600 bg-primary-orange-100 dark:bg-primary-orange-900/30',
    description: 'Le restaurant a confirmÃ© votre rÃ©servation'
  },
  seated: {
    label: 'InstallÃ©',
    icon: Armchair,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    description: 'Vous Ãªtes installÃ© Ã  votre table'
  },
  completed: {
    label: 'TerminÃ©e',
    icon: Check,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
    description: 'Merci pour votre visite !'
  },
  cancelled: {
    label: 'AnnulÃ©e',
    icon: XCircle,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    description: 'Cette rÃ©servation a Ã©tÃ© annulÃ©e'
  },
  no_show: {
    label: 'Absent',
    icon: X,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    description: 'Vous ne vous Ãªtes pas prÃ©sentÃ©'
  }
};

export function CustomerReservationTracker({ 
  reservationId, 
  customerEmail,
  onClose 
}: CustomerReservationTrackerProps) {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReservations = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('restaurant_reservations')
        .select(`
          *,
          professional_services:professional_service_id (
            service_name
          )
        `)
        .order('reservation_date', { ascending: false })
        .order('reservation_time', { ascending: false });

      if (reservationId) {
        query = query.eq('id', reservationId);
      } else if (customerEmail) {
        query = query.eq('customer_email', customerEmail);
      } else if (user?.email) {
        query = query.eq('customer_email', user.email);
      } else {
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedReservations = (data || []).map((r: any) => ({
        ...r,
        restaurant_name: r.professional_services?.service_name || 'Restaurant'
      }));

      setReservations(formattedReservations);
    } catch (err: any) {
      console.error('Erreur chargement rÃ©servations:', err);
      toast.error('Erreur lors du chargement des rÃ©servations');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
    toast.success('Statut mis Ã  jour');
  };

  const generateReceipt = (reservation: Reservation) => {
    // GÃ©nÃ©rer un reÃ§u simple en texte/HTML
    const receiptContent = `
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘          REÃ‡U DE RÃ‰SERVATION          â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘                                       â•‘
â•‘  Restaurant: ${reservation.restaurant_name?.padEnd(22)}â•‘
â•‘  Date: ${format(new Date(reservation.reservation_date), 'dd MMMM yyyy', { locale: fr }).padEnd(28)}â•‘
â•‘  Heure: ${reservation.reservation_time.padEnd(27)}â•‘
â•‘  Convives: ${reservation.party_size.toString().padEnd(24)}â•‘
â•‘  Table: ${(reservation.table_number || 'Ã€ dÃ©finir').padEnd(27)}â•‘
â•‘                                       â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  RÃ©servation au nom de:               â•‘
â•‘  ${reservation.customer_name.padEnd(36)}â•‘
â•‘                                       â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  Statut: ${statusConfig[reservation.status].label.padEnd(26)}â•‘
â•‘                                       â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  RÃ©fÃ©rence: ${reservation.id.substring(0, 8).toUpperCase().padEnd(23)}â•‘
â•‘  CrÃ©Ã©e le: ${format(new Date(reservation.created_at), 'dd/MM/yyyy HH:mm').padEnd(24)}â•‘
â•‘                                       â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

Merci d'avoir rÃ©servÃ© avec 224Solutions !
    `;

    // CrÃ©er un blob et tÃ©lÃ©charger
    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recu-reservation-${reservation.id.substring(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('ReÃ§u tÃ©lÃ©chargÃ© !');
  };

  useEffect(() => {
    loadReservations();
    
    // Ã‰couter les changements en temps rÃ©el
    const channel = supabase
      .channel('reservation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'restaurant_reservations',
          filter: reservationId ? `id=eq.${reservationId}` : undefined
        },
        (payload) => {
          console.log('RÃ©servation mise Ã  jour:', payload);
          loadReservations();
          toast.info('Statut de votre rÃ©servation mis Ã  jour !');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reservationId, customerEmail, user?.email]);

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-muted-foreground">Chargement de vos rÃ©servations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reservations.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Calendar className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Aucune rÃ©servation trouvÃ©e</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mes rÃ©servations</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {reservations.map((reservation) => {
        const status = statusConfig[reservation.status];
        const StatusIcon = status.icon;
        const isPast = new Date(`${reservation.reservation_date}T${reservation.reservation_time}`) < new Date();

        return (
          <Card 
            key={reservation.id}
            className={cn(
              "transition-all",
              reservation.status === 'confirmed' && "ring-2 ring-primary-orange-500/50",
              reservation.status === 'seated' && "ring-2 ring-blue-500/50"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{reservation.restaurant_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    RÃ©f: #{reservation.id.substring(0, 8).toUpperCase()}
                  </p>
                </div>
                <Badge className={cn("gap-1", status.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Info principale */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium text-sm">
                      {format(new Date(reservation.reservation_date), 'd MMM', { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Heure</p>
                    <p className="font-medium text-sm">{reservation.reservation_time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Convives</p>
                    <p className="font-medium text-sm">{reservation.party_size}</p>
                  </div>
                </div>
              </div>

              {/* Table assignÃ©e */}
              {reservation.table_number && (
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Table {reservation.table_number}</p>
                    <p className="text-xs text-muted-foreground">Votre table est prÃªte !</p>
                  </div>
                </div>
              )}

              {/* Statut description */}
              <div className={cn(
                "rounded-lg p-3 flex items-start gap-3",
                status.color.replace('text-', 'bg-').replace('-600', '-50')
              )}>
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{status.description}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateReceipt(reservation)}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  TÃ©lÃ©charger le reÃ§u
                </Button>

                {!isPast && reservation.status !== 'cancelled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: ImplÃ©menter l'annulation
                      toast.info('Veuillez contacter le restaurant pour annuler');
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                )}
              </div>

              {/* Demandes spÃ©ciales */}
              {reservation.special_requests && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Demandes spÃ©ciales</p>
                    <p className="text-sm">{reservation.special_requests}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
