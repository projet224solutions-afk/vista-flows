import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Separator } from '@/components/ui/separator';

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartCount } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' GNF';
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/marketplace')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Mon Panier</h1>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <ShoppingCart className="w-24 h-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Votre panier est vide</h2>
          <p className="text-muted-foreground mb-6">Ajoutez des produits pour commencer vos achats</p>
          <Button onClick={() => navigate('/marketplace')}>
            Découvrir les produits
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketplace')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Mon Panier</h1>
          <Badge className="ml-auto">{getCartCount()} article{getCartCount() > 1 ? 's' : ''}</Badge>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Liste des produits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Articles ({cartItems.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={clearCart}>
              Vider le panier
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-md"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                  {item.vendor_name && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Vendu par {item.vendor_name}
                    </p>
                  )}
                  <p className="text-primary font-bold">{formatPrice(item.price)}</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="h-8 w-8"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-mono font-bold w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="h-8 w-8"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm font-semibold">
                    Total: {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Résumé de la commande */}
        <Card>
          <CardHeader>
            <CardTitle>Résumé de la commande</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-semibold">{formatPrice(getCartTotal())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frais de livraison</span>
                <span className="font-semibold">À calculer</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(getCartTotal())}</span>
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={() => navigate('/payment')}>
              Procéder au paiement
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
