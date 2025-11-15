/**
 * Taxi Moto Payment Service - Stub temporaire
 */

export class TaxiMotoPaymentService {
  private static instance: TaxiMotoPaymentService;

  static getInstance(): TaxiMotoPaymentService {
    if (!TaxiMotoPaymentService.instance) {
      TaxiMotoPaymentService.instance = new TaxiMotoPaymentService();
    }
    return TaxiMotoPaymentService.instance;
  }

  async getPaymentMethods() { return []; }
  async createTripPayment() { return null; }
  async getTransactionHistory() { return []; }
  async processDriverPayment() { return null; }
}
