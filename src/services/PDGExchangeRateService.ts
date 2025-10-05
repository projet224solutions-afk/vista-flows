/**
 * 🏦 SERVICE DE GESTION DES TAUX DE CHANGE PDG
 * Contrôle manuel des taux de change par le PDG avec simulation
 */

import { supabase } from '@/integrations/supabase/client';
import { GlobalCurrencyService } from './GlobalCurrencyService';

export interface ExchangeRateUpdate {
  fromCurrency: string;
  toCurrency: string;
  oldRate: number;
  newRate: number;
  updatedBy: string;
  updatedAt: string;
  reason?: string;
}

export interface RateSimulation {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  currentRate: number;
  convertedAmount: number;
  internalFees: number;
  apiCommission: number;
  totalFees: number;
  totalCharged: number;
  platformGain: number;
}

export interface FeeStructure {
  internalFeePercentage: number;
  internalFeeMin: number;
  internalFeeMax: number;
  apiCommissionPercentage: number;
  currency: string;
}

export class PDGExchangeRateService {
  // Structure des frais par défaut
  private static readonly DEFAULT_FEE_STRUCTURE: FeeStructure = {
    internalFeePercentage: 0.005, // 0.5%
    internalFeeMin: 0.10, // 0.10 USD
    internalFeeMax: 20.00, // 20.00 USD
    apiCommissionPercentage: 0.001, // 0.1%
    currency: 'USD'
  };

  /**
   * Obtenir tous les taux de change actuels
   */
  static async getAllExchangeRates(): Promise<Array<{
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    source: string;
    lastUpdated: string;
    updatedBy?: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('from_currency, to_currency, rate, source, updated_at, updated_by')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data.map(rate => ({
        fromCurrency: rate.from_currency,
        toCurrency: rate.to_currency,
        rate: rate.rate,
        source: rate.source,
        lastUpdated: rate.updated_at,
        updatedBy: rate.updated_by
      }));
    } catch (error) {
      console.error('Error getting exchange rates:', error);
      return [];
    }
  }

  /**
   * Mettre à jour un taux de change manuellement
   */
  static async updateExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    newRate: number,
    updatedBy: string,
    reason?: string
  ): Promise<{ success: boolean; message: string; oldRate?: number }> {
    try {
      // Récupérer l'ancien taux
      const { data: oldRateData } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('is_active', true)
        .single();

      const oldRate = oldRateData?.rate || 0;

      // Désactiver l'ancien taux
      await supabase
        .from('exchange_rates')
        .update({ is_active: false })
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('is_active', true);

      // Insérer le nouveau taux
      const { error } = await supabase
        .from('exchange_rates')
        .insert({
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: newRate,
          source: 'manual',
          is_active: true,
          updated_by: updatedBy
        });

      if (error) {
        throw new Error(error.message);
      }

      // Enregistrer l'historique des modifications
      await supabase
        .from('exchange_rate_history')
        .insert({
          from_currency: fromCurrency,
          to_currency: toCurrency,
          old_rate: oldRate,
          new_rate: newRate,
          updated_by: updatedBy,
          reason: reason || 'Mise à jour manuelle par le PDG'
        });

      return {
        success: true,
        message: `Taux ${fromCurrency} → ${toCurrency} mis à jour: ${oldRate} → ${newRate}`,
        oldRate: oldRate
      };
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      return {
        success: false,
        message: `Erreur lors de la mise à jour: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Mettre à jour plusieurs taux de change en lot
   */
  static async updateMultipleRates(
    rates: Array<{
      fromCurrency: string;
      toCurrency: string;
      rate: number;
    }>,
    updatedBy: string,
    reason?: string
  ): Promise<{ success: boolean; message: string; updatedCount: number }> {
    try {
      let updatedCount = 0;
      const errors: string[] = [];

      for (const rate of rates) {
        const result = await this.updateExchangeRate(
          rate.fromCurrency,
          rate.toCurrency,
          rate.rate,
          updatedBy,
          reason
        );

        if (result.success) {
          updatedCount++;
        } else {
          errors.push(`${rate.fromCurrency} → ${rate.toCurrency}: ${result.message}`);
        }
      }

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? `${updatedCount} taux mis à jour avec succès`
          : `${updatedCount} taux mis à jour, ${errors.length} erreurs: ${errors.join(', ')}`,
        updatedCount
      };
    } catch (error) {
      console.error('Error updating multiple rates:', error);
      return {
        success: false,
        message: `Erreur lors de la mise à jour en lot: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        updatedCount: 0
      };
    }
  }

  /**
   * Simuler une conversion avec les taux actuels
   */
  static async simulateConversion(
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): Promise<RateSimulation | null> {
    try {
      // Récupérer le taux actuel
      const { data: rateData } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('is_active', true)
        .single();

      if (!rateData) {
        return null;
      }

      const currentRate = rateData.rate;
      const convertedAmount = amount * currentRate;

      // Calculer les frais
      const feeStructure = this.DEFAULT_FEE_STRUCTURE;
      const apiCommission = amount * feeStructure.apiCommissionPercentage;
      const internalFees = Math.max(
        Math.min(
          amount * feeStructure.internalFeePercentage,
          feeStructure.internalFeeMax
        ),
        feeStructure.internalFeeMin
      );
      const totalFees = apiCommission + internalFees;
      const totalCharged = amount + totalFees;
      const platformGain = totalFees;

      return {
        fromCurrency,
        toCurrency,
        amount,
        currentRate,
        convertedAmount,
        internalFees,
        apiCommission,
        totalFees,
        totalCharged,
        platformGain
      };
    } catch (error) {
      console.error('Error simulating conversion:', error);
      return null;
    }
  }

  /**
   * Obtenir l'historique des modifications de taux
   */
  static async getRateHistory(
    fromCurrency?: string,
    toCurrency?: string,
    limit: number = 50
  ): Promise<ExchangeRateUpdate[]> {
    try {
      let query = supabase
        .from('exchange_rate_history')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (fromCurrency) {
        query = query.eq('from_currency', fromCurrency);
      }
      if (toCurrency) {
        query = query.eq('to_currency', toCurrency);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data.map(history => ({
        fromCurrency: history.from_currency,
        toCurrency: history.to_currency,
        oldRate: history.old_rate,
        newRate: history.new_rate,
        updatedBy: history.updated_by,
        updatedAt: history.updated_at,
        reason: history.reason
      }));
    } catch (error) {
      console.error('Error getting rate history:', error);
      return [];
    }
  }

  /**
   * Obtenir les statistiques des taux de change
   */
  static async getRateStatistics(): Promise<{
    totalRates: number;
    manualRates: number;
    apiRates: number;
    lastUpdated: string;
    mostActiveCurrency: string;
  }> {
    try {
      const { data: rates, error: ratesError } = await supabase
        .from('exchange_rates')
        .select('source, updated_at, from_currency')
        .eq('is_active', true);

      if (ratesError) {
        throw new Error(ratesError.message);
      }

      const totalRates = rates.length;
      const manualRates = rates.filter(r => r.source === 'manual').length;
      const apiRates = rates.filter(r => r.source === 'api').length;
      
      const lastUpdated = rates.length > 0 
        ? rates.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0].updated_at
        : '';

      // Trouver la devise la plus active
      const currencyCounts: Record<string, number> = {};
      rates.forEach(rate => {
        currencyCounts[rate.from_currency] = (currencyCounts[rate.from_currency] || 0) + 1;
      });
      
      const mostActiveCurrency = Object.keys(currencyCounts).reduce((a, b) => 
        currencyCounts[a] > currencyCounts[b] ? a : b, 'GNF'
      );

      return {
        totalRates,
        manualRates,
        apiRates,
        lastUpdated,
        mostActiveCurrency
      };
    } catch (error) {
      console.error('Error getting rate statistics:', error);
      return {
        totalRates: 0,
        manualRates: 0,
        apiRates: 0,
        lastUpdated: '',
        mostActiveCurrency: 'GNF'
      };
    }
  }

  /**
   * Obtenir les devises les plus utilisées
   */
  static async getMostUsedCurrencies(limit: number = 10): Promise<Array<{
    currency: string;
    count: number;
    percentage: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('multi_currency_transfers')
        .select('currency_sent, currency_received')
        .eq('status', 'completed');

      if (error) {
        throw new Error(error.message);
      }

      const currencyCounts: Record<string, number> = {};
      data.forEach(transfer => {
        currencyCounts[transfer.currency_sent] = (currencyCounts[transfer.currency_sent] || 0) + 1;
        currencyCounts[transfer.currency_received] = (currencyCounts[transfer.currency_received] || 0) + 1;
      });

      const total = Object.values(currencyCounts).reduce((sum, count) => sum + count, 0);
      
      return Object.entries(currencyCounts)
        .map(([currency, count]) => ({
          currency,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting most used currencies:', error);
      return [];
    }
  }

  /**
   * Formater un taux de change pour l'affichage
   */
  static formatRate(rate: number, fromCurrency: string, toCurrency: string): string {
    if (rate >= 1) {
      return `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
    } else {
      return `1 ${toCurrency} = ${(1 / rate).toFixed(4)} ${fromCurrency}`;
    }
  }

  /**
   * Calculer le pourcentage de changement entre deux taux
   */
  static calculateRateChange(oldRate: number, newRate: number): {
    percentage: number;
    direction: 'up' | 'down' | 'same';
  } {
    if (oldRate === 0) return { percentage: 0, direction: 'same' };
    
    const percentage = ((newRate - oldRate) / oldRate) * 100;
    const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'same';
    
    return { percentage: Math.abs(percentage), direction };
  }
}
