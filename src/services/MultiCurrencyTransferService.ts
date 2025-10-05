import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TransferRequest {
    receiverEmail: string;
    amount: number;
    currencySent: string;
    currencyReceived?: string;
    description?: string;
    reference?: string;
}

export interface TransferResponse {
    success: boolean;
    transactionId?: string;
    amountSent?: number;
    currencySent?: string;
    amountReceived?: number;
    currencyReceived?: string;
    exchangeRate?: number;
    feeAmount?: number;
    feePercentage?: number;
    feeFixed?: number;
    newBalance?: number;
    error?: string;
    errorCode?: string;
}

export interface TransferHistory {
    id: string;
    transactionId: string;
    senderId: string;
    receiverId: string;
    amountSent: number;
    currencySent: string;
    amountReceived: number;
    currencyReceived: string;
    exchangeRate: number;
    feeAmount: number;
    description?: string;
    reference?: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    isSent: boolean;
    isReceived: boolean;
}

export interface TransferLimits {
    canTransfer: boolean;
    dailyLimit: number;
    dailyUsed: number;
    dailyRemaining: number;
    monthlyLimit: number;
    monthlyUsed: number;
    monthlyRemaining: number;
    requestedAmount: number;
}

export interface TransferFees {
    feeFixed: number;
    feePercentage: number;
    feeAmount: number;
    totalAmount: number;
    netAmount: number;
}

export interface ExchangeRate {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    lastUpdated: string;
}

export class MultiCurrencyTransferService {
    /**
     * Effectuer un transfert multi-devises
     */
    static async performTransfer(request: TransferRequest): Promise<TransferResponse> {
        try {
            const { data, error } = await supabase.rpc('perform_multi_currency_transfer', {
                p_sender_id: (await supabase.auth.getUser()).data.user?.id,
                p_receiver_email: request.receiverEmail,
                p_amount: request.amount,
                p_currency_sent: request.currencySent,
                p_currency_received: request.currencyReceived || request.currencySent,
                p_description: request.description,
                p_reference: request.reference
            });

            if (error) {
                throw new Error(error.message);
            }

            return data as TransferResponse;
        } catch (error) {
            console.error('Error performing transfer:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur inconnue',
                errorCode: 'TRANSFER_ERROR'
            };
        }
    }

    /**
     * Calculer les frais de transfert
     */
    static async calculateFees(
        userRole: string,
        amount: number,
        currency: string
    ): Promise<TransferFees> {
        try {
            const { data, error } = await supabase.rpc('calculate_transfer_fees', {
                p_user_role: userRole,
                p_amount: amount,
                p_currency: currency
            });

            if (error) {
                throw new Error(error.message);
            }

            return data as TransferFees;
        } catch (error) {
            console.error('Error calculating fees:', error);
            return {
                feeFixed: 0,
                feePercentage: 0.01, // 1% par défaut
                feeAmount: amount * 0.01,
                totalAmount: amount * 1.01,
                netAmount: amount
            };
        }
    }

    /**
     * Vérifier les limites de transfert
     */
    static async checkLimits(
        userId: string,
        amount: number,
        currency: string
    ): Promise<TransferLimits> {
        try {
            const { data, error } = await supabase.rpc('check_transfer_limits', {
                p_user_id: userId,
                p_amount: amount,
                p_currency: currency
            });

            if (error) {
                throw new Error(error.message);
            }

            return data as TransferLimits;
        } catch (error) {
            console.error('Error checking limits:', error);
            return {
                canTransfer: false,
                dailyLimit: 0,
                dailyUsed: 0,
                dailyRemaining: 0,
                monthlyLimit: 0,
                monthlyUsed: 0,
                monthlyRemaining: 0,
                requestedAmount: amount
            };
        }
    }

    /**
     * Récupérer l'historique des transferts
     */
    static async getTransferHistory(
        userId: string,
        limit: number = 20,
        offset: number = 0
    ): Promise<{ transfers: TransferHistory[]; totalCount: number }> {
        try {
            const { data, error } = await supabase.rpc('get_transfer_history', {
                p_user_id: userId,
                p_limit: limit,
                p_offset: offset
            });

            if (error) {
                throw new Error(error.message);
            }

            return {
                transfers: data.transfers || [],
                totalCount: data.total_count || 0
            };
        } catch (error) {
            console.error('Error getting transfer history:', error);
            return { transfers: [], totalCount: 0 };
        }
    }

    /**
     * Récupérer les taux de change
     */
    static async getExchangeRates(): Promise<ExchangeRate[]> {
        try {
            const { data, error } = await supabase
                .from('exchange_rates')
                .select('from_currency, to_currency, rate, updated_at')
                .eq('is_active', true)
                .order('updated_at', { ascending: false });

            if (error) {
                throw new Error(error.message);
            }

            return data.map(rate => ({
                fromCurrency: rate.from_currency,
                toCurrency: rate.to_currency,
                rate: rate.rate,
                lastUpdated: rate.updated_at
            }));
        } catch (error) {
            console.error('Error getting exchange rates:', error);
            return [];
        }
    }

    /**
     * Récupérer les devises disponibles
     */
    static async getAvailableCurrencies(): Promise<Array<{ code: string; name: string; symbol: string }>> {
        try {
            const { data, error } = await supabase
                .from('currencies')
                .select('code, name, symbol')
                .eq('is_active', true)
                .order('name');

            if (error) {
                throw new Error(error.message);
            }

            return data;
        } catch (error) {
            console.error('Error getting currencies:', error);
            return [];
        }
    }

    /**
     * Vérifier si un utilisateur peut recevoir des transferts
     */
    static async canReceiveTransfer(email: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .eq('is_active', true)
                .single();

            return !error && data !== null;
        } catch (error) {
            console.error('Error checking if user can receive transfer:', error);
            return false;
        }
    }

    /**
     * Récupérer les statistiques de transfert
     */
    static async getTransferStatistics(
        userId: string,
        period: 'day' | 'week' | 'month' | 'year' = 'month'
    ) {
        try {
            const { data, error } = await supabase.rpc('get_transfer_statistics', {
                p_user_id: userId,
                p_period: period
            });

            if (error) {
                throw new Error(error.message);
            }

            return data;
        } catch (error) {
            console.error('Error getting transfer statistics:', error);
            return null;
        }
    }

    /**
     * Mettre à jour les taux de change (admin seulement)
     */
    static async updateExchangeRates(rates: Array<{
        fromCurrency: string;
        toCurrency: string;
        rate: number;
    }>): Promise<{ success: boolean; updatedCount: number; message: string }> {
        try {
            const { data, error } = await supabase.rpc('update_exchange_rates', {
                p_rates: rates
            });

            if (error) {
                throw new Error(error.message);
            }

            return data;
        } catch (error) {
            console.error('Error updating exchange rates:', error);
            return {
                success: false,
                updatedCount: 0,
                message: 'Erreur lors de la mise à jour des taux'
            };
        }
    }

    /**
     * Formater un montant avec la devise
     */
    static formatAmount(amount: number, currency: string): string {
        const symbols: Record<string, string> = {
            'GNF': 'FG',
            'USD': '$',
            'EUR': '€',
            'XOF': 'CFA',
            'XAF': 'CFA',
            'GBP': '£',
            'JPY': '¥',
            'CNY': '¥',
            'CAD': 'C$',
            'AUD': 'A$'
        };

        const symbol = symbols[currency] || currency;
        return `${symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    /**
     * Valider un email
     */
    static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Valider un montant
     */
    static isValidAmount(amount: number): boolean {
        return amount > 0 && amount <= 999999999.99;
    }

    /**
     * Générer un ID de transaction unique côté client
     */
    static generateTransactionId(): string {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8);
        return `TX-224-${timestamp}-${random}`;
    }
}
