/**
 * 🌍 SERVICE DE TRANSFERT MULTI-DEVISES AVANCÉ
 * Gestion complète des transferts avec détection automatique du pays et frais dynamiques
 */

import { supabase } from '@/integrations/supabase/client';
import { GlobalCurrencyService, Currency, CountryCurrency } from './GlobalCurrencyService';
import { PDGExchangeRateService, RateSimulation } from './PDGExchangeRateService';

export interface AdvancedTransferRequest {
  receiverEmail?: string;
  receiverUserId?: string;
  amount: number;
  currencySent: string;
  currencyReceived?: string;
  description?: string;
  reference?: string;
  autoDetectCurrency?: boolean;
}

export interface AdvancedTransferResponse {
  success: boolean;
  transferId?: string;
  amountSent?: number;
  currencySent?: string;
  amountReceived?: number;
  currencyReceived?: string;
  exchangeRate?: number;
  fees?: {
    internalFees: number;
    apiCommission: number;
    totalFees: number;
    totalCharged: number;
    platformGain: number;
  };
  newSenderBalance?: number;
  error?: string;
  errorCode?: string;
}

export interface UserCurrencyProfile {
  userId: string;
  detectedCountry: string;
  defaultCurrency: string;
  availableCurrencies: string[];
  lastUpdated: string;
}

export interface TransferLimits {
  canTransfer: boolean;
  dailyRemaining: number;
  monthlyRemaining: number;
  currency: string;
  reason?: string;
}

export class AdvancedMultiCurrencyService {
  /**
   * Détecter automatiquement le pays et la devise de l'utilisateur
   */
  static async detectUserCurrencyProfile(userId: string): Promise<UserCurrencyProfile | null> {
    try {
      // Détecter le pays de l'utilisateur
      const countryInfo = await GlobalCurrencyService.detectUserCountry();
      
      if (!countryInfo) {
        // Fallback sur la devise par défaut (GNF)
        return {
          userId,
          detectedCountry: 'Guinea',
          defaultCurrency: 'GNF',
          availableCurrencies: ['GNF', 'USD', 'EUR', 'XOF'],
          lastUpdated: new Date().toISOString()
        };
      }

      // Obtenir les devises disponibles
      const availableCurrencies = await this.getAvailableCurrenciesForUser(userId);

      return {
        userId,
        detectedCountry: countryInfo.country,
        defaultCurrency: countryInfo.currency,
        availableCurrencies,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error detecting user currency profile:', error);
      return null;
    }
  }

  /**
   * Obtenir les devises disponibles pour un utilisateur
   */
  static async getAvailableCurrenciesForUser(userId: string): Promise<string[]> {
    try {
      // Récupérer les wallets existants de l'utilisateur
      const { data: wallets } = await supabase
        .from('wallets')
        .select('currency')
        .eq('user_id', userId);

      const userCurrencies = wallets?.map(w => w.currency) || [];
      
      // Ajouter les devises principales
      const mainCurrencies = ['GNF', 'USD', 'EUR', 'XOF', 'XAF', 'NGN', 'GBP', 'CAD', 'CNY', 'JPY'];
      
      // Combiner et dédupliquer
      const allCurrencies = [...new Set([...userCurrencies, ...mainCurrencies])];
      
      return allCurrencies;
    } catch (error) {
      console.error('Error getting available currencies:', error);
      return ['GNF', 'USD', 'EUR'];
    }
  }

  /**
   * Effectuer un transfert multi-devises avancé
   */
  static async performAdvancedTransfer(request: AdvancedTransferRequest): Promise<AdvancedTransferResponse> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return {
          success: false,
          error: 'Utilisateur non authentifié',
          errorCode: 'AUTH_ERROR'
        };
      }

      // Validation des paramètres
      if (!request.amount || request.amount <= 0) {
        return {
          success: false,
          error: 'Montant invalide',
          errorCode: 'INVALID_AMOUNT'
        };
      }

      if (!request.receiverEmail && !request.receiverUserId) {
        return {
          success: false,
          error: 'Email ou ID du destinataire requis',
          errorCode: 'MISSING_RECEIVER'
        };
      }

      // Déterminer la devise de réception
      const currencyReceived = request.currencyReceived || request.currencySent;

      // Vérifier les limites de transfert
      const limits = await this.checkTransferLimits(user.id, request.amount, request.currencySent);
      if (!limits.canTransfer) {
        return {
          success: false,
          error: limits.reason || 'Limite de transfert dépassée',
          errorCode: 'LIMIT_EXCEEDED'
        };
      }

      // Simuler la conversion pour obtenir les frais
      const simulation = await PDGExchangeRateService.simulateConversion(
        request.currencySent,
        currencyReceived,
        request.amount
      );

      if (!simulation) {
        return {
          success: false,
          error: 'Taux de change non disponible',
          errorCode: 'RATE_NOT_FOUND'
        };
      }

      // Effectuer le transfert via la fonction RPC
      const { data, error } = await supabase.rpc('perform_advanced_multi_currency_transfer', {
        p_sender_id: user.id,
        p_receiver_email: request.receiverEmail,
        p_receiver_user_id: request.receiverUserId,
        p_amount: request.amount,
        p_currency_sent: request.currencySent,
        p_currency_received: currencyReceived,
        p_description: request.description,
        p_reference: request.reference || `TXN-${Date.now()}`
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: data.success,
        transferId: data.transfer_id,
        amountSent: data.amount_sent,
        currencySent: data.currency_sent,
        amountReceived: data.amount_received,
        currencyReceived: data.currency_received,
        exchangeRate: data.exchange_rate,
        fees: {
          internalFees: data.internal_fees,
          apiCommission: data.api_commission,
          totalFees: data.total_fees,
          totalCharged: data.total_charged,
          platformGain: data.platform_gain
        },
        newSenderBalance: data.new_sender_balance,
        error: data.error,
        errorCode: data.error_code
      };
    } catch (error) {
      console.error('Error performing advanced transfer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        errorCode: 'TRANSFER_ERROR'
      };
    }
  }

  /**
   * Vérifier les limites de transfert
   */
  static async checkTransferLimits(
    userId: string,
    amount: number,
    currency: string
  ): Promise<TransferLimits> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance, daily_transfer_limit, monthly_transfer_limit, daily_transferred_amount, monthly_transferred_amount')
        .eq('user_id', userId)
        .eq('currency', currency)
        .single();

      if (error) {
        return {
          canTransfer: false,
          dailyRemaining: 0,
          monthlyRemaining: 0,
          currency,
          reason: 'Portefeuille non trouvé'
        };
      }

      const { balance, daily_transfer_limit, monthly_transfer_limit, daily_transferred_amount, monthly_transferred_amount } = data;

      // Vérifier le solde
      if (balance < amount) {
        return {
          canTransfer: false,
          dailyRemaining: daily_transfer_limit - daily_transferred_amount,
          monthlyRemaining: monthly_transfer_limit - monthly_transferred_amount,
          currency,
          reason: 'Solde insuffisant'
        };
      }

      // Vérifier les limites quotidiennes
      if ((daily_transferred_amount + amount) > daily_transfer_limit) {
        return {
          canTransfer: false,
          dailyRemaining: daily_transfer_limit - daily_transferred_amount,
          monthlyRemaining: monthly_transfer_limit - monthly_transferred_amount,
          currency,
          reason: 'Limite quotidienne dépassée'
        };
      }

      // Vérifier les limites mensuelles
      if ((monthly_transferred_amount + amount) > monthly_transfer_limit) {
        return {
          canTransfer: false,
          dailyRemaining: daily_transfer_limit - daily_transferred_amount,
          monthlyRemaining: monthly_transfer_limit - monthly_transferred_amount,
          currency,
          reason: 'Limite mensuelle dépassée'
        };
      }

      return {
        canTransfer: true,
        dailyRemaining: daily_transfer_limit - daily_transferred_amount,
        monthlyRemaining: monthly_transfer_limit - monthly_transferred_amount,
        currency
      };
    } catch (error) {
      console.error('Error checking transfer limits:', error);
      return {
        canTransfer: false,
        dailyRemaining: 0,
        monthlyRemaining: 0,
        currency,
        reason: 'Erreur lors de la vérification des limites'
      };
    }
  }

  /**
   * Obtenir les devises disponibles
   */
  static async getAvailableCurrencies(): Promise<Currency[]> {
    return GlobalCurrencyService.getActiveCurrencies();
  }

  /**
   * Rechercher des devises
   */
  static async searchCurrencies(query: string): Promise<Currency[]> {
    return GlobalCurrencyService.searchCurrencies(query);
  }

  /**
   * Simuler une conversion
   */
  static async simulateConversion(
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): Promise<RateSimulation | null> {
    return PDGExchangeRateService.simulateConversion(fromCurrency, toCurrency, amount);
  }

  /**
   * Formater un montant avec la devise
   */
  static formatAmount(amount: number, currencyCode: string): string {
    return GlobalCurrencyService.formatAmount(amount, currencyCode);
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
    return amount > 0 && !isNaN(amount) && isFinite(amount);
  }

  /**
   * Valider un ID utilisateur (UUID)
   */
  static isValidUserId(userId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId);
  }

  /**
   * Obtenir l'historique des transferts
   */
  static async getTransferHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<{
    id: string;
    amountSent: number;
    currencySent: string;
    amountReceived: number;
    currencyReceived: string;
    exchangeRate: number;
    fees: number;
    status: string;
    description?: string;
    reference: string;
    createdAt: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('advanced_multi_currency_transfers')
        .select('*')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      return data.map(transfer => ({
        id: transfer.id,
        amountSent: transfer.amount_sent,
        currencySent: transfer.currency_sent,
        amountReceived: transfer.amount_received,
        currencyReceived: transfer.currency_received,
        exchangeRate: transfer.exchange_rate,
        fees: transfer.total_fees,
        status: transfer.status,
        description: transfer.description,
        reference: transfer.reference,
        createdAt: transfer.created_at
      }));
    } catch (error) {
      console.error('Error getting transfer history:', error);
      return [];
    }
  }

  /**
   * Obtenir les statistiques de transfert
   */
  static async getTransferStatistics(userId: string): Promise<{
    totalTransfers: number;
    totalVolume: number;
    totalFees: number;
    mostUsedCurrency: string;
    averageTransferAmount: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('advanced_multi_currency_transfers')
        .select('amount_sent, currency_sent, total_fees, status')
        .eq('sender_id', userId)
        .eq('status', 'completed');

      if (error) {
        throw new Error(error.message);
      }

      const totalTransfers = data.length;
      const totalVolume = data.reduce((sum, transfer) => sum + transfer.amount_sent, 0);
      const totalFees = data.reduce((sum, transfer) => sum + transfer.total_fees, 0);
      
      // Trouver la devise la plus utilisée
      const currencyCounts: Record<string, number> = {};
      data.forEach(transfer => {
        currencyCounts[transfer.currency_sent] = (currencyCounts[transfer.currency_sent] || 0) + 1;
      });
      
      const mostUsedCurrency = Object.keys(currencyCounts).reduce((a, b) => 
        currencyCounts[a] > currencyCounts[b] ? a : b, 'GNF'
      );

      return {
        totalTransfers,
        totalVolume,
        totalFees,
        mostUsedCurrency,
        averageTransferAmount: totalTransfers > 0 ? totalVolume / totalTransfers : 0
      };
    } catch (error) {
      console.error('Error getting transfer statistics:', error);
      return {
        totalTransfers: 0,
        totalVolume: 0,
        totalFees: 0,
        mostUsedCurrency: 'GNF',
        averageTransferAmount: 0
      };
    }
  }
}
