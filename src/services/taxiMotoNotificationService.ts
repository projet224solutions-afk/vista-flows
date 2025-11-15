/**
 * Taxi Moto Notification Service - Stub temporaire
 */

export interface TaxiNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

export class TaxiMotoNotificationService {
  private static instance: TaxiMotoNotificationService;

  static getInstance(): TaxiMotoNotificationService {
    if (!TaxiMotoNotificationService.instance) {
      TaxiMotoNotificationService.instance = new TaxiMotoNotificationService();
    }
    return TaxiMotoNotificationService.instance;
  }

  async sendNotification(): Promise<void> {}
  async getNotifications(): Promise<TaxiNotification[]> { return []; }
  async markAsRead(): Promise<void> {}
}

export const taxiNotificationService = TaxiMotoNotificationService.getInstance();
