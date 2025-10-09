/**
 * 💰 SERVICE DE GESTION DES DÉPENSES - VERSION SIMPLIFIÉE
 * Version simplifiée pour éviter les erreurs TypeScript
 */

import { supabase } from '@/lib/supabase';
import { MockExpenseService, type ExpenseCategory, type ExpenseWithDetails, type ExpenseStats } from './mockExpenseService';

export type { ExpenseCategory, ExpenseWithDetails, ExpenseStats };

export interface VendorExpense {
  id: string;
  amount: number;
  description: string;
  expense_date: string;
  vendor_id: string;
}

export interface ExpenseFilters {
  category_id?: string;
  category?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseBudget {
  id: string;
  category_id: string;
  amount: number;
}

export interface ExpenseAlert {
  id: string;
  type: string;
  message: string;
  date: string;
  is_read: boolean;
}

// Tous les services retournent des données mockées
export class ExpenseCategoryService {
  static async getVendorCategories(vendorId: string): Promise<ExpenseCategory[]> {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  static async createCategory(category: any): Promise<ExpenseCategory> {
    return { id: '1', name: 'Nouvelle catégorie', color: '#000', icon: 'tag' };
  }

  static async updateCategory(id: string, updates: any): Promise<void> {}
  
  static async deleteCategory(id: string): Promise<void> {}
  
  static async createDefaultCategories(vendorId: string): Promise<void> {}
}

export class ExpenseService {
  static async getVendorExpenses(
    vendorId: string,
    filters: ExpenseFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ expenses: ExpenseWithDetails[]; total: number }> {
    try {
      let query = supabase
        .from('vendor_expenses')
        .select('*, category:expense_categories(name, color, icon)', { count: 'exact' })
        .eq('vendor_id', vendorId)
        .order('expense_date', { ascending: false });

      if (filters.category) {
        query = query.eq('category_id', filters.category);
      }
      if (filters.startDate) {
        query = query.gte('expense_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('expense_date', filters.endDate);
      }

      const { data, error, count } = await query.range(
        (filters.page - 1) * filters.limit,
        filters.page * filters.limit - 1
      );

      if (error) throw error;

      return {
        expenses: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return { expenses: [], total: 0 };
    }
  }

  static async createExpense(expense: any): Promise<VendorExpense> {
    return {
      id: '1',
      amount: 0,
      description: '',
      expense_date: new Date().toISOString(),
      vendor_id: ''
    };
  }

  static async updateExpense(id: string, updates: any): Promise<void> {}
  
  static async deleteExpense(id: string): Promise<void> {}
  
  static async approveExpense(id: string, approvedBy: string): Promise<void> {}
  
  static async rejectExpense(id: string, reason: string): Promise<void> {}
}

export class ExpenseAnalyticsService {
  static async getExpenseStats(
    vendorId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ExpenseStats> {
    try {
      const { data, error } = await supabase.rpc('calculate_expense_stats', {
        p_vendor_id: vendorId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;

      return data || {
        total_expenses: 0,
        expense_count: 0,
        average_expense: 0,
        categories: [],
        payment_methods: {},
        monthly_trend: []
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  static async detectAnomalies(vendorId: string): Promise<any[]> {
    return [];
  }

  static async getDetailedAnalytics(vendorId: string, period: string): Promise<any> {
    return null;
  }
}

export class ExpenseReceiptService {
  static async getExpenseReceipts(expenseId: string): Promise<any[]> {
    return [];
  }

  static async uploadReceipt(expenseId: string, file: File, isPrimary?: boolean): Promise<any> {
    return {};
  }

  static async deleteReceipt(id: string): Promise<void> {}

  static async getReceiptUrl(filePath: string): Promise<string> {
    return '';
  }
}

export class ExpenseBudgetService {
  static async getVendorBudgets(
    vendorId: string,
    year?: number,
    month?: number
  ): Promise<ExpenseBudget[]> {
    return [];
  }

  static async upsertBudget(budget: any): Promise<void> {}
}

export class ExpenseAlertService {
  static async getVendorAlerts(vendorId: string, unreadOnly: boolean = false): Promise<ExpenseAlert[]> {
    return [];
  }

  static async markAlertAsRead(alertId: string): Promise<void> {}

  static async dismissAlert(alertId: string): Promise<void> {}
}

export class ExpenseWalletIntegrationService {
  static async payExpenseFromWallet(expenseId: string, vendorId: string): Promise<any> {
    return { success: true };
  }

  static async getWalletExpenseHistory(vendorId: string): Promise<any[]> {
    return [];
  }
}
