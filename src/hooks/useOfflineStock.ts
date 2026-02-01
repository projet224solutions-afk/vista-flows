/**
 * Hook useOfflineStock - Gestion du stock local en temps réel
 * 224SOLUTIONS - Mode Offline Avancé
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getVendorStock,
  getProductStock,
  decrementStockFromSale,
  adjustStock,
  getActiveAlerts,
  acknowledgeAlert,
  getStockStats,
  type LocalStockItem,
  type StockAlert
} from '@/lib/offline/localStockManager';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useOfflineStock() {
  const { user } = useAuth();
  const [stock, setStock] = useState<LocalStockItem[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    activeAlertsCount: 0,
    recentMovementsCount: 0
  });
  const [loading, setLoading] = useState(true);

  /**
   * Charger le stock
   */
  const loadStock = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [stockData, alertsData, statsData] = await Promise.all([
        getVendorStock(user.id),
        getActiveAlerts(user.id),
        getStockStats(user.id)
      ]);

      setStock(stockData);
      setAlerts(alertsData);
      setStats(statsData);
    } catch (error) {
      console.error('[useOfflineStock] Erreur chargement:', error);
      toast.error('Erreur lors du chargement du stock local');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Décompter le stock après une vente
   */
  const decrementStock = useCallback(async (
    productId: string,
    quantity: number,
    saleReference: string
  ) => {
    const result = await decrementStockFromSale(productId, quantity, saleReference);

    if (result.success) {
      await loadStock(); // Recharger le stock
      toast.success(`Stock mis à jour: ${quantity} unité(s) vendues`);
    } else {
      toast.error(result.error || 'Erreur lors de la mise à jour du stock');
    }

    return result;
  }, [loadStock]);

  /**
   * Ajuster manuellement le stock
   */
  const updateStock = useCallback(async (
    productId: string,
    newQuantity: number,
    reason?: string
  ) => {
    if (!user?.id) return { success: false, error: 'Utilisateur non connecté' };

    const result = await adjustStock(productId, user.id, newQuantity, reason);

    if (result.success) {
      await loadStock();
      toast.success('Stock ajusté avec succès');
    } else {
      toast.error(result.error || 'Erreur lors de l\'ajustement du stock');
    }

    return result;
  }, [user?.id, loadStock]);

  /**
   * Acquitter une alerte
   */
  const dismissAlert = useCallback(async (alertId: string) => {
    await acknowledgeAlert(alertId);
    await loadStock();
    toast.success('Alerte acquittée');
  }, [loadStock]);

  /**
   * Obtenir le stock d'un produit spécifique
   */
  const getStock = useCallback(async (productId: string) => {
    return await getProductStock(productId);
  }, []);

  /**
   * Vérifier si un produit est en stock
   */
  const isInStock = useCallback((productId: string, quantity: number = 1): boolean => {
    const item = stock.find(s => s.product_id === productId);
    return item ? item.available_quantity >= quantity : false;
  }, [stock]);

  /**
   * Obtenir les produits en stock bas
   */
  const lowStockProducts = stock.filter(item =>
    item.available_quantity > 0 && item.available_quantity <= item.min_stock_alert
  );

  /**
   * Obtenir les produits en rupture
   */
  const outOfStockProducts = stock.filter(item => item.available_quantity === 0);

  // Charger au montage
  useEffect(() => {
    loadStock();

    // Recharger toutes les 30 secondes
    const interval = setInterval(loadStock, 30000);

    return () => clearInterval(interval);
  }, [loadStock]);

  return {
    stock,
    alerts,
    stats,
    loading,
    lowStockProducts,
    outOfStockProducts,
    decrementStock,
    updateStock,
    dismissAlert,
    getStock,
    isInStock,
    reload: loadStock
  };
}

export default useOfflineStock;
