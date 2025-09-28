import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface TrackingData {
  id: string;
  order_id?: string;
  user_id: string;
  latitude?: number;
  longitude?: number;
  status: 'waiting' | 'in_progress' | 'delivered' | 'cancelled';
  notes?: string;
  updated_at: string;
  created_at: string;
}

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export const useTracking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Récupérer les données de tracking
  const fetchTrackingData = async (orderId?: string) => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('trackings')
        .select(`
          *,
          orders (
            id,
            order_number,
            customer_id,
            vendor_id,
            status
          )
        `)
        .eq('user_id', user.id);

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;
      setTrackingData(data || []);
    } catch (err: any) {
      console.error('Error fetching tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Créer un nouveau point de tracking
  const createTrackingPoint = async (
    orderId: string,
    latitude: number,
    longitude: number,
    status: 'waiting' | 'in_progress' | 'delivered' | 'cancelled' = 'in_progress',
    notes?: string
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('trackings')
        .insert({
          order_id: orderId,
          user_id: user.id,
          latitude,
          longitude,
          status,
          notes
        })
        .select()
        .single();

      if (error) throw error;

      setTrackingData(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le point de tracking",
        variant: "destructive",
      });
      console.error('Error creating tracking point:', err);
      return null;
    }
  };

  // Mettre à jour la position
  const updateLocation = async (
    trackingId: string,
    latitude: number,
    longitude: number,
    status?: 'waiting' | 'in_progress' | 'delivered' | 'cancelled',
    notes?: string
  ) => {
    try {
      const updateData: any = {
        latitude,
        longitude,
        updated_at: new Date().toISOString()
      };

      if (status) updateData.status = status;
      if (notes) updateData.notes = notes;

      const { error } = await supabase
        .from('trackings')
        .update(updateData)
        .eq('id', trackingId);

      if (error) throw error;

      // Mettre à jour l'état local
      setTrackingData(prev => 
        prev.map(tracking => 
          tracking.id === trackingId 
            ? { ...tracking, ...updateData }
            : tracking
        )
      );

      return true;
    } catch (err: any) {
      console.error('Error updating location:', err);
      return false;
    }
  };

  // Démarrer le suivi GPS
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS non supporté",
        description: "Votre appareil ne supporte pas la géolocalisation",
        variant: "destructive",
      });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // 1 minute
    };

    const successCallback = (position: GeolocationPosition) => {
      const locationUpdate: LocationUpdate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };
      
      setCurrentLocation(locationUpdate);
      console.log('Location updated:', locationUpdate);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      let message = "Erreur de géolocalisation";
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = "Permission de géolocalisation refusée";
          break;
        case error.POSITION_UNAVAILABLE:
          message = "Position indisponible";
          break;
        case error.TIMEOUT:
          message = "Délai d'attente dépassé";
          break;
      }

      toast({
        title: "Erreur GPS",
        description: message,
        variant: "destructive",
      });
      
      console.error('Geolocation error:', error);
      setIsTracking(false);
    };

    const id = navigator.geolocation.watchPosition(
      successCallback,
      errorCallback,
      options
    );

    setWatchId(id);
    setIsTracking(true);
    
    toast({
      title: "Suivi activé",
      description: "Le suivi GPS a été activé",
    });
  };

  // Arrêter le suivi GPS
  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    
    setIsTracking(false);
    setCurrentLocation(null);
    
    toast({
      title: "Suivi désactivé",
      description: "Le suivi GPS a été désactivé",
    });
  };

  // Obtenir la position actuelle une seule fois
  const getCurrentPosition = (): Promise<LocationUpdate | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationUpdate: LocationUpdate = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          resolve(locationUpdate);
        },
        (error) => {
          console.error('Error getting current position:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  // Calculer la distance entre deux points (en km)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Souscrire aux mises à jour de tracking en temps réel
  const subscribeToTracking = (orderId?: string) => {
    let channel = supabase
      .channel('tracking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trackings'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTrackingData(prev => [payload.new as TrackingData, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTrackingData(prev => 
              prev.map(tracking => 
                tracking.id === payload.new.id 
                  ? payload.new as TrackingData
                  : tracking
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  // Nettoyer les ressources au démontage
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  useEffect(() => {
    if (user) {
      fetchTrackingData();
    }
  }, [user]);

  return {
    trackingData,
    currentLocation,
    isTracking,
    loading,
    createTrackingPoint,
    updateLocation,
    startTracking,
    stopTracking,
    getCurrentPosition,
    calculateDistance,
    subscribeToTracking,
    fetchTrackingData
  };
};