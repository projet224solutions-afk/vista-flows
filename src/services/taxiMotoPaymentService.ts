/**
 * Taxi Moto Payment Service - Stub temporaire
 */

export interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  isDefault: boolean;
}

export interface WalletBalance {
  balance: number;
  currency: string;
}

export class TaxiMotoPaymentService {
  private static instance: TaxiMotoPaymentService;

  static getInstance(): TaxiMotoPaymentService {
    if (!TaxiMotoPaymentService.instance) {
      TaxiMotoPaymentService.instance = new TaxiMotoPaymentService();
    }
    return TaxiMotoPaymentService.instance;
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> { return []; }
  async createTripPayment(): Promise<any> { return null; }
  async getTransactionHistory(): Promise<any[]> { return []; }
  async processDriverPayment(): Promise<any> { return null; }
}

export const taxiPaymentService = TaxiMotoPaymentService.getInstance();
