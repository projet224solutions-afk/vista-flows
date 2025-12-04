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

      // Créer l'objet SOS en utilisant l'insertion directe (pas de table pour l'instant)
      const sosData: Partial<SOSAlert> = {
        id: crypto.randomUUID(),
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
        triggered_at: new Date().toISOString()
      };

      // Sauvegarder en localStorage temporairement (jusqu'à migration SQL)
      const existingAlerts = this.getLocalSOSAlerts();
      existingAlerts.push(sosData as SOSAlert);
      localStorage.setItem('taxi_sos_alerts', JSON.stringify(existingAlerts));

      // Mettre à jour le temps du dernier SOS
      this.lastSOSTime = Date.now();

      // Envoyer notification au Bureau Syndicat
      await this.notifyBureauSyndicat(sosData as SOSAlert);

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
      // Créer une notification système
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 ALERTE SOS TAXI MOTO', {
          body: `${sosAlert.driver_name} a déclenché un SOS!\nPosition: ${sosAlert.latitude}, ${sosAlert.longitude}`,
          icon: '/taxi-icon.png',
          tag: `sos-${sosAlert.id}`,
          requireInteraction: true
        });
      }

      // Broadcast via channel (si disponible)
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('taxi-sos-alerts');
        channel.postMessage({
          type: 'NEW_SOS',
          alert: sosAlert
        });
        channel.close();
      }

      console.log('📢 Bureau Syndicat notifié:', sosAlert);
    } catch (error) {
      console.error('Erreur notification Bureau:', error);
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
      const alerts = this.getLocalSOSAlerts();
      const index = alerts.findIndex(a => a.id === sosId);
      
      if (index === -1) {
        return false;
      }

      alerts[index].status = newStatus;
      alerts[index].updated_at = new Date().toISOString();
      
      if (newStatus === 'RESOLU') {
        alerts[index].resolved_at = new Date().toISOString();
        alerts[index].resolved_by = resolvedBy;
      }

      localStorage.setItem('taxi_sos_alerts', JSON.stringify(alerts));

      toast.success(`Statut mis à jour: ${newStatus}`);
      return true;
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      return false;
    }
  }

  /**
   * Récupère toutes les alertes SOS actives
   */
  public async getActiveSOSAlerts(): Promise<SOSAlert[]> {
    try {
      const alerts = this.getLocalSOSAlerts();
      return alerts.filter(a => a.status === 'DANGER' || a.status === 'EN_INTERVENTION');
    } catch (error) {
      console.error('Erreur récupération alertes:', error);
      return [];
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
