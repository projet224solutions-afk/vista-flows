/**
 * HOOK DRIVER - 224SOLUTIONS
 * Hook React pour gérer l'état et les actions du livreur
 */

import { useState, useEffect, useCallback } from 'react';
import { DriverService, type DriverData } from '@/services/driver/DriverService';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export function useDriver() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    todayDeliveries: 0,
    weekEarnings: 0,
    weekDeliveries: 0,
    monthEarnings: 0,
    monthDeliveries: 0,
  });

  /**
   * Charger le profil du driver
   */
  const loadDriverProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const driverData = await DriverService.getDriverByUserId(user.id);
      if (driverData) {
        setDriver(driverData);
        
        // Charger les statistiques
        const driverStats = await DriverService.getDriverStats(driverData.id);
        setStats(driverStats);
      }
    } catch (error) {
      console.error('[useDriver] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Passer en ligne
   */
  const goOnline = useCallback(async (location: { lat: number; lng: number }) => {
    if (!driver) return;

    try {
      await DriverService.goOnline(driver.id, location);
      setDriver((prev) => prev ? { ...prev, status: 'online', is_online: true } : null);
      toast.success('✅ Vous êtes maintenant EN LIGNE');
    } catch (error) {
      toast.error('Impossible de passer en ligne');
    }
  }, [driver]);

  /**
   * Passer hors ligne
   */
  const goOffline = useCallback(async () => {
    if (!driver) return;

    try {
      await DriverService.goOffline(driver.id);
      setDriver((prev) => prev ? { ...prev, status: 'offline', is_online: false } : null);
      toast.success('Vous êtes maintenant HORS LIGNE');
    } catch (error) {
      toast.error('Impossible de passer hors ligne');
    }
  }, [driver]);

  /**
   * Mettre en pause
   */
  const pause = useCallback(async () => {
    if (!driver) return;

    try {
      await DriverService.pause(driver.id);
      setDriver((prev) => prev ? { ...prev, status: 'paused' } : null);
      toast.info('⏸️ En pause');
    } catch (error) {
      toast.error('Impossible de mettre en pause');
    }
  }, [driver]);

  /**
   * Mettre à jour la position GPS
   */
  const updateLocation = useCallback(async (coords: { lat: number; lng: number }) => {
    if (!driver) return;

    try {
      await DriverService.updateLocation(driver.id, coords);
    } catch (error) {
      console.error('[useDriver] Error updating location:', error);
    }
  }, [driver]);

  /**
   * Uploader une photo de preuve
   */
  const uploadProof = useCallback(async (deliveryId: string, file: File) => {
    try {
      const photoUrl = await DriverService.uploadProofPhoto(deliveryId, file);
      return photoUrl;
    } catch (error) {
      console.error('[useDriver] Error uploading proof:', error);
      throw error;
    }
  }, []);

  // S'abonner aux mises à jour en temps réel du profil
  useEffect(() => {
    if (!driver) return;

    const unsubscribe = DriverService.subscribeToDriver(driver.id, (updatedDriver) => {
      setDriver(updatedDriver);
    });

    return unsubscribe;
  }, [driver?.id]);

  // Charger le profil au montage
  useEffect(() => {
    loadDriverProfile();
  }, [loadDriverProfile]);

  return {
    driver,
    stats,
    loading,
    goOnline,
    goOffline,
    pause,
    updateLocation,
    uploadProof,
    loadDriverProfile,
  };
}
