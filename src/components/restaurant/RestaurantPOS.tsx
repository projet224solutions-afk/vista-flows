/**
 * Restaurant POS - Point de vente pour plats, boissons et services
 * Utilise le menu du restaurant pour créer des ventes rapides
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRestaurantMenu, type MenuItem } from '@/hooks/useRestaurantMenu';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StripeCardPaymentModal } from '@/components/pos/StripeCardPaymentModal';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Receipt,
  UtensilsCrossed, MapPin, Truck, ShoppingBag, Printer,
  Check, X, Users, Clock, CreditCard, Banknote, Smartphone
} from 'lucide-react';

interface RestaurantPOSProps {
  serviceId: string;
}

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

type OrderType = 'sur_place' | 'emporter' | 'livraison';
type PaymentMethod = 'cash' | 'mobile_money' | 'card';

const ORDER_TYPES: { value: OrderType; label: string; icon: React.ReactNode }[] = [
  { value: 'sur_place', label: 'Sur place', icon: <MapPin className="w-4 h-4" /> },
  { value: 'emporter', label: 'À emporter', icon: <ShoppingBag className="w-4 h-4" /> },
  { value: 'livraison', label: 'Livraison', icon: <Truck className="w-4 h-4" /> },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash', label: 'Espèces', icon: <Banknote className="w-4 h-4" /> },
  { value: 'mobile_money', label: 'Mobile Money', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'card', label: 'Carte', icon: <CreditCard className="w-4 h-4" /> },
];

export function RestaurantPOS({ serviceId }: RestaurantPOSProps) {
  const formatCurrency = useFormatCurrency();
  const { categories, menuItems, loading } = useRestaurantMenu(serviceId);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('sur_place');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  // Filter available items
  const availableItems = useMemo(() => {
    let items = menuItems.filter(i => i.is_available);

    if (selectedCategory) {
      items = items.filter(i => i.category_id === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }

    return items;
  }, [menuItems, selectedCategory, search]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, {
        id: crypto.randomUUID(),
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
      }];
    });
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
      .filter(c => c.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(c => c.id !== id));
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, c) => sum + c.price * c.quantity, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((sum, c) => sum + c.quantity, 0), [cart]);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      // Create order in restaurant_orders table
      const orderData = {
        professional_service_id: serviceId,
        order_type: orderType,
        status: 'pending',
        customer_name: customerName || 'Client',
        table_number: orderType === 'sur_place' ? (tableNumber || null) : null,
        total_amount: subtotal,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cash' ? 'pending' : 'paid',
        notes: orderNotes || null,
        items: cart.map(c => ({
          menu_item_id: c.menuItemId,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
          notes: c.notes,
          subtotal: c.price * c.quantity,
        })),
      };

      const { data, error } = await supabase
        .from('restaurant_orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      setLastOrder({ ...orderData, id: data.id, created_at: data.created_at });
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);

      // Reset
      setCart([]);
      setCustomerName('');
      setTableNumber('');
      setOrderNotes('');

      toast.success(`Commande #${data.id.slice(-6).toUpperCase()} créée !`);
    } catch (error: any) {
      console.error('Erreur création commande:', error);
      toast.error('Erreur lors de la création de la commande');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)] min-h-[500px]">
      {/* LEFT: Menu Items */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        {/* Search & Categories */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un plat..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="whitespace-nowrap text-xs"
            >
              Tous
            </Button>
            {categories.filter(c => c.is_active).map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="whitespace-nowrap text-xs"
              >
                {cat.icon || '🍽️'} {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Order Type Selector */}
        <div className="flex gap-2">
          {ORDER_TYPES.map(type => (
            <Button
              key={type.value}
              variant={orderType === type.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOrderType(type.value)}
              className="gap-1 text-xs flex-1"
            >
              {type.icon} {type.label}
            </Button>
          ))}
        </div>

        {/* Menu Grid */}
        <ScrollArea className="flex-1">
          {availableItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <UtensilsCrossed className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Aucun plat disponible</p>
              <p className="text-xs">Ajoutez des plats depuis l'onglet Menu</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {availableItems.map(item => {
                const inCart = cart.find(c => c.menuItemId === item.id);
                return (
                  <Card
                    key={item.id}
                    className={`cursor-pointer hover:shadow-md transition-all relative ${
                      inCart ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => addToCart(item)}
                  >
                    {item.image_url && (
                      <div className="h-20 overflow-hidden rounded-t-lg">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-2">
                      <p className="font-medium text-xs line-clamp-2 leading-tight">{item.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-bold text-primary">
                          {formatCurrency(item.price)}
                        </span>
                        {item.is_new && (
                          <Badge className="text-[8px] px-1 py-0 bg-orange-500">NEW</Badge>
                        )}
                      </div>
                      {item.preparation_time > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {item.preparation_time} min
                        </div>
                      )}
                      {inCart && (
                        <Badge className="absolute top-1 right-1 text-[10px] px-1.5 py-0">
                          x{inCart.quantity}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* RIGHT: Cart */}
      <div className="flex flex-col border rounded-lg bg-card">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <ShoppingCart className="w-4 h-4" />
            Panier ({totalItems})
          </h3>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCart([])}>
              <Trash2 className="w-3 h-3 mr-1" />
              Vider
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 p-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ShoppingCart className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">Panier vide</p>
              <p className="text-[10px]">Cliquez sur un plat pour l'ajouter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-xs text-primary font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Cart Footer */}
        <div className="p-3 border-t space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(subtotal)}</span>
          </div>
          <Button
            className="w-full gap-2"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
          >
            <Receipt className="w-4 h-4" />
            Valider ({totalItems} articles)
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Finaliser la commande
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Nom du client</label>
                <Input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Client"
                  className="h-9"
                />
              </div>

              {orderType === 'sur_place' && (
                <div>
                  <label className="text-xs font-medium mb-1 block">N° Table</label>
                  <Input
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    placeholder="Ex: 5"
                    className="h-9"
                  />
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="text-xs font-medium mb-1 block">Mode de paiement</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(method => (
                    <Button
                      key={method.value}
                      variant={paymentMethod === method.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod(method.value)}
                      className="gap-1 text-xs"
                    >
                      {method.icon} {method.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Notes</label>
                <Textarea
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder="Instructions spéciales..."
                  className="h-16 text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitOrder} disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  Envoi...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirmer • {formatCurrency(subtotal)}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              Commande enregistrée !
            </DialogTitle>
          </DialogHeader>

          {lastOrder && (
            <div className="bg-muted/30 rounded-lg p-4 font-mono text-xs space-y-2">
              <div className="text-center border-b pb-2">
                <p className="font-bold text-sm">REÇU DE COMMANDE</p>
                <p>#{lastOrder.id?.slice(-6).toUpperCase()}</p>
                <p>{new Date(lastOrder.created_at).toLocaleString('fr-FR')}</p>
              </div>

              <div className="border-b pb-2">
                <p><strong>Client:</strong> {lastOrder.customer_name}</p>
                <p><strong>Type:</strong> {ORDER_TYPES.find(t => t.value === lastOrder.order_type)?.label}</p>
                {lastOrder.table_number && <p><strong>Table:</strong> {lastOrder.table_number}</p>}
                <p><strong>Paiement:</strong> {PAYMENT_METHODS.find(m => m.value === lastOrder.payment_method)?.label}</p>
              </div>

              <div className="space-y-1 border-b pb-2">
                {lastOrder.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-sm pt-1">
                <span>TOTAL</span>
                <span>{formatCurrency(lastOrder.total_amount)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiptOpen(false)} className="w-full">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RestaurantPOS;
