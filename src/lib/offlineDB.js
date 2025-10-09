/**
 * OFFLINE DATABASE - INDEXEDDB STORAGE
 * Système de stockage hors-ligne pour l'interface vendeur 224SOLUTIONS
 * Gestion des événements en attente de synchronisation
 */

import { openDB } from 'idb';

const DB_NAME = 'VendorOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_events';

class OfflineDB {
    constructor() {
        this.db = null;
        this.init();
    }

    /**
     * Initialise la base de données IndexedDB
     */
    async init() {
        try {
            this.db = await openDB(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    // Créer le store pour les événements hors-ligne
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, {
                            keyPath: 'client_event_id',
                            autoIncrement: false
                        });

                        // Index pour les requêtes
                        store.createIndex('status', 'status', { unique: false });
                        store.createIndex('type', 'type', { unique: false });
                        store.createIndex('created_at', 'created_at', { unique: false });
                        store.createIndex('vendor_id', 'vendor_id', { unique: false });
                    }
                }
            });
            console.log('✅ OfflineDB initialisée avec succès');
        } catch (error) {
            console.error('❌ Erreur initialisation OfflineDB:', error);
        }
    }

    /**
     * Génère un UUID unique pour les événements
     */
    generateEventId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Stocke un événement hors-ligne
     */
    async storeEvent(eventData) {
        if (!this.db) {
            await this.init();
        }

        try {
            const event = {
                client_event_id: this.generateEventId(),
                type: eventData.type, // 'sale', 'receipt', 'invoice', 'payment', 'upload'
                status: 'pending', // 'pending', 'synced', 'failed'
                vendor_id: eventData.vendor_id,
                data: eventData.data,
                files: eventData.files || [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                retry_count: 0,
                max_retries: 3
            };

            await this.db.add(STORE_NAME, event);
            console.log('✅ Événement stocké hors-ligne:', event.client_event_id);
            return event.client_event_id;
        } catch (error) {
            console.error('❌ Erreur stockage événement:', error);
            throw error;
        }
    }

    /**
     * Récupère tous les événements en attente
     */
    async getPendingEvents() {
        if (!this.db) {
            await this.init();
        }

        try {
            const events = await this.db.getAllFromIndex(STORE_NAME, 'status', 'pending');
            return events;
        } catch (error) {
            console.error('❌ Erreur récupération événements en attente:', error);
            return [];
        }
    }

    /**
     * Récupère les événements par type
     */
    async getEventsByType(type) {
        if (!this.db) {
            await this.init();
        }

        try {
            const events = await this.db.getAllFromIndex(STORE_NAME, 'type', type);
            return events;
        } catch (error) {
            console.error('❌ Erreur récupération événements par type:', error);
            return [];
        }
    }

    /**
     * Marque un événement comme synchronisé
     */
    async markEventAsSynced(clientEventId) {
        if (!this.db) {
            await this.init();
        }

        try {
            const event = await this.db.get(STORE_NAME, clientEventId);
            if (event) {
                event.status = 'synced';
                event.updated_at = new Date().toISOString();
                await this.db.put(STORE_NAME, event);
                console.log('✅ Événement marqué comme synchronisé:', clientEventId);
            }
        } catch (error) {
            console.error('❌ Erreur marquage événement synchronisé:', error);
        }
    }

    /**
     * Marque un événement comme échoué
     */
    async markEventAsFailed(clientEventId, error = null) {
        if (!this.db) {
            await this.init();
        }

        try {
            const event = await this.db.get(STORE_NAME, clientEventId);
            if (event) {
                event.retry_count += 1;
                event.error = error;
                event.updated_at = new Date().toISOString();

                if (event.retry_count >= event.max_retries) {
                    event.status = 'failed';
                } else {
                    event.status = 'pending'; // Réessayer plus tard
                }

                await this.db.put(STORE_NAME, event);
                console.log('⚠️ Événement marqué comme échoué:', clientEventId);
            }
        } catch (error) {
            console.error('❌ Erreur marquage événement échoué:', error);
        }
    }

    /**
     * Supprime un événement synchronisé (nettoyage)
     */
    async deleteSyncedEvent(clientEventId) {
        if (!this.db) {
            await this.init();
        }

        try {
            await this.db.delete(STORE_NAME, clientEventId);
            console.log('🗑️ Événement synchronisé supprimé:', clientEventId);
        } catch (error) {
            console.error('❌ Erreur suppression événement:', error);
        }
    }

    /**
     * Nettoie les anciens événements synchronisés
     */
    async cleanupSyncedEvents() {
        if (!this.db) {
            await this.init();
        }

        try {
            const syncedEvents = await this.db.getAllFromIndex(STORE_NAME, 'status', 'synced');
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            for (const event of syncedEvents) {
                if (new Date(event.updated_at) < oneWeekAgo) {
                    await this.deleteSyncedEvent(event.client_event_id);
                }
            }

            console.log('🧹 Nettoyage des anciens événements terminé');
        } catch (error) {
            console.error('❌ Erreur nettoyage événements:', error);
        }
    }

    /**
     * Récupère les statistiques des événements
     */
    async getEventStats() {
        if (!this.db) {
            await this.init();
        }

        try {
            const allEvents = await this.db.getAll(STORE_NAME);

            const stats = {
                total: allEvents.length,
                pending: allEvents.filter(e => e.status === 'pending').length,
                synced: allEvents.filter(e => e.status === 'synced').length,
                failed: allEvents.filter(e => e.status === 'failed').length,
                by_type: {}
            };

            // Statistiques par type
            allEvents.forEach(event => {
                if (!stats.by_type[event.type]) {
                    stats.by_type[event.type] = { total: 0, pending: 0, synced: 0, failed: 0 };
                }
                stats.by_type[event.type].total++;
                stats.by_type[event.type][event.status]++;
            });

            return stats;
        } catch (error) {
            console.error('❌ Erreur récupération statistiques:', error);
            return { total: 0, pending: 0, synced: 0, failed: 0, by_type: {} };
        }
    }

    /**
     * Stocke un fichier localement (pour upload différé)
     */
    async storeFile(file, eventId) {
        if (!this.db) {
            await this.init();
        }

        try {
            const fileData = {
                id: this.generateEventId(),
                event_id: eventId,
                name: file.name,
                type: file.type,
                size: file.size,
                data: await this.fileToBase64(file),
                created_at: new Date().toISOString()
            };

            // Stocker dans un store séparé pour les fichiers
            if (!this.db.objectStoreNames.contains('offline_files')) {
                const store = this.db.createObjectStore('offline_files', {
                    keyPath: 'id'
                });
            }

            await this.db.add('offline_files', fileData);
            console.log('✅ Fichier stocké hors-ligne:', file.name);
            return fileData.id;
        } catch (error) {
            console.error('❌ Erreur stockage fichier:', error);
            throw error;
        }
    }

    /**
     * Convertit un fichier en base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Récupère un fichier stocké
     */
    async getStoredFile(fileId) {
        if (!this.db) {
            await this.init();
        }

        try {
            const fileData = await this.db.get('offline_files', fileId);
            return fileData;
        } catch (error) {
            console.error('❌ Erreur récupération fichier:', error);
            return null;
        }
    }

    /**
     * Supprime un fichier stocké
     */
    async deleteStoredFile(fileId) {
        if (!this.db) {
            await this.init();
        }

        try {
            await this.db.delete('offline_files', fileId);
            console.log('🗑️ Fichier supprimé:', fileId);
        } catch (error) {
            console.error('❌ Erreur suppression fichier:', error);
        }
    }
}

// Instance singleton
const offlineDB = new OfflineDB();

export default offlineDB;
export { OfflineDB };
