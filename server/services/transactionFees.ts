/**
 * Service de calcul automatique des frais de transaction multi-devises
 * Frais : 1% du montant + 1000 GNF (ou équivalent dans autre devise)
 */

interface FeeCalculation {
  amount: number;
  currency: string;
  percentageFee: number;
  fixedFee: number;
  totalFee: number;
  amountAfterFee: number;
}

interface CurrencyRates {
  [key: string]: number; // Taux par rapport à GNF
}

// Taux de change par rapport à GNF (Franc Guinéen)
const EXCHANGE_RATES: CurrencyRates = {
  'GNF': 1,
  'XOF': 0.07, // CFA West Africa
  'XAF': 0.07, // CFA Central Africa  
  'USD': 8500,
  'EUR': 9200,
  'NGN': 20,
  'GHS': 750,
};

// Frais fixes en GNF (équivalent à 1000 GNF dans chaque devise)
const FIXED_FEE_GNF = 1000;

// Pourcentage de frais (1%)
const PERCENTAGE_FEE = 0.01;

export class TransactionFeeService {
  /**
   * Calcule les frais automatiques pour une transaction
   * @param amount Montant de la transaction
   * @param currency Code ISO de la devise (GNF, XOF, USD, etc.)
   * @returns Objet avec les détails des frais
   */
  static calculateFees(amount: number, currency: string = 'GNF'): FeeCalculation {
    const rate = EXCHANGE_RATES[currency] || 1;
    
    // Calculer le frais fixe dans la devise de la transaction
    const fixedFeeInCurrency = FIXED_FEE_GNF / rate;
    
    // Calculer le frais en pourcentage (1%)
    const percentageFee = amount * PERCENTAGE_FEE;
    
    // Total des frais
    const totalFee = percentageFee + fixedFeeInCurrency;
    
    // Montant après déduction des frais
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
   * @param amount Montant à convertir
   * @param fromCurrency Devise source
   * @param toCurrency Devise cible
   * @returns Montant converti
   */
  static convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): number {
    const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
    const toRate = EXCHANGE_RATES[toCurrency] || 1;
    
    // Convertir d'abord en GNF puis vers la devise cible
    const amountInGNF = amount * fromRate;
    const convertedAmount = amountInGNF / toRate;
    
    return Math.round(convertedAmount * 100) / 100;
  }

  /**
   * Calcule les frais pour un transfert multi-devises
   * @param amount Montant à envoyer
   * @param fromCurrency Devise de l'expéditeur
   * @param toCurrency Devise du destinataire
   * @returns Détails complets du transfert avec frais
   */
  static calculateCrossCurrencyFees(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): {
    originalAmount: number;
    originalCurrency: string;
    convertedAmount: number;
    targetCurrency: string;
    fees: FeeCalculation;
    recipientReceives: number;
  } {
    // Calculer les frais dans la devise source
    const fees = this.calculateFees(amount, fromCurrency);
    
    // Convertir le montant après frais vers la devise cible
    const convertedAmount = this.convertCurrency(
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
  static getSupportedCurrencies(): string[] {
    return Object.keys(EXCHANGE_RATES);
  }

  /**
   * Obtient le taux de change d'une devise
   */
  static getExchangeRate(currency: string): number {
    return EXCHANGE_RATES[currency] || 1;
  }

  /**
   * Met à jour le taux de change d'une devise (pour le PDG)
   */
  static updateExchangeRate(currency: string, rate: number): boolean {
    if (rate <= 0) return false;
    EXCHANGE_RATES[currency] = rate;
    return true;
  }
}
