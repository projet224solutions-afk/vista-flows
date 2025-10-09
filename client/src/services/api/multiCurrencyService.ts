import { apiRequest } from "@/lib/queryClient";

export interface FeeCalculation {
  amount: number;
  currency: string;
  percentageFee: number;
  fixedFee: number;
  totalFee: number;
  amountAfterFee: number;
}

export interface CrossCurrencyTransfer {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  fees: FeeCalculation;
  recipientReceives: number;
}

export interface ExchangeRate {
  currency: string;
  rate: number;
}

export class MultiCurrencyService {
  /**
   * Calcule les frais pour une transaction (1% + 1000 GNF équivalent)
   */
  static async calculateFees(amount: number, currency: string = 'GNF'): Promise<FeeCalculation> {
    const response = await apiRequest('/api/transactions/calculate-fees', {
      method: 'POST',
      body: JSON.stringify({ amount, currency })
    });
    return response.data;
  }

  /**
   * Calcule les frais et conversion pour un transfert multi-devises
   */
  static async calculateCrossCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CrossCurrencyTransfer> {
    const response = await apiRequest('/api/transactions/calculate-cross-currency', {
      method: 'POST',
      body: JSON.stringify({ amount, fromCurrency, toCurrency })
    });
    return response.data;
  }

  /**
   * Obtient la liste des devises supportées
   */
  static async getSupportedCurrencies(): Promise<string[]> {
    const response = await apiRequest('/api/transactions/supported-currencies');
    return response.data;
  }

  /**
   * Obtient le taux de change d'une devise par rapport à GNF
   */
  static async getExchangeRate(currency: string): Promise<ExchangeRate> {
    const response = await apiRequest(`/api/transactions/exchange-rate/${currency}`);
    return response.data;
  }

  /**
   * Met à jour le taux de change (réservé au PDG)
   */
  static async updateExchangeRate(currency: string, rate: number): Promise<void> {
    await apiRequest('/api/transactions/update-exchange-rate', {
      method: 'POST',
      body: JSON.stringify({ currency, rate })
    });
  }
}
