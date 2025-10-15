/**
 * 🎭 HOOK SIMULÉ POUR LA GESTION DES DÉPENSES - 224SOLUTIONS
 * Hook temporaire utilisant des données simulées pour permettre au système de fonctionner
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MockExpenseService } from '@/services/mockExpenseService';

/**
 * 🎯 Hook principal pour la gestion complète des dépenses (version simulée)
 */
export function useMockExpenseManagement() {
    const [currentFilters, setCurrentFilters] = useState<unknown>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedExpense, setSelectedExpense] = useState<unknown>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Données simulées - synchrones
    const categories = useMemo(() => MockExpenseService.getCategories(), []);
    const expensesData = useMemo(() => MockExpenseService.getExpenses(currentFilters), [currentFilters]);
    const analytics = useMemo(() => MockExpenseService.getStats(), []);
    const alerts = useMemo(() => MockExpenseService.getAlerts(), []);
    const budgets = useMemo(() => MockExpenseService.getBudgets(), []);
    const aiAnalytics = useMemo(() => MockExpenseService.getAnalytics(), []);
    const notifications = useMemo(() => MockExpenseService.getNotifications(), []);
    const quickStats = useMemo(() => MockExpenseService.getQuickStats(), []);

    // Fonctions utilitaires
    const applyFilters = useCallback((filters: unknown) => {
        setCurrentFilters(filters);
        setCurrentPage(1);
    }, []);

    const clearFilters = useCallback(() => {
        setCurrentFilters({});
        setCurrentPage(1);
    }, []);

    const goToPage = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    const selectExpense = useCallback((expense: unknown) => {
        setSelectedExpense(expense);
    }, []);

    // Actions simulées
    const createCategory = useCallback((categoryData: unknown) => {
        setIsLoading(true);
        setTimeout(() => {
            MockExpenseService.createCategory(categoryData);
            setIsLoading(false);
        }, 500);
    }, []);

    const createExpense = useCallback((expenseData: unknown) => {
        setIsLoading(true);
        setTimeout(() => {
            MockExpenseService.createExpense(expenseData);
            setIsLoading(false);
        }, 500);
    }, []);

    const markAlertAsRead = useCallback((alertId: string) => {
        MockExpenseService.markAlertAsRead(alertId);
    }, []);

    const markNotificationAsRead = useCallback((notificationId: string) => {
        MockExpenseService.markNotificationAsRead(notificationId);
    }, []);

    // Fonction de rafraîchissement simulée
    const refetch = useCallback(() => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
        }, 300);
    }, []);

    return {
        // État
        currentFilters,
        currentPage,
        selectedExpense,
        quickStats,

        // Données
        categories,
        expenses: expensesData.expenses,
        totalExpenses: expensesData.total,
        analytics,
        anomalies: aiAnalytics.anomalies,
        alerts,
        budgets,
        notifications,
        walletHistory: [], // Pas d'historique wallet en mode simulé

        // Actions de navigation
        applyFilters,
        clearFilters,
        goToPage,
        selectExpense,

        // Actions sur les catégories
        createCategory,
        updateCategory: createCategory, // Même fonction pour la démo
        deleteCategory: () => { }, // Pas d'action en mode simulé
        createDefaultCategories: () => { }, // Déjà créées

        // Actions sur les dépenses
        createExpense,
        updateExpense: createExpense, // Même fonction pour la démo
        deleteExpense: () => { }, // Pas d'action en mode simulé
        approveExpense: () => { }, // Pas d'action en mode simulé
        rejectExpense: () => { }, // Pas d'action en mode simulé

        // Actions sur les alertes
        markAlertAsRead,
        dismissAlert: markAlertAsRead, // Même fonction

        // Actions wallet (simulées)
        payFromWallet: () => {
            return { success: true, message: 'Paiement simulé réussi' };
        },

        // États de chargement
        isLoading,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,

        // Erreurs
        error: null,

        // Fonction de rafraîchissement
        refetch
    };
}

// Export par défaut
export default useMockExpenseManagement;
