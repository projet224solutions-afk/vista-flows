/**
 * 💰 SERVICE DE GESTION DES DÉPENSES - VERSION SIMPLIFIÉE
 * Version simplifiée pour éviter les erreurs TypeScript
 */

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
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface ExpenseBudget {
  id: string;
  category_id: string;
  amount: number;
}

export interface ExpenseAlert {
  id: string;
  message: string;
  is_read: boolean;
}

// Tous les services retournent des données mockées
export class ExpenseCategoryService {
  static async getVendorCategories(vendorId: string): Promise<ExpenseCategory[]> {
    return MockExpenseService.getCategories(vendorId);
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
    return MockExpenseService.getExpenses();
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
    return MockExpenseService.getStats();
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
