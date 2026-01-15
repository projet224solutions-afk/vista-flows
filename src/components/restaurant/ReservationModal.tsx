/**
 * Modal de réservation restaurant professionnel
 * Inspiré des systèmes OpenTable, TheFork, et des restaurants étoilés Michelin
 * Experience utilisateur premium avec sélection de date, heure, et préférences
 */

import { useState, useEffect } from 'react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, Users, Phone, Mail, User, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRestaurantReservations, TimeSlot, ReservationFormData } from '@/hooks/useRestaurantReservations';
import { useAuth } from '@/hooks/useAuth';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  restaurantName: string;
  restaurantPhone?: string;
}

type Step = 'guests' | 'datetime' | 'details' | 'confirmation';

export function ReservationModal({
  isOpen,
  onClose,
  serviceId,
  restaurantName,
  restaurantPhone
}: ReservationModalProps) {
  const { user } = useAuth();
  const { createReservation, checkAvailability } = useRestaurantReservations(serviceId);
  
  const [step, setStep] = useState<Step>('guests');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Form data
  const [partySize, setPartySize] = useState(2);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  
  // Confirmation data
  const [confirmationData, setConfirmationData] = useState<any>(null);

  // Préremplir avec les infos de l'utilisateur connecté
  useEffect(() => {
    if (user) {
      setCustomerEmail(user.email || '');
    }
  }, [user]);

  // Charger les créneaux quand la date change
  useEffect(() => {
    if (selectedDate && serviceId) {
      loadTimeSlots();
    }
  }, [selectedDate, partySize]);

  const loadTimeSlots = async () => {
    if (!selectedDate) return;
    
    setLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const slots = await checkAvailability(dateStr, partySize);
      setTimeSlots(slots);
    } catch (error) {
      console.error('Erreur chargement créneaux:', error);
      toast.error('Erreur lors du chargement des disponibilités');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !customerName) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSubmitting(true);
    try {
      const reservationData: ReservationFormData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        party_size: partySize,
        reservation_date: format(selectedDate, 'yyyy-MM-dd'),
        reservation_time: selectedTime,
        special_requests: specialRequests || undefined,
      };

      const result = await createReservation(reservationData);
      
      if (result) {
        setConfirmationData(result);
        setStep('confirmation');
        toast.success('Réservation confirmée !');
      }
    } catch (error: any) {
      console.error('Erreur création réservation:', error);
      toast.error(error.message || 'Erreur lors de la réservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('guests');
    setPartySize(2);
    setSelectedDate(undefined);
    setSelectedTime('');
    setCustomerName('');
    setCustomerPhone('');
    setSpecialRequests('');
    setConfirmationData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Séparer les créneaux midi et soir
  const lunchSlots = timeSlots.filter(s => {
    const hour = parseInt(s.time.split(':')[0]);
    return hour >= 11 && hour < 15;
  });

  const dinnerSlots = timeSlots.filter(s => {
    const hour = parseInt(s.time.split(':')[0]);
    return hour >= 18 && hour <= 22;
  });

  const renderStep = () => {
    switch (step) {
      case 'guests':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Combien de convives ?</h3>
              <p className="text-muted-foreground mt-1">Sélectionnez le nombre de personnes</p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                <Button
                  key={num}
                  variant={partySize === num ? 'default' : 'outline'}
                  className={cn(
                    'h-16 text-lg font-semibold transition-all',
                    partySize === num && 'ring-2 ring-primary ring-offset-2'
                  )}
                  onClick={() => setPartySize(num)}
                >
                  {num}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center mt-4">
              <AlertCircle className="w-4 h-4" />
              <span>Pour plus de 8 personnes, veuillez nous appeler</span>
            </div>

            <Button 
              className="w-full h-12 text-lg" 
              onClick={() => setStep('datetime')}
            >
              Continuer
            </Button>
          </div>
        );

      case 'datetime':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold">Choisissez date et heure</h3>
              <p className="text-muted-foreground">{partySize} {partySize > 1 ? 'personnes' : 'personne'}</p>
            </div>

            {/* Sélection de la date */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-12',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate 
                      ? format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })
                      : 'Sélectionner une date'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => 
                      isBefore(date, startOfDay(new Date())) || 
                      isBefore(addDays(new Date(), 60), date)
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Créneaux horaires */}
            {selectedDate && (
              <div className="space-y-4">
                {loadingSlots ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="text-muted-foreground mt-2">Recherche des disponibilités...</p>
                  </div>
                ) : (
                  <>
                    {/* Service du midi */}
                    {lunchSlots.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                          <span className="text-lg">🌞</span> Service du midi
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                          {lunchSlots.map(slot => (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? 'default' : 'outline'}
                              className={cn(
                                'h-10 text-sm',
                                !slot.available && 'opacity-50 cursor-not-allowed',
                                selectedTime === slot.time && 'ring-2 ring-primary ring-offset-1'
                              )}
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.time)}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Service du soir */}
                    {dinnerSlots.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                          <span className="text-lg">🌙</span> Service du soir
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                          {dinnerSlots.map(slot => (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? 'default' : 'outline'}
                              className={cn(
                                'h-10 text-sm',
                                !slot.available && 'opacity-50 cursor-not-allowed',
                                selectedTime === slot.time && 'ring-2 ring-primary ring-offset-1'
                              )}
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.time)}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12" 
                onClick={() => setStep('guests')}
              >
                Retour
              </Button>
              <Button 
                className="flex-1 h-12" 
                onClick={() => setStep('details')}
                disabled={!selectedDate || !selectedTime}
              >
                Continuer
              </Button>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold">Vos coordonnées</h3>
              <p className="text-muted-foreground">
                {format(selectedDate!, 'EEEE d MMMM', { locale: fr })} à {selectedTime}
              </p>
            </div>

            {/* Récapitulatif */}
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-4">
              <Badge variant="secondary" className="h-10 px-4">
                <Users className="w-4 h-4 mr-2" />
                {partySize} pers.
              </Badge>
              <Badge variant="secondary" className="h-10 px-4">
                <Calendar className="w-4 h-4 mr-2" />
                {format(selectedDate!, 'd MMM', { locale: fr })}
              </Badge>
              <Badge variant="secondary" className="h-10 px-4">
                <Clock className="w-4 h-4 mr-2" />
                {selectedTime}
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nom complet *
                </Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="h-12 mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Téléphone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="h-12 mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="jean@exemple.com"
                  className="h-12 mt-1"
                />
              </div>

              <div>
                <Label htmlFor="requests" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Demandes spéciales (optionnel)
                </Label>
                <Textarea
                  id="requests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Anniversaire, allergies, préférences de table..."
                  className="mt-1 min-h-[80px]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12" 
                onClick={() => setStep('datetime')}
              >
                Retour
              </Button>
              <Button 
                className="flex-1 h-12" 
                onClick={handleSubmit}
                disabled={!customerName || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Confirmation...
                  </>
                ) : (
                  'Confirmer la réservation'
                )}
              </Button>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className="space-y-6 text-center py-4">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                Réservation confirmée !
              </h3>
              <p className="text-muted-foreground mt-2">
                Votre table vous attend chez {restaurantName}
              </p>
            </div>

            <div className="bg-muted/50 rounded-xl p-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Date</span>
                <span className="font-semibold">
                  {format(selectedDate!, 'EEEE d MMMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Heure</span>
                <span className="font-semibold">{selectedTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Convives</span>
                <span className="font-semibold">{partySize} personne{partySize > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Nom</span>
                <span className="font-semibold">{customerName}</span>
              </div>
            </div>

            {restaurantPhone && (
              <p className="text-sm text-muted-foreground">
                Besoin de modifier ? Appelez le <a href={`tel:${restaurantPhone}`} className="text-primary underline">{restaurantPhone}</a>
              </p>
            )}

            <Button 
              className="w-full h-12" 
              onClick={handleClose}
            >
              Terminé
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Réserver chez {restaurantName}
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        {step !== 'confirmation' && (
          <div className="flex gap-1 mb-4">
            {['guests', 'datetime', 'details'].map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  ['guests', 'datetime', 'details'].indexOf(step) >= i
                    ? 'bg-primary'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>
        )}

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
