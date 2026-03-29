/**
 * Offline POS Interface - Interface POS dÃ©diÃ©e au mode hors ligne
 * 224SOLUTIONS - Mode Offline AvancÃ©
 *
 * Cette interface est affichÃ©e uniquement en mode offline.
 * Elle rÃ©utilise la logique du POS existant mais avec les fonctionnalitÃ©s offline.
 */

import React, { useState } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createOfflineSale, checkDailyLimit, type OfflinePaymentMethod } from '@/lib/offline/advancedPOSManager';
import { decrementStockFromSale } from '@/lib/offline/localStockManager';
import { useOfflineStock } from '@/hooks/useOfflineStock';
import { useAuth } from '@/hooks/useAuth';

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  sku?: string;
}

export function OfflinePOSInterface() {
  const { user } = useAuth();
  const { stock, isInStock } = useOfflineStock();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<OfflinePaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculer les totaux
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = 0; // Ã€ implÃ©menter selon vos rÃ¨gles
  const discount = cart.reduce((sum, item) => sum + item.discount, 0);
  const total = subtotal + tax - discount;

  // Ajouter un produit au panier
  const addToCart = (product: any) => {
    // VÃ©rifier le stock
    if (!isInStock(product.id, 1)) {
      toast.error('Produit en rupture de stock');
      return;
    }

    const existingItem = cart.find(item => item.product_id === product.id);

    if (existingItem) {
      // IncrÃ©menter la quantitÃ©
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      // Ajouter nouveau
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        discount: 0,
        total: product.price,
        sku: product.sku
      }]);
    }
  };

  // Mettre Ã  jour la quantitÃ©
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // VÃ©rifier le stock
    if (!isInStock(productId, newQuantity)) {
      toast.error('Stock insuffisant');
      return;
    }

    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, quantity: newQuantity, total: item.unit_price * newQuantity }
        : item
    ));
  };

  // Retirer du panier
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  // Vider le panier
  const clearCart = () => {
    setCart([]);
    setCustomerName('');
  };

  // Finaliser la vente
  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }

    if (!user?.id) {
      toast.error('Utilisateur non identifiÃ©');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. VÃ©rifier la limite journaliÃ¨re
      const limitCheck = await checkDailyLimit(user.id, total);
      if (!limitCheck.allowed) {
        toast.error(`Limite journaliÃ¨re atteinte!`, {
          description: `Restant: ${limitCheck.remaining.toLocaleString()} GNF`
        });
        return;
      }

      // 2. CrÃ©er la vente offline
      const result = await createOfflineSale({
        vendor_id: user.id,
        customer_name: customerName || 'Client',
        items: cart,
        subtotal,
        tax,
        discount,
        total,
        payment_method: selectedPayment,
        notes: 'Vente en mode hors ligne'
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la vente');
        return;
      }

      // 3. DÃ©compter le stock
      for (const item of cart) {
        await decrementStockFromSale(
          item.product_id,
          item.quantity,
          result.sale!.id
        );
      }

      // 4. SuccÃ¨s
      toast.success('Vente enregistrÃ©e!', {
        description: `ReÃ§u NÂ° ${result.sale!.receipt_number}. Synchronisation automatique au retour en ligne.`
      });

      // Afficher les informations de paiement si USSD ou QR
      if (selectedPayment === 'ussd' && result.sale!.payment_reference) {
        toast.info('Code USSD gÃ©nÃ©rÃ©', {
          description: `${result.sale!.payment_reference}`,
          duration: 10000
        });
      } else if (selectedPayment === 'qr_local' && result.sale!.payment_reference) {
        toast.info('QR Code gÃ©nÃ©rÃ©', {
          description: 'Code disponible sur le reÃ§u',
          duration: 10000
        });
      }

      // 5. RÃ©initialiser
      clearCart();

    } catch (error: any) {
      console.error('[OfflinePOS] Erreur:', error);
      toast.error('Erreur lors de la vente', {
        description: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* BanniÃ¨re mode offline */}
      <div className="mb-4 p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
          ðŸ”´ Mode Hors Ligne - Limite journaliÃ¨re: 50M GNF - Paiements: Cash, USSD, QR uniquement
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des produits (gauche) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold">Produits Disponibles</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {stock.filter(item => item.available_quantity > 0).map(item => (
              <Card
                key={item.product_id}
                className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => addToCart({
                  id: item.product_id,
                  name: item.product_name,
                  price: 10000, // TODO: RÃ©cupÃ©rer le prix rÃ©el
                  sku: item.product_sku
                })}
              >
                <h3 className="font-semibold truncate">{item.product_name}</h3>
                <p className="text-sm text-gray-500">Stock: {item.available_quantity} {item.unit}</p>
                <p className="text-lg font-bold mt-2">10 000 GNF</p>
                <Button size="sm" className="w-full mt-2">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Panier (droite) */}
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Panier ({cart.length})
            </h2>

            {/* Items du panier */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500">{item.unit_price.toLocaleString()} GNF</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeFromCart(item.product_id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <p className="text-center text-gray-500 py-8">Panier vide</p>
              )}
            </div>

            {/* Client */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Nom du client (optionnel)</label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nom du client..."
              />
            </div>

            {/* MÃ©thodes de paiement */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">MÃ©thode de paiement</label>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedPayment('cash')}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    selectedPayment === 'cash'
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <p className="font-medium">ðŸ’µ EspÃ¨ces (Cash)</p>
                  <p className="text-xs text-gray-500">Paiement immÃ©diat</p>
                </button>

                <button
                  onClick={() => setSelectedPayment('ussd')}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    selectedPayment === 'ussd'
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <p className="font-medium">ðŸ“± USSD</p>
                  <p className="text-xs text-gray-500">Code gÃ©nÃ©rÃ© localement</p>
                </button>

                <button
                  onClick={() => setSelectedPayment('qr_local')}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    selectedPayment === 'qr_local'
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <p className="font-medium">ðŸ“² QR Code Local</p>
                  <p className="text-xs text-gray-500">Paiement diffÃ©rÃ©</p>
                </button>
              </div>
            </div>

            {/* Totaux */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex justify-between text-sm">
                <span>Sous-total:</span>
                <span>{subtotal.toLocaleString()} GNF</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-primary-orange-600">
                  <span>Remise:</span>
                  <span>-{discount.toLocaleString()} GNF</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span>{total.toLocaleString()} GNF</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 mt-4">
              <Button
                className="w-full"
                size="lg"
                onClick={completeSale}
                disabled={cart.length === 0 || isProcessing}
              >
                <Receipt className="w-4 h-4 mr-2" />
                {isProcessing ? 'Traitement...' : 'Finaliser la Vente'}
              </Button>

              {cart.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearCart}
                  disabled={isProcessing}
                >
                  Vider le Panier
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default OfflinePOSInterface;
