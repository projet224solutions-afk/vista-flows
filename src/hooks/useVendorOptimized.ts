/**
 * HOOK VENDEUR OPTIMISÉ
 * Gestion optimisée des données vendeur avec cache et retry
 * 224Solutions - Optimized Vendor Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedQuery } from './useOptimizedQuery';

interface VendorStats {
    revenue: number;
    profit: number;
    orders_count: number;
    orders_pending: number;
    customers_count: number;
    products_count: number;
    low_stock_count: number;
    overdue_payments: number;
}

interface VendorProfile {
    id: string;
    user_id: string;
    business_name: string;
    business_type: string;
    status: string;
    created_at: string;
}

export function useVendorOptimized() {
    const { user } = useAuth();
    const { toast } = useToast();

    // Hook optimisé pour les statistiques
    const {
        data: stats,
        loading: statsLoading,
        error: statsError,
        refetch: refetchStats
    } = useOptimizedQuery({
        queryKey: ['vendor-stats', user?.id],
        queryFn: async () => {
            if (!user) throw new Error('Utilisateur non authentifié');

            // Récupérer l'ID du vendeur
            const { data: vendor, error: vendorError } = await supabase
                .from('vendors')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (vendorError || !vendor) {
                throw new Error('Profil vendeur non trouvé');
            }

            // Requêtes parallèles pour optimiser les performances
            const [
                ordersResult,
                productsResult,
                inventoryResult,
                paymentsResult,
                customersResult
            ] = await Promise.all([
                // Commandes
                supabase
                    .from('orders')
                    .select('total_amount, status')
                    .eq('vendor_id', vendor.id),

                // Produits
                supabase
                    .from('products')
                    .select('id', { count: 'exact', head: true })
                    .eq('vendor_id', vendor.id)
                    .eq('is_active', true),

                // Inventaire
                supabase
                    .from('inventory')
                    .select('quantity, products!inner(vendor_id)', { count: 'exact', head: true })
                    .eq('products.vendor_id', vendor.id)
                    .lt('quantity', 10),

                // Paiements en retard
                supabase
                    .from('payment_schedules')
                    .select('status, orders!inner(vendor_id)', { count: 'exact', head: true })
                    .eq('orders.vendor_id', vendor.id)
                    .eq('status', 'overdue'),

                // Clients
                supabase
                    .from('orders')
                    .select('customer_id', { count: 'exact', head: true })
                    .eq('vendor_id', vendor.id)
            ]);

            // Calculer les statistiques
            const orders = ordersResult.data || [];
            const revenue = orders.reduce((acc, order) => acc + (order.total_amount || 0), 0);
            const orders_count = orders.length;
            const orders_pending = orders.filter(o => o.status === 'pending').length;

            return {
                revenue,
                profit: revenue * 0.2, // 20% de marge
                orders_count,
                orders_pending,
                customers_count: customersResult.count || 0,
                products_count: productsResult.count || 0,
                low_stock_count: inventoryResult.count || 0,
                overdue_payments: paymentsResult.count || 0
            } as VendorStats;
        },
        options: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: 3,
            retryDelay: 1000,
            onError: (error) => {
                console.error('Erreur chargement stats vendeur:', error);
                toast({
                    title: "Erreur de chargement",
                    description: "Impossible de charger les statistiques",
                    variant: "destructive"
                });
            }
        }
    });

    // Hook optimisé pour le profil vendeur
    const {
        data: profile,
        loading: profileLoading,
        error: profileError
    } = useOptimizedQuery({
        queryKey: ['vendor-profile', user?.id],
        queryFn: async () => {
            if (!user) throw new Error('Utilisateur non authentifié');

            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            return data as VendorProfile;
        },
        options: {
            staleTime: 15 * 60 * 1000, // 15 minutes
            cacheTime: 30 * 60 * 1000, // 30 minutes
            retry: 2
        }
    });

    // Fonction de création de profil vendeur
    const createVendorProfile = useCallback(async (profileData: Partial<VendorProfile>) => {
        if (!user) throw new Error('Utilisateur non authentifié');

        try {
            const { data, error } = await supabase
                .from('vendors')
                .insert({
                    user_id: user.id,
                    business_name: profileData.business_name || 'Mon Entreprise',
                    business_type: profileData.business_type || 'retail',
                    status: 'active',
                    ...profileData
                })
                .select()
                .single();

            if (error) throw error;

            toast({
                title: "Profil vendeur créé",
                description: "Votre profil vendeur a été créé avec succès",
            });

            return data;
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Impossible de créer le profil vendeur",
                variant: "destructive",
            });
            throw error;
        }
    }, [user, toast]);

    // Fonction de mise à jour du profil
    const updateVendorProfile = useCallback(async (updates: Partial<VendorProfile>) => {
        if (!user || !profile) throw new Error('Profil vendeur non trouvé');

        try {
            const { data, error } = await supabase
                .from('vendors')
                .update(updates)
                .eq('id', profile.id)
                .select()
                .single();

            if (error) throw error;

            toast({
                title: "Profil mis à jour",
                description: "Votre profil vendeur a été mis à jour",
            });

            return data;
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Impossible de mettre à jour le profil",
                variant: "destructive",
            });
            throw error;
        }
    }, [user, profile, toast]);

    // Fonction de diagnostic
    const runDiagnostic = useCallback(async () => {
        const results = [];

        try {
            // Test 1: Authentification
            if (!user) {
                results.push({ test: 'Authentification', status: 'error', message: 'Utilisateur non authentifié' });
                return results;
            }
            results.push({ test: 'Authentification', status: 'success', message: 'Utilisateur authentifié' });

            // Test 2: Profil vendeur
            if (!profile) {
                results.push({ test: 'Profil vendeur', status: 'error', message: 'Profil vendeur non trouvé' });
            } else {
                results.push({ test: 'Profil vendeur', status: 'success', message: 'Profil vendeur trouvé' });
            }

            // Test 3: Statistiques
            if (statsError) {
                results.push({ test: 'Statistiques', status: 'error', message: statsError.message });
            } else if (stats) {
                results.push({ test: 'Statistiques', status: 'success', message: 'Statistiques chargées' });
            }

            // Test 4: Wallet
            const { data: wallet } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!wallet) {
                results.push({ test: 'Wallet', status: 'error', message: 'Wallet non trouvé' });
            } else {
                results.push({ test: 'Wallet', status: 'success', message: 'Wallet trouvé' });
            }

        } catch (error) {
            results.push({ test: 'Diagnostic', status: 'error', message: error.message });
        }

        return results;
    }, [user, profile, stats, statsError]);

    // Fonction de réparation automatique
    const autoFix = useCallback(async () => {
        const fixes = [];

        try {
            // Créer le profil vendeur si manquant
            if (!profile && user) {
                await createVendorProfile({
                    business_name: 'Mon Entreprise',
                    business_type: 'retail'
                });
                fixes.push('Profil vendeur créé');
            }

            // Créer le wallet si manquant
            const { data: wallet } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            if (!wallet && user) {
                await supabase
                    .from('wallets')
                    .insert({
                        user_id: user.id,
                        balance: 0,
                        currency: 'GNF'
                    });
                fixes.push('Wallet créé');
            }

            if (fixes.length > 0) {
                toast({
                    title: "Réparation réussie",
                    description: `Corrections appliquées: ${fixes.join(', ')}`,
                });

                // Recharger les données
                refetchStats();
            }

        } catch (error) {
            toast({
                title: "Erreur lors de la réparation",
                description: error.message,
                variant: "destructive",
            });
        }
    }, [user, profile, createVendorProfile, refetchStats, toast]);

    // État global
    const loading = statsLoading || profileLoading;
    const error = statsError || profileError;

    return {
        // Données
        stats,
        profile,
        loading,
        error,

        // Actions
        createVendorProfile,
        updateVendorProfile,
        runDiagnostic,
        autoFix,
        refetchStats
    };
}
