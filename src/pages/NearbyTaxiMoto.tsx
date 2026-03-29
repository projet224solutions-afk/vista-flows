/**
 * NEARBY TAXI-MOTO PAGE
 * Liste des taxi-motos disponibles Ã  proximitÃ©
 * 224Solutions - Production Ready v4 (Uber/Bolt Grade)
 *
 * Optimisations appliquÃ©es:
 * âœ… Comparaison des distances arrondies (Ã©vite re-renders sur micro-changements)
 * âœ… DÃ©pendances React corrigÃ©es (pas de drivers.length dans useCallback)
 * âœ… Logique refresh unifiÃ©e (refreshPosition dÃ©clenche loadDrivers)
 * âœ… Intervalle secondes unique (ref pour lastUpdated)
 * âœ… Annulation des requÃªtes (AbortController)
 * âœ… Auto-refresh intelligent (visibilityState)
 * âœ… Protection memory leaks complÃ¨te
 * âœ… Protection contre requÃªtes parallÃ¨les
 * âœ… Anti-spam sur bouton refresh
 * âœ… Aucune recrÃ©ation d'intervalle inutile
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bike,
  Navigation,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QuickFooter from "@/components/QuickFooter";
import { useGeoDistance } from "@/hooks/useGeoDistance";
import {
  type TaxiDriver,
  processTaxiDriver,
  filterDriversByRadius,
  sortDrivers,
  extractProfilesFromJoinedData,
} from '@/lib/drivers';
import { TaxiDriversList } from '@/components/drivers';

// ============================================================================
// Constants
// ============================================================================

const RADIUS_KM = 20;
const AUTO_REFRESH_INTERVAL = 20000; // 20 secondes
const MAX_DRIVERS_LIMIT = 100;
const REFRESH_COOLDOWN = 2000; // 2 secondes entre les clics manuels

// ============================================================================
// Utility: Compare driver arrays avec distances arrondies
// ============================================================================

/**
 * Compare deux arrays de drivers en arrondissant les distances
 * pour Ã©viter les re-renders sur des micro-changements de float
 */
function areDriversEqual(prev: TaxiDriver[], next: TaxiDriver[]): boolean {
  if (prev.length !== next.length) return false;

  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];

    // âœ… Arrondir les distances Ã  2 dÃ©cimales (centiÃ¨mes de km = 10m)
    const pDistanceRounded = p.distance !== undefined ? Math.round(p.distance * 100) : -1;
    const nDistanceRounded = n.distance !== undefined ? Math.round(n.distance * 100) : -1;

    // âœ… Arrondir les ratings Ã  1 dÃ©cimale
    const pRatingRounded = p.rating !== null ? Math.round(p.rating * 10) : -1;
    const nRatingRounded = n.rating !== null ? Math.round(n.rating * 10) : -1;

    if (
      p.id !== n.id ||
      p.status !== n.status ||
      p.is_online !== n.is_online ||
      pDistanceRounded !== nDistanceRounded ||
      pRatingRounded !== nRatingRounded
    ) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Composant principal
// ============================================================================

export default function NearbyTaxiMoto() {
  const navigate = useNavigate();

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // State
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const [drivers, setDrivers] = useState<TaxiDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Refs pour protection memory leaks, requÃªtes et intervalles
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const autoRefreshRef = useRef<number | null>(null);
  const secondsIntervalRef = useRef<number | null>(null);
  const lastRefreshClickRef = useRef<number>(0);
  const lastUpdatedRef = useRef<Date | null>(null); // âœ… Ref au lieu de state pour Ã©viter recrÃ©ation d'intervalle
  const driversRef = useRef<TaxiDriver[]>([]); // âœ… Ref pour accÃ¨s dans catch sans dÃ©pendance

  // GÃ©olocalisation centralisÃ©e
  const { userPosition, positionReady, refreshPosition } = useGeoDistance();

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Fonction de chargement optimisÃ©e avec AbortController
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const loadDrivers = useCallback(async (isAutoRefresh = false) => {
    // âœ… Protection contre les requÃªtes parallÃ¨les
    if (isFetchingRef.current) return;
    if (!positionReady) return;

    // âœ… Annuler la requÃªte prÃ©cÃ©dente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // âœ… CrÃ©er un nouveau AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    isFetchingRef.current = true;

    // âœ… Activer le loading UNIQUEMENT pour le premier chargement
    if (!isAutoRefresh) {
      setLoading(true);
      setError(null);
    }

    try {
      const position = { lat: userPosition.latitude, lng: userPosition.longitude };

      const { data, error: queryError } = await supabase
        .from('taxi_drivers')
        .select(`
          id,
          user_id,
          vehicle_type,
          vehicle_plate,
          rating,
          total_rides,
          status,
          is_online,
          last_lat,
          last_lng,
          profiles:user_id (id, first_name, last_name, phone, avatar_url)
        `)
        .eq('is_online', true)
        .limit(MAX_DRIVERS_LIMIT)
        .abortSignal(abortController.signal);

      // âœ… VÃ©rifier si la requÃªte a Ã©tÃ© annulÃ©e ou composant dÃ©montÃ©
      if (abortController.signal.aborted || !isMountedRef.current) return;

      if (queryError) throw new Error(`Erreur: ${queryError.message}`);

      // Traitement des donnÃ©es
      const rawData = (data || []) as Array<Record<string, unknown>>;
      const profileMap = extractProfilesFromJoinedData(rawData);

      const processedDrivers: TaxiDriver[] = [];
      for (const raw of rawData) {
        processedDrivers.push(processTaxiDriver(raw, position, profileMap));
      }

      const filtered = filterDriversByRadius(processedDrivers, RADIUS_KM);
      const sorted = sortDrivers(filtered) as TaxiDriver[];

      // âœ… VÃ©rifier Ã  nouveau si annulÃ© ou dÃ©montÃ©
      if (abortController.signal.aborted || !isMountedRef.current) return;

      // âœ… Mettre Ã  jour uniquement si les donnÃ©es ont changÃ©
      setDrivers(prevDrivers => {
        if (areDriversEqual(prevDrivers, sorted)) {
          return prevDrivers; // Pas de changement, pas de re-render
        }
        driversRef.current = sorted; // Sync ref
        return sorted;
      });

      // âœ… Mettre Ã  jour le timestamp via ref (pas de recrÃ©ation d'intervalle)
      lastUpdatedRef.current = new Date();
      setSecondsAgo(0);

      // Clear l'erreur en cas de succÃ¨s
      setError(null);

    } catch (err) {
      // âœ… Ignorer les erreurs d'annulation
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      if (!isMountedRef.current) return;

      console.error('Error loading taxi drivers:', err);

      // âœ… Ne pas Ã©craser les donnÃ©es existantes en cas d'erreur d'auto-refresh
      // Utiliser driversRef au lieu de drivers.length pour Ã©viter la dÃ©pendance
      if (!isAutoRefresh || driversRef.current.length === 0) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      }
    } finally {
      if (isMountedRef.current) {
        isFetchingRef.current = false;
        if (!isAutoRefresh) {
          setLoading(false);
        }
      }
    }
  // âœ… DÃ©pendances corrigÃ©es: pas de drivers.length
  }, [positionReady, userPosition.latitude, userPosition.longitude]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Chargement initial et rechargement sur changement de position
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  useEffect(() => {
    if (positionReady) {
      loadDrivers(false);
    }
  }, [positionReady, userPosition.latitude, userPosition.longitude, loadDrivers]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Auto-refresh intelligent avec visibilityState
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  useEffect(() => {
    if (!positionReady) return;

    // âœ… Fonction de refresh conditionnelle
    const doAutoRefresh = () => {
      // Ne pas rafraÃ®chir si l'onglet n'est pas visible
      if (document.visibilityState !== 'visible') return;
      if (!isMountedRef.current) return;

      loadDrivers(true);
    };

    // âœ… Handler pour le changement de visibilitÃ©
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        // RafraÃ®chir immÃ©diatement quand l'onglet redevient visible
        loadDrivers(true);
      }
    };

    // CrÃ©er l'intervalle
    autoRefreshRef.current = window.setInterval(doAutoRefresh, AUTO_REFRESH_INTERVAL);

    // Ã‰couter les changements de visibilitÃ©
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (autoRefreshRef.current !== null) {
        window.clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [positionReady, loadDrivers]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Compteur "Mis Ã  jour il y a X secondes" - Intervalle unique
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  useEffect(() => {
    // âœ… CrÃ©er un seul intervalle au montage
    secondsIntervalRef.current = window.setInterval(() => {
      if (!isMountedRef.current) return;

      // âœ… Utiliser la ref au lieu du state pour Ã©viter les dÃ©pendances
      const lastUpdated = lastUpdatedRef.current;
      if (lastUpdated) {
        const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        setSecondsAgo(prev => {
          // âœ… Ne mettre Ã  jour que si la valeur change
          if (prev !== diff) return diff;
          return prev;
        });
      }
    }, 1000);

    return () => {
      if (secondsIntervalRef.current !== null) {
        window.clearInterval(secondsIntervalRef.current);
        secondsIntervalRef.current = null;
      }
    };
  }, []); // âœ… Aucune dÃ©pendance = intervalle crÃ©Ã© une seule fois

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Cleanup complet au dÃ©montage
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // âœ… Annuler toute requÃªte en cours
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // âœ… Nettoyer les intervalles
      if (autoRefreshRef.current !== null) {
        window.clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
      if (secondsIntervalRef.current !== null) {
        window.clearInterval(secondsIntervalRef.current);
        secondsIntervalRef.current = null;
      }
    };
  }, []);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Handlers
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // âœ… RafraÃ®chissement manuel - uniquement refreshPosition
  // Le chargement est dÃ©clenchÃ© automatiquement par le changement de position
  const handleRefresh = useCallback(async () => {
    const now = Date.now();

    // âœ… Protection anti-spam: 2 secondes minimum entre les clics
    if (now - lastRefreshClickRef.current < REFRESH_COOLDOWN) {
      return;
    }

    // âœ… Protection contre les requÃªtes parallÃ¨les
    if (isFetchingRef.current) {
      return;
    }

    lastRefreshClickRef.current = now;

    // âœ… RafraÃ®chir la position - loadDrivers sera appelÃ© automatiquement
    // via l'effet qui Ã©coute userPosition.latitude/longitude
    await refreshPosition();

    // âœ… Force un refresh immÃ©diat aprÃ¨s le refreshPosition
    // car la position peut ne pas avoir changÃ© significativement
    await loadDrivers(false);
  }, [refreshPosition, loadDrivers]);

  const handleBookDriver = useCallback((driverId: string) => {
    navigate(`/taxi-moto?driver=${driverId}`);
  }, [navigate]);

  const handleBookNow = useCallback(() => {
    navigate('/taxi-moto');
  }, [navigate]);

  const handleRetry = useCallback(() => {
    loadDrivers(false);
  }, [loadDrivers]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Formatage du temps Ã©coulÃ©
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const formatTimeAgo = (seconds: number): string => {
    if (seconds < 5) return 'Ã€ l\'instant';
    if (seconds < 60) return `Il y a ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `Il y a ${minutes}min`;
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Rendu
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const isRefreshDisabled = loading || isFetchingRef.current;
  const hasLastUpdated = lastUpdatedRef.current !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Bike className="w-5 h-5 text-primary-blue-500" />
                Taxi-Moto Ã  ProximitÃ©
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {drivers.length} conducteur{drivers.length !== 1 ? 's' : ''} dans un rayon de {RADIUS_KM} km
                </p>
                {hasLastUpdated && (
                  <span className="text-xs text-muted-foreground/70">
                    â€¢ {formatTimeAgo(secondsAgo)}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshDisabled}
              className="rounded-full"
              title="Actualiser"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Quick Book Button */}
        <Card className="bg-gradient-to-r from-primary-blue-500 to-primary-orange-600 border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h3 className="font-semibold">RÃ©server maintenant</h3>
                <p className="text-sm opacity-90">Laissez-nous trouver le plus proche</p>
              </div>
              <Button
                onClick={handleBookNow}
                className="bg-white text-primary-blue-600 hover:bg-white/90"
              >
                <Navigation className="w-4 h-4 mr-2" />
                RÃ©server
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* âœ… Liste des conducteurs - Composant mÃ©moÃ¯sÃ© externe */}
        <TaxiDriversList
          loading={loading}
          error={error}
          drivers={drivers}
          onRetry={handleRetry}
          onBook={handleBookDriver}
        />
      </div>

      <QuickFooter />
    </div>
  );
}
