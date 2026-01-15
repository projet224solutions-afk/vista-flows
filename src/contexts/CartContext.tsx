import React, { createContext, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { useListPersistence } from '@/hooks/useAppPersistence';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  vendor_id: string;
  vendor_name?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Utiliser le hook de persistence universel avec sauvegarde automatique
  const { 
    items: cartItems, 
    setItems: setCartItems, 
    addItem,
    removeItem,
    updateItem,
    clearList,
    isRestored 
  } = useListPersistence<CartItem>('marketplace_cart', {
    enabled: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 heures pour le panier
    onRestore: (items) => {
      if (items.length > 0) {
        toast.success(`🛒 Panier restauré (${items.length} article${items.length > 1 ? 's' : ''})`, {
          duration: 3000
        });
      }
    }
  });

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    const existingItem = cartItems.find(i => i.id === item.id);
    
    if (existingItem) {
      updateItem(item.id, { quantity: existingItem.quantity + 1 });
      toast.success('Quantité augmentée dans le panier');
    } else {
      addItem({ ...item, quantity: 1 });
      toast.success('Produit ajouté au panier');
    }
  };

  const removeFromCart = (itemId: string) => {
    removeItem(itemId);
    toast.info('Produit retiré du panier');
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    updateItem(itemId, { quantity });
  };

  const clearCart = () => {
    clearList();
    toast.info('Panier vidé');
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
