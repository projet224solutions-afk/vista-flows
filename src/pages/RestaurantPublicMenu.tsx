/**
 * Page publique Menu Restaurant
 * Permet aux clients de voir le menu et passer une commande
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCheckout, setShowCheckout] = useState(false);
  
  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('takeaway');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

        // Load menu items
        const { data: itemsData, error: itemsError } = await supabase
          .from('restaurant_menu_items')
          .select('*')
          .eq('professional_service_id', serviceId)
          .eq('is_available', true)
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
    toast.success(`${item.name} ajouté au panier`);
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

  // Submit order
  const handleSubmitOrder = async () => {
    if (!customerName.trim()) {
      toast.error('Veuillez entrer votre nom');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }
    if (orderType === 'dine_in' && !tableNumber.trim()) {
      toast.error('Veuillez entrer le numéro de table');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Veuillez entrer l\'adresse de livraison');
      return;
    }
    if (cart.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create order
      const orderItems = cart.map(item => ({
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        special_instructions: item.special_instructions || null,
      }));

      const orderNumber = `CMD-${Date.now().toString(36).toUpperCase()}`;

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
          subtotal: cartTotal,
          tax: 0,
          total: cartTotal,
          notes: orderNotes || null,
          status: 'pending',
          payment_status: 'pending',
          payment_method: 'cash',
          source: 'online',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Commande ${orderNumber} envoyée avec succès !`);
      clearCart();
      setShowCheckout(false);
      
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

  // Get category name
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Sans catégorie';
    return categories.find(c => c.id === categoryId)?.name || 'Sans catégorie';
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
          <h2 className="text-xl font-semibold mb-2">Restaurant non trouvé</h2>
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
            <p>Aucun plat disponible dans cette catégorie</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map(item => {
              const qty = getItemQuantity(item.id);
              return (
                <Card key={item.id} className="overflow-hidden">
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
                        {item.is_new && (
                          <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0">Nouveau</Badge>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm line-clamp-1">{item.name}</h3>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.spicy_level > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-500 border-red-200">
                              🌶️ {item.spicy_level > 2 ? 'Très épicé' : 'Épicé'}
                            </Badge>
                          )}
                          {item.dietary_tags?.includes('vegetarian') && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-200">
                              <Leaf className="w-2.5 h-2.5 mr-0.5" /> Végé
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
                          <span className="font-bold text-primary">{item.price.toLocaleString()} GNF</span>
                          
                          {qty > 0 ? (
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
                              className="h-8 gap-1"
                              onClick={() => addToCart(item)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Ajouter
                            </Button>
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
                        <span className="text-lg">🥡</span>
                        <span className="text-xs font-medium">À emporter</span>
                      </label>
                      <label className={cn(
                        'flex flex-col items-center gap-1 p-3 border rounded-xl cursor-pointer transition-colors',
                        orderType === 'dine_in' && 'border-primary bg-primary/5'
                      )}>
                        <RadioGroupItem value="dine_in" className="sr-only" />
                        <span className="text-lg">🍽️</span>
                        <span className="text-xs font-medium">Sur place</span>
                      </label>
                      <label className={cn(
                        'flex flex-col items-center gap-1 p-3 border rounded-xl cursor-pointer transition-colors',
                        orderType === 'delivery' && 'border-primary bg-primary/5'
                      )}>
                        <RadioGroupItem value="delivery" className="sr-only" />
                        <span className="text-lg">🛵</span>
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
                    <Label htmlFor="phone">Téléphone *</Label>
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
                      <Label htmlFor="table">Numéro de table *</Label>
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
                        placeholder="Entrez votre adresse complète"
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
                      placeholder="Instructions spéciales..."
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
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Confirmer la commande • {cartTotal.toLocaleString()} GNF
                    </>
                  )}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
