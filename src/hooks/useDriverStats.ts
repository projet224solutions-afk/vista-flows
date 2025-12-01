import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseDriverStatsReturn {
  driverStats: {
    todayEarnings: number;
    todayRides: number;
    rating: number;
    totalRides: number;
    onlineTime: string;
  };
  loadDriverStats: () => Promise<void>;
}

export function useDriverStats(driverId: string | null): UseDriverStatsReturn {
  const [driverStats, setDriverStats] = useState({
    todayEarnings: 0,
    todayRides: 0,
    rating: 0,
    totalRides: 0,
    onlineTime: '0h 0m'
  });

  const loadDriverStats = useCallback(async () => {
    if (!driverId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: rides, error } = await supabase
        .from('taxi_trips')
        .select('*')
        .eq('driver_id', driverId)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const completedRides = rides?.filter(r => r.status === 'completed') || [];
      const todayEarnings = completedRides.reduce((sum, ride) => sum + (ride.driver_share || 0), 0);
      const todayRides = completedRides.length;

      const { data: allRides } = await supabase
        .from('taxi_trips')
        .select('id')
        .eq('driver_id', driverId)
        .eq('status', 'completed');

      const totalRides = allRides?.length || 0;

      const { data: currentDriver, error: driverError } = await supabase
        .from('taxi_drivers')
        .select('rating, total_rides, online_since')
        .eq('id', driverId)
        .single();

      if (driverError) {
        console.error('Error loading driver stats:', driverError);
      }

      const rating = 0; // TODO: Add rating column to taxi_drivers table

      let onlineTime = '0h 0m';
      // TODO: Add online_since column to taxi_drivers table
      // if (currentDriver?.online_since) {
      //   const onlineSince = new Date(currentDriver.online_since);
      //   const now = new Date();
      //   const diffMs = now.getTime() - onlineSince.getTime();
      //   const hours = Math.floor(diffMs / (1000 * 60 * 60));
      //   const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      //   onlineTime = `${hours}h ${minutes}m`;
      // }

      setDriverStats({
        todayEarnings,
        todayRides,
        rating: Math.round(rating * 10) / 10,
        totalRides,
        onlineTime
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [driverId]);

  useEffect(() => {
    if (driverId) {
      loadDriverStats();
      const interval = setInterval(loadDriverStats, 30000);
      return () => clearInterval(interval);
    }
  }, [driverId, loadDriverStats]);

  return { driverStats, loadDriverStats };
}
