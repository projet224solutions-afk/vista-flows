import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Charger le panier depuis localStorage au montage
  useEffect(() => {
    const savedCart = localStorage.getItem('224solutions_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Erreur chargement panier:', error);
      }
    }
  }, []);

  // Sauvegarder le panier dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem('224solutions_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCartItems(prev => {
      const existingItem = prev.find(i => i.id === item.id);
      
      if (existingItem) {
        toast.success('Quantité augmentée dans le panier');
        return prev.map(i =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      
      toast.success('Produit ajouté au panier');
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    toast.info('Produit retiré du panier');
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCartItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
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
