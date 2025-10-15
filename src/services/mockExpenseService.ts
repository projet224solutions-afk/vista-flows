/**
 * SERVICE MOCK POUR LES DÉPENSES
 * Utilisé temporairement en attendant la configuration complète de la DB
 */

export interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface ExpenseWithDetails {
  id: string;
  amount: number;
  description: string;
  category?: ExpenseCategory;
  expense_date: string;
  vendor_id: string;
}

export interface ExpenseStats {
  total_expenses: number;
  expense_count: number;
  average_expense: number;
  categories: Array<{ name: string; total: number; count: number; color: string }>;
  payment_methods: Record<string, number>;
  monthly_trend: Array<{ month: string; total: number }>;
}

export class MockExpenseService {
  static getCategories(vendorId?: string): ExpenseCategory[] {
    return [];
  }

  static getExpenses(filters?: unknown): { expenses: ExpenseWithDetails[]; total: number } {
    return { expenses: [], total: 0 };
  }

  static getStats(vendorId?: string, startDate?: Date, endDate?: Date): ExpenseStats {
    return {
      total_expenses: 0,
      expense_count: 0,
      average_expense: 0,
      categories: [],
      payment_methods: {},
      monthly_trend: []
    };
  }

  static getAlerts(): unknown[] {
    return [];
  }

  static getBudgets(): unknown[] {
    return [];
  }

  static getAnalytics(): { anomalies: unknown[] } {
    return { anomalies: [] };
  }

  static getNotifications(): unknown[] {
    return [];
  }

  static getQuickStats() {
    return {
      totalExpenses: 0,
      expenseCount: 0,
      averageExpense: 0,
      unreadAlerts: 0,
      hasAnomalies: false
    };
  }

  static createCategory(data: unknown): void {
    // Mock implementation
  }

  static createExpense(data: unknown): void {
    // Mock implementation
  }

  static markAlertAsRead(alertId: string): void {
    // Mock implementation
  }

  static markNotificationAsRead(notificationId: string): void {
    // Mock implementation
  }
}
