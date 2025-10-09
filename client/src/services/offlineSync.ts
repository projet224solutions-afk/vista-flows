/**
 * Service de synchronisation offline/online pour les vendeurs
 * Gère le cache, la file d'attente et la synchronisation automatique
 */

export interface PendingAction {
  id: string;
  type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'CREATE_ORDER' | 'UPDATE_ORDER' | 'UPDATE_INVENTORY';
  data: any;
  timestamp: number;
  retryCount: number;
}

export class OfflineSyncService {
  private static readonly STORAGE_KEY = 'offline_sync_queue';
  private static readonly MAX_RETRIES = 3;
  private static syncInterval: NodeJS.Timeout | null = null;
  private static isOnline = navigator.onLine;

  /**
   * Initialise le service de synchronisation
   */
  static initialize() {
    // Écouter les changements de connexion
    window.addEventListener('online', () => {
      console.log('📡 Online - Starting sync...');
      this.isOnline = true;
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Offline mode activated');
      this.isOnline = false;
    });

    // Synchroniser toutes les 30 secondes si online
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingActions();
      }
    }, 30000);

    // Sync initial si online
    if (this.isOnline) {
      this.syncPendingActions();
    }
  }

  /**
   * Arrête le service
   */
  static destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Ajoute une action à la file d'attente
   */
  static async queueAction(type: PendingAction['type'], data: any): Promise<string> {
    const action: PendingAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    const queue = this.getQueue();
    queue.push(action);
    this.saveQueue(queue);

    console.log(`✅ Action queued: ${type}`, action.id);

    // Tenter de synchroniser immédiatement si online
    if (this.isOnline) {
      this.syncPendingActions();
    }

    return action.id;
  }

  /**
   * Récupère la file d'attente
   */
  private static getQueue(): PendingAction[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading sync queue:', error);
      return [];
    }
  }

  /**
   * Sauvegarde la file d'attente
   */
  private static saveQueue(queue: PendingAction[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  /**
   * Synchronise toutes les actions en attente
   */
  static async syncPendingActions(): Promise<{
    success: number;
    failed: number;
    remaining: number;
  }> {
    if (!this.isOnline) {
      return { success: 0, failed: 0, remaining: this.getQueue().length };
    }

    const queue = this.getQueue();
    if (queue.length === 0) {
      return { success: 0, failed: 0, remaining: 0 };
    }

    console.log(`🔄 Syncing ${queue.length} pending actions...`);

    let successCount = 0;
    let failedCount = 0;
    const remainingQueue: PendingAction[] = [];

    for (const action of queue) {
      try {
        await this.executeAction(action);
        successCount++;
        console.log(`✅ Synced: ${action.type}`, action.id);
      } catch (error) {
        action.retryCount++;
        
        if (action.retryCount < this.MAX_RETRIES) {
          remainingQueue.push(action);
          console.warn(`⚠️ Retry ${action.retryCount}/${this.MAX_RETRIES}: ${action.type}`, action.id);
        } else {
          failedCount++;
          console.error(`❌ Max retries reached: ${action.type}`, action.id, error);
        }
      }
    }

    this.saveQueue(remainingQueue);

    const result = {
      success: successCount,
      failed: failedCount,
      remaining: remainingQueue.length
    };

    console.log('📊 Sync complete:', result);
    return result;
  }

  /**
   * Exécute une action spécifique
   */
  private static async executeAction(action: PendingAction): Promise<void> {
    const baseUrl = '/api';

    switch (action.type) {
      case 'CREATE_PRODUCT':
        await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;

      case 'UPDATE_PRODUCT':
        await fetch(`${baseUrl}/products/${action.data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;

      case 'CREATE_ORDER':
        await fetch(`${baseUrl}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;

      case 'UPDATE_ORDER':
        await fetch(`${baseUrl}/orders/${action.data.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action.data.status })
        });
        break;

      case 'UPDATE_INVENTORY':
        // TODO: Implémenter l'endpoint inventory
        break;

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Obtient le statut de synchronisation
   */
  static getSyncStatus(): {
    isOnline: boolean;
    pendingCount: number;
    queue: PendingAction[];
  } {
    return {
      isOnline: this.isOnline,
      pendingCount: this.getQueue().length,
      queue: this.getQueue()
    };
  }

  /**
   * Nettoie les actions anciennes (> 7 jours)
   */
  static cleanOldActions() {
    const queue = this.getQueue();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const cleaned = queue.filter(action => action.timestamp > sevenDaysAgo);
    
    if (cleaned.length < queue.length) {
      this.saveQueue(cleaned);
      console.log(`🧹 Cleaned ${queue.length - cleaned.length} old actions`);
    }
  }
}
