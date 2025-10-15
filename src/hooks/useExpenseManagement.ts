/**
 * 💰 HOOK GESTION DÉPENSES RÉEL - 224SOLUTIONS
 * Hook opérationnel pour gestion des dépenses avec Supabase
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { expenseService, ExpenseCategory, VendorExpense, ExpenseStats, ExpenseAlert } from '@/services/expenseService';
import { toast } from 'sonner';

export function useExpenseManagement(vendorId?: string) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<VendorExpense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [alerts, setAlerts] = useState<ExpenseAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les catégories
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await expenseService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('❌ Erreur chargement catégories:', error);
      setError('Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les dépenses
  const loadExpenses = useCallback(async (filters?: unknown) => {
    if (!vendorId) return;

    try {
      setLoading(true);
      const data = await expenseService.getExpenses(vendorId, filters);
      setExpenses(data);
    } catch (error) {
      console.error('❌ Erreur chargement dépenses:', error);
      setError('Erreur lors du chargement des dépenses');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  // Charger les statistiques
  const loadStats = useCallback(async () => {
    if (!vendorId) return;

    try {
      const data = await expenseService.getStats(vendorId);
      setStats(data);
    } catch (error) {
      console.error('❌ Erreur chargement statistiques:', error);
      setError('Erreur lors du chargement des statistiques');
    }
  }, [vendorId]);

  // Charger les alertes
  const loadAlerts = useCallback(async () => {
    if (!vendorId) return;

    try {
      const data = await expenseService.getAlerts(vendorId);
      setAlerts(data);
    } catch (error) {
      console.error('❌ Erreur chargement alertes:', error);
      setError('Erreur lors du chargement des alertes');
    }
  }, [vendorId]);

  // Créer une dépense
  const createExpense = useCallback(async (expense: Omit<VendorExpense, 'id' | 'created_at' | 'updated_at' | 'category'>) => {
    try {
      const newExpense = await expenseService.createExpense(expense);
      setExpenses(prev => [newExpense, ...prev]);
      toast.success('Dépense créée avec succès');
      return newExpense;
    } catch (error) {
      console.error('❌ Erreur création dépense:', error);
      toast.error('Erreur lors de la création de la dépense');
      throw error;
    }
  }, []);

  // Mettre à jour une dépense
  const updateExpense = useCallback(async (id: string, updates: Partial<VendorExpense>) => {
    try {
      const updatedExpense = await expenseService.updateExpense(id, updates);
      setExpenses(prev => prev.map(expense => 
        expense.id === id ? updatedExpense : expense
      ));
      toast.success('Dépense mise à jour avec succès');
      return updatedExpense;
    } catch (error) {
      console.error('❌ Erreur mise à jour dépense:', error);
      toast.error('Erreur lors de la mise à jour de la dépense');
      throw error;
    }
  }, []);

  // Supprimer une dépense
  const deleteExpense = useCallback(async (id: string) => {
    try {
      await expenseService.deleteExpense(id);
      setExpenses(prev => prev.filter(expense => expense.id !== id));
      toast.success('Dépense supprimée avec succès');
    } catch (error) {
      console.error('❌ Erreur suppression dépense:', error);
      toast.error('Erreur lors de la suppression de la dépense');
      throw error;
    }
  }, []);

  // Créer une catégorie
  const createCategory = useCallback(async (category: Omit<ExpenseCategory, 'id' | 'created_at'>) => {
    try {
      const newCategory = await expenseService.createCategory(category);
      setCategories(prev => [...prev, newCategory]);
      toast.success('Catégorie créée avec succès');
      return newCategory;
    } catch (error) {
      console.error('❌ Erreur création catégorie:', error);
      toast.error('Erreur lors de la création de la catégorie');
      throw error;
    }
  }, []);

  // Charger toutes les données
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        loadCategories(),
        loadExpenses(),
        loadStats(),
        loadAlerts()
      ]);

      console.log('✅ Données dépenses chargées avec succès');
    } catch (error) {
      console.error('❌ Erreur chargement données dépenses:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [loadCategories, loadExpenses, loadStats, loadAlerts]);

  // Charger les données au montage
  useEffect(() => {
    if (vendorId) {
      loadAllData();
    }
  }, [vendorId, loadAllData]);

  // Statistiques calculées
  const quickStats = useMemo(() => {
    if (!stats) return null;

    return {
      totalExpenses: stats.total_expenses,
      monthlyExpenses: stats.monthly_expenses,
      categoryCount: categories.length,
      alertCount: alerts.length,
      pendingExpenses: expenses.filter(expense => expense.status === 'pending').length
    };
  }, [stats, categories.length, alerts.length, expenses]);

  return {
    categories,
    expenses,
    stats,
    alerts,
    loading,
    error,
    quickStats,
    createExpense,
    updateExpense,
    deleteExpense,
    createCategory,
    loadAllData,
    refetch: loadAllData
  };
}