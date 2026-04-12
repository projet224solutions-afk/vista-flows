/**
 * NEARBY TAXI-MOTO PAGE
 * Liste des taxi-motos disponibles ├á proximit├®
 * 224Solutions - Production Ready v4 (Uber/Bolt Grade)
 *
 * Optimisations appliqu├®es:
 * Ô£à Comparaison des distances arrondies (├®vite re-renders sur micro-changements)
 * Ô£à D├®pendances React corrig├®es (pas de drivers.length dans useCallback)
 * Ô£à Logique refresh unifi├®e (refreshPosition d├®clenche loadDrivers)
 * Ô£à Intervalle secondes unique (ref pour lastUpdated)
 * Ô£à Annulation des requ├¬tes (AbortController)
 * Ô£à Auto-refresh intelligent (visibilityState)
 * Ô£à Protection memory leaks compl├¿te
 * Ô£à Protection contre requ├¬tes parall├¿les
 * Ô£à Anti-spam sur bouton refresh
 * Ô£à Aucune recr├®ation d'intervalle inutile
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
 * pour ├®viter les re-renders sur des micro-changements de float
 */
function areDriversEqual(prev: TaxiDriver[], next: TaxiDriver[]): boolean {
  if (prev.length !== next.length) return false;

  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];

    // Ô£à Arrondir les distances ├á 2 d├®cimales (centi├¿mes de km = 10m)
    const pDistanceRounded = p.distance !== undefined ? Math.round(p.distance * 100) : -1;
    const nDistanceRounded = n.distance !== undefined ? Math.round(n.distance * 100) : -1;

    // Ô£à Arrondir les ratings ├á 1 d├®cimale
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

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // State
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  const [drivers, setDrivers] = useState<TaxiDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Refs pour protection memory leaks, requ├¬tes et intervalles
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const autoRefreshRef = useRef<number | null>(null);
  const secondsIntervalRef = useRef<number | null>(null);
  const lastRefreshClickRef = useRef<number>(0);
  const lastUpdatedRef = useRef<Date | null>(null); // Ô£à Ref au lieu de state pour ├®viter recr├®ation d'intervalle
  const driversRef = useRef<TaxiDriver[]>([]); // Ô£à Ref pour acc├¿s dans catch sans d├®pendance

  // G├®olocalisation centralis├®e
  const { userPosition, positionReady, refreshPosition } = useGeoDistance();

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Fonction de chargement optimis├®e avec AbortController
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  const loadDrivers = useCallback(async (isAutoRefresh = false) => {
    // Ô£à Protection contre les requ├¬tes parall├¿les
    if (isFetchingRef.current) return;
    if (!positionReady) return;

    // Ô£à Annuler la requ├¬te pr├®c├®dente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Ô£à Cr├®er un nouveau AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    isFetchingRef.current = true;

    // Ô£à Activer le loading UNIQUEMENT pour le premier chargement
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

      // Ô£à V├®rifier si la requ├¬te a ├®t├® annul├®e ou composant d├®mont├®
      if (abortController.signal.aborted || !isMountedRef.current) return;

      if (queryError) throw new Error(`Erreur: ${queryError.message}`);

      // Traitement des donn├®es
      const rawData = (data || []) as Array<Record<string, unknown>>;
      const profileMap = extractProfilesFromJoinedData(rawData);

      const processedDrivers: TaxiDriver[] = [];
      for (const raw of rawData) {
        processedDrivers.push(processTaxiDriver(raw, position, profileMap));
      }

      const filtered = filterDriversByRadius(processedDrivers, RADIUS_KM);
      const sorted = sortDrivers(filtered) as TaxiDriver[];

      // Ô£à V├®rifier ├á nouveau si annul├® ou d├®mont├®
      if (abortController.signal.aborted || !isMountedRef.current) return;

      // Ô£à Mettre ├á jour uniquement si les donn├®es ont chang├®
      setDrivers(prevDrivers => {
        if (areDriversEqual(prevDrivers, sorted)) {
          return prevDrivers; // Pas de changement, pas de re-render
        }
        driversRef.current = sorted; // Sync ref
        return sorted;
      });

      // Ô£à Mettre ├á jour le timestamp via ref (pas de recr├®ation d'intervalle)
      lastUpdatedRef.current = new Date();
      setSecondsAgo(0);

      // Clear l'erreur en cas de succ├¿s
      setError(null);

    } catch (err) {
      // Ô£à Ignorer les erreurs d'annulation
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      if (!isMountedRef.current) return;

      console.error('Error loading taxi drivers:', err);

      // Ô£à Ne pas ├®craser les donn├®es existantes en cas d'erreur d'auto-refresh
      // Utiliser driversRef au lieu de drivers.length pour ├®viter la d├®pendance
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
  // Ô£à D├®pendances corrig├®es: pas de drivers.length
  }, [positionReady, userPosition.latitude, userPosition.longitude]);

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Chargement initial et rechargement sur changement de position
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  useEffect(() => {
    if (positionReady) {
      loadDrivers(false);
    }
  }, [positionReady, userPosition.latitude, userPosition.longitude, loadDrivers]);

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Auto-refresh intelligent avec visibilityState
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  useEffect(() => {
    if (!positionReady) return;

    // Ô£à Fonction de refresh conditionnelle
    const doAutoRefresh = () => {
      // Ne pas rafra├«chir si l'onglet n'est pas visible
      if (document.visibilityState !== 'visible') return;
      if (!isMountedRef.current) return;

      loadDrivers(true);
    };

    // Ô£à Handler pour le changement de visibilit├®
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        // Rafra├«chir imm├®diatement quand l'onglet redevient visible
        loadDrivers(true);
      }
    };

    // Cr├®er l'intervalle
    autoRefreshRef.current = window.setInterval(doAutoRefresh, AUTO_REFRESH_INTERVAL);

    // ├ëcouter les changements de visibilit├®
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (autoRefreshRef.current !== null) {
        window.clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [positionReady, loadDrivers]);

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Compteur "Mis ├á jour il y a X secondes" - Intervalle unique
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  useEffect(() => {
    // Ô£à Cr├®er un seul intervalle au montage
    secondsIntervalRef.current = window.setInterval(() => {
      if (!isMountedRef.current) return;

      // Ô£à Utiliser la ref au lieu du state pour ├®viter les d├®pendances
      const lastUpdated = lastUpdatedRef.current;
      if (lastUpdated) {
        const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        setSecondsAgo(prev => {
          // Ô£à Ne mettre ├á jour que si la valeur change
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
  }, []); // Ô£à Aucune d├®pendance = intervalle cr├®├® une seule fois

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Cleanup complet au d├®montage
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Ô£à Annuler toute requ├¬te en cours
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Ô£à Nettoyer les intervalles
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

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Handlers
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

  // Ô£à Rafra├«chissement manuel - uniquement refreshPosition
  // Le chargement est d├®clench├® automatiquement par le changement de position
  const handleRefresh = useCallback(async () => {
    const now = Date.now();

    // Ô£à Protection anti-spam: 2 secondes minimum entre les clics
    if (now - lastRefreshClickRef.current < REFRESH_COOLDOWN) {
      return;
    }

    // Ô£à Protection contre les requ├¬tes parall├¿les
    if (isFetchingRef.current) {
      return;
    }

    lastRefreshClickRef.current = now;

    // Ô£à Rafra├«chir la position - loadDrivers sera appel├® automatiquement
    // via l'effet qui ├®coute userPosition.latitude/longitude
    await refreshPosition();

    // Ô£à Force un refresh imm├®diat apr├¿s le refreshPosition
    // car la position peut ne pas avoir chang├® significativement
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

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Formatage du temps ├®coul├®
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  const formatTimeAgo = (seconds: number): string => {
    if (seconds < 5) return '├Ç l\'instant';
    if (seconds < 60) return `Il y a ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `Il y a ${minutes}min`;
  };

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Rendu
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

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
                <Bike className="w-5 h-5 text-emerald-500" />
                Taxi-Moto ├á Proximit├®
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {drivers.length} conducteur{drivers.length !== 1 ? 's' : ''} dans un rayon de {RADIUS_KM} km
                </p>
                {hasLastUpdated && (
                  <span className="text-xs text-muted-foreground/70">
                    ÔÇó {formatTimeAgo(secondsAgo)}
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
                <h3 className="font-semibold">R├®server maintenant</h3>
                <p className="text-sm opacity-90">Laissez-nous trouver le plus proche</p>
              </div>
              <Button
                onClick={handleBookNow}
                className="bg-white text-emerald-600 hover:bg-white/90"
              >
                <Navigation className="w-4 h-4 mr-2" />
                R├®server
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ô£à Liste des conducteurs - Composant m├®mo├»s├® externe */}
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
