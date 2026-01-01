// @ts-nocheck
/**
 * INTERFACE CONDUCTEUR TAXI-MOTO ULTRA PROFESSIONNELLE
 * Dashboard complet pour les conducteurs avec navigation temps réel
 * 224Solutions - Taxi-Moto System
 * 
 * REFACTORISÉ - Utilise les hooks modulaires pour une meilleure maintenabilité
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useGPSLocation } from "@/hooks/useGPSLocation";
import { useDriverSubscription } from "@/hooks/useDriverSubscription";
import { useTaxiNotifications } from "@/hooks/useTaxiNotifications";
import { useTaxiErrorBoundary } from "@/hooks/useTaxiErrorBoundary";
import { TaxiMotoService } from "@/services/taxi/TaxiMotoService";
import { GeolocationService } from "@/services/taxi/GeolocationService";
import { supabase } from "@/integrations/supabase/client";
import { Car, Star } from "lucide-react";

// Hooks modulaires refactorisés
import { useTaxiDriverProfile } from "@/hooks/useTaxiDriverProfile";
import { useTaxiDriverStats } from "@/hooks/useTaxiDriverStats";
import { useTaxiRideRequests, RideRequest } from "@/hooks/useTaxiRideRequests";
import { useTaxiActiveRide, ActiveRide } from "@/hooks/useTaxiActiveRide";

// UI Components - New Uber/Bolt Style
import { 
    DriverHeader, 
    BottomNavigation, 
    DriverMainDashboard,
    ActiveRideNavigationPanel
} from "@/components/taxi-moto/driver";

// Existing components
import { GoogleMapsNavigation } from "@/components/taxi-moto/GoogleMapsNavigation";
import { GPSPermissionHelper } from "@/components/taxi-moto/GPSPermissionHelper";
import { DriverSettings } from "@/components/taxi-moto/DriverSettings";
import { DriverEarnings } from "@/components/taxi-moto/DriverEarnings";
import { DriverNavigation } from "@/components/taxi-moto/DriverNavigation";
import { InstallPromptBanner } from "@/components/pwa/InstallPromptBanner";
import CommunicationWidget from "@/components/communication/CommunicationWidget";

export default function TaxiMotoDriver() {
    const navigate = useNavigate();
    const { user, profile, signOut } = useAuth();
    const { error, capture, clear } = useTaxiErrorBoundary();
    const { t } = useTranslation();
    
    // GPS unifié avec fallback et error handling
    const { 
        location, 
        loading: gpsLoading, 
        error: gpsError, 
        isWatching,
        getCurrentLocation, 
        startWatching, 
        stopWatching,
        refreshLocation
    } = useGPSLocation({
        enableHighAccuracy: true,
        watchPosition: false,
        onLocationChange: (loc) => {
            console.log('📍 [GPS] Position mise à jour:', loc);
        },
        onError: (err) => {
            capture('gps', err.userMessage, err);
            toast.error(err.userMessage, {
                description: err.suggestions[0]
            });
        }
    });
    
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useTaxiNotifications();
    const { hasAccess, subscription, loading: subscriptionLoading, isExpired } = useDriverSubscription();

    // États UI
    const [activeTab, setActiveTab] = useState('dashboard');
    const [onlineSince, setOnlineSince] = useState<Date | null>(null);

    // États de navigation
    const [distanceToDestination, setDistanceToDestination] = useState(0);
    const [timeToDestination, setTimeToDestination] = useState(0);
    const [nextInstruction, setNextInstruction] = useState('');
    const [routeSteps, setRouteSteps] = useState<any[]>([]);

    // ========== HOOKS MODULAIRES ==========
    
    // Hook profil conducteur
    const {
        driverId,
        driverProfile,
        loading: driverLoading,
        isOnline,
        setIsOnline,
        loadDriverProfile,
        updateDriverLocation
    } = useTaxiDriverProfile(user?.id);

    // Hook statistiques
    const {
        stats: driverStats,
        rideHistory,
        loadDriverStats,
        loadRideHistory,
        updateLocalStats
    } = useTaxiDriverStats(driverId);

    // Fonction de démarrage de navigation (passée aux hooks)
    const startNavigation = useCallback(async (destination: { latitude: number; longitude: number }) => {
        setNextInstruction('📍 Calcul de l\'itinéraire...');
        
        if (!location) {
            toast.error('Position GPS non disponible');
            return;
        }

        try {
            const route = await GeolocationService.calculateRoute(
                { lat: location.latitude, lng: location.longitude },
                { lat: destination.latitude, lng: destination.longitude }
            );

            if (route) {
                setDistanceToDestination(route.distance);
                setTimeToDestination(route.duration);
                setRouteSteps(route.steps);
                
                if (route.steps.length > 0) {
                    const firstStep = route.steps[0];
                    setNextInstruction(firstStep.instruction.replace(/<[^>]*>/g, ''));
                } else {
                    setNextInstruction(`Direction: ${route.endAddress}`);
                }

                toast.success(`🗺️ Itinéraire calculé: ${route.distanceText}, ${route.durationText}`);
            } else {
                const distance = GeolocationService.calculateDistance(
                    location.latitude,
                    location.longitude,
                    destination.latitude,
                    destination.longitude
                );
                setDistanceToDestination(distance * 1000);
                setTimeToDestination(Math.ceil(distance / 30 * 60));
                setNextInstruction('Navigation démarrée - Suivez les indications');
                toast.info('Navigation activée (mode simplifié)');
            }
        } catch (error) {
            console.error('Navigation error:', error);
            const distance = GeolocationService.calculateDistance(
                location.latitude,
                location.longitude,
                destination.latitude,
                destination.longitude
            );
            setDistanceToDestination(distance * 1000);
            setTimeToDestination(Math.ceil(distance / 30 * 60));
            setNextInstruction('Navigation activée');
            toast.warning('Navigation en mode simplifié');
        }
    }, [location]);

    // Hook course active
    const {
        activeRide,
        setActiveRide,
        navigationActive,
        setNavigationActive,
        loadActiveRide,
        updateRideStatus,
        cancelActiveRide,
        completeRide
    } = useTaxiActiveRide(driverId, startNavigation, updateLocalStats);

    // Hook demandes de courses
    const {
        rideRequests,
        acceptingRideId,
        loadPendingRides,
        acceptRideRequest,
        declineRideRequest,
        clearRideRequests
    } = useTaxiRideRequests(driverId, isOnline, hasAccess, location);

    // ========== EFFETS ==========

    // Calcul temps en ligne en temps réel avec stats enrichies
    useEffect(() => {
        if (!isOnline || !onlineSince) {
            return;
        }

        const updateOnlineTime = () => {
            const now = new Date();
            const diffMs = now.getTime() - onlineSince.getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            
            let timeStr = '';
            if (hours > 0) {
                timeStr = `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
                timeStr = `${minutes}m ${seconds}s`;
            } else {
                timeStr = `${seconds}s`;
            }
            
            // Note: onlineTime est géré dans useTaxiDriverStats
        };

        updateOnlineTime();
        const interval = setInterval(updateOnlineTime, 1000);
        
        return () => clearInterval(interval);
    }, [isOnline, onlineSince]);

    // Gérer le statut en ligne et le tracking GPS automatique
    useEffect(() => {
        if (isOnline && driverId && hasAccess && location) {
            // Démarrer le suivi continu avec le hook GPS unifié
            startWatching(
                (position) => {
                    // Mettre à jour la position du conducteur
                    updateDriverLocation(position.latitude, position.longitude);

                    // Si une course est active, tracker la position
                    if (activeRide && (activeRide.status === 'picked_up' || activeRide.status === 'in_progress')) {
                        TaxiMotoService.trackPosition(
                            activeRide.id,
                            driverId,
                            position.latitude,
                            position.longitude,
                            undefined, // speed
                            undefined, // heading
                            position.accuracy || undefined
                        ).catch(err => console.error('❌ Erreur tracking course:', err));
                    }
                },
                (error) => {
                    console.error('❌ Erreur suivi GPS:', error);
                    toast.error(error || 'Erreur suivi GPS', { duration: 5000 });
                }
            );
            
            loadPendingRides();
        } else if (!isOnline && isWatching) {
            // Arrêter le suivi quand hors ligne
            stopWatching();
        }
        
        return () => {
            // Cleanup au démontage
            if (isWatching) stopWatching();
        };
    }, [isOnline, driverId, hasAccess]);

    // ========== FONCTIONS ==========

    /**
     * Bascule le statut en ligne/hors ligne avec GPS unifié
     */
    const toggleOnlineStatus = async () => {
        const next = !isOnline;
        
        if (!driverId) {
            toast.error('Profil conducteur non trouvé');
            return;
        }

        if (next && !hasAccess) {
            toast.error('⚠️ Abonnement requis', {
                description: 'Vous devez avoir un abonnement actif pour recevoir des courses'
            });
            return;
        }

        if (next) {
            toast.loading('📍 Activation GPS...', { id: 'gps-loading' });
            
            try {
                // Obtenir position avec le hook GPS unifié (avec fallback automatique)
                await enableGPS(
                    (position) => {
                        toast.dismiss('gps-loading');
                        toast.success('✅ GPS activé');
                    },
                    (error) => {
                        toast.dismiss('gps-loading');
                        toast.error(error || 'Impossible d\'activer le GPS');
                        return;
                    }
                );
                
                // Vérifier qu'on a bien une position
                if (!location) {
                    toast.error('Position GPS non disponible');
                    return;
                }
                
                // Mettre à jour le statut dans la base
                await TaxiMotoService.updateDriverStatus(
                    driverId,
                    true,
                    true,
                    location.latitude,
                    location.longitude
                );

                setIsOnline(true);
                
                toast.success('🟢 Vous êtes maintenant en ligne');
                
            } catch (error: any) {
                toast.dismiss('gps-loading');
                console.error('❌ Erreur activation:', error);
                return;
            }
        } else {
            // Passer hors ligne
            try {
                // Arrêter le suivi GPS
                await disableGPS();
                
                await TaxiMotoService.updateDriverStatus(
                    driverId,
                    false,
                    false,
                    location?.latitude,
                    location?.longitude
                );

                setIsOnline(false);
                clearRideRequests();
                
                toast.info('🔴 Vous êtes maintenant hors ligne');
            } catch (error) {
                capture('network', 'Erreur lors du changement de statut', error);
                toast.error('Erreur lors du changement de statut');
            }
        }
    };

    /**
     * Accepte une demande de course avec transition UI
     */
    const handleAcceptRide = async (request: RideRequest) => {
        const result = await acceptRideRequest(request);
        
        if (result) {
            setActiveRide(result);
            setNavigationActive(true);
            setActiveTab('navigation');

            // Marquer les notifications comme lues
            const relatedNotifs = notifications.filter(n => n.data?.rideId === request.id);
            relatedNotifs.forEach(n => markAsRead(n.id));

            // Démarrer la navigation
            startNavigation(request.pickupCoords);
        }
    };

    /**
     * Refuse une demande de course
     */
    const handleDeclineRide = async (requestId: string) => {
        await declineRideRequest(requestId);
        
        // Marquer les notifications comme lues
        const relatedNotifs = notifications.filter(n => n.data?.rideId === requestId);
        relatedNotifs.forEach(n => markAsRead(n.id));
    };

    /**
     * Contacte le client
     */
    const contactCustomer = (phone: string) => {
        window.open(`tel:${phone}`);
    };

    /**
     * Déconnexion
     */
    const handleSignOut = async () => {
        setIsOnline(false);
        await signOut();
        toast.success('Déconnexion réussie');
    };

    // ========== RENDU ==========

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header conducteur - Uber/Bolt Style */}
            <DriverHeader
                firstName={profile?.first_name || ''}
                isOnline={isOnline}
                hasLocation={!!location}
                unreadCount={unreadCount}
                driverId={driverId}
                driverName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Conducteur'}
                driverPhone={profile?.phone || ''}
                onSignOut={handleSignOut}
            />

            {/* Contenu principal selon l'onglet */}
            {activeTab === 'dashboard' && (
                <DriverMainDashboard
                    isOnline={isOnline}
                    isLoading={driverLoading}
                    hasSubscription={hasAccess}
                    driverId={driverId}
                    userId={user?.id}
                    location={location}
                    stats={driverStats}
                    rideRequests={rideRequests}
                    acceptingRideId={acceptingRideId}
                    error={error}
                    hasAccess={hasAccess}
                    onToggleOnline={toggleOnlineStatus}
                    onAcceptRide={handleAcceptRide}
                    onDeclineRide={handleDeclineRide}
                    onClearError={clear}
                    onExpandMap={() => setActiveTab('gps-navigation')}
                    onStatClick={(statId) => {
                        if (statId === 'earnings') setActiveTab('earnings');
                        else if (statId === 'history') setActiveTab('history');
                        else if (statId === 'rating') setActiveTab('rating');
                    }}
                />
            )}

            {activeTab === 'navigation' && (
                <div className="min-h-screen bg-gray-950 pb-20">
                    {activeRide ? (
                        <ActiveRideNavigationPanel
                            activeRide={{
                                id: activeRide.id,
                                customerName: activeRide.customer.name,
                                customerPhone: activeRide.customer.phone,
                                pickup: activeRide.pickup,
                                destination: activeRide.destination,
                                status: activeRide.status,
                                estimatedPrice: activeRide.estimatedEarnings / 0.85,
                                estimatedEarnings: activeRide.estimatedEarnings
                            }}
                            currentLocation={location}
                            onContactCustomer={contactCustomer}
                            onUpdateStatus={async (status) => {
                                await updateRideStatus(status as ActiveRide['status']);
                            }}
                            onCancelRide={cancelActiveRide}
                        />
                    ) : (
                        <DriverNavigation
                            driverId={driverId || ''}
                            location={location}
                            onContactCustomer={contactCustomer}
                        />
                    )}
                </div>
            )}

            {activeTab === 'gps-navigation' && (
                <div className="min-h-screen bg-gray-950 pb-20">
                    {!location ? (
                        <GPSPermissionHelper
                            onLocationGranted={async () => {
                                toast.loading('Récupération de la position...', { id: 'gps-load' });
                                try {
                                    await getCurrentLocation();
                                    toast.dismiss('gps-load');
                                    toast.success('Position obtenue !');
                                } catch (err) {
                                    console.error('[TaxiMotoDriver] GPS error:', err);
                                    toast.dismiss('gps-load');
                                    toast.error('Erreur GPS - Veuillez réessayer');
                                }
                            }}
                            currentError={null}
                        />
                    ) : (
                        <GoogleMapsNavigation
                            activeRide={activeRide}
                            currentLocation={location}
                            onContactCustomer={contactCustomer}
                        />
                    )}
                </div>
            )}

            {activeTab === 'earnings' && (
                <div className="min-h-screen bg-gray-950 pb-20">
                    <DriverEarnings driverId={driverId || ''} />
                </div>
            )}

            {activeTab === 'history' && (
                <div className="min-h-screen bg-gray-950 pb-20 pt-4 px-4">
                    <div className="space-y-4">
                        <h2 className="text-white font-bold text-lg">Historique des courses</h2>
                        {rideHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500">Aucune course complétée</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rideHistory.map((ride: any) => (
                                    <div key={ride.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                ride.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                ride.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {ride.status === 'completed' ? 'Terminée' : 
                                                 ride.status === 'cancelled' ? 'Annulée' : ride.status}
                                            </span>
                                            <span className="text-gray-400 text-xs">
                                                {new Date(ride.created_at).toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>
                                        <p className="text-white text-sm mb-1 truncate">{ride.pickup_address || 'Adresse départ'}</p>
                                        <p className="text-gray-400 text-xs truncate">→ {ride.dropoff_address || 'Destination'}</p>
                                        {ride.driver_share && (
                                            <p className="text-emerald-400 font-bold mt-2">{ride.driver_share.toLocaleString()} GNF</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'rating' && (
                <div className="min-h-screen bg-gray-950 pb-20 pt-4 px-4">
                    <div className="space-y-6">
                        <h2 className="text-white font-bold text-lg">Votre note</h2>
                        
                        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl p-6 border border-amber-500/30 text-center">
                            <div className="text-5xl font-bold text-amber-400 mb-2">
                                {driverStats.rating > 0 ? driverStats.rating.toFixed(1) : '—'}
                            </div>
                            <div className="flex justify-center gap-1 mb-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                        key={star}
                                        className={`w-6 h-6 ${
                                            star <= Math.round(driverStats.rating) 
                                                ? 'text-amber-400 fill-amber-400' 
                                                : 'text-gray-600'
                                        }`}
                                    />
                                ))}
                            </div>
                            <p className="text-gray-400 text-sm">Basé sur {driverStats.totalRides || 0} courses</p>
                        </div>

                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                            <h3 className="text-white font-medium mb-3">Comment améliorer votre note</h3>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400">✓</span>
                                    Soyez ponctuel aux rendez-vous
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400">✓</span>
                                    Conduisez prudemment et respectez le code
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400">✓</span>
                                    Soyez courtois avec les clients
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400">✓</span>
                                    Maintenez votre véhicule propre
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="min-h-screen bg-gray-950 pb-20">
                    <DriverSettings driverId={driverId || ''} />
                </div>
            )}

            {/* Widget de communication */}
            {user && (
                <CommunicationWidget 
                    currentUserId={user.id}
                    currentUserName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Conducteur'}
                />
            )}

            {/* Navigation bottom */}
            <BottomNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                hasActiveRide={!!activeRide}
                isOnline={isOnline}
            />
        </div>
    );
}
