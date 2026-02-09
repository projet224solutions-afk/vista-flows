/**
 * NEARBY TAXI-MOTO PAGE
 * Liste des taxi-motos disponibles à proximité
 * 224Solutions - Production Ready v3
 *
 * Optimisations appliquées:
 * ✅ Pas de clignotement lors de l'auto-refresh
 * ✅ Pas de double appel réseau
 * ✅ Protection contre les requêtes parallèles (verrou isFetching)
 * ✅ Indicateur de fraîcheur des données
 * ✅ Protection contre les memory leaks (isMounted)
 * ✅ Composants mémoïsés externalisés
 * ✅ Comparaison des données avant setState
 * ✅ Type correct pour setInterval (number)
 * ✅ Protection anti-spam sur le bouton refresh
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
// Utility: Compare driver arrays pour éviter les re-renders inutiles
// ============================================================================

function areDriversEqual(prev: TaxiDriver[], next: TaxiDriver[]): boolean {
  if (prev.length !== next.length) return false;

  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (
      p.id !== n.id ||
      p.status !== n.status ||
      p.is_online !== n.is_online ||
      p.distance !== n.distance ||
      p.rating !== n.rating
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

  // ═══════════════════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════════════════
  const [drivers, setDrivers] = useState<TaxiDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // ═══════════════════════════════════════════════════════════════════════════
  // Refs pour protection memory leaks et requêtes parallèles
  // ═══════════════════════════════════════════════════════════════════════════
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const autoRefreshRef = useRef<number | null>(null); // ✅ Type correct: number
  const lastRefreshClickRef = useRef<number>(0);
  const secondsIntervalRef = useRef<number | null>(null);

  // Géolocalisation centralisée
  const { userPosition, positionReady, refreshPosition } = useGeoDistance();

  // ═══════════════════════════════════════════════════════════════════════════
  // Fonction de chargement optimisée
  // ═══════════════════════════════════════════════════════════════════════════
  const loadDrivers = useCallback(async (isAutoRefresh = false) => {
    // ✅ Protection contre les requêtes parallèles
    if (isFetchingRef.current) return;
    if (!positionReady) return;

    isFetchingRef.current = true;

    // ✅ Activer le loading UNIQUEMENT pour le premier chargement
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
        .limit(MAX_DRIVERS_LIMIT);

      // ✅ Vérifier si le composant est toujours monté
      if (!isMountedRef.current) return;

      if (queryError) throw new Error(`Erreur: ${queryError.message}`);

      // Traitement des données
      const rawData = (data || []) as Array<Record<string, unknown>>;
      const profileMap = extractProfilesFromJoinedData(rawData);

      const processedDrivers: TaxiDriver[] = [];
      for (const raw of rawData) {
        processedDrivers.push(processTaxiDriver(raw, position, profileMap));
      }

      const filtered = filterDriversByRadius(processedDrivers, RADIUS_KM);
      const sorted = sortDrivers(filtered) as TaxiDriver[];

      // ✅ Vérifier à nouveau si le composant est monté
      if (!isMountedRef.current) return;

      // ✅ Mettre à jour uniquement si les données ont changé
      setDrivers(prevDrivers => {
        if (areDriversEqual(prevDrivers, sorted)) {
          return prevDrivers; // Pas de changement, pas de re-render
        }
        return sorted;
      });

      // Mettre à jour le timestamp
      setLastUpdated(new Date());
      setSecondsAgo(0);

      // Clear l'erreur en cas de succès (même sur auto-refresh)
      setError(null);

    } catch (err) {
      if (!isMountedRef.current) return;

      console.error('Error loading taxi drivers:', err);

      // ✅ Ne pas écraser les données existantes en cas d'erreur d'auto-refresh
      if (!isAutoRefresh || drivers.length === 0) {
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
  }, [positionReady, userPosition, drivers.length]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Chargement initial
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (positionReady) {
      loadDrivers(false);
    }
  }, [positionReady, loadDrivers]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-refresh toutes les 20 secondes (SANS clignotement)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!positionReady) return;

    autoRefreshRef.current = window.setInterval(() => {
      if (isMountedRef.current) {
        loadDrivers(true); // ✅ isAutoRefresh = true → pas de skeleton
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (autoRefreshRef.current !== null) {
        window.clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [positionReady, loadDrivers]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Compteur "Mis à jour il y a X secondes"
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    secondsIntervalRef.current = window.setInterval(() => {
      if (isMountedRef.current && lastUpdated) {
        const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        setSecondsAgo(diff);
      }
    }, 1000);

    return () => {
      if (secondsIntervalRef.current !== null) {
        window.clearInterval(secondsIntervalRef.current);
        secondsIntervalRef.current = null;
      }
    };
  }, [lastUpdated]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Cleanup complet au démontage
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (autoRefreshRef.current !== null) {
        window.clearInterval(autoRefreshRef.current);
      }
      if (secondsIntervalRef.current !== null) {
        window.clearInterval(secondsIntervalRef.current);
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════════════════════

  // Rafraîchissement manuel avec protection anti-spam
  const handleRefresh = useCallback(async () => {
    const now = Date.now();

    // ✅ Protection anti-spam: 2 secondes minimum entre les clics
    if (now - lastRefreshClickRef.current < REFRESH_COOLDOWN) {
      return;
    }

    // ✅ Protection contre les requêtes parallèles
    if (isFetchingRef.current) {
      return;
    }

    lastRefreshClickRef.current = now;

    // Rafraîchir la position
    await refreshPosition();

    // ✅ Charger les données (le verrou empêchera les doublons)
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Formatage du temps écoulé
  // ═══════════════════════════════════════════════════════════════════════════
  const formatTimeAgo = (seconds: number): string => {
    if (seconds < 5) return 'À l\'instant';
    if (seconds < 60) return `Il y a ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `Il y a ${minutes}min`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendu
  // ═══════════════════════════════════════════════════════════════════════════

  const isRefreshDisabled = loading || isFetchingRef.current;

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
                <Bike className="w-5 h-5 text-emerald-500" />
                Taxi-Moto à Proximité
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {drivers.length} conducteur{drivers.length !== 1 ? 's' : ''} dans un rayon de {RADIUS_KM} km
                </p>
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground/70">
                    • {formatTimeAgo(secondsAgo)}
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
        <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h3 className="font-semibold">Réserver maintenant</h3>
                <p className="text-sm opacity-90">Laissez-nous trouver le plus proche</p>
              </div>
              <Button
                onClick={handleBookNow}
                className="bg-white text-emerald-600 hover:bg-white/90"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Réserver
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Liste des conducteurs - Composant mémoïsé externe */}
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
