// @ts-nocheck
/**
 * 🗺️ COMPOSANT CARTE DE LIVRAISON - 224SOLUTIONS
 * Carte interactive avec Mapbox pour la livraison
 */

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Position } from '../../services/geolocation/GeolocationService';
import { DeliveryRequest, DeliveryUser } from '../../services/delivery/DeliveryService';

interface DeliveryMapProps {
    center: Position;
    zoom?: number;
    deliveryRequest?: DeliveryRequest;
    deliveryUsers?: DeliveryUser[];
    onUserClick?: (user: DeliveryUser) => void;
    onRouteClick?: (route: unknown) => void;
    showRoute?: boolean;
    showUsers?: boolean;
    height?: string;
    className?: string;
}

const DeliveryMap: React.FC<DeliveryMapProps> = ({
    center,
    zoom = 13,
    deliveryRequest,
    deliveryUsers = [],
    onUserClick,
    onRouteClick,
    showRoute = false,
    showUsers = true,
    height = '400px',
    className = ''
}) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [route, setRoute] = useState<unknown>(null);

    // Initialiser la carte
    useEffect(() => {
        if (!mapContainer.current) return;

        // Configuration Mapbox
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

        if (!mapboxgl.accessToken) {
            console.error('Token Mapbox manquant');
            return;
        }

        // Créer la carte
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [center.longitude, center.latitude],
            zoom: zoom,
            pitch: 0,
            bearing: 0
        });

        // Ajouter les contrôles de navigation
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

        // Gérer le chargement de la carte
        map.current.on('load', () => {
            setIsMapLoaded(true);
            console.log('🗺️ Carte de livraison chargée');
        });

        // Nettoyer à la destruction
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Mettre à jour le centre de la carte
    useEffect(() => {
        if (map.current && isMapLoaded) {
            map.current.setCenter([center.longitude, center.latitude]);
        }
    }, [center, isMapLoaded]);

    // Afficher les livreurs sur la carte
    useEffect(() => {
        if (!map.current || !isMapLoaded || !showUsers) return;

        // Supprimer les marqueurs existants
        const existingMarkers = document.querySelectorAll('.delivery-user-marker');
        existingMarkers.forEach(marker => marker.remove());

        // Ajouter les marqueurs des livreurs
        deliveryUsers.forEach((user, index) => {
            if (!user.currentPosition) return;

            // Créer l'élément du marqueur
            const markerElement = document.createElement('div');
            markerElement.className = 'delivery-user-marker';
            markerElement.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${user.isAvailable ? '#10B981' : '#EF4444'};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: white;
        font-weight: bold;
      `;
            markerElement.textContent = '🚚';

            // Créer le marqueur Mapbox
            const marker = new mapboxgl.Marker(markerElement)
                .setLngLat([user.currentPosition.longitude, user.currentPosition.latitude])
                .addTo(map.current!);

            // Ajouter un popup
            const popup = new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
          <div class="p-3">
            <h3 class="font-semibold text-gray-800">${user.name}</h3>
            <p class="text-sm text-gray-600">${user.vehicleType.toUpperCase()}</p>
            <p class="text-sm text-gray-600">Note: ${user.rating}/5</p>
            <p class="text-sm text-gray-600">${user.totalDeliveries} livraisons</p>
            <p class="text-sm ${user.isAvailable ? 'text-green-600' : 'text-red-600'}">
              ${user.isAvailable ? 'Disponible' : 'Occupé'}
            </p>
            <button 
              class="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              onclick="window.deliveryUserClick('${user.id}')"
            >
              Sélectionner
            </button>
          </div>
        `);

            marker.setPopup(popup);

            // Gérer le clic
            markerElement.addEventListener('click', () => {
                if (onUserClick) {
                    onUserClick(user);
                }
            });
        });

        // Fonction globale pour les clics
        (window as unknown).deliveryUserClick = (userId: string) => {
            const user = deliveryUsers.find(u => u.id === userId);
            if (user && onUserClick) {
                onUserClick(user);
            }
        };
    }, [deliveryUsers, isMapLoaded, showUsers, onUserClick]);

    // Afficher la demande de livraison
    useEffect(() => {
        if (!map.current || !isMapLoaded || !deliveryRequest) return;

        // Supprimer les marqueurs existants de la demande
        const existingRequestMarkers = document.querySelectorAll('.delivery-request-marker');
        existingRequestMarkers.forEach(marker => marker.remove());

        // Marqueur de départ
        const pickupElement = document.createElement('div');
        pickupElement.className = 'delivery-request-marker';
        pickupElement.style.cssText = `
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #3B82F6;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: white;
    `;
        pickupElement.textContent = '📍';

        new mapboxgl.Marker(pickupElement)
            .setLngLat([deliveryRequest.pickupPosition.longitude, deliveryRequest.pickupPosition.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
          <div class="p-3">
            <h3 class="font-semibold text-gray-800">Point de départ</h3>
            <p class="text-sm text-gray-600">${deliveryRequest.pickupAddress}</p>
          </div>
        `))
            .addTo(map.current);

        // Marqueur de destination
        const deliveryElement = document.createElement('div');
        deliveryElement.className = 'delivery-request-marker';
        deliveryElement.style.cssText = `
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #10B981;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: white;
    `;
        deliveryElement.textContent = '🏁';

        new mapboxgl.Marker(deliveryElement)
            .setLngLat([deliveryRequest.deliveryPosition.longitude, deliveryRequest.deliveryPosition.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
          <div class="p-3">
            <h3 class="font-semibold text-gray-800">Destination</h3>
            <p class="text-sm text-gray-600">${deliveryRequest.deliveryAddress}</p>
            <p class="text-sm text-gray-600">Distance: ${Math.round(deliveryRequest.distance / 1000 * 10) / 10} km</p>
            <p class="text-sm text-gray-600">Temps estimé: ${deliveryRequest.estimatedTime} min</p>
            <p class="text-sm text-gray-600">Prix: ${deliveryRequest.totalPrice} GNF</p>
          </div>
        `))
            .addTo(map.current);
    }, [deliveryRequest, isMapLoaded]);

    // Calculer et afficher l'itinéraire
    useEffect(() => {
        if (!map.current || !isMapLoaded || !showRoute || !deliveryRequest) return;

        const calculateRoute = async () => {
            try {
                const response = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/driving/${deliveryRequest.pickupPosition.longitude},${deliveryRequest.pickupPosition.latitude};${deliveryRequest.deliveryPosition.longitude},${deliveryRequest.deliveryPosition.latitude}?access_token=${mapboxgl.accessToken}&geometries=polyline`
                );

                if (!response.ok) {
                    throw new Error('Erreur calcul itinéraire');
                }

                const data = await response.json();
                const route = data.routes[0];

                if (route) {
                    setRoute(route);

                    // Ajouter la source de l'itinéraire
                    if (!map.current!.getSource('route')) {
                        map.current!.addSource('route', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: {
                                    type: 'LineString',
                                    coordinates: route.geometry.coordinates
                                }
                            }
                        });
                    } else {
                        (map.current!.getSource('route') as mapboxgl.GeoJSONSource).setData({
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'LineString',
                                coordinates: route.geometry.coordinates
                            }
                        });
                    }

                    // Ajouter le style de l'itinéraire
                    if (!map.current!.getLayer('route')) {
                        map.current!.addLayer({
                            id: 'route',
                            type: 'line',
                            source: 'route',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            paint: {
                                'line-color': '#3B82F6',
                                'line-width': 4
                            }
                        });
                    }

                    // Ajuster la vue pour inclure l'itinéraire
                    const coordinates = route.geometry.coordinates;
                    const bounds = coordinates.reduce((bounds: unknown, coord: unknown) => {
                        return bounds.extend(coord);
                    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

                    map.current!.fitBounds(bounds, {
                        padding: 50
                    });

                    // Émettre l'événement de route
                    if (onRouteClick) {
                        onRouteClick(route);
                    }
                }
            } catch (error) {
                console.error('Erreur calcul itinéraire:', error);
            }
        };

        calculateRoute();
    }, [deliveryRequest, isMapLoaded, showRoute, onRouteClick]);

    return (
        <div className={`relative ${className}`}>
            <div
                ref={mapContainer}
                className="w-full rounded-lg shadow-lg"
                style={{ height }}
            />

            {!isMapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">Chargement de la carte...</p>
                    </div>
                </div>
            )}

            {route && (
                <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
                    <div className="text-sm">
                        <p className="font-semibold text-gray-800">Itinéraire</p>
                        <p className="text-gray-600">
                            Distance: {Math.round(route.distance / 1000 * 10) / 10} km
                        </p>
                        <p className="text-gray-600">
                            Durée: {Math.round(route.duration / 60)} min
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryMap;
