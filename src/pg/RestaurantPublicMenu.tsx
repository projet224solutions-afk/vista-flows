/**
 * Page publique Menu Restaurant
 * Permet aux clients de voir le menu et passer une commande directement
 * v2 - Achat direct sans panier interm├®diaire
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppPersistence, useFormPersistence } from '@/hooks/useAppPersistence';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Clock,
  Flame,
  Star,
  MapPin,
  Phone,
  X,
  ChefHat,
  Utensils,
  Leaf,
  AlertTriangle,
  CreditCard,
  Wallet,
  Check,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  preparation_time: number;
  is_available: boolean;
  is_featured: boolean;
  is_new: boolean;
  spicy_level: number;
  dietary_tags: string[] | null;
  allergens: string[] | null;
}

interface CartItem extends MenuItem {
  quantity: number;
  special_instructions?: string;
}

interface RestaurantInfo {
  id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  address: string | null;
  phone: string | null;
  rating: number | null;
  total_reviews: number | null;
}

export default function RestaurantPublicMenu() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCheckout, setShowCheckout] = useState(false);
  
  // Quick order modal (achat direct)
  const [quickOrderItem, setQuickOrderItem] = useState<MenuItem | null>(null);
  const [quickOrderQuantity, setQuickOrderQuantity] = useState(1);
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState('');
  
  // ├ëtats persist├®s - Checkout form + Cart
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Persistance du panier restaurant
  const persistedCart = useAppPersistence<CartItem[]>({
    key: `restaurant_cart_${serviceId}`,
    defaultState: [],
    maxAge: 2 * 60 * 60 * 1000, // 2 heures
    enabled: !!serviceId,
  });
  
  // Persistance du formulaire checkout
  const { values: checkoutForm, setValues: setCheckoutForm, resetForm: resetCheckoutForm } = useFormPersistence(
    `restaurant_checkout_${serviceId}`,
    {
      customerName: '',
      customerPhone: '',
      orderType: 'takeaway' as 'dine_in' | 'takeaway' | 'delivery',
      tableNumber: '',
      deliveryAddress: '',
      orderNotes: '',
      paymentMethod: 'cash' as 'cash' | 'mobile' | 'card',
    },
    { enabled: !!serviceId, maxAge: 30 * 60 * 1000 }
  );
  
  // Aliases pour compatibilit├® avec le code existant
  const cart = persistedCart.state;
  const setCart = persistedCart.setState;
  const customerName = checkoutForm.customerName;
  const setCustomerName = (v: string) => setCheckoutForm(prev => ({ ...prev, customerName: v }));
  const customerPhone = checkoutForm.customerPhone;
  const setCustomerPhone = (v: string) => setCheckoutForm(prev => ({ ...prev, customerPhone: v }));
  const orderType = checkoutForm.orderType;
  const setOrderType = (v: 'dine_in' | 'takeaway' | 'delivery') => setCheckoutForm(prev => ({ ...prev, orderType: v }));
  const tableNumber = checkoutForm.tableNumber;
  const setTableNumber = (v: string) => setCheckoutForm(prev => ({ ...prev, tableNumber: v }));
  const deliveryAddress = checkoutForm.deliveryAddress;
  const setDeliveryAddress = (v: string) => setCheckoutForm(prev => ({ ...prev, deliveryAddress: v }));
  const orderNotes = checkoutForm.orderNotes;
  const setOrderNotes = (v: string) => setCheckoutForm(prev => ({ ...prev, orderNotes: v }));
  const paymentMethod = checkoutForm.paymentMethod;
  const setPaymentMethod = (v: 'cash' | 'mobile' | 'card') => setCheckoutForm(prev => ({ ...prev, paymentMethod: v }));

  // Load restaurant and menu data
  useEffect(() => {
    const loadRestaurantData = async () => {
      if (!serviceId) return;

      try {
        setLoading(true);

        // Load restaurant info
        const { data: restaurantData, error: restError } = await supabase
          .from('professional_services')
          .select('id, business_name, description, logo_url, cover_image_url, address, phone, rating, total_reviews')
          .eq('id', serviceId)
          .single();

        if (restError) throw restError;
        setRestaurant(restaurantData);

        // Load menu categories
        const { data: categoriesData, error: catError } = await supabase
          .from('restaurant_menu_categories')
          .select('*')
          .eq('professional_service_id', serviceId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (catError) throw catError;
        setCategories(categoriesData || []);

        // Load menu items - afficher TOUS les plats (is_available pour filtrer l'affichage)
        const { data: itemsData, error: itemsError } = await supabase
          .from('restaurant_menu_items')
          .select('*')
          .eq('professional_service_id', serviceId)
          .order('display_order', { ascending: true });

        if (itemsError) throw itemsError;
        setMenuItems(itemsData || []);

      } catch (error) {
        console.error('Error loading restaurant:', error);
        toast.error('Erreur lors du chargement du restaurant');
      } finally {
        setLoading(false);
      }
    };

    loadRestaurantData();
  }, [serviceId]);

  // Pre-fill user info if logged in
  useEffect(() => {
    if (user) {
      setCustomerName(user.user_metadata?.full_name || '');
      setCustomerPhone(user.phone || '');
    }
  }, [user]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return menuItems;
    return menuItems.filter(item => item.category_id === selectedCategory);
  }, [menuItems, selectedCategory]);

  // Featured items
  const featuredItems = useMemo(() => 
    menuItems.filter(item => item.is_featured), 
    [menuItems]
  );

  // Cart operations
  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  // Quick order - Achat direct
  const openQuickOrder = useCallback((item: MenuItem) => {
    setQuickOrderItem(item);
    setQuickOrderQuantity(1);
    setOrderSuccess(false);
    setShowQuickOrder(true);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const getItemQuantity = useCallback((itemId: string) => {
    return cart.find(i => i.id === itemId)?.quantity || 0;
  }, [cart]);

  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const cartCount = useMemo(() => 
    cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Submit order (from cart or quick order)
  // Fonction pour cr├®diter le wallet du restaurant
  const creditRestaurantWallet = async (restaurantServiceId: string, amount: number, orderNumber: string) => {
    try {
      // R├®cup├®rer le user_id du restaurant (propri├®taire du service professionnel)
      const { data: serviceData, error: serviceError } = await supabase
        .from('professional_services')
        .select('user_id, business_name')
        .eq('id', restaurantServiceId)
        .single();

      if (serviceError || !serviceData?.user_id) {
        console.error('Erreur r├®cup├®ration user_id restaurant:', serviceError);
        return false;
      }

      // V├®rifier/cr├®er le wallet du restaurant
      let { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', serviceData.user_id)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // Cr├®er le wallet s'il n'existe pas
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({
            user_id: serviceData.user_id,
            balance: 0,
            currency: 'GNF'
          })
          .select()
          .single();

        if (createError) {
          console.error('Erreur cr├®ation wallet restaurant:', createError);
          return false;
        }
        wallet = newWallet;
      }

      if (!wallet) {
        console.error('Wallet restaurant introuvable');
        return false;
      }

      // Cr├®diter le wallet
      const newBalance = (wallet.balance || 0) + amount;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      if (updateError) {
        console.error('Erreur cr├®dit wallet restaurant:', updateError);
        return false;
      }

      // Cr├®er le log de transaction (bypass type check car les types g├®n├®r├®s sont incorrects)
      try {
        await (supabase.from('wallet_logs') as any).insert({
          wallet_id: wallet.id,
          user_id: serviceData.user_id,
          action: 'credit',
          amount: amount,
          currency: 'GNF',
          balance_before: wallet.balance || 0,
          balance_after: newBalance,
          status: 'completed',
          payment_method: 'online',
          metadata: {
            source: 'restaurant_order',
            order_number: orderNumber,
            restaurant_name: serviceData.business_name
          }
        });
      } catch (logError) {
        console.warn('Erreur log transaction:', logError);
      }

      console.log(`Ô£à Wallet restaurant cr├®dit├®: +${amount} GNF`);
      return true;
    } catch (err) {
      console.error('Erreur creditRestaurantWallet:', err);
      return false;
    }
  };

  const handleSubmitOrder = async (isQuickOrder: boolean = false) => {
    if (!customerName.trim()) {
      toast.error('Veuillez entrer votre nom');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Veuillez entrer votre num├®ro de t├®l├®phone');
      return;
    }
    if (orderType === 'dine_in' && !tableNumber.trim()) {
      toast.error('Veuillez entrer le num├®ro de table');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Veuillez entrer l\'adresse de livraison');
      return;
    }

    // Determine items to order
    const itemsToOrder = isQuickOrder && quickOrderItem
      ? [{ ...quickOrderItem, quantity: quickOrderQuantity }]
      : cart;

    if (itemsToOrder.length === 0) {
      toast.error('Aucun article ├á commander');
      return;
    }

    const total = itemsToOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);

    setIsSubmitting(true);
    try {
      const orderItems = itemsToOrder.map(item => ({
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        special_instructions: orderNotes || null,
      }));

      const orderNumber = `CMD-${Date.now().toString(36).toUpperCase()}`;
      
      // D├®terminer le statut de paiement
      const isPaid = paymentMethod === 'card' || paymentMethod === 'mobile';

      const { data: order, error } = await supabase
        .from('restaurant_orders')
        .insert({
          professional_service_id: serviceId,
          order_number: orderNumber,
          customer_name: customerName,
          customer_phone: customerPhone,
          order_type: orderType,
          table_number: orderType === 'dine_in' ? tableNumber : null,
          delivery_address: orderType === 'delivery' ? deliveryAddress : null,
          items: orderItems,
          subtotal: total,
          tax: 0,
          total: total,
          notes: orderNotes || null,
          status: 'pending',
          payment_status: isPaid ? 'paid' : 'pending',
          payment_method: paymentMethod,
          source: 'online',
        })
        .select()
        .single();

      if (error) throw error;

      // Cr├®diter le wallet du restaurant si paiement en ligne (card ou mobile)
      if (isPaid && serviceId) {
        const credited = await creditRestaurantWallet(serviceId, total, orderNumber);
        if (credited) {
          toast.success('­ƒÆ░ Paiement re├ºu par le restaurant');
        }
      }

      setLastOrderNumber(orderNumber);
      
      if (isQuickOrder) {
        setOrderSuccess(true);
        toast.success(`Commande ${orderNumber} envoy├®e !`);
      } else {
        toast.success(`Commande ${orderNumber} envoy├®e avec succ├¿s !`);
        clearCart();
        setShowCheckout(false);
      }
      
      // Reset form
      setOrderNotes('');
      setTableNumber('');
      setDeliveryAddress('');

    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Erreur lors de l\'envoi de la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickOrderTotal = useMemo(() => 
    quickOrderItem ? quickOrderItem.price * quickOrderQuantity : 0,
    [quickOrderItem, quickOrderQuantity]
  );

  // Get category name
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Sans cat├®gorie';
    return categories.find(c => c.id === categoryId)?.name || 'Sans cat├®gorie';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du menu...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Restaurant non trouv├®</h2>
          <Button onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with cover image */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-orange-500 to-red-600">
        {restaurant.cover_image_url ? (
          <img
            src={restaurant.cover_image_url}
            alt={restaurant.business_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Utensils className="w-20 h-20 text-white/50" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-black/30 text-white hover:bg-black/50 rounded-full"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Restaurant info overlay */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center gap-3">
            {restaurant.logo_url && (
              <img
                src={restaurant.logo_url}
                alt=""
                className="w-14 h-14 rounded-xl object-cover border-2 border-white"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                {restaurant.business_name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/90">
                {restaurant.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {restaurant.rating.toFixed(1)}
                    {restaurant.total_reviews && ` (${restaurant.total_reviews})`}
                  </span>
                )}
                {restaurant.address && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3" />
                    {restaurant.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories tabs */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="flex-shrink-0"
            >
              Tout
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="flex-shrink-0"
              >
                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured items */}
      {selectedCategory === 'all' && featuredItems.length > 0 && (
        <section className="px-4 py-4">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Populaires
          </h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {featuredItems.map(item => (
              <Card 
                key={item.id} 
                className="flex-shrink-0 w-40 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => addToCart(item)}
              >
                <div className="relative h-24 bg-muted">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  {item.is_new && (
                    <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0">Nouveau</Badge>
                  )}
                </div>
                <CardContent className="p-2">
                  <h3 className="font-medium text-sm line-clamp-1">{item.name}</h3>
                  <p className="text-primary font-bold text-sm">{item.price.toLocaleString()} GNF</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Menu items grid */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-bold mb-3">
          {selectedCategory === 'all' ? 'Tous les plats' : getCategoryName(selectedCategory)}
        </h2>
        
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun plat disponible dans cette cat├®gorie</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map(item => {
              const qty = getItemQuantity(item.id);
              return (
                <Card key={item.id} className={cn(
                  "overflow-hidden",
                  !item.is_available && "opacity-60"
                )}>
                  <CardContent className="p-0">
                    <div className="flex gap-3 p-3">
                      {/* Image */}
                      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ChefHat className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        {item.is_new && item.is_available && (
                          <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0">Nouveau</Badge>
                        )}
                        {!item.is_available && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                              Indisponible
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className={cn(
                              "font-semibold text-sm line-clamp-1",
                              !item.is_available && "line-through text-muted-foreground"
                            )}>{item.name}</h3>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {!item.is_available && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-500 border-orange-200">
                              <Clock className="w-2.5 h-2.5 mr-0.5" /> Bient├┤t disponible
                            </Badge>
                          )}
                          {item.spicy_level > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-500 border-red-200">
                              ­ƒîÂ´©Å {item.spicy_level > 2 ? 'Tr├¿s ├®pic├®' : '├ëpic├®'}
                            </Badge>
                          )}
                          {item.dietary_tags?.includes('vegetarian') && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-200">
                              <Leaf className="w-2.5 h-2.5 mr-0.5" /> V├®g├®
                            </Badge>
                          )}
                          {item.preparation_time > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Clock className="w-2.5 h-2.5 mr-0.5" /> {item.preparation_time} min
                            </Badge>
                          )}
                        </div>

                        {/* Price & Add button */}
                        <div className="flex items-center justify-between mt-2">
                          <span className={cn(
                            "font-bold",
                            item.is_available ? "text-primary" : "text-muted-foreground"
                          )}>{item.price.toLocaleString()} GNF</span>
                          
                          {item.is_available ? (
                            qty > 0 ? (
                              <div className="flex items-center gap-2 bg-primary/10 rounded-full px-2 py-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-6 h-6 rounded-full"
                                  onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="font-semibold text-sm w-5 text-center">{qty}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-6 h-6 rounded-full"
                                  onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="h-8 gap-1 bg-green-600 hover:bg-green-700"
                                onClick={() => openQuickOrder(item)}
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                Commander
                              </Button>
                            )
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Non disponible
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-30">
          <Sheet open={showCheckout} onOpenChange={setShowCheckout}>
            <SheetTrigger asChild>
              <Button className="w-full h-14 rounded-2xl shadow-xl gap-3 text-base">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <Badge variant="secondary" className="bg-white text-primary">
                    {cartCount}
                  </Badge>
                </div>
                <span className="flex-1">Voir le panier</span>
                <span className="font-bold">{cartTotal.toLocaleString()} GNF</span>
              </Button>
            </SheetTrigger>

            <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
              <SheetHeader className="pb-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Votre commande
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto py-4 space-y-6">
                {/* Cart items */}
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ChefHat className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                        <p className="text-primary font-semibold text-sm">
                          {(item.price * item.quantity).toLocaleString()} GNF
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-7 h-7 rounded-full"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-semibold w-5 text-center">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-7 h-7 rounded-full"
                          onClick={() => addToCart(item)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order type */}
                <div className="space-y-3">
                  <Label>Type de commande</Label>
                  <RadioGroup value={orderType} onValueChange={(v) => setOrderType(v as typeof orderType)}>
                    <div className="grid grid-cols-3 gap-2">
                      <label className={cn(
                        'flex flex-col items-center gap-1 p-3 border rounded-xl cursor-pointer transition-colors',
                        orderType === 'takeaway' && 'border-primary bg-primary/5'
                      )}>
                        <RadioGroupItem value="takeaway" className="sr-only" />
                        <span className="text-lg">­ƒÑí</span>
                        <span className="text-xs font-medium">├Ç emporter</span>
                      </label>
                      <label className={cn(
                        'flex flex-col items-center gap-1 p-3 border rounded-xl cursor-pointer transition-colors',
                        orderType === 'dine_in' && 'border-primary bg-primary/5'
                      )}>
                        <RadioGroupItem value="dine_in" className="sr-only" />
                        <span className="text-lg">­ƒì¢´©Å</span>
                        <span className="text-xs font-medium">Sur place</span>
                      </label>
                      <label className={cn(
                        'flex flex-col items-center gap-1 p-3 border rounded-xl cursor-pointer transition-colors',
                        orderType === 'delivery' && 'border-primary bg-primary/5'
                      )}>
                        <RadioGroupItem value="delivery" className="sr-only" />
                        <span className="text-lg">­ƒøÁ</span>
                        <span className="text-xs font-medium">Livraison</span>
                      </label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Customer info */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Votre nom *</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Entrez votre nom"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">T├®l├®phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Ex: 620 00 00 00"
                      className="mt-1"
                    />
                  </div>
                  
                  {orderType === 'dine_in' && (
                    <div>
                      <Label htmlFor="table">Num├®ro de table *</Label>
                      <Input
                        id="table"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="Ex: 5"
                        className="mt-1"
                      />
                    </div>
                  )}

                  {orderType === 'delivery' && (
                    <div>
                      <Label htmlFor="address">Adresse de livraison *</Label>
                      <Textarea
                        id="address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Entrez votre adresse compl├¿te"
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">Notes (optionnel)</Label>
                    <Textarea
                      id="notes"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Instructions sp├®ciales..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span>{cartTotal.toLocaleString()} GNF</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{cartTotal.toLocaleString()} GNF</span>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-4 border-t">
                <Button
                  className="w-full h-12 text-base"
                  onClick={() => handleSubmitOrder(false)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Confirmer la commande ÔÇó {cartTotal.toLocaleString()} GNF
                    </>
                  )}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Quick Order Modal - Achat direct */}
      <Dialog open={showQuickOrder} onOpenChange={setShowQuickOrder}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Commander directement
            </DialogTitle>
          </DialogHeader>

          {orderSuccess ? (
            // Success state
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-600">Commande envoy├®e !</h3>
                <p className="text-muted-foreground mt-1">R├®f├®rence: {lastOrderNumber}</p>
              </div>
              <Card className="bg-muted/50">
                <CardContent className="p-4 text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Article</span>
                    <span className="font-medium">{quickOrderItem?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantit├®</span>
                    <span className="font-medium">{quickOrderQuantity}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">{quickOrderTotal.toLocaleString()} GNF</span>
                  </div>
                </CardContent>
              </Card>
              <p className="text-sm text-muted-foreground">
                Le restaurant va pr├®parer votre commande. Vous serez notifi├® quand elle sera pr├¬te.
              </p>
              <Button className="w-full" onClick={() => setShowQuickOrder(false)}>
                Fermer
              </Button>
            </div>
          ) : (
            // Order form
            <div className="space-y-4">
              {/* Item preview */}
              {quickOrderItem && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {quickOrderItem.image_url ? (
                          <img src={quickOrderItem.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ChefHat className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{quickOrderItem.name}</h3>
                        {quickOrderItem.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{quickOrderItem.description}</p>
                        )}
                        <p className="text-primary font-bold mt-1">{quickOrderItem.price.toLocaleString()} GNF</p>
                      </div>
                    </div>
                    
                    {/* Quantity selector */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <span className="font-medium">Quantit├®</span>
                      <div className="flex items-center gap-3">
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-8 h-8 rounded-full"
                          onClick={() => setQuickOrderQuantity(q => Math.max(1, q - 1))}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-bold text-lg w-8 text-center">{quickOrderQuantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-8 h-8 rounded-full"
                          onClick={() => setQuickOrderQuantity(q => q + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order type */}
              <div className="space-y-2">
                <Label>Type de commande</Label>
                <RadioGroup value={orderType} onValueChange={(v) => setOrderType(v as typeof orderType)}>
                  <div className="grid grid-cols-3 gap-2">
                    <label className={cn(
                      'flex flex-col items-center gap-1 p-2 border rounded-lg cursor-pointer transition-colors',
                      orderType === 'takeaway' && 'border-primary bg-primary/5'
                    )}>
                      <RadioGroupItem value="takeaway" className="sr-only" />
                      <span className="text-lg">­ƒÑí</span>
                      <span className="text-xs">├Ç emporter</span>
                    </label>
                    <label className={cn(
                      'flex flex-col items-center gap-1 p-2 border rounded-lg cursor-pointer transition-colors',
                      orderType === 'dine_in' && 'border-primary bg-primary/5'
                    )}>
                      <RadioGroupItem value="dine_in" className="sr-only" />
                      <span className="text-lg">­ƒì¢´©Å</span>
                      <span className="text-xs">Sur place</span>
                    </label>
                    <label className={cn(
                      'flex flex-col items-center gap-1 p-2 border rounded-lg cursor-pointer transition-colors',
                      orderType === 'delivery' && 'border-primary bg-primary/5'
                    )}>
                      <RadioGroupItem value="delivery" className="sr-only" />
                      <span className="text-lg">­ƒøÁ</span>
                      <span className="text-xs">Livraison</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="quick-name">Nom *</Label>
                  <Input
                    id="quick-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Votre nom"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="quick-phone">T├®l├®phone *</Label>
                  <Input
                    id="quick-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="620 00 00 00"
                    className="mt-1"
                  />
                </div>
              </div>

              {orderType === 'dine_in' && (
                <div>
                  <Label htmlFor="quick-table">Num├®ro de table *</Label>
                  <Input
                    id="quick-table"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Ex: 5"
                    className="mt-1"
                  />
                </div>
              )}

              {orderType === 'delivery' && (
                <div>
                  <Label htmlFor="quick-address">Adresse de livraison *</Label>
                  <Input
                    id="quick-address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Votre adresse"
                    className="mt-1"
                  />
                </div>
              )}

              {/* Payment method */}
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                  <div className="grid grid-cols-3 gap-2">
                    <label className={cn(
                      'flex flex-col items-center gap-1 p-2 border rounded-lg cursor-pointer transition-colors',
                      paymentMethod === 'cash' && 'border-primary bg-primary/5'
                    )}>
                      <RadioGroupItem value="cash" className="sr-only" />
                      <Wallet className="w-5 h-5 text-green-600" />
                      <span className="text-xs">Esp├¿ces</span>
                    </label>
                    <label className={cn(
                      'flex flex-col items-center gap-1 p-2 border rounded-lg cursor-pointer transition-colors',
                      paymentMethod === 'mobile' && 'border-primary bg-primary/5'
                    )}>
                      <RadioGroupItem value="mobile" className="sr-only" />
                      <Phone className="w-5 h-5 text-orange-500" />
                      <span className="text-xs">Mobile</span>
                    </label>
                    <label className={cn(
                      'flex flex-col items-center gap-1 p-2 border rounded-lg cursor-pointer transition-colors',
                      paymentMethod === 'card' && 'border-primary bg-primary/5'
                    )}>
                      <RadioGroupItem value="card" className="sr-only" />
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <span className="text-xs">Carte</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="quick-notes">Instructions (optionnel)</Label>
                <Textarea
                  id="quick-notes"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Sans oignon, bien cuit..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Total & Submit */}
              <div className="pt-3 border-t space-y-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{quickOrderTotal.toLocaleString()} GNF</span>
                </div>
                
                <Button
                  className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
                  onClick={() => handleSubmitOrder(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Confirmer la commande
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
