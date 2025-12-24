/**
 * 🌍 useRegion - Hook React pour la gestion multi-région
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  regionService,
  globalHealthService,
  RegionConfig,
  RegionHealth,
  HealthMetrics,
  HealthAlert,
  getEnabledRegions,
  REGIONS,
} from '@/services/region';

interface UseRegionReturn {
  // Current region
  currentRegion: RegionConfig | null;
  isDetecting: boolean;
  
  // Endpoints
  apiEndpoint: string;
  cdnEndpoint: string;
  wsEndpoint: string;
  
  // Health
  health: HealthMetrics | null;
  regionsHealth: RegionHealth[];
  alerts: HealthAlert[];
  
  // Actions
  detectRegion: () => Promise<RegionConfig>;
  switchRegion: (regionId: string) => void;
  failover: () => Promise<RegionConfig>;
  acknowledgeAlert: (alertId: string) => void;
  refreshHealth: () => Promise<HealthMetrics>;
  
  // Utils
  availableRegions: RegionConfig[];
  isHealthy: boolean;
}

export function useRegion(): UseRegionReturn {
  const [currentRegion, setCurrentRegion] = useState<RegionConfig | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [regionsHealth, setRegionsHealth] = useState<RegionHealth[]>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);

  // Détecter la région au montage
  useEffect(() => {
    detectRegion();
    
    // Mettre à jour la santé périodiquement
    const interval = setInterval(() => {
      refreshHealth();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const detectRegion = useCallback(async (): Promise<RegionConfig> => {
    setIsDetecting(true);
    try {
      const region = await regionService.detectOptimalRegion();
      setCurrentRegion(region);
      await refreshHealth();
      return region;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const switchRegion = useCallback((regionId: string): void => {
    const region = REGIONS[regionId];
    if (region && region.enabled) {
      setCurrentRegion(region);
      // Sauvegarder dans le localStorage
      localStorage.setItem('224sol_region', JSON.stringify({
        regionId: region.id,
        timestamp: Date.now(),
      }));
      console.log(`🌍 Switched to region: ${region.displayName}`);
    }
  }, []);

  const failover = useCallback(async (): Promise<RegionConfig> => {
    if (!currentRegion) {
      return detectRegion();
    }
    const newRegion = await regionService.failover(currentRegion.id);
    setCurrentRegion(newRegion);
    return newRegion;
  }, [currentRegion, detectRegion]);

  const refreshHealth = useCallback(async (): Promise<HealthMetrics> => {
    const healthData = await globalHealthService.performHealthCheck();
    setHealth(healthData);
    setRegionsHealth(healthData.regionsStatus);
    setAlerts(globalHealthService.getActiveAlerts());
    return healthData;
  }, []);

  const acknowledgeAlert = useCallback((alertId: string): void => {
    globalHealthService.acknowledgeAlert(alertId);
    setAlerts(globalHealthService.getActiveAlerts());
  }, []);

  // Computed values
  const apiEndpoint = currentRegion?.endpoints.api || 'https://api.224solutions.com';
  const cdnEndpoint = currentRegion?.endpoints.cdn || 'https://cdn.224solutions.com';
  const wsEndpoint = currentRegion?.endpoints.websocket || 'wss://ws.224solutions.com';
  const availableRegions = getEnabledRegions();
  const isHealthy = health?.overallStatus === 'healthy';

  return {
    currentRegion,
    isDetecting,
    apiEndpoint,
    cdnEndpoint,
    wsEndpoint,
    health,
    regionsHealth,
    alerts,
    detectRegion,
    switchRegion,
    failover,
    acknowledgeAlert,
    refreshHealth,
    availableRegions,
    isHealthy,
  };
}

export default useRegion;
