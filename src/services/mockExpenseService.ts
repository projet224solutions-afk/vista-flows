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
  static async getCategories(vendorId: string): Promise<ExpenseCategory[]> {
    return [];
  }

  static async getExpenses(vendorId: string): Promise<ExpenseWithDetails[]> {
    return [];
  }

  static async getStats(vendorId: string, startDate: Date, endDate: Date): Promise<ExpenseStats> {
    return {
      total_expenses: 0,
      expense_count: 0,
      average_expense: 0,
      categories: [],
      payment_methods: {},
      monthly_trend: []
    };
  }
}
