import { useState, useEffect, useCallback } from 'react';
import { GeolocationService } from '@/services/taxi/GeolocationService';

interface UseDriverTrackingProps {
  activeRide: any;
  location: any;
}

export function useDriverTracking({ activeRide, location }: UseDriverTrackingProps) {
  const [navigationActive, setNavigationActive] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [nextInstruction, setNextInstruction] = useState('');
  const [distanceToDestination, setDistanceToDestination] = useState(0);
  const [timeToDestination, setTimeToDestination] = useState(0);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);

  const startNavigation = useCallback(async (destination: { latitude: number; longitude: number }) => {
    if (!location) {
      console.error('Position GPS non disponible');
      return;
    }

    try {
      // TODO: Implement GeolocationService.calculateRoute method
      console.warn('GeolocationService.calculateRoute not implemented yet');
      setNavigationActive(false);
      // const route = await GeolocationService.calculateRoute(
      //   { lat: location.latitude, lng: location.longitude },
      //   { lat: destination.latitude, lng: destination.longitude }
      // );
      //
      // if (route) {
      //   setRouteSteps(route.steps);
      //   setDistanceToDestination(route.distance / 1000);
      //   setTimeToDestination(route.duration / 60);
      //   setNavigationActive(true);
      //
      //   if (route.steps.length > 0) {
      //     setCurrentStep(route.steps[0].instruction);
      //     if (route.steps.length > 1) {
      //       setNextInstruction(route.steps[1].instruction);
      //     }
      //   }
      // }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [location]);

  useEffect(() => {
    if (!navigationActive || !location || !activeRide) return;

    const interval = setInterval(() => {
      const targetCoords = activeRide.status === 'picked_up' || activeRide.status === 'in_progress'
        ? activeRide.destination.coords
        : activeRide.pickup.coords;

      // TODO: Implement GeolocationService.calculateDistance method
      const distance = 0;
      // const distance = GeolocationService.calculateDistance(
      //   location.latitude,
      //   location.longitude,
      //   targetCoords.latitude,
      //   targetCoords.longitude
      // );

      setDistanceToDestination(distance);
      setTimeToDestination(distance / 0.5);
    }, 5000);

    return () => clearInterval(interval);
  }, [navigationActive, location, activeRide]);

  return {
    navigationActive,
    setNavigationActive,
    currentStep,
    nextInstruction,
    distanceToDestination,
    timeToDestination,
    routeSteps,
    startNavigation
  };
}
