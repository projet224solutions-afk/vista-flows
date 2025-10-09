/**
 * Service de calcul automatique des frais de transaction multi-devises
 * Frais : 1% du montant + 1000 GNF (ou équivalent dans autre devise)
 */

import { db } from "../db.js";
import { currencyExchangeRates } from "../../shared/schema.js";
import { eq, and, or, desc, sql, isNull, gt } from "drizzle-orm";

interface FeeCalculation {
  amount: number;
  currency: string;
  percentageFee: number;
  fixedFee: number;
  totalFee: number;
  amountAfterFee: number;
}

interface CurrencyRates {
  [key: string]: number;
}

// Taux de change par défaut (fallback si DB vide)
const DEFAULT_EXCHANGE_RATES: CurrencyRates = {
  'GNF': 1,
  'XOF': 0.07,
  'XAF': 0.07,
  'USD': 8500,
  'EUR': 9200,
  'NGN': 20,
  'GHS': 750,
};

const FIXED_FEE_GNF = 1000;
const PERCENTAGE_FEE = 0.01;

// Cache en mémoire pour performances
let ratesCache: CurrencyRates | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class TransactionFeeService {
  /**
   * Charge les taux de change depuis la DB
   */
  private static async loadExchangeRates(): Promise<CurrencyRates> {
    const now = Date.now();
    
    if (ratesCache && (now - cacheTimestamp) < CACHE_TTL) {
      return ratesCache;
    }

    try {
      const rates = await db.select()
        .from(currencyExchangeRates)
        .where(
          and(
            eq(currencyExchangeRates.isActive, true),
            or(
              isNull(currencyExchangeRates.effectiveUntil),
              gt(currencyExchangeRates.effectiveUntil, new Date())
            )
          )
        );

      if (rates.length === 0) {
        await this.initializeDefaultRates();
        return DEFAULT_EXCHANGE_RATES;
      }

      const ratesMap: CurrencyRates = { 'GNF': 1 };
      
      for (const rate of rates) {
        ratesMap[rate.targetCurrency] = parseFloat(rate.rate);
      }

      ratesCache = ratesMap;
      cacheTimestamp = now;
      
      return ratesMap;
    } catch (error) {
      console.error('Error loading exchange rates:', error);
      return DEFAULT_EXCHANGE_RATES;
    }
  }

  /**
   * Initialise les taux par défaut dans la DB
   */
  private static async initializeDefaultRates(): Promise<void> {
    try {
      for (const [currency, rate] of Object.entries(DEFAULT_EXCHANGE_RATES)) {
        if (currency === 'GNF') continue;
        
        await db.insert(currencyExchangeRates).values({
          baseCurrency: 'GNF',
          targetCurrency: currency,
          rate: rate.toString(),
          isActive: true
        }).onConflictDoNothing();
      }
      
      ratesCache = DEFAULT_EXCHANGE_RATES;
      cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error initializing default rates:', error);
    }
  }

  /**
   * Calcule les frais automatiques pour une transaction
   */
  static async calculateFees(amount: number, currency: string = 'GNF'): Promise<FeeCalculation> {
    const rates = await this.loadExchangeRates();
    const rate = rates[currency] || 1;
    
    const fixedFeeInCurrency = FIXED_FEE_GNF / rate;
    const percentageFee = amount * PERCENTAGE_FEE;
    const totalFee = percentageFee + fixedFeeInCurrency;
    const amountAfterFee = amount - totalFee;

    return {
      amount,
      currency,
      percentageFee: Math.round(percentageFee * 100) / 100,
      fixedFee: Math.round(fixedFeeInCurrency * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100,
      amountAfterFee: Math.round(amountAfterFee * 100) / 100,
    };
  }

  /**
   * Convertit un montant d'une devise à une autre
   */
  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    const rates = await this.loadExchangeRates();
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    
    const amountInGNF = amount * fromRate;
    const convertedAmount = amountInGNF / toRate;
    
    return Math.round(convertedAmount * 100) / 100;
  }

  /**
   * Calcule les frais pour un transfert multi-devises
   */
  static async calculateCrossCurrencyFees(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{
    originalAmount: number;
    originalCurrency: string;
    convertedAmount: number;
    targetCurrency: string;
    fees: FeeCalculation;
    recipientReceives: number;
  }> {
    const fees = await this.calculateFees(amount, fromCurrency);
    
    const convertedAmount = await this.convertCurrency(
      fees.amountAfterFee,
      fromCurrency,
      toCurrency
    );

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      targetCurrency: toCurrency,
      fees,
      recipientReceives: convertedAmount,
    };
  }

  /**
   * Obtient la liste des devises supportées
   */
  static async getSupportedCurrencies(): Promise<string[]> {
    const rates = await this.loadExchangeRates();
    return Object.keys(rates);
  }

  /**
   * Obtient le taux de change d'une devise
   */
  static async getExchangeRate(currency: string): Promise<number> {
    const rates = await this.loadExchangeRates();
    return rates[currency] || 1;
  }

  /**
   * Met à jour le taux de change d'une devise (pour le PDG)
   */
  static async updateExchangeRate(
    currency: string,
    rate: number,
    effectiveUntil?: Date
  ): Promise<boolean> {
    if (rate <= 0) return false;
    
    try {
      await db.update(currencyExchangeRates)
        .set({ isActive: false })
        .where(
          and(
            eq(currencyExchangeRates.targetCurrency, currency),
            eq(currencyExchangeRates.isActive, true)
          )
        );

      await db.insert(currencyExchangeRates).values({
        baseCurrency: 'GNF',
        targetCurrency: currency,
        rate: rate.toString(),
        isActive: true,
        effectiveUntil: effectiveUntil || null
      });

      ratesCache = null;
      
      return true;
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      return false;
    }
  }

  /**
   * Récupère tous les taux de change actifs
   */
  static async getAllRates(): Promise<Array<{
    currency: string;
    rate: number;
    effectiveFrom: string;
    effectiveUntil?: string;
  }>> {
    try {
      const rates = await db.select()
        .from(currencyExchangeRates)
        .where(eq(currencyExchangeRates.isActive, true))
        .orderBy(currencyExchangeRates.targetCurrency);

      return rates.map(r => ({
        currency: r.targetCurrency,
        rate: parseFloat(r.rate),
        effectiveFrom: r.effectiveFrom!.toISOString(),
        effectiveUntil: r.effectiveUntil?.toISOString()
      }));
    } catch (error) {
      console.error('Error getting all rates:', error);
      return [];
    }
  }

  /**
   * Vide le cache des taux de change
   */
  static clearCache(): void {
    ratesCache = null;
    cacheTimestamp = 0;
  }
}
