/**
 * 🎣 HOOK NAVIGATION GPS - 224SOLUTIONS
 * Hook React pour gérer la navigation GPS facilement
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  navigationService, 
  NavigationState, 
  NavigationRoute,
  GPSPosition 
} from '@/services/navigation/NavigationService';
import { toast } from 'sonner';

interface UseNavigationOptions {
  autoStart?: boolean;
  enableVoice?: boolean;
  onNavigationEnd?: () => void;
  onOffRoute?: () => void;
  onStepChange?: (stepIndex: number) => void;
}

interface UseNavigationReturn {
  // État
  isNavigating: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Données
  currentPosition: GPSPosition | null;
  navigationState: NavigationState | null;
  route: NavigationRoute | null;
  
  // Actions
  startNavigation: (startAddress?: string, endAddress?: string) => Promise<void>;
  stopNavigation: () => void;
  recalculateRoute: () => Promise<void>;
  getCurrentLocation: () => Promise<GPSPosition>;
  searchLocation: (address: string) => Promise<GPSPosition[]>;
  
  // Utils
  formatDistance: (meters: number) => string;
  formatDuration: (seconds: number) => string;
}

export const useNavigation = (options: UseNavigationOptions = {}): UseNavigationReturn => {
  const {
    autoStart = false,
    enableVoice = true,
    onNavigationEnd,
    onOffRoute,
    onStepChange
  } = options;

  // États
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null);
  const [route, setRoute] = useState<NavigationRoute | null>(null);

  // Refs
  const previousStepRef = useRef<number>(-1);
  const hasSpokenWarningRef = useRef(false);

  /**
   * 📍 Obtenir position actuelle
   */
  const getCurrentLocation = useCallback(async (): Promise<GPSPosition> => {
    try {
      console.log('📍 [useNavigation] Obtention position GPS...');
      const position = await navigationService.getCurrentPosition();
      setCurrentPosition(position);
      return position;
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur GPS';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    }
  }, []);

  /**
   * 🗺️ Rechercher un lieu
   */
  const searchLocation = useCallback(async (address: string): Promise<GPSPosition[]> => {
    try {
      console.log(`🗺️ [useNavigation] Recherche: "${address}"`);
      const results = await navigationService.geocodeAddress(address, 'GN');
      
      if (results.length === 0) {
        toast.warning(`Lieu "${address}" introuvable`);
      } else {
        toast.success(`${results.length} résultat(s) trouvé(s)`);
      }
      
      return results;
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur de recherche';
      toast.error(errorMsg);
      throw err;
    }
  }, []);

  /**
   * 🚀 Démarrer la navigation
   */
  const startNavigation = useCallback(async (
    startAddress?: string,
    endAddress?: string
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 [useNavigation] Démarrage navigation...');

      // 1️⃣ Position de départ
      let startPos: GPSPosition;
      
      if (startAddress) {
        console.log(`📍 Géocodage départ: "${startAddress}"`);
        const results = await navigationService.geocodeAddress(startAddress, 'GN');
        if (results.length === 0) {
          throw new Error(`Départ "${startAddress}" introuvable`);
        }
        startPos = results[0];
      } else {
        console.log('📍 Utilisation position GPS actuelle');
        startPos = await getCurrentLocation();
      }

      toast.success('📍 Position de départ détectée');

      // 2️⃣ Position d'arrivée
      if (!endAddress) {
        throw new Error('Destination requise');
      }

      console.log(`🎯 Géocodage destination: "${endAddress}"`);
      const destResults = await navigationService.geocodeAddress(endAddress, 'GN');
      
      if (destResults.length === 0) {
        throw new Error(`Destination "${endAddress}" introuvable`);
      }

      const endPos = destResults[0];
      toast.success('🎯 Destination trouvée');

      // 3️⃣ Calculer itinéraire
      console.log('🛣️ Calcul itinéraire...');
      const calculatedRoute = await navigationService.calculateRoute(startPos, endPos);
      setRoute(calculatedRoute);
      
      toast.success(
        `🛣️ Itinéraire calculé: ${calculatedRoute.distance.toFixed(1)} km · ${Math.round(calculatedRoute.duration)} min`
      );

      // 4️⃣ Démarrer navigation
      console.log('🧭 Démarrage navigation...');
      await navigationService.startNavigation(calculatedRoute);
      setIsNavigating(true);
      
      toast.success('🧭 Navigation démarrée!');
      setIsLoading(false);

    } catch (err: any) {
      const errorMsg = err.message || 'Erreur navigation';
      console.error('❌ [useNavigation] Erreur:', err);
      setError(errorMsg);
      setIsLoading(false);
      toast.error(errorMsg);
      throw err;
    }
  }, [getCurrentLocation]);

  /**
   * 🛑 Arrêter la navigation
   */
  const stopNavigation = useCallback(() => {
    console.log('🛑 [useNavigation] Arrêt navigation');
    navigationService.stopNavigation();
    setIsNavigating(false);
    setNavigationState(null);
    setRoute(null);
    previousStepRef.current = -1;
    hasSpokenWarningRef.current = false;
    toast.info('Navigation arrêtée');
    onNavigationEnd?.();
  }, [onNavigationEnd]);

  /**
   * 🔄 Recalculer l'itinéraire
   */
  const recalculateRoute = useCallback(async (): Promise<void> => {
    if (!navigationState || !route) {
      console.warn('⚠️ Aucune navigation active pour recalculer');
      return;
    }

    try {
      console.log('🔄 [useNavigation] Recalcul itinéraire...');
      toast.info('🔄 Recalcul de l\'itinéraire...');

      // Destination = dernier point de la route actuelle
      const lastCoord = route.geometry.coordinates[route.geometry.coordinates.length - 1];
      const destination: GPSPosition = {
        latitude: lastCoord[1],
        longitude: lastCoord[0],
        accuracy: 0,
        timestamp: Date.now()
      };

      const newRoute = await navigationService.calculateRoute(
        navigationState.currentPosition,
        destination
      );

      setRoute(newRoute);
      await navigationService.startNavigation(newRoute);
      
      toast.success('✅ Itinéraire recalculé');
    } catch (err: any) {
      console.error('❌ [useNavigation] Erreur recalcul:', err);
      toast.error('Erreur lors du recalcul');
    }
  }, [navigationState, route]);

  /**
   * 📣 S'abonner aux mises à jour navigation
   */
  useEffect(() => {
    const unsubscribe = navigationService.subscribe('use-navigation-hook', (state) => {
      setNavigationState(state);

      // Callback changement d'étape
      if (state.currentStep !== previousStepRef.current) {
        previousStepRef.current = state.currentStep;
        onStepChange?.(state.currentStep);
        hasSpokenWarningRef.current = false;

        // Synthèse vocale nouvelle instruction
        if (enableVoice && state.nextInstruction) {
          speakInstruction(state.nextInstruction);
        }
      }

      // Callback hors route
      if (state.isOffRoute && !hasSpokenWarningRef.current) {
        hasSpokenWarningRef.current = true;
        onOffRoute?.();
        
        if (enableVoice) {
          speakInstruction('Attention, vous êtes hors de la route. Recalcul en cours.');
        }
        
        toast.warning('⚠️ Hors route - Recalcul...');
      }

      // Avertissement proximité étape
      if (enableVoice && state.distanceToNextStep < 100 && state.distanceToNextStep > 50) {
        if (!hasSpokenWarningRef.current) {
          hasSpokenWarningRef.current = true;
          const distance = Math.round(state.distanceToNextStep);
          speakInstruction(`Dans ${distance} mètres, ${state.nextInstruction}`);
        }
      }

      // Navigation terminée
      if (state.currentStep >= (route?.steps.length || 0) - 1 && state.distanceToNextStep < 20) {
        if (enableVoice) {
          speakInstruction('Vous êtes arrivé à destination');
        }
        toast.success('🎉 Destination atteinte!');
        stopNavigation();
      }
    });

    return unsubscribe;
  }, [route, enableVoice, onStepChange, onOffRoute, stopNavigation]);

  /**
   * 🔊 Synthèse vocale
   */
  const speakInstruction = (text: string) => {
    if ('speechSynthesis' in window && enableVoice) {
      // Annuler toute synthèse en cours
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    }
  };

  /**
   * 📏 Formater distance
   */
  const formatDistance = useCallback((meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }, []);

  /**
   * ⏱️ Formater durée
   */
  const formatDuration = useCallback((seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }, []);

  /**
   * 🚀 Auto-start
   */
  useEffect(() => {
    if (autoStart) {
      getCurrentLocation().catch(console.error);
    }
  }, [autoStart, getCurrentLocation]);

  return {
    // État
    isNavigating,
    isLoading,
    error,
    
    // Données
    currentPosition,
    navigationState,
    route,
    
    // Actions
    startNavigation,
    stopNavigation,
    recalculateRoute,
    getCurrentLocation,
    searchLocation,
    
    // Utils
    formatDistance,
    formatDuration
  };
};

export default useNavigation;
