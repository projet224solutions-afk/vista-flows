/**
 * 💰 HOOKS REACT POUR LA GESTION DES DÉPENSES - 224SOLUTIONS
 * Hooks personnalisés pour l'interface vendeur de gestion des dépenses
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  ExpenseCategoryService,
  ExpenseService,
  ExpenseAnalyticsService,
  ExpenseReceiptService,
  ExpenseBudgetService,
  ExpenseAlertService,
  ExpenseWalletIntegrationService,
  type ExpenseCategory,
  type VendorExpense,
  type ExpenseWithDetails,
  type ExpenseStats,
  type ExpenseFilters,
  type ExpenseBudget,
  type ExpenseAlert
} from '@/services/expenseService';

/**
 * 🏷️ Hook pour la gestion des catégories de dépenses
 */
export function useExpenseCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les catégories
  const {
    data: categories = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['expense-categories', user?.id],
    queryFn: () => ExpenseCategoryService.getVendorCategories(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Créer une catégorie
  const createCategoryMutation = useMutation({
    mutationFn: ExpenseCategoryService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });

  // Mettre à jour une catégorie
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      ExpenseCategoryService.updateCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });

  // Supprimer une catégorie
  const deleteCategoryMutation = useMutation({
    mutationFn: ExpenseCategoryService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });

  // Créer les catégories par défaut
  const createDefaultCategoriesMutation = useMutation({
    mutationFn: () => ExpenseCategoryService.createDefaultCategories(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });

  return {
    categories,
    isLoading,
    error,
    refetch,
    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    createDefaultCategories: createDefaultCategoriesMutation.mutate,
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
}

/**
 * 💸 Hook pour la gestion des dépenses
 */
export function useExpenses(filters: ExpenseFilters = {}, page: number = 1, limit: number = 20) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les dépenses
  const {
    data: expensesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['expenses', user?.id, filters, page, limit],
    queryFn: () => ExpenseService.getVendorExpenses(user!.id, filters, page, limit),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Créer une dépense
  const createExpenseMutation = useMutation({
    mutationFn: ExpenseService.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    },
  });

  // Mettre à jour une dépense
  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      ExpenseService.updateExpense(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    },
  });

  // Supprimer une dépense
  const deleteExpenseMutation = useMutation({
    mutationFn: ExpenseService.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    },
  });

  // Approuver une dépense
  const approveExpenseMutation = useMutation({
    mutationFn: ({ id, approvedBy }: { id: string; approvedBy: string }) =>
      ExpenseService.approveExpense(id, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    },
  });

  // Rejeter une dépense
  const rejectExpenseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      ExpenseService.rejectExpense(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  return {
    expenses: expensesData?.expenses || [],
    totalExpenses: expensesData?.total || 0,
    isLoading,
    error,
    refetch,
    createExpense: createExpenseMutation.mutate,
    updateExpense: updateExpenseMutation.mutate,
    deleteExpense: deleteExpenseMutation.mutate,
    approveExpense: approveExpenseMutation.mutate,
    rejectExpense: rejectExpenseMutation.mutate,
    isCreating: createExpenseMutation.isPending,
    isUpdating: updateExpenseMutation.isPending,
    isDeleting: deleteExpenseMutation.isPending,
    isApproving: approveExpenseMutation.isPending,
    isRejecting: rejectExpenseMutation.isPending,
  };
}

/**
 * 📊 Hook pour les statistiques et analyses des dépenses
 */
export function useExpenseAnalytics(startDate?: string, endDate?: string) {
  const { user } = useAuth();

  // Statistiques générales
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError
  } = useQuery({
    queryKey: ['expense-stats', user?.id, startDate, endDate],
    queryFn: () => ExpenseAnalyticsService.getExpenseStats(user!.id, startDate, endDate),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Détection d'anomalies
  const {
    data: anomalies = [],
    isLoading: isLoadingAnomalies,
    error: anomaliesError
  } = useQuery({
    queryKey: ['expense-anomalies', user?.id],
    queryFn: () => ExpenseAnalyticsService.detectAnomalies(user!.id),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Analyses détaillées
  const {
    data: detailedAnalytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError
  } = useQuery({
    queryKey: ['expense-detailed-analytics', user?.id],
    queryFn: () => ExpenseAnalyticsService.getDetailedAnalytics(user!.id, 'monthly'),
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    stats: stats || {
      total_expenses: 0,
      expense_count: 0,
      average_expense: 0,
      categories: [],
      payment_methods: {},
      monthly_trend: []
    },
    anomalies,
    detailedAnalytics,
    isLoading: isLoadingStats || isLoadingAnomalies || isLoadingAnalytics,
    error: statsError || anomaliesError || analyticsError,
  };
}

/**
 * 📄 Hook pour la gestion des justificatifs
 */
export function useExpenseReceipts(expenseId?: string) {
  const queryClient = useQueryClient();

  // Récupérer les justificatifs d'une dépense
  const {
    data: receipts = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['expense-receipts', expenseId],
    queryFn: () => ExpenseReceiptService.getExpenseReceipts(expenseId!),
    enabled: !!expenseId,
    staleTime: 5 * 60 * 1000,
  });

  // Upload d'un justificatif
  const uploadReceiptMutation = useMutation({
    mutationFn: ({ expenseId, file, isPrimary }: { expenseId: string; file: File; isPrimary?: boolean }) =>
      ExpenseReceiptService.uploadReceipt(expenseId, file, isPrimary),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-receipts'] });
    },
  });

  // Supprimer un justificatif
  const deleteReceiptMutation = useMutation({
    mutationFn: ExpenseReceiptService.deleteReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-receipts'] });
    },
  });

  // Obtenir l'URL d'un justificatif
  const getReceiptUrl = useCallback(async (filePath: string) => {
    return await ExpenseReceiptService.getReceiptUrl(filePath);
  }, []);

  return {
    receipts,
    isLoading,
    error,
    uploadReceipt: uploadReceiptMutation.mutate,
    deleteReceipt: deleteReceiptMutation.mutate,
    getReceiptUrl,
    isUploading: uploadReceiptMutation.isPending,
    isDeleting: deleteReceiptMutation.isPending,
  };
}

/**
 * 💰 Hook pour la gestion des budgets
 */
export function useExpenseBudgets(year?: number, month?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les budgets
  const {
    data: budgets = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['expense-budgets', user?.id, year, month],
    queryFn: () => ExpenseBudgetService.getVendorBudgets(user!.id, year, month),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Créer ou mettre à jour un budget
  const upsertBudgetMutation = useMutation({
    mutationFn: ExpenseBudgetService.upsertBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-budgets'] });
    },
  });

  return {
    budgets,
    isLoading,
    error,
    refetch,
    upsertBudget: upsertBudgetMutation.mutate,
    isUpdating: upsertBudgetMutation.isPending,
  };
}

/**
 * 🔔 Hook pour la gestion des alertes
 */
export function useExpenseAlerts(unreadOnly: boolean = false) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les alertes
  const {
    data: alerts = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['expense-alerts', user?.id, unreadOnly],
    queryFn: () => ExpenseAlertService.getVendorAlerts(user!.id, unreadOnly),
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Marquer comme lue
  const markAsReadMutation = useMutation({
    mutationFn: ExpenseAlertService.markAlertAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-alerts'] });
    },
  });

  // Supprimer une alerte
  const dismissAlertMutation = useMutation({
    mutationFn: ExpenseAlertService.dismissAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-alerts'] });
    },
  });

  // Compter les alertes non lues
  const unreadCount = alerts.filter(alert => !alert.is_read).length;

  return {
    alerts,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    dismissAlert: dismissAlertMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isDismissing: dismissAlertMutation.isPending,
  };
}

/**
 * 🔗 Hook pour l'intégration avec le wallet
 */
export function useExpenseWalletIntegration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Payer une dépense via wallet
  const payFromWalletMutation = useMutation({
    mutationFn: ({ expenseId }: { expenseId: string }) =>
      ExpenseWalletIntegrationService.payExpenseFromWallet(expenseId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    },
  });

  // Historique des paiements wallet
  const {
    data: walletHistory = [],
    isLoading: isLoadingHistory,
    error: historyError
  } = useQuery({
    queryKey: ['expense-wallet-history', user?.id],
    queryFn: () => ExpenseWalletIntegrationService.getWalletExpenseHistory(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    payFromWallet: payFromWalletMutation.mutate,
    walletHistory,
    isPayingFromWallet: payFromWalletMutation.isPending,
    isLoadingHistory,
    historyError,
    paymentResult: payFromWalletMutation.data,
  };
}

/**
 * 🎯 Hook principal pour la gestion complète des dépenses
 */
export function useExpenseManagement() {
  const { user } = useAuth();
  const [currentFilters, setCurrentFilters] = useState<ExpenseFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExpense, setSelectedExpense] = useState<VendorExpense | null>(null);

  // Hooks spécialisés
  const categories = useExpenseCategories();
  const expenses = useExpenses(currentFilters, currentPage, 20);
  const analytics = useExpenseAnalytics();
  const alerts = useExpenseAlerts();
  const walletIntegration = useExpenseWalletIntegration();

  // Fonctions utilitaires
  const applyFilters = useCallback((filters: ExpenseFilters) => {
    setCurrentFilters(filters);
    setCurrentPage(1); // Reset à la première page
  }, []);

  const clearFilters = useCallback(() => {
    setCurrentFilters({});
    setCurrentPage(1);
  }, []);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const selectExpense = useCallback((expense: VendorExpense | null) => {
    setSelectedExpense(expense);
  }, []);

  // Statistiques rapides
  const quickStats = {
    totalExpenses: analytics.stats.total_expenses,
    expenseCount: analytics.stats.expense_count,
    averageExpense: analytics.stats.average_expense,
    unreadAlerts: alerts.unreadCount,
    hasAnomalies: analytics.anomalies.length > 0,
  };

  return {
    // État
    currentFilters,
    currentPage,
    selectedExpense,
    quickStats,
    
    // Données
    categories: categories.categories,
    expenses: expenses.expenses,
    totalExpenses: expenses.totalExpenses,
    analytics: analytics.stats,
    anomalies: analytics.anomalies,
    alerts: alerts.alerts,
    walletHistory: walletIntegration.walletHistory,
    
    // Actions de navigation
    applyFilters,
    clearFilters,
    goToPage,
    selectExpense,
    
    // Actions sur les catégories
    createCategory: categories.createCategory,
    updateCategory: categories.updateCategory,
    deleteCategory: categories.deleteCategory,
    createDefaultCategories: categories.createDefaultCategories,
    
    // Actions sur les dépenses
    createExpense: expenses.createExpense,
    updateExpense: expenses.updateExpense,
    deleteExpense: expenses.deleteExpense,
    approveExpense: expenses.approveExpense,
    rejectExpense: expenses.rejectExpense,
    
    // Actions sur les alertes
    markAlertAsRead: alerts.markAsRead,
    dismissAlert: alerts.dismissAlert,
    
    // Actions wallet
    payFromWallet: walletIntegration.payFromWallet,
    
    // États de chargement
    isLoading: categories.isLoading || expenses.isLoading || analytics.isLoading,
    isCreating: categories.isCreating || expenses.isCreating,
    isUpdating: categories.isUpdating || expenses.isUpdating,
    isDeleting: categories.isDeleting || expenses.isDeleting,
    
    // Erreurs
    error: categories.error || expenses.error || analytics.error,
    
    // Fonctions de rafraîchissement
    refetch: () => {
      categories.refetch();
      expenses.refetch();
      alerts.refetch();
    }
  };
}

// Export par défaut
export default useExpenseManagement;
