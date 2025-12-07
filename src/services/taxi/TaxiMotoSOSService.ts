/**
 * Service de gestion des alertes SOS pour Taxi Moto
 * Permet aux conducteurs d'envoyer des alertes d'urgence au Bureau Syndicat
 * Utilise Supabase pour la persistence et le temps réel
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { GPSPosition, SOSAlert, SOSResponse, SOSStatus } from '@/types/sos.types';

class TaxiMotoSOSService {
  private static instance: TaxiMotoSOSService;
  private watchId: number | null = null;
  private gpsHistory: GPSPosition[] = [];
  private maxHistorySize = 5;
  private lastSOSTime: number = 0;
  private cooldownPeriod = 60000; // 60 secondes

  private constructor() {
    // Démarrer le suivi GPS automatiquement
    this.startGPSTracking();
  }

  public static getInstance(): TaxiMotoSOSService {
    if (!TaxiMotoSOSService.instance) {
      TaxiMotoSOSService.instance = new TaxiMotoSOSService();
    }
    return TaxiMotoSOSService.instance;
  }

  /**
   * Démarre le suivi GPS en arrière-plan
   */
  private startGPSTracking(): void {
    if (!navigator.geolocation) {
      console.warn('Géolocalisation non disponible');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const gpsPoint: GPSPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          direction: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: position.timestamp
        };

        // Ajouter au début et garder seulement les N derniers points
        this.gpsHistory.unshift(gpsPoint);
        if (this.gpsHistory.length > this.maxHistorySize) {
          this.gpsHistory = this.gpsHistory.slice(0, this.maxHistorySize);
        }
      },
      (error) => {
        console.error('Erreur GPS tracking:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  /**
   * Obtient la position GPS actuelle
   */
  private async getCurrentPosition(): Promise<GPSPosition | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            direction: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp
          });
        },
        (error) => {
          console.error('Erreur position actuelle:', error);
          // Fallback: utiliser la dernière position connue
          resolve(this.gpsHistory[0] || null);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Vérifie si un SOS peut être déclenché (cooldown)
   */
  public canTriggerSOS(): boolean {
    const now = Date.now();
    return (now - this.lastSOSTime) >= this.cooldownPeriod;
  }

  /**
   * Obtient le temps restant avant de pouvoir déclencher un nouveau SOS
   */
  public getCooldownRemaining(): number {
    const now = Date.now();
    const elapsed = now - this.lastSOSTime;
    const remaining = Math.max(0, this.cooldownPeriod - elapsed);
    return Math.ceil(remaining / 1000); // en secondes
  }

  /**
   * Déclenche une alerte SOS - Sauvegarde dans Supabase
   */
  public async triggerSOS(
    taxiId: string,
    driverName: string,
    driverPhone: string,
    bureauSyndicatId?: string,
    description?: string
  ): Promise<SOSResponse> {
    try {
      // Vérifier le cooldown
      if (!this.canTriggerSOS()) {
        const remaining = this.getCooldownRemaining();
        return {
          success: false,
          message: `Veuillez attendre ${remaining}s avant de déclencher un nouveau SOS`,
          error: 'COOLDOWN'
        };
      }

      // Obtenir position actuelle
      const currentPosition = await this.getCurrentPosition();
      
      if (!currentPosition) {
        return {
          success: false,
          message: 'Impossible de récupérer votre position GPS',
          error: 'NO_GPS'
        };
      }

      console.log('📍 Position SOS:', currentPosition);
      console.log('🚨 Envoi SOS vers bureau:', bureauSyndicatId);

      // Insérer dans Supabase pour persistence et temps réel
      const { data: sosData, error } = await supabase
        .from('sos_alerts')
        .insert({
          driver_name: driverName,
          driver_phone: driverPhone,
          bureau_id: bureauSyndicatId || null,
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          accuracy: currentPosition.accuracy,
          direction: currentPosition.direction,
          speed: currentPosition.speed,
          gps_history: this.gpsHistory as any,
          status: 'DANGER',
          description: description || 'Alerte SOS déclenchée',
          alert_type: 'SOS_TAXI_MOTO',
          severity: 'critical',
          member_name: driverName,
          address: `GPS: ${currentPosition.latitude}, ${currentPosition.longitude}`
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur insertion SOS:', error);
        throw error;
      }

      console.log('✅ SOS enregistré:', sosData);

      // Mettre à jour le temps du dernier SOS
      this.lastSOSTime = Date.now();

      return {
        success: true,
        sos_id: sosData.id,
        message: 'SOS envoyé au Bureau Syndicat'
      };

    } catch (error: any) {
      console.error('Erreur déclenchement SOS:', error);
      toast.error('Erreur lors de l\'envoi du SOS');
      return {
        success: false,
        message: 'Erreur lors de l\'envoi du SOS',
        error: error.message
      };
    }
  }

  /**
   * Met à jour le statut d'une alerte SOS
   */
  public async updateSOSStatus(
    sosId: string,
    newStatus: SOSStatus,
    resolvedBy?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'RESOLU') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = resolvedBy;
      }

      const { error } = await supabase
        .from('sos_alerts')
        .update(updateData)
        .eq('id', sosId);

      if (error) {
        console.error('Erreur mise à jour SOS:', error);
        return false;
      }

      toast.success(`Statut mis à jour: ${newStatus}`);
      return true;
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      return false;
    }
  }

  /**
   * Récupère toutes les alertes SOS actives depuis Supabase
   */
  public async getActiveSOSAlerts(bureauId?: string): Promise<SOSAlert[]> {
    try {
      let query = supabase
        .from('sos_alerts')
        .select('*')
        .in('status', ['DANGER', 'EN_INTERVENTION'])
        .order('created_at', { ascending: false });

      if (bureauId) {
        query = query.eq('bureau_id', bureauId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur récupération alertes:', error);
        return [];
      }

      // Mapper les données Supabase vers le type SOSAlert
      return (data || []).map(row => {
        const gpsHistory = Array.isArray(row.gps_history) 
          ? (row.gps_history as any[]).map(p => ({
              latitude: Number(p?.latitude) || 0,
              longitude: Number(p?.longitude) || 0,
              accuracy: p?.accuracy,
              direction: p?.direction,
              speed: p?.speed,
              timestamp: p?.timestamp || Date.now()
            }))
          : [];
        
        return {
          id: row.id,
          taxi_driver_id: row.taxi_driver_id || '',
          driver_name: row.driver_name || row.member_name || 'Conducteur inconnu',
          driver_phone: row.driver_phone || '',
          latitude: Number(row.latitude) || 0,
          longitude: Number(row.longitude) || 0,
          accuracy: row.accuracy ? Number(row.accuracy) : undefined,
          direction: row.direction ? Number(row.direction) : undefined,
          speed: row.speed ? Number(row.speed) : undefined,
          gps_history: gpsHistory,
          status: row.status as SOSStatus,
          bureau_syndicat_id: row.bureau_id,
          description: row.description,
          resolved_by: row.resolved_by,
          resolved_at: row.resolved_at,
          triggered_at: row.created_at,
          updated_at: row.updated_at
        };
      });
    } catch (error) {
      console.error('Erreur récupération alertes:', error);
      return [];
    }
  }

  /**
   * Récupère toutes les alertes SOS (y compris résolues)
   */
  public async getAllSOSAlerts(bureauId?: string): Promise<SOSAlert[]> {
    try {
      let query = supabase
        .from('sos_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (bureauId) {
        query = query.eq('bureau_id', bureauId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur récupération alertes:', error);
        return [];
      }

      return (data || []).map(row => {
        const gpsHistory = Array.isArray(row.gps_history) 
          ? (row.gps_history as any[]).map(p => ({
              latitude: Number(p?.latitude) || 0,
              longitude: Number(p?.longitude) || 0,
              accuracy: p?.accuracy,
              direction: p?.direction,
              speed: p?.speed,
              timestamp: p?.timestamp || Date.now()
            }))
          : [];
        
        return {
          id: row.id,
          taxi_driver_id: row.taxi_driver_id || '',
          driver_name: row.driver_name || row.member_name || 'Conducteur inconnu',
          driver_phone: row.driver_phone || '',
          latitude: Number(row.latitude) || 0,
          longitude: Number(row.longitude) || 0,
          accuracy: row.accuracy ? Number(row.accuracy) : undefined,
          direction: row.direction ? Number(row.direction) : undefined,
          speed: row.speed ? Number(row.speed) : undefined,
          gps_history: gpsHistory,
          status: row.status as SOSStatus,
          bureau_syndicat_id: row.bureau_id,
          description: row.description,
          resolved_by: row.resolved_by,
          resolved_at: row.resolved_at,
          triggered_at: row.created_at,
          updated_at: row.updated_at
        };
      });
    } catch (error) {
      console.error('Erreur récupération alertes:', error);
      return [];
    }
  }

  /**
   * Obtient l'historique GPS
   */
  public getGPSHistory(): GPSPosition[] {
    return [...this.gpsHistory];
  }

  /**
   * Arrête le suivi GPS
   */
  public stopGPSTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

// Export singleton
export const taxiMotoSOSService = TaxiMotoSOSService.getInstance();
