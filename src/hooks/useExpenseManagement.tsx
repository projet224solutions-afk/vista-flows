/**
 * 💰 HOOKS REACT POUR LA GESTION DES DÉPENSES - 224SOLUTIONS
 * Version connectée aux données réelles Supabase
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExpenseCategory {
  id: string;
  vendor_id: string;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorExpense {
  id: string;
  vendor_id: string;
  category_id?: string;
  amount: number;
  description: string;
  expense_date: string;
  payment_method?: string;
  status: string;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory;
}

export function useExpenseCategories(vendorId?: string) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    if (!vendorId) return;
    
    try {
      setIsLoading(true);
      const { data, error: err } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('name');

      if (err) throw err;
      setCategories(data || []);
    } catch (err) {
      console.error('❌ Erreur chargement catégories:', err);
      setError('Erreur lors du chargement des catégories');
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const createCategory = useCallback(async (categoryData: Partial<ExpenseCategory>) => {
    try {
      const { data, error: err } = await supabase
        .from('expense_categories')
        .insert([categoryData])
        .select()
        .single();

      if (err) throw err;
      setCategories(prev => [...prev, data]);
      toast.success('Catégorie créée avec succès');
      return data;
    } catch (err) {
      console.error('❌ Erreur création catégorie:', err);
      toast.error('Erreur lors de la création de la catégorie');
      throw err;
    }
  }, []);

  const updateCategory = useCallback(async (id: string, updates: Partial<ExpenseCategory>) => {
    try {
      const { data, error: err } = await supabase
        .from('expense_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (err) throw err;
      setCategories(prev => prev.map(cat => cat.id === id ? data : cat));
      toast.success('Catégorie mise à jour');
      return data;
    } catch (err) {
      console.error('❌ Erreur mise à jour catégorie:', err);
      toast.error('Erreur lors de la mise à jour');
      throw err;
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);

      if (err) throw err;
      setCategories(prev => prev.filter(cat => cat.id !== id));
      toast.success('Catégorie supprimée');
    } catch (err) {
      console.error('❌ Erreur suppression catégorie:', err);
      toast.error('Erreur lors de la suppression');
      throw err;
    }
  }, []);

  return {
    categories,
    isLoading,
    error,
    refetch: loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createDefaultCategories: async () => {},
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  };
}

export function useExpenses(vendorId?: string, filters = {}, page = 1, limit = 20) {
  const [expenses, setExpenses] = useState<VendorExpense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    if (!vendorId) return;
    
    try {
      setIsLoading(true);
      const { data, error: err, count } = await supabase
        .from('vendor_expenses')
        .select(`
          *,
          category:expense_categories(*)
        `, { count: 'exact' })
        .eq('vendor_id', vendorId)
        .order('expense_date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (err) throw err;
      setExpenses(data || []);
      setTotalExpenses(count || 0);
    } catch (err) {
      console.error('❌ Erreur chargement dépenses:', err);
      setError('Erreur lors du chargement des dépenses');
    } finally {
      setIsLoading(false);
    }
  }, [vendorId, page, limit]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const createExpense = useCallback(async (expenseData: Partial<VendorExpense>) => {
    try {
      const { data, error: err } = await supabase
        .from('vendor_expenses')
        .insert([expenseData])
        .select()
        .single();

      if (err) throw err;
      setExpenses(prev => [data, ...prev]);
      toast.success('Dépense créée avec succès');
      return data;
    } catch (err) {
      console.error('❌ Erreur création dépense:', err);
      toast.error('Erreur lors de la création de la dépense');
      throw err;
    }
  }, []);

  const updateExpense = useCallback(async (id: string, updates: Partial<VendorExpense>) => {
    try {
      const { data, error: err } = await supabase
        .from('vendor_expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (err) throw err;
      setExpenses(prev => prev.map(exp => exp.id === id ? data : exp));
      toast.success('Dépense mise à jour');
      return data;
    } catch (err) {
      console.error('❌ Erreur mise à jour dépense:', err);
      toast.error('Erreur lors de la mise à jour');
      throw err;
    }
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('vendor_expenses')
        .delete()
        .eq('id', id);

      if (err) throw err;
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      toast.success('Dépense supprimée');
    } catch (err) {
      console.error('❌ Erreur suppression dépense:', err);
      toast.error('Erreur lors de la suppression');
      throw err;
    }
  }, []);

  return {
    expenses,
    totalExpenses,
    isLoading,
    error,
    refetch: loadExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    approveExpense: async () => {},
    rejectExpense: async () => {},
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isApproving: false,
    isRejecting: false,
  };
}

export function useExpenseAnalytics(vendorId?: string, startDate?: string, endDate?: string) {
  const [stats, setStats] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        // Charger les statistiques depuis Supabase
        const { data: expenses } = await supabase
          .from('vendor_expenses')
          .select('*')
          .eq('vendor_id', vendorId);

        if (expenses) {
          const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
          setStats({
            total_expenses: total,
            expense_count: expenses.length,
            average_expense: expenses.length > 0 ? total / expenses.length : 0,
          });
        }
      } catch (err) {
        console.error('❌ Erreur chargement analytics:', err);
        setError('Erreur lors du chargement des statistiques');
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [vendorId, startDate, endDate]);

  return {
    stats,
    anomalies,
    detailedAnalytics: null,
    isLoading,
    error,
  };
}

export function useExpenseReceipts(expenseId?: string) {
  return {
    receipts: [],
    isLoading: false,
    error: null,
    uploadReceipt: () => {},
    deleteReceipt: () => {},
    getReceiptUrl: async () => '',
    isUploading: false,
    isDeleting: false,
  };
}

export function useExpenseBudgets(vendorId?: string, year?: number, month?: number) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    
    const loadBudgets = async () => {
      try {
        setIsLoading(true);
        const { data, error: err } = await supabase
          .from('expense_budgets')
          .select('*')
          .eq('vendor_id', vendorId);

        if (err) throw err;
        setBudgets(data || []);
      } catch (err) {
        console.error('❌ Erreur chargement budgets:', err);
        setError('Erreur lors du chargement des budgets');
      } finally {
        setIsLoading(false);
      }
    };

    loadBudgets();
  }, [vendorId, year, month]);

  return {
    budgets,
    isLoading,
    error,
    refetch: () => {},
    upsertBudget: () => {},
    isUpdating: false,
  };
}

export function useExpenseAlerts(vendorId?: string, unreadOnly = false) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    
    const loadAlerts = async () => {
      try {
        setIsLoading(true);
        let query = supabase
          .from('expense_alerts')
          .select('*')
          .eq('vendor_id', vendorId);

        if (unreadOnly) {
          query = query.eq('is_read', false);
        }

        const { data, error: err } = await query;
        if (err) throw err;
        setAlerts(data || []);
      } catch (err) {
        console.error('❌ Erreur chargement alertes:', err);
        setError('Erreur lors du chargement des alertes');
      } finally {
        setIsLoading(false);
      }
    };

    loadAlerts();
  }, [vendorId, unreadOnly]);

  return {
    alerts,
    unreadCount: alerts.filter(a => !a.is_read).length,
    isLoading,
    error,
    refetch: () => {},
    markAsRead: async () => {},
    dismissAlert: async () => {},
    isMarkingAsRead: false,
    isDismissing: false,
  };
}

export function useExpenseWalletIntegration() {
  return {
    payFromWallet: () => {},
    walletHistory: [],
    isPayingFromWallet: false,
    isLoadingHistory: false,
    historyError: null,
    paymentResult: null,
  };
}

export function useExpenseManagement(vendorId?: string) {
  const categories = useExpenseCategories(vendorId);
  const expenses = useExpenses(vendorId);
  const analytics = useExpenseAnalytics(vendorId);
  const alerts = useExpenseAlerts(vendorId);

  return {
    ...categories,
    ...expenses,
    ...analytics,
    ...alerts,
  };
}

export default useExpenseManagement;
