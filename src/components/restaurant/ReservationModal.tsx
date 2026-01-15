/**
 * Modal de réservation restaurant professionnel
 * Inspiré des systèmes OpenTable, TheFork, et des restaurants étoilés Michelin
 * Experience utilisateur premium avec sélection de date, heure, menu et paiement
 */

import { useState, useEffect } from 'react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, Clock, Users, Phone, Mail, User, Sparkles, Check, AlertCircle,
  UtensilsCrossed, CreditCard, ShoppingCart, Plus, Minus, Trash2, ChevronRight,
  Flame, Leaf, Info
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRestaurantReservations, TimeSlot, ReservationFormData } from '@/hooks/useRestaurantReservations';
import { useRestaurantMenu, MenuItem, MenuCategory } from '@/hooks/useRestaurantMenu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  restaurantName: string;
  restaurantPhone?: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

type Step = 'guests' | 'datetime' | 'menu' | 'details' | 'payment' | 'confirmation';

export function ReservationModal({
  isOpen,
  onClose,
  serviceId,
  restaurantName,
  restaurantPhone
}: ReservationModalProps) {
  const { user } = useAuth();
  const { createReservation, checkAvailability } = useRestaurantReservations(serviceId);
  const { categories, menuItems, loading: menuLoading } = useRestaurantMenu(serviceId);
  
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
  
  // Menu / Précommande
  const [wantToPreorder, setWantToPreorder] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Paiement
  const [wantToPrepay, setWantToPrepay] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  
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

  // Fonctions panier
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c => 
          c.menuItem.id === item.id 
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(c => 
          c.menuItem.id === itemId 
            ? { ...c, quantity: c.quantity - 1 }
            : c
        );
      }
      return prev.filter(c => c.menuItem.id !== itemId);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filtrer les plats
  const filteredMenuItems = selectedCategory === 'all' 
    ? menuItems.filter(i => i.is_available)
    : menuItems.filter(i => i.is_available && i.category_id === selectedCategory);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !customerName) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSubmitting(true);
    try {
      // Préparer les données de précommande
      const preorderData = wantToPreorder && cart.length > 0 
        ? JSON.stringify(cart.map(c => ({
            item_id: c.menuItem.id,
            name: c.menuItem.name,
            quantity: c.quantity,
            unit_price: c.menuItem.price,
            total: c.menuItem.price * c.quantity
          })))
        : null;

      const reservationData: ReservationFormData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        party_size: partySize,
        reservation_date: format(selectedDate, 'yyyy-MM-dd'),
        reservation_time: selectedTime,
        special_requests: specialRequests 
          ? (preorderData 
            ? `${specialRequests}\n\n--- Précommande ---\n${cart.map(c => `${c.quantity}x ${c.menuItem.name}`).join(', ')}\nTotal: ${cartTotal.toLocaleString()} GNF`
            : specialRequests)
          : (preorderData 
            ? `--- Précommande ---\n${cart.map(c => `${c.quantity}x ${c.menuItem.name}`).join(', ')}\nTotal: ${cartTotal.toLocaleString()} GNF`
            : undefined),
      };

      const result = await createReservation(reservationData);
      
      if (result) {
        setConfirmationData({
          ...result,
          preorder: wantToPreorder ? cart : null,
          preorderTotal: cartTotal
        });
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
    setCart([]);
    setWantToPreorder(false);
    setWantToPrepay(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Navigation entre étapes
  const goToNextStep = () => {
    switch (step) {
      case 'guests': setStep('datetime'); break;
      case 'datetime': setStep('menu'); break;
      case 'menu': setStep('details'); break;
      case 'details': 
        if (wantToPrepay && cartTotal > 0) {
          setStep('payment');
        } else {
          handleSubmit();
        }
        break;
      case 'payment': handleSubmit(); break;
    }
  };

  const goToPreviousStep = () => {
    switch (step) {
      case 'datetime': setStep('guests'); break;
      case 'menu': setStep('datetime'); break;
      case 'details': setStep('menu'); break;
      case 'payment': setStep('details'); break;
    }
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
              onClick={goToNextStep}
            >
              Continuer
              <ChevronRight className="w-5 h-5 ml-2" />
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
                <PopoverContent className="w-auto p-0 z-[9999] bg-background border shadow-lg" align="start" sideOffset={5}>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => 
                      isBefore(date, startOfDay(new Date())) || 
                      isBefore(addDays(new Date(), 60), date)
                    }
                    initialFocus
                    className="pointer-events-auto p-3"
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
                onClick={goToPreviousStep}
              >
                Retour
              </Button>
              <Button 
                className="flex-1 h-12" 
                onClick={goToNextStep}
                disabled={!selectedDate || !selectedTime}
              >
                Continuer
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'menu':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold">Découvrez notre menu</h3>
              <p className="text-muted-foreground">Précommandez vos plats préférés</p>
            </div>

            {/* Toggle précommande */}
            <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UtensilsCrossed className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium">Précommander des plats</p>
                    <p className="text-xs text-muted-foreground">Vos plats seront prêts à votre arrivée</p>
                  </div>
                </div>
                <Switch checked={wantToPreorder} onCheckedChange={setWantToPreorder} />
              </CardContent>
            </Card>

            {wantToPreorder && (
              <>
                {/* Catégories */}
                {categories.length > 0 && (
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-2 pb-2">
                      <Badge 
                        variant={selectedCategory === 'all' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedCategory('all')}
                      >
                        Tous
                      </Badge>
                      {categories.map(cat => (
                        <Badge
                          key={cat.id}
                          variant={selectedCategory === cat.id ? 'default' : 'outline'}
                          className="cursor-pointer whitespace-nowrap"
                          onClick={() => setSelectedCategory(cat.id)}
                        >
                          {cat.icon && <span className="mr-1">{cat.icon}</span>}
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Liste des plats */}
                <ScrollArea className="h-[250px] pr-4">
                  {menuLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                    </div>
                  ) : filteredMenuItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Aucun plat disponible</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredMenuItems.map(item => {
                        const inCart = cart.find(c => c.menuItem.id === item.id);
                        return (
                          <div 
                            key={item.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border transition-all",
                              inCart ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                            )}
                          >
                            {/* Image */}
                            {item.image_url && (
                              <img 
                                src={item.image_url} 
                                alt={item.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            )}
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{item.name}</span>
                                {item.is_featured && (
                                  <Badge variant="secondary" className="text-xs">⭐</Badge>
                                )}
                                {item.spicy_level && item.spicy_level > 0 && (
                                  <span className="text-red-500">
                                    {Array(item.spicy_level).fill('🌶️').join('')}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-semibold text-primary">
                                  {item.price.toLocaleString()} GNF
                                </span>
                                {item.preparation_time && (
                                  <span className="text-xs text-muted-foreground">
                                    ~{item.preparation_time}min
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {inCart ? (
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-8 w-8"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <span className="w-6 text-center font-semibold">
                                    {inCart.quantity}
                                  </span>
                                  <Button 
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => addToCart(item)}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addToCart(item)}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Ajouter
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Panier récapitulatif */}
                {cart.length > 0 && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4" />
                          Votre précommande
                        </span>
                        <Badge>{cartItemsCount} article{cartItemsCount > 1 ? 's' : ''}</Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        {cart.map(c => (
                          <div key={c.menuItem.id} className="flex justify-between">
                            <span>{c.quantity}x {c.menuItem.name}</span>
                            <span>{(c.menuItem.price * c.quantity).toLocaleString()} GNF</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                        <span>Total</span>
                        <span className="text-primary">{cartTotal.toLocaleString()} GNF</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={goToPreviousStep}>
                Retour
              </Button>
              <Button className="flex-1 h-12" onClick={goToNextStep}>
                Continuer
                <ChevronRight className="w-5 h-5 ml-2" />
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
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-4 flex-wrap">
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
              {cart.length > 0 && (
                <Badge className="h-10 px-4 bg-orange-500">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {cartTotal.toLocaleString()} GNF
                </Badge>
              )}
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
                  placeholder="+224 620 00 00 00"
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

              {/* Option paiement */}
              {cartTotal > 0 && (
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">Payer maintenant</p>
                        <p className="text-xs text-muted-foreground">Payez votre précommande en avance</p>
                      </div>
                    </div>
                    <Switch checked={wantToPrepay} onCheckedChange={setWantToPrepay} />
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={goToPreviousStep}>
                Retour
              </Button>
              <Button 
                className="flex-1 h-12" 
                onClick={goToNextStep}
                disabled={!customerName || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Confirmation...
                  </>
                ) : wantToPrepay && cartTotal > 0 ? (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Passer au paiement
                  </>
                ) : (
                  'Confirmer la réservation'
                )}
              </Button>
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Paiement sécurisé</h3>
              <p className="text-muted-foreground">Payez votre précommande en avance</p>
            </div>

            {/* Récapitulatif de la commande */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium">Récapitulatif</h4>
                {cart.map(c => (
                  <div key={c.menuItem.id} className="flex justify-between text-sm">
                    <span>{c.quantity}x {c.menuItem.name}</span>
                    <span>{(c.menuItem.price * c.quantity).toLocaleString()} GNF</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total à payer</span>
                  <span className="text-primary">{cartTotal.toLocaleString()} GNF</span>
                </div>
              </CardContent>
            </Card>

            {/* Options de paiement (simplifié) */}
            <div className="space-y-3">
              <Button 
                className="w-full h-14 bg-orange-500 hover:bg-orange-600"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Orange_Money_logo.png" 
                     alt="Orange Money" 
                     className="w-6 h-6 mr-2 rounded" />
                Payer avec Orange Money
              </Button>
              
              <Button 
                variant="outline"
                className="w-full h-14"
                onClick={() => {
                  setWantToPrepay(false);
                  handleSubmit();
                }}
                disabled={isSubmitting}
              >
                Payer sur place
              </Button>
            </div>

            <Button variant="ghost" className="w-full" onClick={goToPreviousStep}>
              Retour
            </Button>
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
              {confirmationData?.preorder && confirmationData.preorder.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Précommande</span>
                    <span className="font-semibold text-orange-600">
                      {confirmationData.preorderTotal.toLocaleString()} GNF
                    </span>
                  </div>
                </div>
              )}
            </div>

            {restaurantPhone && (
              <p className="text-sm text-muted-foreground">
                Besoin de modifier ? Appelez le{' '}
                <a href={`tel:${restaurantPhone}`} className="text-primary underline">
                  {restaurantPhone}
                </a>
              </p>
            )}

            <Button className="w-full h-12" onClick={handleClose}>
              Terminé
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Réserver chez {restaurantName}
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        {step !== 'confirmation' && (
          <div className="flex gap-1 mb-4">
            {['guests', 'datetime', 'menu', 'details', ...(wantToPrepay && cartTotal > 0 ? ['payment'] : [])].map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  ['guests', 'datetime', 'menu', 'details', 'payment'].indexOf(step) >= i
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
