/**
 * 💰 SERVICE DE GESTION DES DÉPENSES - 224SOLUTIONS
 * Service backend complet pour la gestion des dépenses vendeurs
 */

import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

// Types TypeScript pour les dépenses
export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];
export type ExpenseCategoryInsert = Database['public']['Tables']['expense_categories']['Insert'];
export type ExpenseCategoryUpdate = Database['public']['Tables']['expense_categories']['Update'];

export type VendorExpense = Database['public']['Tables']['vendor_expenses']['Row'];
export type VendorExpenseInsert = Database['public']['Tables']['vendor_expenses']['Insert'];
export type VendorExpenseUpdate = Database['public']['Tables']['vendor_expenses']['Update'];

export type ExpenseReceipt = Database['public']['Tables']['expense_receipts']['Row'];
export type ExpenseReceiptInsert = Database['public']['Tables']['expense_receipts']['Insert'];

export type ExpenseBudget = Database['public']['Tables']['expense_budgets']['Row'];
export type ExpenseBudgetInsert = Database['public']['Tables']['expense_budgets']['Insert'];
export type ExpenseBudgetUpdate = Database['public']['Tables']['expense_budgets']['Update'];

export type ExpenseAnalytics = Database['public']['Tables']['expense_analytics']['Row'];
export type ExpenseAlert = Database['public']['Tables']['expense_alerts']['Row'];

// Interfaces pour les données enrichies
export interface ExpenseWithDetails extends VendorExpense {
    category?: ExpenseCategory;
    receipts?: ExpenseReceipt[];
    receipt_count?: number;
}

export interface ExpenseStats {
    total_expenses: number;
    expense_count: number;
    average_expense: number;
    categories: Array<{
        name: string;
        total: number;
        count: number;
        color: string;
    }>;
    payment_methods: Record<string, number>;
    monthly_trend: Array<{
        month: string;
        total: number;
    }>;
}

export interface ExpenseFilters {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    status?: string;
    paymentMethod?: string;
    minAmount?: number;
    maxAmount?: number;
    searchQuery?: string;
}

/**
 * 🏷️ GESTION DES CATÉGORIES DE DÉPENSES
 */
export class ExpenseCategoryService {
    /**
     * Récupérer toutes les catégories d'un vendeur
     */
    static async getVendorCategories(vendorId: string): Promise<ExpenseCategory[]> {
        try {
            const { data, error } = await supabase
                .from('expense_categories')
                .select('*')
                .eq('vendor_id', vendorId)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur lors de la récupération des catégories:', error);
            throw new Error('Impossible de récupérer les catégories de dépenses');
        }
    }

    /**
     * Créer une nouvelle catégorie
     */
    static async createCategory(category: ExpenseCategoryInsert): Promise<ExpenseCategory> {
        try {
            const { data, error } = await supabase
                .from('expense_categories')
                .insert(category)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur lors de la création de la catégorie:', error);
            throw new Error('Impossible de créer la catégorie');
        }
    }

    /**
     * Mettre à jour une catégorie
     */
    static async updateCategory(
        categoryId: string,
        updates: ExpenseCategoryUpdate
    ): Promise<ExpenseCategory> {
        try {
            const { data, error } = await supabase
                .from('expense_categories')
                .update(updates)
                .eq('id', categoryId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la catégorie:', error);
            throw new Error('Impossible de mettre à jour la catégorie');
        }
    }

    /**
     * Supprimer une catégorie (soft delete) - Désactivé car is_active n'existe pas
     */
    static async deleteCategory(categoryId: string): Promise<void> {
        try {
            // La colonne is_active n'existe pas dans expense_categories
            // Pour l'instant, on désactive cette fonctionnalité
            const { error } = await supabase
                .from('expense_categories')
                .delete()
                .eq('id', categoryId);

            if (error) throw error;
        } catch (error) {
            console.error('Erreur lors de la suppression de la catégorie:', error);
            throw new Error('Impossible de supprimer la catégorie');
        }
    }

    /**
     * Créer les catégories par défaut pour un nouveau vendeur
     */
    static async createDefaultCategories(vendorId: string): Promise<void> {
        try {
            const { error } = await supabase.rpc('create_default_expense_categories', {
                p_vendor_id: vendorId
            });

            if (error) throw error;
        } catch (error) {
            console.error('Erreur lors de la création des catégories par défaut:', error);
            throw new Error('Impossible de créer les catégories par défaut');
        }
    }
}

/**
 * 💸 GESTION DES DÉPENSES
 */
export class ExpenseService {
    /**
     * Récupérer les dépenses d'un vendeur avec filtres
     */
    static async getVendorExpenses(
        vendorId: string,
        filters: ExpenseFilters = {},
        page: number = 1,
        limit: number = 20
    ): Promise<{ expenses: ExpenseWithDetails[]; total: number }> {
        try {
            let query = supabase
                .from('vendor_expenses')
                .select(`
          *,
          category:expense_categories(*),
          receipts:expense_receipts(count)
        `)
                .eq('vendor_id', vendorId);

            // Appliquer les filtres
            if (filters.startDate) {
                query = query.gte('expense_date', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('expense_date', filters.endDate);
            }
            if (filters.categoryId) {
                query = query.eq('category_id', filters.categoryId);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.paymentMethod) {
                query = query.eq('payment_method', filters.paymentMethod);
            }
            if (filters.minAmount) {
                query = query.gte('amount', filters.minAmount);
            }
            if (filters.maxAmount) {
                query = query.lte('amount', filters.maxAmount);
            }
            if (filters.searchQuery) {
                query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
            }

            // Pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, error, count } = await query
                .order('expense_date', { ascending: false })
                .range(from, to);

            if (error) throw error;

            return {
                expenses: data || [],
                total: count || 0
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des dépenses:', error);
            throw new Error('Impossible de récupérer les dépenses');
        }
    }

    /**
     * Créer une nouvelle dépense
     */
    static async createExpense(expense: VendorExpenseInsert): Promise<VendorExpense> {
        try {
            const { data, error } = await supabase
                .from('vendor_expenses')
                .insert(expense)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur lors de la création de la dépense:', error);
            throw new Error('Impossible de créer la dépense');
        }
    }

    /**
     * Mettre à jour une dépense
     */
    static async updateExpense(
        expenseId: string,
        updates: VendorExpenseUpdate
    ): Promise<VendorExpense> {
        try {
            const { data, error } = await supabase
                .from('vendor_expenses')
                .update(updates)
                .eq('id', expenseId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la dépense:', error);
            throw new Error('Impossible de mettre à jour la dépense');
        }
    }

    /**
     * Supprimer une dépense
     */
    static async deleteExpense(expenseId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('vendor_expenses')
                .delete()
                .eq('id', expenseId);

            if (error) throw error;
        } catch (error) {
            console.error('Erreur lors de la suppression de la dépense:', error);
            throw new Error('Impossible de supprimer la dépense');
        }
    }

    /**
     * Approuver une dépense
     */
    static async approveExpense(expenseId: string, approvedBy: string): Promise<VendorExpense> {
        try {
            const { data, error } = await supabase
                .from('vendor_expenses')
                .update({
                    status: 'approved',
                    approved_by: approvedBy,
                    approved_at: new Date().toISOString()
                })
                .eq('id', expenseId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur lors de l\'approbation de la dépense:', error);
            throw new Error('Impossible d\'approuver la dépense');
        }
    }

    /**
     * Rejeter une dépense
     */
    static async rejectExpense(
        expenseId: string,
        rejectionReason: string
    ): Promise<VendorExpense> {
        try {
            const { data, error } = await supabase
                .from('vendor_expenses')
                .update({
                    status: 'rejected',
                    rejection_reason: rejectionReason
                })
                .eq('id', expenseId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur lors du rejet de la dépense:', error);
            throw new Error('Impossible de rejeter la dépense');
        }
    }
}

/**
 * 📊 GESTION DES STATISTIQUES ET ANALYSES
 */
export class ExpenseAnalyticsService {
    /**
     * Récupérer les statistiques de dépenses
     */
    static async getExpenseStats(
        vendorId: string,
        startDate?: string,
        endDate?: string
    ): Promise<ExpenseStats> {
        try {
            const { data, error } = await supabase.rpc('calculate_expense_stats', {
                p_vendor_id: vendorId,
                p_start_date: startDate || null,
                p_end_date: endDate || null
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
            console.error('Erreur lors du calcul des statistiques:', error);
            throw new Error('Impossible de calculer les statistiques');
        }
    }

    /**
     * Détecter les anomalies de dépenses
     */
    static async detectAnomalies(vendorId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase.rpc('detect_expense_anomalies', {
                p_vendor_id: vendorId
            });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur lors de la détection d\'anomalies:', error);
            throw new Error('Impossible de détecter les anomalies');
        }
    }

    /**
     * Récupérer les analyses détaillées
     */
    static async getDetailedAnalytics(
        vendorId: string,
        period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
    ): Promise<ExpenseAnalytics | null> {
        try {
            const { data, error } = await supabase
                .from('expense_analytics')
                .select('*')
                .eq('vendor_id', vendorId)
                .eq('analysis_period', period)
                .eq('is_current', true)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            console.error('Erreur lors de la récupération des analyses:', error);
            throw new Error('Impossible de récupérer les analyses');
        }
    }
}

/**
 * 📄 GESTION DES JUSTIFICATIFS
 */
export class ExpenseReceiptService {
    /**
     * Uploader un justificatif
     */
    static async uploadReceipt(
        expenseId: string,
        file: File,
        isPrimary: boolean = false
    ): Promise<ExpenseReceipt> {
        try {
            // 1. Upload du fichier vers Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${expenseId}_${Date.now()}.${fileExt}`;
            const filePath = `expense-receipts/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Créer l'enregistrement du justificatif
            const receiptData: ExpenseReceiptInsert = {
                expense_id: expenseId,
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                file_type: file.type.includes('pdf') ? 'pdf' : 'image',
                mime_type: file.type,
                is_primary: isPrimary
            };

            const { data, error } = await supabase
                .from('expense_receipts')
                .insert(receiptData)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur lors de l\'upload du justificatif:', error);
            throw new Error('Impossible d\'uploader le justificatif');
        }
    }

    /**
     * Récupérer les justificatifs d'une dépense
     */
    static async getExpenseReceipts(expenseId: string): Promise<ExpenseReceipt[]> {
        try {
            const { data, error } = await supabase
                .from('expense_receipts')
                .select('*')
                .eq('expense_id', expenseId)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur lors de la récupération des justificatifs:', error);
            throw new Error('Impossible de récupérer les justificatifs');
        }
    }

    /**
     * Supprimer un justificatif
     */
    static async deleteReceipt(receiptId: string): Promise<void> {
        try {
            // 1. Récupérer les infos du justificatif
            const { data: receipt, error: fetchError } = await supabase
                .from('expense_receipts')
                .select('file_path')
                .eq('id', receiptId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Supprimer le fichier du storage
            const { error: deleteFileError } = await supabase.storage
                .from('documents')
                .remove([receipt.file_path]);

            if (deleteFileError) throw deleteFileError;

            // 3. Supprimer l'enregistrement
            const { error: deleteRecordError } = await supabase
                .from('expense_receipts')
                .delete()
                .eq('id', receiptId);

            if (deleteRecordError) throw deleteRecordError;
        } catch (error) {
            console.error('Erreur lors de la suppression du justificatif:', error);
            throw new Error('Impossible de supprimer le justificatif');
        }
    }

    /**
     * Obtenir l'URL publique d'un justificatif
     */
    static async getReceiptUrl(filePath: string): Promise<string> {
        try {
            const { data } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Erreur lors de la génération de l\'URL:', error);
            throw new Error('Impossible de générer l\'URL du justificatif');
        }
    }
}

/**
 * 💰 GESTION DES BUDGETS
 */
export class ExpenseBudgetService {
    /**
     * Récupérer les budgets d'un vendeur
     */
    static async getVendorBudgets(
        vendorId: string,
        year?: number,
        month?: number
    ): Promise<ExpenseBudget[]> {
        try {
            let query = supabase
                .from('expense_budgets')
                .select(`
          *,
          category:expense_categories(*)
        `)
                .eq('vendor_id', vendorId);

            if (year) query = query.eq('year', year);
            if (month) query = query.eq('month', month);

            const { data, error } = await query.order('year', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur lors de la récupération des budgets:', error);
            throw new Error('Impossible de récupérer les budgets');
        }
    }

    /**
     * Créer ou mettre à jour un budget
     */
    static async upsertBudget(budget: ExpenseBudgetInsert): Promise<ExpenseBudget> {
        try {
            const { data, error } = await supabase
                .from('expense_budgets')
                .upsert(budget, {
                    onConflict: 'vendor_id,category_id,year,month'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur lors de la création/mise à jour du budget:', error);
            throw new Error('Impossible de sauvegarder le budget');
        }
    }
}

/**
 * 🔔 GESTION DES ALERTES
 */
export class ExpenseAlertService {
    /**
     * Récupérer les alertes d'un vendeur
     */
    static async getVendorAlerts(
        vendorId: string,
        unreadOnly: boolean = false
    ): Promise<ExpenseAlert[]> {
        try {
            let query = supabase
                .from('expense_alerts')
                .select('*')
                .eq('vendor_id', vendorId);

            if (unreadOnly) {
                query = query.eq('is_read', false);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur lors de la récupération des alertes:', error);
            throw new Error('Impossible de récupérer les alertes');
        }
    }

    /**
     * Marquer une alerte comme lue
     */
    static async markAlertAsRead(alertId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('expense_alerts')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('id', alertId);

            if (error) throw error;
        } catch (error) {
            console.error('Erreur lors du marquage de l\'alerte:', error);
            throw new Error('Impossible de marquer l\'alerte comme lue');
        }
    }

    /**
     * Supprimer une alerte
     */
    static async dismissAlert(alertId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('expense_alerts')
                .update({
                    is_dismissed: true,
                    dismissed_at: new Date().toISOString()
                })
                .eq('id', alertId);

            if (error) throw error;
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'alerte:', error);
            throw new Error('Impossible de supprimer l\'alerte');
        }
    }
}

/**
 * 🔗 INTÉGRATION AVEC LE SYSTÈME WALLET
 */
export class ExpenseWalletIntegrationService {
    /**
     * Payer une dépense via le wallet
     */
    static async payExpenseFromWallet(
        expenseId: string,
        vendorId: string
    ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
        try {
            // 1. Récupérer les détails de la dépense
            const { data: expense, error: expenseError } = await supabase
                .from('vendor_expenses')
                .select('amount, currency, title')
                .eq('id', expenseId)
                .eq('vendor_id', vendorId)
                .single();

            if (expenseError) throw expenseError;

            // 2. Vérifier le solde du wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('balance, currency')
                .eq('user_id', vendorId)
                .single();

            if (walletError) throw walletError;

            if (wallet.balance < expense.amount) {
                return {
                    success: false,
                    error: 'Solde insuffisant dans le wallet'
                };
            }

            // 3. Créer la transaction wallet
            const { data: transaction, error: transactionError } = await supabase
                .from('wallet_transactions')
                .insert({
                    user_id: vendorId,
                    type: 'expense',
                    amount: -expense.amount,
                    currency: expense.currency,
                    description: `Paiement dépense: ${expense.title}`,
                    metadata: { expense_id: expenseId }
                })
                .select()
                .single();

            if (transactionError) throw transactionError;

            // 4. Mettre à jour le solde du wallet
            const { error: updateWalletError } = await supabase
                .from('wallets')
                .update({
                    balance: wallet.balance - expense.amount
                })
                .eq('user_id', vendorId);

            if (updateWalletError) throw updateWalletError;

            // 5. Mettre à jour la dépense
            const { error: updateExpenseError } = await supabase
                .from('vendor_expenses')
                .update({
                    payment_method: 'wallet',
                    payment_reference: transaction.id,
                    wallet_transaction_id: transaction.id,
                    status: 'paid'
                })
                .eq('id', expenseId);

            if (updateExpenseError) throw updateExpenseError;

            return {
                success: true,
                transactionId: transaction.id
            };
        } catch (error) {
            console.error('Erreur lors du paiement via wallet:', error);
            return {
                success: false,
                error: 'Erreur lors du paiement via wallet'
            };
        }
    }

    /**
     * Récupérer l'historique des dépenses payées via wallet
     */
    static async getWalletExpenseHistory(vendorId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('vendor_expenses')
                .select(`
          *,
          category:expense_categories(name, color),
          wallet_transaction:wallet_transactions(*)
        `)
                .eq('vendor_id', vendorId)
                .eq('payment_method', 'wallet')
                .not('wallet_transaction_id', 'is', null)
                .order('expense_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique wallet:', error);
            throw new Error('Impossible de récupérer l\'historique des paiements wallet');
        }
    }
}

// Export par défaut de tous les services
export default {
    ExpenseCategoryService,
    ExpenseService,
    ExpenseAnalyticsService,
    ExpenseReceiptService,
    ExpenseBudgetService,
    ExpenseAlertService,
    ExpenseWalletIntegrationService
};
