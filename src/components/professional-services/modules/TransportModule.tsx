/**
 * MODULE VOYAGE / TOURISME PROFESSIONNEL
 * InspirÃ© de: Booking.com, Expedia, TripAdvisor
 * Gestion agence de voyage: destinations, rÃ©servations, billets
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Plane, MapPin, Hotel, Users, Calendar, Clock,
  Plus, DollarSign, TrendingUp, Star, Globe,
  Ticket, Palmtree, Ship, Car, CheckCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface TransportModuleProps {
  serviceId: string;
  businessName?: string;
}

interface Destination {
  id: string;
  name: string;
  country: string;
  type: 'vol' | 'hotel' | 'package' | 'excursion';
  price: number;
  duration: string;
  image?: string;
  rating: number;
  bookings: number;
  available: boolean;
}

interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  destination: string;
  travelDate: string;
  passengers: number;
  total: number;
  status: 'confirme' | 'en_attente' | 'annule' | 'termine';
  paymentStatus: 'paye' | 'partiel' | 'impaye';
}

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  vol: { label: 'Vol', icon: 'âœˆï¸', color: 'bg-blue-100 text-blue-800' },
  hotel: { label: 'HÃ´tel', icon: 'ðŸ¨', color: 'bg-purple-100 text-purple-800' },
  package: { label: 'Package', icon: 'ðŸ“¦', color: 'bg-primary-orange-100 text-primary-orange-800' },
  excursion: { label: 'Excursion', icon: 'ðŸ—ºï¸', color: 'bg-amber-100 text-amber-800' },
};

const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
  confirme: { label: 'ConfirmÃ©', color: 'bg-primary-orange-100 text-primary-orange-800' },
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  annule: { label: 'AnnulÃ©', color: 'bg-red-100 text-red-800' },
  termine: { label: 'TerminÃ©', color: 'bg-muted text-muted-foreground' },
};

export function TransportModule({ serviceId, businessName }: TransportModuleProps) {
  const [activeTab, setActiveTab] = useState('destinations');
  const [showNewBooking, setShowNewBooking] = useState(false);

  const [destinations] = useState<Destination[]>([
    { id: '1', name: 'Conakry â†’ Dakar', country: 'SÃ©nÃ©gal', type: 'vol', price: 2500000, duration: '1h30', rating: 4.5, bookings: 45, available: true },
    { id: '2', name: 'Conakry â†’ Abidjan', country: 'CÃ´te d\'Ivoire', type: 'vol', price: 3200000, duration: '2h', rating: 4.3, bookings: 38, available: true },
    { id: '3', name: 'SÃ©jour ÃŽle de Loos', country: 'GuinÃ©e', type: 'package', price: 850000, duration: '3 jours', rating: 4.8, bookings: 22, available: true },
    { id: '4', name: 'Conakry â†’ Paris CDG', country: 'France', type: 'vol', price: 8500000, duration: '6h30', rating: 4.2, bookings: 67, available: true },
    { id: '5', name: 'HÃ´tel Riviera Conakry', country: 'GuinÃ©e', type: 'hotel', price: 450000, duration: 'par nuit', rating: 4.6, bookings: 120, available: true },
    { id: '6', name: 'Excursion Fouta Djallon', country: 'GuinÃ©e', type: 'excursion', price: 1200000, duration: '5 jours', rating: 4.9, bookings: 15, available: true },
  ]);

  const [bookings] = useState<Booking[]>([
    { id: '1', clientName: 'Mamadou Diallo', clientPhone: '+224 621 00 00 00', destination: 'Conakry â†’ Paris CDG', travelDate: '2026-04-15', passengers: 2, total: 17000000, status: 'confirme', paymentStatus: 'paye' },
    { id: '2', clientName: 'Fatou Bah', clientPhone: '+224 622 00 00 00', destination: 'SÃ©jour ÃŽle de Loos', travelDate: '2026-03-25', passengers: 4, total: 3400000, status: 'en_attente', paymentStatus: 'partiel' },
    { id: '3', clientName: 'Ibrahim Camara', clientPhone: '+224 623 00 00 00', destination: 'Conakry â†’ Dakar', travelDate: '2026-03-22', passengers: 1, total: 2500000, status: 'confirme', paymentStatus: 'paye' },
  ]);

  // Stats
  const totalDestinations = destinations.length;
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirme').length;
  const totalRevenue = bookings.filter(b => b.paymentStatus === 'paye').reduce((acc, b) => acc + b.total, 0);
  const pendingRevenue = bookings.filter(b => b.paymentStatus !== 'paye').reduce((acc, b) => acc + b.total, 0);
  const avgRating = destinations.reduce((acc, d) => acc + d.rating, 0) / destinations.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{businessName || 'Agence de Voyage'}</h2>
            <p className="text-muted-foreground">Billets, sÃ©jours & excursions</p>
          </div>
        </div>
        <Dialog open={showNewBooking} onOpenChange={setShowNewBooking}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> RÃ©servation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nouvelle rÃ©servation</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Client</Label><Input placeholder="Nom complet" /></div>
                <div className="space-y-2"><Label>TÃ©lÃ©phone</Label><Input placeholder="+224 6XX" /></div>
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Select><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.id}>{TYPE_LABELS[d.type].icon} {d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date de voyage</Label><Input type="date" /></div>
                <div className="space-y-2"><Label>Passagers</Label><Input type="number" placeholder="1" /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Infos complÃ©mentaires..." /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewBooking(false)}>Annuler</Button>
              <Button onClick={() => { toast.success('RÃ©servation crÃ©Ã©e'); setShowNewBooking(false); }}>RÃ©server</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <Globe className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{totalDestinations}</p>
            <p className="text-xs opacity-80">Destinations</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br bg-primary-blue-600 text-white">
          <CardContent className="p-4">
            <Ticket className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{confirmedBookings}</p>
            <p className="text-xs opacity-80">RÃ©servations confirmÃ©es</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
          <CardContent className="p-4">
            <Users className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{bookings.reduce((acc, b) => acc + b.passengers, 0)}</p>
            <p className="text-xs opacity-80">Passagers</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <Star className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{avgRating.toFixed(1)}</p>
            <p className="text-xs opacity-80">Note moyenne</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br bg-primary-orange-600 text-white">
          <CardContent className="p-4">
            <DollarSign className="h-4 w-4 opacity-80" />
            <p className="text-lg font-bold mt-1">{(totalRevenue / 1e6).toFixed(1)}M</p>
            <p className="text-xs opacity-80">Revenus GNF</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white">
          <CardContent className="p-4">
            <Clock className="h-4 w-4 opacity-80" />
            <p className="text-lg font-bold mt-1">{(pendingRevenue / 1e6).toFixed(1)}M</p>
            <p className="text-xs opacity-80">En attente GNF</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="destinations"><Globe className="h-4 w-4 mr-1 hidden sm:inline" /> Destinations</TabsTrigger>
          <TabsTrigger value="bookings"><Ticket className="h-4 w-4 mr-1 hidden sm:inline" /> RÃ©servations</TabsTrigger>
          <TabsTrigger value="clients"><Users className="h-4 w-4 mr-1 hidden sm:inline" /> Voyageurs</TabsTrigger>
        </TabsList>

        {/* DESTINATIONS */}
        <TabsContent value="destinations" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map(dest => {
              const type = TYPE_LABELS[dest.type];
              return (
                <Card key={dest.id} className="hover:shadow-md transition-shadow cursor-pointer group overflow-hidden">
                  <div className="h-24 bg-gradient-to-br from-sky-100 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/10 flex items-center justify-center">
                    <span className="text-4xl group-hover:scale-110 transition-transform">{type.icon}</span>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h4 className="font-bold text-sm">{dest.name}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {dest.country} â€¢ {dest.duration}
                        </p>
                      </div>
                      <Badge className={type.color}>{type.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-medium">{dest.rating}</span>
                        <span className="text-xs text-muted-foreground">({dest.bookings})</span>
                      </div>
                      <p className="font-bold text-primary">{dest.price.toLocaleString()} GNF</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* RÃ‰SERVATIONS */}
        <TabsContent value="bookings" className="space-y-4">
          <h3 className="font-semibold">RÃ©servations ({bookings.length})</h3>
          <div className="space-y-3">
            {bookings.map(booking => {
              const st = BOOKING_STATUS[booking.status];
              return (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{booking.clientName}</h4>
                          <Badge className={st.color}>{st.label}</Badge>
                          <Badge variant="outline" className="text-xs">
                            {booking.paymentStatus === 'paye' ? 'âœ… PayÃ©' : booking.paymentStatus === 'partiel' ? 'â³ Partiel' : 'âŒ ImpayÃ©'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Plane className="w-3 h-3 inline" /> {booking.destination}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ðŸ“… {booking.travelDate} â€¢ ðŸ‘¥ {booking.passengers} passager(s)
                        </p>
                      </div>
                      <p className="font-bold text-primary">{booking.total.toLocaleString()} GNF</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* VOYAGEURS */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Fichier voyageurs</CardTitle>
              <CardDescription>Historique et prÃ©fÃ©rences de vos clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">{b.clientName[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{b.clientName}</p>
                        <p className="text-xs text-muted-foreground">{b.clientPhone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{b.total.toLocaleString()} GNF</p>
                      <p className="text-xs text-muted-foreground">{b.passengers} voyage(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
