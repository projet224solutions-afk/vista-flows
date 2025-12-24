/**
 * 🌍 RegionService - Gestion des régions et routage intelligent
 * Détection automatique de la meilleure région pour l'utilisateur
 */

import { 
  REGIONS, 
  RegionConfig, 
  RegionHealth, 
  getEnabledRegions, 
  getPrimaryRegion,
  getFailoverRegions,
  GLOBAL_CONFIG,
} from '@/config/regions';

interface GeoLocation {
  latitude: number;
  longitude: number;
  country?: string;
  city?: string;
  continent?: string;
  timezone?: string;
}

interface RegionLatencyResult {
  regionId: string;
  latency: number;
  status: 'success' | 'timeout' | 'error';
}

class RegionService {
  private static instance: RegionService;
  private currentRegion: RegionConfig | null = null;
  private regionHealth: Map<string, RegionHealth> = new Map();
  private userLocation: GeoLocation | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeHealthChecks();
  }

  static getInstance(): RegionService {
    if (!RegionService.instance) {
      RegionService.instance = new RegionService();
    }
    return RegionService.instance;
  }

  // ==================== DÉTECTION DE RÉGION ====================

  /**
   * Détecter automatiquement la meilleure région pour l'utilisateur
   */
  async detectOptimalRegion(): Promise<RegionConfig> {
    console.log('🌍 Detecting optimal region...');

    // 1. Vérifier le cache local
    const cached = this.getCachedRegion();
    if (cached) {
      console.log(`✅ Using cached region: ${cached.displayName}`);
      return cached;
    }

    // 2. Obtenir la géolocalisation
    const location = await this.getUserLocation();
    
    // 3. Mesurer la latence vers chaque région
    const latencies = await this.measureAllRegionsLatency();
    
    // 4. Sélectionner la meilleure région
    const optimal = this.selectBestRegion(location, latencies);
    
    // 5. Mettre en cache
    this.cacheRegion(optimal);
    this.currentRegion = optimal;
    
    console.log(`✅ Optimal region selected: ${optimal.displayName} (${optimal.id})`);
    return optimal;
  }

  /**
   * Obtenir la localisation de l'utilisateur
   */
  private async getUserLocation(): Promise<GeoLocation | null> {
    if (this.userLocation) return this.userLocation;

    try {
      // Essayer l'API de géolocalisation IP
      const response = await fetch('https://ipapi.co/json/', { 
        signal: AbortSignal.timeout(5000) 
      });
      
      if (response.ok) {
        const data = await response.json();
        this.userLocation = {
          latitude: data.latitude,
          longitude: data.longitude,
          country: data.country_code,
          city: data.city,
          continent: data.continent_code,
          timezone: data.timezone,
        };
        console.log(`📍 User location detected: ${data.city}, ${data.country_code}`);
        return this.userLocation;
      }
    } catch (error) {
      console.warn('⚠️ Could not detect user location:', error);
    }

    // Fallback: utiliser le timezone du navigateur
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const continent = this.getContinentFromTimezone(timezone);
      this.userLocation = {
        latitude: 0,
        longitude: 0,
        continent,
        timezone,
      };
      return this.userLocation;
    } catch {
      return null;
    }
  }

  /**
   * Mesurer la latence vers toutes les régions actives
   */
  private async measureAllRegionsLatency(): Promise<RegionLatencyResult[]> {
    const regions = getEnabledRegions();
    const results: RegionLatencyResult[] = [];

    await Promise.all(
      regions.map(async (region) => {
        const result = await this.measureRegionLatency(region);
        results.push(result);
      })
    );

    return results.sort((a, b) => a.latency - b.latency);
  }

  /**
   * Mesurer la latence vers une région spécifique
   */
  private async measureRegionLatency(region: RegionConfig): Promise<RegionLatencyResult> {
    const startTime = performance.now();
    
    try {
      // Ping l'endpoint de santé de la région
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      // En développement, on simule la latence basée sur la distance
      const simulatedLatency = this.simulateLatency(region);
      
      clearTimeout(timeout);
      
      return {
        regionId: region.id,
        latency: simulatedLatency,
        status: 'success',
      };
    } catch (error) {
      return {
        regionId: region.id,
        latency: Infinity,
        status: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'error',
      };
    }
  }

  /**
   * Simuler la latence (pour le développement)
   */
  private simulateLatency(region: RegionConfig): number {
    // Base latency par région
    const baseLatency: Record<string, number> = {
      'africa-west': 30,
      'africa-central': 60,
      'europe-west': 100,
      'europe-central': 120,
      'us-east': 180,
      'us-west': 220,
      'asia-east': 280,
    };

    const base = baseLatency[region.id] || 150;
    const variance = Math.random() * 20 - 10; // ±10ms variance
    
    return Math.max(10, base + variance);
  }

  /**
   * Sélectionner la meilleure région
   */
  private selectBestRegion(
    location: GeoLocation | null, 
    latencies: RegionLatencyResult[]
  ): RegionConfig {
    const enabledRegions = getEnabledRegions();
    
    // Si on a des résultats de latence, prendre la plus rapide
    if (latencies.length > 0) {
      const fastestHealthy = latencies.find(l => {
        const health = this.regionHealth.get(l.regionId);
        return l.status === 'success' && (!health || health.status !== 'unhealthy');
      });

      if (fastestHealthy) {
        const region = REGIONS[fastestHealthy.regionId];
        if (region) return region;
      }
    }

    // Fallback: sélection basée sur la géolocalisation
    if (location?.continent) {
      const continentRegions = enabledRegions.filter(
        r => r.continent === this.mapContinent(location.continent!)
      );
      if (continentRegions.length > 0) {
        return continentRegions[0];
      }
    }

    // Fallback final: région primaire
    return getPrimaryRegion();
  }

  // ==================== HEALTH CHECKS ====================

  /**
   * Initialiser les health checks périodiques
   */
  private initializeHealthChecks(): void {
    if (typeof window === 'undefined') return;

    // Premier check immédiat
    this.performHealthChecks();

    // Checks périodiques
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      GLOBAL_CONFIG.loadBalancing.healthCheckInterval
    );
  }

  /**
   * Effectuer les health checks sur toutes les régions
   */
  private async performHealthChecks(): Promise<void> {
    const regions = getEnabledRegions();

    await Promise.all(
      regions.map(async (region) => {
        const health = await this.checkRegionHealth(region);
        this.regionHealth.set(region.id, health);
      })
    );
  }

  /**
   * Vérifier la santé d'une région
   */
  private async checkRegionHealth(region: RegionConfig): Promise<RegionHealth> {
    const startTime = performance.now();
    
    try {
      // Simuler le health check
      const latency = this.simulateLatency(region);
      const isHealthy = latency < region.latency.threshold;

      return {
        regionId: region.id,
        status: isHealthy ? 'healthy' : 'degraded',
        latency,
        lastCheck: new Date().toISOString(),
        uptime: 99.9 + Math.random() * 0.1,
        errorRate: Math.random() * 0.5,
        load: 30 + Math.random() * 40,
      };
    } catch {
      return {
        regionId: region.id,
        status: 'unhealthy',
        latency: -1,
        lastCheck: new Date().toISOString(),
        uptime: 0,
        errorRate: 100,
        load: 0,
      };
    }
  }

  // ==================== FAILOVER ====================

  /**
   * Basculer vers une région de secours
   */
  async failover(fromRegionId: string): Promise<RegionConfig> {
    console.log(`🔄 Initiating failover from ${fromRegionId}...`);

    const failoverRegions = getFailoverRegions(fromRegionId);
    
    for (const region of failoverRegions) {
      const health = this.regionHealth.get(region.id);
      if (!health || health.status === 'healthy') {
        console.log(`✅ Failover to ${region.displayName}`);
        this.currentRegion = region;
        this.cacheRegion(region);
        return region;
      }
    }

    // Fallback vers la région primaire
    const primary = getPrimaryRegion();
    console.log(`⚠️ Failover to primary region: ${primary.displayName}`);
    this.currentRegion = primary;
    return primary;
  }

  // ==================== CACHE ====================

  private getCachedRegion(): RegionConfig | null {
    try {
      const cached = localStorage.getItem('224sol_region');
      if (cached) {
        const { regionId, timestamp } = JSON.parse(cached);
        const ttl = GLOBAL_CONFIG.loadBalancing.sessionTTL;
        
        if (Date.now() - timestamp < ttl) {
          const region = REGIONS[regionId];
          if (region?.enabled) {
            return region;
          }
        }
      }
    } catch {
      // Ignore cache errors
    }
    return null;
  }

  private cacheRegion(region: RegionConfig): void {
    try {
      localStorage.setItem('224sol_region', JSON.stringify({
        regionId: region.id,
        timestamp: Date.now(),
      }));
    } catch {
      // Ignore cache errors
    }
  }

  // ==================== HELPERS ====================

  private getContinentFromTimezone(timezone: string): string {
    if (timezone.startsWith('Africa')) return 'Africa';
    if (timezone.startsWith('Europe')) return 'Europe';
    if (timezone.startsWith('America')) return 'North America';
    if (timezone.startsWith('Asia')) return 'Asia';
    if (timezone.startsWith('Australia') || timezone.startsWith('Pacific')) return 'Oceania';
    return 'Unknown';
  }

  private mapContinent(continentCode: string): string {
    const mapping: Record<string, string> = {
      'AF': 'Africa',
      'EU': 'Europe',
      'NA': 'North America',
      'SA': 'South America',
      'AS': 'Asia',
      'OC': 'Oceania',
    };
    return mapping[continentCode] || 'Unknown';
  }

  // ==================== PUBLIC API ====================

  getCurrentRegion(): RegionConfig {
    return this.currentRegion || getPrimaryRegion();
  }

  getRegionHealth(regionId: string): RegionHealth | undefined {
    return this.regionHealth.get(regionId);
  }

  getAllRegionsHealth(): RegionHealth[] {
    return Array.from(this.regionHealth.values());
  }

  getApiEndpoint(): string {
    return this.getCurrentRegion().endpoints.api;
  }

  getCdnEndpoint(): string {
    return this.getCurrentRegion().endpoints.cdn;
  }

  getWebsocketEndpoint(): string {
    return this.getCurrentRegion().endpoints.websocket;
  }

  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

export const regionService = RegionService.getInstance();
export default regionService;
