/**
 * SERVICE DE PAIEMENT TAXI MOTO
 * Gestion des paiements et transactions pour le système taxi moto
 * 224Solutions - Taxi-Moto System
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentMethod {
    id: string;
    type: 'wallet_224' | 'mobile_money' | 'card' | 'cash';
    name: string;
    isDefault: boolean;
    isActive: boolean;
    details?: {
        phone?: string;
        provider?: string;
        last4?: string;
    };
}

export interface TripPayment {
    tripId: string;
    amount: number;
    driverShare: number;
    platformFee: number;
    paymentMethod: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    transactionId?: string;
    processedAt?: string;
}

export interface WalletBalance {
    balance: number;
    currency: string;
    lastUpdated: string;
}

class TaxiMotoPaymentService {
    private isInitialized = false;

    /**
     * Initialise le service de paiement
     */
    async initialize(): Promise<void> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Utilisateur non connecté');
            }
            this.isInitialized = true;
            console.log('💳 Service de paiement taxi moto initialisé');
        } catch (error) {
            console.error('Erreur initialisation paiement:', error);
            throw error;
        }
    }

    /**
     * Récupère les méthodes de paiement disponibles
     */
    async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
        try {
            const { data, error } = await supabase
                .from('user_payment_methods')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('is_default', { ascending: false });

            if (error) throw error;

            return data?.map(method => ({
                id: method.id,
                type: method.type,
                name: method.name,
                isDefault: method.is_default,
                isActive: method.is_active,
                details: method.details
            })) || [];
        } catch (error) {
            console.error('Erreur récupération méthodes paiement:', error);
            return [];
        }
    }

    /**
     * Récupère le solde du wallet
     */
    async getWalletBalance(userId: string): Promise<WalletBalance | null> {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('balance, currency, updated_at')
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return {
                balance: data.balance || 0,
                currency: data.currency || 'GNF',
                lastUpdated: data.updated_at
            };
        } catch (error) {
            console.error('Erreur récupération solde:', error);
            return null;
        }
    }

    /**
     * Calcule le prix d'une course
     */
    calculateTripPrice(
        distance: number,
        duration: number,
        vehicleType: string = 'moto_rapide',
        surgeMultiplier: number = 1.0
    ): {
        basePrice: number;
        distancePrice: number;
        timePrice: number;
        totalPrice: number;
        driverShare: number;
        platformFee: number;
    } {
        // Tarifs de base par type de véhicule
        const baseRates = {
            moto_economique: { base: 800, perKm: 150, perMin: 30 },
            moto_rapide: { base: 1000, perKm: 200, perMin: 40 },
            moto_premium: { base: 1500, perKm: 300, perMin: 60 }
        };

        const rates = baseRates[vehicleType as keyof typeof baseRates] || baseRates.moto_rapide;

        const basePrice = rates.base;
        const distancePrice = distance * rates.perKm;
        const timePrice = duration * rates.perMin;
        const subtotal = basePrice + distancePrice + timePrice;
        const totalPrice = Math.round(subtotal * surgeMultiplier);

        // Répartition 80/20 (conducteur/plateforme)
        const driverShare = Math.round(totalPrice * 0.8);
        const platformFee = totalPrice - driverShare;

        return {
            basePrice,
            distancePrice,
            timePrice,
            totalPrice,
            driverShare,
            platformFee
        };
    }

    /**
     * Traite un paiement pour une course
     */
    async processTripPayment(
        tripId: string,
        paymentMethod: string,
        amount: number
    ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Vérifier le solde si paiement par wallet
            if (paymentMethod === 'wallet_224') {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Utilisateur non connecté');

                const balance = await this.getWalletBalance(user.id);
                if (!balance || balance.balance < amount) {
                    return {
                        success: false,
                        error: 'Solde insuffisant'
                    };
                }
            }

            // Créer la transaction
            const { data: transaction, error } = await supabase
                .from('taxi_transactions')
                .insert({
                    trip_id: tripId,
                    amount: amount,
                    payment_method: paymentMethod,
                    status: 'processing',
                    created_at: new Date().toISOString()
                })
                .select('id')
                .single();

            if (error) throw error;

            // Traiter le paiement selon la méthode
            let paymentResult;
            switch (paymentMethod) {
                case 'wallet_224':
                    paymentResult = await this.processWalletPayment(transaction.id, amount);
                    break;
                case 'mobile_money':
                    paymentResult = await this.processMobileMoneyPayment(transaction.id, amount);
                    break;
                case 'card':
                    paymentResult = await this.processCardPayment(transaction.id, amount);
                    break;
                case 'cash':
                    paymentResult = await this.processCashPayment(transaction.id, amount);
                    break;
                default:
                    throw new Error('Méthode de paiement non supportée');
            }

            if (paymentResult.success) {
                // Mettre à jour le statut de la transaction
                await supabase
                    .from('taxi_transactions')
                    .update({
                        status: 'completed',
                        processed_at: new Date().toISOString()
                    })
                    .eq('id', transaction.id);

                toast.success('Paiement effectué avec succès');
                return {
                    success: true,
                    transactionId: transaction.id
                };
            } else {
                // Marquer comme échoué
                await supabase
                    .from('taxi_transactions')
                    .update({
                        status: 'failed',
                        error_message: paymentResult.error
                    })
                    .eq('id', transaction.id);

                return {
                    success: false,
                    error: paymentResult.error
                };
            }
        } catch (error) {
            console.error('Erreur traitement paiement:', error);
            return {
                success: false,
                error: 'Erreur lors du traitement du paiement'
            };
        }
    }

    /**
     * Traite un paiement par wallet 224Solutions
     */
    private async processWalletPayment(transactionId: string, amount: number): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Utilisateur non connecté');

            // Débiter le wallet du client
            const { error: debitError } = await supabase.rpc('debit_wallet', {
                user_id: user.id,
                amount: amount,
                description: `Paiement course ${transactionId}`
            });

            if (debitError) throw debitError;

            return { success: true };
        } catch (error) {
            console.error('Erreur paiement wallet:', error);
            return { success: false, error: 'Erreur paiement wallet' };
        }
    }

    /**
     * Traite un paiement par mobile money
     */
    private async processMobileMoneyPayment(transactionId: string, amount: number): Promise<{ success: boolean; error?: string }> {
        try {
            // Simulation d'un paiement mobile money
            // En production, intégrer avec les APIs Orange Money, MTN Money, etc.

            const response = await fetch('/api/payments/mobile-money', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId,
                    amount,
                    provider: 'orange_money' // ou 'mtn_money'
                })
            });

            if (!response.ok) {
                throw new Error('Erreur API mobile money');
            }

            return { success: true };
        } catch (error) {
            console.error('Erreur paiement mobile money:', error);
            return { success: false, error: 'Erreur paiement mobile money' };
        }
    }

    /**
     * Traite un paiement par carte
     */
    private async processCardPayment(transactionId: string, amount: number): Promise<{ success: boolean; error?: string }> {
        try {
            // Simulation d'un paiement par carte
            // En production, intégrer avec Stripe, PayPal, etc.

            const response = await fetch('/api/payments/card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId,
                    amount,
                    currency: 'GNF'
                })
            });

            if (!response.ok) {
                throw new Error('Erreur API carte');
            }

            return { success: true };
        } catch (error) {
            console.error('Erreur paiement carte:', error);
            return { success: false, error: 'Erreur paiement carte' };
        }
    }

    /**
     * Traite un paiement en espèces
     */
    private async processCashPayment(transactionId: string, amount: number): Promise<{ success: boolean; error?: string }> {
        try {
            // Pour les paiements en espèces, on marque simplement comme en attente
            // Le conducteur confirmera la réception manuellement

            await supabase
                .from('taxi_transactions')
                .update({
                    status: 'pending_cash',
                    notes: 'Paiement en espèces - En attente de confirmation'
                })
                .eq('id', transactionId);

            return { success: true };
        } catch (error) {
            console.error('Erreur paiement espèces:', error);
            return { success: false, error: 'Erreur paiement espèces' };
        }
    }

    /**
     * Confirme un paiement en espèces
     */
    async confirmCashPayment(transactionId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('taxi_transactions')
                .update({
                    status: 'completed',
                    processed_at: new Date().toISOString()
                })
                .eq('id', transactionId);

            if (error) throw error;

            toast.success('Paiement en espèces confirmé');
            return true;
        } catch (error) {
            console.error('Erreur confirmation paiement espèces:', error);
            toast.error('Erreur confirmation paiement');
            return false;
        }
    }

    /**
     * Effectue le paiement au conducteur
     */
    async payDriver(driverId: string, amount: number, tripId: string): Promise<boolean> {
        try {
            // Créditer le wallet du conducteur
            const { error } = await supabase.rpc('credit_wallet', {
                user_id: driverId,
                amount: amount,
                description: `Gains course ${tripId}`
            });

            if (error) throw error;

            console.log(`💰 Paiement conducteur: ${amount} GNF (Course: ${tripId})`);
            return true;
        } catch (error) {
            console.error('Erreur paiement conducteur:', error);
            return false;
        }
    }

    /**
     * Récupère l'historique des transactions
     */
    async getTransactionHistory(
        userId: string,
        limit: number = 50
    ): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('taxi_transactions')
                .select(`
                    id,
                    amount,
                    payment_method,
                    status,
                    created_at,
                    processed_at,
                    taxi_trips (
                        trip_number,
                        pickup_address,
                        dropoff_address
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur récupération historique:', error);
            return [];
        }
    }

    /**
     * Calcule les statistiques de paiement
     */
    async getPaymentStats(userId: string, period: 'day' | 'week' | 'month' = 'day'): Promise<{
        totalAmount: number;
        transactionCount: number;
        averageAmount: number;
        byMethod: Record<string, number>;
    }> {
        try {
            const startDate = new Date();
            switch (period) {
                case 'day':
                    startDate.setDate(startDate.getDate() - 1);
                    break;
                case 'week':
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
            }

            const { data, error } = await supabase
                .from('taxi_transactions')
                .select('amount, payment_method, status')
                .eq('user_id', userId)
                .eq('status', 'completed')
                .gte('created_at', startDate.toISOString());

            if (error) throw error;

            const totalAmount = data?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
            const transactionCount = data?.length || 0;
            const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;

            const byMethod = data?.reduce((acc, tx) => {
                acc[tx.payment_method] = (acc[tx.payment_method] || 0) + tx.amount;
                return acc;
            }, {} as Record<string, number>) || {};

            return {
                totalAmount,
                transactionCount,
                averageAmount,
                byMethod
            };
        } catch (error) {
            console.error('Erreur calcul statistiques:', error);
            return {
                totalAmount: 0,
                transactionCount: 0,
                averageAmount: 0,
                byMethod: {}
            };
        }
    }
}

// Instance singleton
export const taxiPaymentService = new TaxiMotoPaymentService();
