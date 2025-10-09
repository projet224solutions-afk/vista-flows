/**
 * 💰 HOOKS REACT POUR LA GESTION DES DÉPENSES - 224SOLUTIONS
 * Version simplifiée utilisant le service mock pour éviter les erreurs
 */

import useMockExpenseManagement from './useMockExpenseManagement';

export function useExpenseCategories() {
  const mock = useMockExpenseManagement();
  return {
    categories: mock.categories,
    isLoading: mock.isLoading,
    error: mock.error,
    refetch: mock.refetch,
    createCategory: mock.createCategory,
    updateCategory: mock.updateCategory,
    deleteCategory: mock.deleteCategory,
    createDefaultCategories: mock.createDefaultCategories,
    isCreating: mock.isCreating,
    isUpdating: mock.isUpdating,
    isDeleting: mock.isDeleting,
  };
}

export function useExpenses(filters = {}, page = 1, limit = 20) {
  const mock = useMockExpenseManagement();
  return {
    expenses: mock.expenses,
    totalExpenses: mock.totalExpenses,
    isLoading: mock.isLoading,
    error: mock.error,
    refetch: mock.refetch,
    createExpense: mock.createExpense,
    updateExpense: mock.updateExpense,
    deleteExpense: mock.deleteExpense,
    approveExpense: mock.approveExpense,
    rejectExpense: mock.rejectExpense,
    isCreating: mock.isCreating,
    isUpdating: mock.isUpdating,
    isDeleting: mock.isDeleting,
    isApproving: false,
    isRejecting: false,
  };
}

export function useExpenseAnalytics(startDate?: string, endDate?: string) {
  const mock = useMockExpenseManagement();
  return {
    stats: mock.analytics,
    anomalies: mock.anomalies,
    detailedAnalytics: null,
    isLoading: mock.isLoading,
    error: mock.error,
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

export function useExpenseBudgets(year?: number, month?: number) {
  const mock = useMockExpenseManagement();
  return {
    budgets: mock.budgets,
    isLoading: mock.isLoading,
    error: mock.error,
    refetch: mock.refetch,
    upsertBudget: () => {},
    isUpdating: false,
  };
}

export function useExpenseAlerts(unreadOnly = false) {
  const mock = useMockExpenseManagement();
  return {
    alerts: mock.alerts,
    unreadCount: 0,
    isLoading: mock.isLoading,
    error: mock.error,
    refetch: mock.refetch,
    markAsRead: mock.markAlertAsRead,
    dismissAlert: mock.dismissAlert,
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

export function useExpenseManagement() {
  return useMockExpenseManagement();
}

export default useExpenseManagement;
