/**
 * 🎣 HOOK WALLET - 224SOLUTIONS
 * Hook React pour la gestion des portefeuilles utilisateurs
 * Intégration automatique avec l'inscription et les fonctionnalités
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import walletService, { Wallet, Transaction, WalletStats } from '@/services/walletService';
import { toast } from 'sonner';

// =====================================================
// HOOK PRINCIPAL WALLET
// =====================================================

export function useWallet() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isInitialized, setIsInitialized] = useState(false);

    // Récupérer le wallet de l'utilisateur
    const {
        data: wallet,
        isLoading: walletLoading,
        error: walletError,
        refetch: refetchWallet
    } = useQuery({
        queryKey: ['wallet', user?.id],
        queryFn: () => user ? walletService.getUserWallet(user.id) : null,
        enabled: !!user,
        staleTime: 30000, // 30 secondes
    });

    // Créer automatiquement un wallet si nécessaire
    const createWallet = useMutation({
        mutationFn: () => {
            if (!user) throw new Error('Utilisateur non connecté');
            return walletService.createUserWallet(user.id);
        },
        onSuccess: (newWallet) => {
            if (newWallet) {
                queryClient.setQueryData(['wallet', user?.id], newWallet);
                toast.success('Portefeuille créé avec succès');
                setIsInitialized(true);
            }
        },
        onError: (error) => {
            console.error('❌ Erreur création wallet:', error);
            toast.error('Erreur lors de la création du portefeuille');
        }
    });

    // Initialisation automatique du wallet
    useEffect(() => {
        if (user && !wallet && !walletLoading && !isInitialized) {
            console.log('🔄 Initialisation automatique du wallet pour:', user.email);
            createWallet.mutate();
        }
    }, [user, wallet, walletLoading, isInitialized]);

    // Marquer comme initialisé quand le wallet existe
    useEffect(() => {
        if (wallet && !isInitialized) {
            setIsInitialized(true);
        }
    }, [wallet, isInitialized]);

    return {
        wallet,
        isLoading: walletLoading || createWallet.isPending,
        error: walletError,
        isInitialized,
        refetch: refetchWallet,
        createWallet: createWallet.mutate,
        isCreating: createWallet.isPending
    };
}

// =====================================================
// HOOK TRANSACTIONS
// =====================================================

export function useWalletTransactions(walletId?: string) {
    const queryClient = useQueryClient();

    // Récupérer les transactions
    const {
        data: transactions = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['wallet-transactions', walletId],
        queryFn: () => walletId ? walletService.getWalletTransactions(walletId) : [],
        enabled: !!walletId,
        refetchInterval: 30000, // Actualiser toutes les 30 secondes
    });

    // Créer une transaction
    const createTransaction = useMutation({
        mutationFn: (transactionData: Partial<Transaction>) => {
            return walletService.createTransaction(transactionData);
        },
        onSuccess: (transaction) => {
            if (transaction) {
                queryClient.setQueryData(['wallet-transactions', walletId], (old: Transaction[] = []) =>
                    [transaction, ...old]
                );
                // Invalider le wallet pour mettre à jour le solde
                queryClient.invalidateQueries({ queryKey: ['wallet'] });
                toast.success('Transaction créée avec succès');
            }
        },
        onError: (error) => {
            console.error('❌ Erreur création transaction:', error);
            toast.error('Erreur lors de la création de la transaction');
        }
    });

    // Effectuer un transfert
    const transferFunds = useMutation({
        mutationFn: ({
            toWalletId,
            amount,
            description
        }: {
            toWalletId: string;
            amount: number;
            description: string
        }) => {
            if (!walletId) throw new Error('Wallet ID manquant');
            return walletService.transferFunds(walletId, toWalletId, amount, description);
        },
        onSuccess: (success) => {
            if (success) {
                // Invalider les données pour les mettre à jour
                queryClient.invalidateQueries({ queryKey: ['wallet'] });
                queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
                toast.success('Transfert effectué avec succès');
            }
        },
        onError: (error) => {
            console.error('❌ Erreur transfert:', error);
            toast.error('Erreur lors du transfert');
        }
    });

    return {
        transactions,
        isLoading,
        error,
        refetch,
        createTransaction: createTransaction.mutate,
        transferFunds: transferFunds.mutate,
        isCreatingTransaction: createTransaction.isPending,
        isTransferring: transferFunds.isPending
    };
}

// =====================================================
// HOOK STATISTIQUES WALLET
// =====================================================

export function useWalletStats(walletId?: string) {
    // Récupérer les statistiques
    const {
        data: stats,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['wallet-stats', walletId],
        queryFn: () => walletId ? walletService.getWalletStats(walletId) : null,
        enabled: !!walletId,
        refetchInterval: 60000, // Actualiser toutes les minutes
    });

    return {
        stats: stats || {
            totalBalance: 0,
            totalTransactions: 0,
            totalCredits: 0,
            totalDebits: 0,
            pendingTransactions: 0,
            monthlyVolume: 0
        },
        isLoading,
        error,
        refetch
    };
}

// =====================================================
// HOOK GESTION WALLET
// =====================================================

export function useWalletManagement() {
    const queryClient = useQueryClient();

    return {
        updateWalletStatus: () => {},
        isUpdatingStatus: false
    };
}

// =====================================================
// HOOK UTILITAIRES WALLET
// =====================================================

export function useWalletUtils() {
    // Formater un montant
    const formatAmount = useCallback((amount: number, currency: string = 'FCFA') => {
        return walletService.formatAmount(amount, currency);
    }, []);

    // Valider un montant
    const validateAmount = useCallback((amount: number) => {
        return walletService.validateAmount(amount);
    }, []);

    // Générer un QR code
    const generateQR = useCallback((walletId: string) => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletId)}`;
    }, []);

    // Obtenir le statut d'un wallet
    const getWalletStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'active':
                return 'text-green-600 bg-green-100';
            case 'suspended':
                return 'text-yellow-600 bg-yellow-100';
            case 'closed':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    }, []);

    // Obtenir l'icône d'un type de transaction
    const getTransactionIcon = useCallback((type: string) => {
        switch (type) {
            case 'credit':
                return '↗️';
            case 'debit':
                return '↙️';
            case 'transfer':
                return '↔️';
            default:
                return '💰';
        }
    }, []);

    return {
        formatAmount,
        validateAmount,
        generateQR,
        getWalletStatusColor,
        getTransactionIcon
    };
}

// =====================================================
// HOOK INTÉGRATION INSCRIPTION
// =====================================================

export function useWalletRegistration() {
    // Hook à utiliser lors de l'inscription
    const onUserRegistration = useCallback(async (userId: string) => {
        try {
            await walletService.onUserRegistration(userId);
            console.log('✅ Wallet créé automatiquement lors de l\'inscription');
        } catch (error) {
            console.error('❌ Erreur création wallet inscription:', error);
        }
    }, []);

    return {
        onUserRegistration
    };
}
