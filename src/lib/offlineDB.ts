/**
 * OFFLINE DATABASE - Stockage IndexedDB pour mode hors ligne
 * 224SOLUTIONS - Gestion des événements offline
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineEvent {
  client_event_id: string;
  type: string;
  data: any;
  vendor_id?: string;
  created_at: string;
  status: 'pending' | 'synced' | 'failed';
  error_message?: string;
  retry_count: number;
}

interface OfflineDBSchema extends DBSchema {
  events: {
    key: string;
    value: OfflineEvent;
    indexes: {
      'by-status': string;
      'by-type': string;
      'by-created': string;
    };
  };
  cache: {
    key: string;
    value: {
      key: string;
      data: any;
      timestamp: number;
      ttl: number;
    };
  };
}

let db: IDBPDatabase<OfflineDBSchema> | null = null;

/**
 * Initialise la base de données IndexedDB
 */
async function initDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (db) return db;

  db = await openDB<OfflineDBSchema>('224Solutions-OfflineDB', 2, {
    upgrade(database, oldVersion) {
      // Store pour les événements
      if (!database.objectStoreNames.contains('events')) {
        const eventStore = database.createObjectStore('events', {
          keyPath: 'client_event_id'
        });
        eventStore.createIndex('by-status', 'status');
        eventStore.createIndex('by-type', 'type');
        eventStore.createIndex('by-created', 'created_at');
      }

      // Store pour le cache
      if (!database.objectStoreNames.contains('cache')) {
        database.createObjectStore('cache', { keyPath: 'key' });
      }
    }
  });

  return db;
}

/**
 * Stocke un événement pour synchronisation ultérieure
 */
async function storeEvent(event: Omit<OfflineEvent, 'client_event_id' | 'status' | 'retry_count'>): Promise<string> {
  const database = await initDB();
  const clientEventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const fullEvent: OfflineEvent = {
    ...event,
    client_event_id: clientEventId,
    status: 'pending',
    retry_count: 0
  };

  await database.put('events', fullEvent);
  console.log('📦 Événement stocké offline:', clientEventId);

  return clientEventId;
}

/**
 * Récupère tous les événements en attente
 */
async function getPendingEvents(): Promise<OfflineEvent[]> {
  const database = await initDB();
  return database.getAllFromIndex('events', 'by-status', 'pending');
}

/**
 * Récupère les événements échoués
 */
async function getFailedEvents(): Promise<OfflineEvent[]> {
  const database = await initDB();
  return database.getAllFromIndex('events', 'by-status', 'failed');
}

/**
 * Marque un événement comme synchronisé
 */
async function markEventAsSynced(clientEventId: string): Promise<void> {
  const database = await initDB();
  const event = await database.get('events', clientEventId);

  if (event) {
    event.status = 'synced';
    await database.put('events', event);
    console.log('✅ Événement synchronisé:', clientEventId);
  }
}

/**
 * Marque un événement comme échoué
 */
async function markEventAsFailed(clientEventId: string, errorMessage: string): Promise<void> {
  const database = await initDB();
  const event = await database.get('events', clientEventId);

  if (event) {
    event.status = 'failed';
    event.error_message = errorMessage;
    event.retry_count++;
    await database.put('events', event);
    console.log('❌ Événement échoué:', clientEventId, errorMessage);
  }
}

/**
 * Réinitialise un événement échoué pour nouvelle tentative
 */
async function retryEvent(clientEventId: string): Promise<void> {
  const database = await initDB();
  const event = await database.get('events', clientEventId);

  if (event && event.retry_count < 5) {
    event.status = 'pending';
    await database.put('events', event);
    console.log('🔄 Événement réinitialisé pour retry:', clientEventId);
  }
}

/**
 * Supprime les événements synchronisés anciens (> 24h)
 */
async function cleanupSyncedEvents(): Promise<number> {
  const database = await initDB();
  const allEvents = await database.getAll('events');
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  let cleaned = 0;

  for (const event of allEvents) {
    const eventTime = new Date(event.created_at).getTime();
    if (event.status === 'synced' && eventTime < oneDayAgo) {
      await database.delete('events', event.client_event_id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 ${cleaned} événements anciens nettoyés`);
  }

  return cleaned;
}

/**
 * Obtient les statistiques des événements
 */
async function getEventStats(): Promise<{
  total: number;
  pending: number;
  synced: number;
  failed: number;
  by_type: Record<string, number>;
}> {
  const database = await initDB();
  const allEvents = await database.getAll('events');

  const stats = {
    total: allEvents.length,
    pending: 0,
    synced: 0,
    failed: 0,
    by_type: {} as Record<string, number>
  };

  for (const event of allEvents) {
    if (event.status === 'pending') stats.pending++;
    else if (event.status === 'synced') stats.synced++;
    else if (event.status === 'failed') stats.failed++;

    stats.by_type[event.type] = (stats.by_type[event.type] || 0) + 1;
  }

  return stats;
}

/**
 * Stocke des données en cache avec TTL
 */
async function cacheData(key: string, data: any, ttlMs: number = 3600000): Promise<void> {
  const database = await initDB();
  await database.put('cache', {
    key,
    data,
    timestamp: Date.now(),
    ttl: ttlMs
  });
}

/**
 * Récupère des données du cache
 */
async function getCachedData<T>(key: string): Promise<T | null> {
  const database = await initDB();
  const cached = await database.get('cache', key);

  if (!cached) return null;

  // Vérifier le TTL
  if (Date.now() - cached.timestamp > cached.ttl) {
    await database.delete('cache', key);
    return null;
  }

  return cached.data as T;
}

/**
 * Efface tout le cache
 */
async function clearCache(): Promise<void> {
  const database = await initDB();
  await database.clear('cache');
  console.log('🧹 Cache effacé');
}

/**
 * Récupère un événement par ID
 */
async function getEvent(clientEventId: string): Promise<OfflineEvent | undefined> {
  const database = await initDB();
  return database.get('events', clientEventId);
}

/**
 * Supprime un événement
 */
async function deleteEvent(clientEventId: string): Promise<void> {
  const database = await initDB();
  await database.delete('events', clientEventId);
}

export default {
  initDB,
  storeEvent,
  getPendingEvents,
  getFailedEvents,
  markEventAsSynced,
  markEventAsFailed,
  retryEvent,
  cleanupSyncedEvents,
  getEventStats,
  cacheData,
  getCachedData,
  clearCache,
  getEvent,
  deleteEvent
};
