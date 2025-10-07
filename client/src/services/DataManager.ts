/**
 * 🚀 DataManager Unifié - 224Solutions
 * Couche d'abstraction pour optimiser Backend ↔ Frontend ↔ Database
 */

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Types unifiés
export interface DataQuery {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  realtime?: boolean;
}

export interface DataMutation {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data?: any;
  filters?: Record<string, any>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live en ms
}

export class DataManager {
  private static instance: DataManager;
  private cache = new Map<string, CacheEntry<any>>();
  private subscriptions = new Map<string, RealtimeChannel>();
  private listeners = new Map<string, Set<(data: any) => void>>();

  // Singleton pattern
  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  /**
   * 📊 Requête unifiée avec cache intelligent
   */
  async query<T>(queryConfig: DataQuery): Promise<T | null> {
    const cacheKey = this.generateCacheKey(queryConfig);
    
    // Vérifier le cache
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for ${cacheKey}`);
      return cached;
    }

    try {
      console.log(`🔍 Fetching data for ${queryConfig.table}`);
      
      // Construire la requête
      let query = supabase
        .from(queryConfig.table as any)
        .select(queryConfig.select || '*');

      // Appliquer les filtres
      if (queryConfig.filters) {
        Object.entries(queryConfig.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value as any);
          } else if (typeof value === 'object' && value.operator) {
            // Filtres avancés : { operator: 'gte', value: 100 }
            const operator = value.operator as any;
            query = (query as any)[operator](key, value.value);
          } else {
            query = query.eq(key, value as any);
          }
        });
      }

      // Tri
      if (queryConfig.orderBy) {
        query = query.order(queryConfig.orderBy.column, { 
          ascending: queryConfig.orderBy.ascending ?? true 
        });
      }

      // Limite
      if (queryConfig.limit) {
        query = query.limit(queryConfig.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`❌ Error fetching ${queryConfig.table}:`, error);
        throw error;
      }

      // Mettre en cache
      this.setCache(cacheKey, data, 5 * 60 * 1000); // 5 minutes TTL

      // Configurer temps réel si demandé
      if (queryConfig.realtime) {
        this.setupRealtime(queryConfig, cacheKey);
      }

      return data as T;
    } catch (error) {
      console.error(`💥 DataManager query failed:`, error);
      throw error;
    }
  }

  /**
   * ✏️ Mutation unifiée avec optimistic updates
   */
  async mutate(mutationConfig: DataMutation): Promise<any> {
    try {
      console.log(`✏️ Mutating ${mutationConfig.table} - ${mutationConfig.operation}`);

      let query = supabase.from(mutationConfig.table as any);
      let result;

      switch (mutationConfig.operation) {
        case 'insert':
          result = await query.insert(mutationConfig.data).select();
          break;
        
        case 'update':
          if (!mutationConfig.filters) {
            throw new Error('Filters required for update operation');
          }
          query = this.applyFilters(query, mutationConfig.filters);
          result = await query.update(mutationConfig.data).select();
          break;
        
        case 'delete':
          if (!mutationConfig.filters) {
            throw new Error('Filters required for delete operation');
          }
          query = this.applyFilters(query, mutationConfig.filters);
          result = await query.delete().select();
          break;
      }

      if (result.error) {
        throw result.error;
      }

      // Invalider le cache pour cette table
      this.invalidateCache(mutationConfig.table);

      // Notifier les listeners
      this.notifyListeners(mutationConfig.table, result.data);

      return result.data;
    } catch (error) {
      console.error(`💥 DataManager mutation failed:`, error);
      throw error;
    }
  }

  /**
   * 📡 Configuration temps réel
   */
  private setupRealtime(queryConfig: DataQuery, cacheKey: string) {
    const channelName = `realtime_${queryConfig.table}`;
    
    if (this.subscriptions.has(channelName)) {
      return; // Déjà configuré
    }

    console.log(`📡 Setting up realtime for ${queryConfig.table}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: queryConfig.table,
        },
        (payload) => {
          console.log(`🔄 Realtime update for ${queryConfig.table}:`, payload);
          
          // Invalider le cache
          this.invalidateCache(queryConfig.table);
          
          // Notifier les listeners
          this.notifyListeners(queryConfig.table, payload);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
  }

  /**
   * 👂 Écouter les changements
   */
  subscribe(table: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    
    this.listeners.get(table)!.add(callback);

    // Retourner fonction de désabonnement
    return () => {
      this.listeners.get(table)?.delete(callback);
    };
  }

  /**
   * 🔔 Notifier les listeners
   */
  private notifyListeners(table: string, data: any) {
    const listeners = this.listeners.get(table);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * 🗂️ Gestion du cache
   */
  private generateCacheKey(queryConfig: DataQuery): string {
    return `${queryConfig.table}_${JSON.stringify(queryConfig)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Vérifier TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private invalidateCache(table: string) {
    // Supprimer toutes les entrées de cache pour cette table
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.startsWith(table)
    );
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Cache invalidated for ${table} (${keysToDelete.length} entries)`);
  }

  /**
   * 🔧 Utilitaires
   */
  private applyFilters(query: any, filters: Record<string, any>) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    return query;
  }

  /**
   * 📊 Statistiques du cache
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      subscriptions: this.subscriptions.size,
      listeners: Array.from(this.listeners.entries()).map(([table, listeners]) => ({
        table,
        count: listeners.size
      }))
    };
  }

  /**
   * 🧹 Nettoyage
   */
  cleanup() {
    // Fermer toutes les subscriptions
    this.subscriptions.forEach(channel => {
      channel.unsubscribe();
    });
    
    // Vider les caches et listeners
    this.cache.clear();
    this.subscriptions.clear();
    this.listeners.clear();
    
    console.log('🧹 DataManager cleaned up');
  }
}

// Export singleton
export const dataManager = DataManager.getInstance();
