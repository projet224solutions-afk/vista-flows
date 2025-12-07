/**
 * Service de gestion des alertes SOS pour Taxi Moto
 * Permet aux conducteurs d'envoyer des alertes d'urgence au Bureau Syndicat
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
   * Déclenche une alerte SOS
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

      // Créer l'objet SOS dans Supabase
      console.log('🚨 Création alerte SOS dans Supabase...');
      
      const { data: sosRecord, error: insertError } = await supabase
        .from('syndicate_sos_alerts')
        .insert({
          taxi_driver_id: taxiId,
          driver_name: driverName,
          driver_phone: driverPhone,
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          accuracy: currentPosition.accuracy,
          speed: currentPosition.speed,
          status: 'DANGER',
          bureau_id: bureauSyndicatId,
          description: description || 'Alerte SOS d\'urgence',
          triggered_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erreur insertion SOS:', insertError);
        throw new Error(`Impossible de créer l'alerte SOS: ${insertError.message}`);
      }

      console.log('✅ Alerte SOS créée avec ID:', sosRecord.id);

      // Mettre à jour le temps du dernier SOS
      this.lastSOSTime = Date.now();

      // Sauvegarder aussi en localStorage en backup
      const sosData: SOSAlert = {
        id: sosRecord.id,
        taxi_driver_id: taxiId,
        driver_name: driverName,
        driver_phone: driverPhone,
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        accuracy: currentPosition.accuracy,
        direction: currentPosition.direction,
        speed: currentPosition.speed,
        gps_history: this.gpsHistory,
        status: 'DANGER' as SOSStatus,
        bureau_syndicat_id: bureauSyndicatId,
        description: description,
        triggered_at: sosRecord.triggered_at
      };
      
      const existingAlerts = this.getLocalSOSAlerts();
      existingAlerts.push(sosData);
      localStorage.setItem('taxi_sos_alerts', JSON.stringify(existingAlerts));

      // Envoyer notification au Bureau Syndicat
      await this.notifyBureauSyndicat(sosData);

      toast.success('🚨 SOS envoyé avec succès!', {
        description: 'Le Bureau Syndicat a été notifié'
      });

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
   * Récupère les alertes SOS depuis localStorage
   */
  private getLocalSOSAlerts(): SOSAlert[] {
    try {
      const stored = localStorage.getItem('taxi_sos_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Notifie le Bureau Syndicat d'une nouvelle alerte
   */
  private async notifyBureauSyndicat(sosAlert: SOSAlert): Promise<void> {
    try {
      console.log('📢 Envoi notification Bureau Syndicat...');
      
      // 1. Notification système native
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('🚨 ALERTE SOS TAXI MOTO', {
            body: `${sosAlert.driver_name} a déclenché un SOS!\nPosition: ${sosAlert.latitude.toFixed(4)}, ${sosAlert.longitude.toFixed(4)}`,
            icon: '/taxi-icon.png',
            tag: `sos-${sosAlert.id}`,
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
          });
          console.log('✅ Notification système envoyée');
        } else if (Notification.permission === 'default') {
          // Demander permission
          await Notification.requestPermission();
        }
      }

      // 2. BroadcastChannel pour communication inter-onglets
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('taxi-sos-alerts');
        channel.postMessage({
          type: 'NEW_SOS',
          alert: sosAlert,
          timestamp: Date.now()
        });
        channel.close();
        console.log('✅ BroadcastChannel envoyé');
      }

      // 3. Créer notification dans la table notifications Supabase
      try {
        await supabase.from('notifications').insert({
          user_id: sosAlert.bureau_syndicat_id || 'all-bureaus',
          type: 'sos_alert',
          title: '🚨 ALERTE SOS URGENTE',
          message: `${sosAlert.driver_name} (${sosAlert.driver_phone}) a déclenché un SOS!`,
          data: {
            sos_id: sosAlert.id,
            driver_id: sosAlert.taxi_driver_id,
            driver_name: sosAlert.driver_name,
            driver_phone: sosAlert.driver_phone,
            latitude: sosAlert.latitude,
            longitude: sosAlert.longitude,
            accuracy: sosAlert.accuracy,
            triggered_at: sosAlert.triggered_at
          },
          priority: 'urgent',
          read: false
        });
        console.log('✅ Notification DB créée');
      } catch (dbError) {
        console.error('⚠️ Erreur notification DB:', dbError);
      }

      // 4. Jouer son d'alerte
      try {
        const audio = new Audio('/notification-urgent.mp3');
        audio.volume = 1.0;
        await audio.play();
      } catch (audioError) {
        console.warn('⚠️ Son alerte non joué:', audioError);
      }

      console.log('✅ Bureau Syndicat notifié pour SOS:', sosAlert.id);
    } catch (error) {
      console.error('❌ Erreur notification Bureau:', error);
      throw error;
    }
  }

  /**
   * Met à jour le statut d'une alerte SOS dans Supabase
   */
  public async updateSOSStatus(
    sosId: string,
    newStatus: SOSStatus,
    resolvedBy?: string
  ): Promise<boolean> {
    try {
      console.log(`🔄 Mise à jour SOS ${sosId} vers statut: ${newStatus}`);
      
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'RESOLU') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = resolvedBy;
      }
      
      const { error } = await supabase
        .from('syndicate_sos_alerts')
        .update(updateData)
        .eq('id', sosId);
      
      if (error) {
        console.error('❌ Erreur mise à jour SOS Supabase:', error);
        return false;
      }
      
      // Mettre à jour aussi localStorage en backup
      try {
        const alerts = this.getLocalSOSAlerts();
        const index = alerts.findIndex(a => a.id === sosId);
        
        if (index !== -1) {
          alerts[index].status = newStatus;
          alerts[index].updated_at = updateData.updated_at;
          
          if (newStatus === 'RESOLU') {
            alerts[index].resolved_at = updateData.resolved_at;
            alerts[index].resolved_by = resolvedBy;
          }
          
          localStorage.setItem('taxi_sos_alerts', JSON.stringify(alerts));
        }
      } catch (localError) {
        console.warn('⚠️ Erreur localStorage:', localError);
      }
      
      console.log('✅ SOS mis à jour avec succès');
      toast.success(`Statut mis à jour: ${newStatus}`);
      return true;
    } catch (error) {
      console.error('❌ Exception updateSOSStatus:', error);
      toast.error('Erreur mise à jour statut SOS');
      return false;
    }
  }

  /**
   * Récupère toutes les alertes SOS actives depuis Supabase
   */
  public async getActiveSOSAlerts(): Promise<SOSAlert[]> {
    try {
      console.log('🔍 Chargement alertes SOS actives depuis Supabase...');
      
      const { data, error } = await supabase
        .from('syndicate_sos_alerts')
        .select('*')
        .in('status', ['DANGER', 'EN_INTERVENTION'])
        .order('triggered_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Erreur chargement SOS Supabase:', error);
        // Fallback vers localStorage
        const alerts = this.getLocalSOSAlerts();
        return alerts.filter(a => a.status === 'DANGER' || a.status === 'EN_INTERVENTION');
      }

      console.log(`✅ ${data?.length || 0} alertes SOS actives chargées`);

      // Mapper les données Supabase vers le format SOSAlert
      return (data || []).map(record => ({
        id: record.id,
        taxi_driver_id: record.taxi_driver_id,
        driver_name: record.driver_name,
        driver_phone: record.driver_phone,
        latitude: record.latitude,
        longitude: record.longitude,
        accuracy: record.accuracy,
        direction: undefined,
        speed: record.speed,
        gps_history: [],
        status: record.status as SOSStatus,
        bureau_syndicat_id: record.bureau_id,
        description: record.description,
        triggered_at: record.triggered_at,
        resolved_at: record.resolved_at,
        resolved_by: record.resolved_by
      }));
    } catch (error) {
      console.error('❌ Exception getActiveSOSAlerts:', error);
      // Fallback vers localStorage
      const alerts = this.getLocalSOSAlerts();
      return alerts.filter(a => a.status === 'DANGER' || a.status === 'EN_INTERVENTION');
    }
  }

  /**
   * Récupère toutes les alertes SOS (y compris résolues)
   */
  public async getAllSOSAlerts(): Promise<SOSAlert[]> {
    return this.getLocalSOSAlerts();
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
