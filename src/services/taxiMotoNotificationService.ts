/**
 * Taxi Moto Notification Service - Stub temporaire
 */

export class TaxiMotoNotificationService {
  private static instance: TaxiMotoNotificationService;

  static getInstance(): TaxiMotoNotificationService {
    if (!TaxiMotoNotificationService.instance) {
      TaxiMotoNotificationService.instance = new TaxiMotoNotificationService();
    }
    return TaxiMotoNotificationService.instance;
  }

  async sendNotification() {}
  async getNotifications() { return []; }
  async markAsRead() {}
}
