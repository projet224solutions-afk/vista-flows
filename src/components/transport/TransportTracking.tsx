/**
 * 🚚 SUIVI DE TRANSPORT EN TEMPS RÉEL
 * Interface de suivi pour client et transporteur
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Navigation, Phone, MessageSquare, Camera, CheckCircle, AlertTriangle } from 'lucide-react';
import TransportService, { TransportRequest, TransportUser } from '../../services/transport/TransportService';
import GeolocationService from '../../services/geolocation/GeolocationService';

interface TransportTrackingProps {
  requestId: string;
  userType: 'client' | 'transport';
  onComplete?: () => void;
  onDispute?: () => void;
  className?: string;
}

const TransportTracking: React.FC<TransportTrackingProps> = ({
  requestId,
  userType,
  onComplete,
  onDispute,
  className = ''
}) => {
  const [request, setRequest] = useState<TransportRequest | null>(null);
  const [transportUser, setTransportUser] = useState<TransportUser | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number; timestamp: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [estimatedArrival, setEstimatedArrival] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);

  const transportService = TransportService.getInstance();
  const geolocationService = GeolocationService.getInstance();
  const trackingInterval = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRequest();
    startTracking();
    
    return () => {
      stopTracking();
    };
  }, [requestId]);

  const loadRequest = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/transport/request/${requestId}`);
      if (response.ok) {
        const requestData = await response.json();
        setRequest(requestData);
        
        if (requestData.transportUserId) {
          const transportUserData = await fetch(`/api/transport/user/${requestData.transportUserId}`);
          if (transportUserData.ok) {
            const user = await transportUserData.json();
            setTransportUser(user);
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement demande:', error);
      setError('Erreur lors du chargement de la demande');
    } finally {
      setIsLoading(false);
    }
  };

  const startTracking = async () => {
    try {
      setIsTracking(true);
      
      // Obtenir la position actuelle
      const position = await geolocationService.getCurrentPosition();
      setCurrentPosition({
        lat: position.latitude,
        lng: position.longitude,
        timestamp: position.timestamp
      });

      // Démarrer le suivi de position
      const watchId = navigator.geolocation.watchPosition(
        (newPosition) => {
          setCurrentPosition({
            lat: newPosition.coords.latitude,
            lng: newPosition.coords.longitude,
            timestamp: Date.now()
          });
          updateProgress();
        },
        (error) => {
          console.error('Erreur géolocalisation:', error);
        }
      );

      // Mettre à jour la position toutes les 5 secondes
      trackingInterval.current = setInterval(() => {
        updateProgress();
      }, 5000);

      return watchId;
    } catch (error) {
      console.error('Erreur démarrage suivi:', error);
      setError('Impossible de démarrer le suivi');
    }
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current);
      trackingInterval.current = null;
    }
  };

  const updateProgress = () => {
    if (request && currentPosition) {
      // Calculer la distance parcourue
      const startDistance = geolocationService.calculateDistance(
        request.pickupPosition,
        request.deliveryPosition
      );
      
      const pos1 = currentPosition ? {
        latitude: currentPosition.lat,
        longitude: currentPosition.lng,
        timestamp: currentPosition.timestamp || Date.now()
      } : request.pickupPosition;
      
      const currentDistance = geolocationService.calculateDistance(
        pos1,
        request.deliveryPosition
      );
      
      const progressPercent = Math.max(0, Math.min(100, 
        ((startDistance - currentDistance) / startDistance) * 100
      ));
      
      setProgress(progressPercent);
      
      // Estimer l'arrivée
      const remainingDistance = currentDistance / 1000; // en km
      const estimatedMinutes = Math.ceil(remainingDistance * 2); // 2 min par km
      setEstimatedArrival(estimatedMinutes);
    }
  };

  const handleMarkAsPickedUp = async () => {
    if (!request) return;
    
    try {
      setIsLoading(true);
      await transportService.markAsPickedUp(request.id);
      await loadRequest(); // Recharger les données
    } catch (error) {
      console.error('Erreur marquage récupéré:', error);
      setError('Erreur lors du marquage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!request) return;
    
    try {
      setIsLoading(true);
      
      const proofPos = currentPosition ? {
        latitude: currentPosition.lat,
        longitude: currentPosition.lng,
        timestamp: currentPosition.timestamp || Date.now()
      } : undefined;
      
      const proofOfDelivery = {
        photo: proofPhoto,
        coordinates: proofPos,
        clientSignature: 'signature_client_' + Date.now()
      };
      
      await transportService.markAsDelivered(request.id, proofOfDelivery);
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Erreur marquage livré:', error);
      setError('Erreur lors de la livraison');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDispute = async () => {
    if (!request) return;
    
    try {
      setIsLoading(true);
      
      await transportService.openDispute(
        request.id,
        'Problème de livraison',
        'Le transporteur n\'a pas respecté les conditions',
        {
          photos: proofPhoto ? [proofPhoto] : [],
          messages: ['Litige ouvert par le client'],
          coordinates: currentPosition ? [currentPosition] : []
        }
      );
      
      if (onDispute) {
        onDispute();
      }
    } catch (error) {
      console.error('Erreur ouverture litige:', error);
      setError('Erreur lors de l\'ouverture du litige');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = () => {
    // Simuler la prise de photo
    setProofPhoto('photo_proof_' + Date.now() + '.jpg');
    setShowProofModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'accepted': return 'text-blue-600 bg-blue-100';
      case 'picked_up': return 'text-purple-600 bg-purple-100';
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'disputed': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Acceptée';
      case 'picked_up': return 'Récupéré';
      case 'delivered': return 'Livré';
      case 'cancelled': return 'Annulée';
      case 'disputed': return 'En litige';
      default: return 'Inconnu';
    }
  };

  if (isLoading && !request) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Demande de transport non trouvée</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* En-tête */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Suivi de Transport</h3>
            <p className="text-sm text-gray-600">ID: {request.id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
            {getStatusText(request.status)}
          </div>
        </div>
      </div>

      {/* Informations du transport */}
      <div className="p-6 space-y-4">
        {/* Adresses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Départ</span>
            </div>
            <p className="text-sm text-blue-700">{request.pickupAddress}</p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Destination</span>
            </div>
            <p className="text-sm text-green-700">{request.deliveryAddress}</p>
          </div>
        </div>

        {/* Informations transporteur */}
        {transportUser && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">
                  {transportUser.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{transportUser.name}</h4>
                <p className="text-sm text-gray-600">
                  {transportUser.vehicleType} • {transportUser.vehicleInfo.model}
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-gray-500">
                    ⭐ {transportUser.rating}/5
                  </span>
                  <span className="text-xs text-gray-500">
                    {transportUser.totalTrips} courses
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Progression */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Progression</span>
            <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {estimatedArrival > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Arrivée estimée: {estimatedArrival} min</span>
            </div>
          )}
        </div>

        {/* Prix */}
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Prix de la course</p>
              <p className="text-xs text-green-600">Frais 1% inclus</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">{request.totalPrice} GNF</p>
              <p className="text-xs text-green-500">Net: {request.price} GNF</p>
            </div>
          </div>
        </div>

        {/* Actions selon le statut */}
        {userType === 'transport' && (
          <div className="space-y-3">
            {request.status === 'accepted' && (
              <button
                onClick={handleMarkAsPickedUp}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Marquage...' : 'Marquer comme récupéré'}
              </button>
            )}
            
            {request.status === 'picked_up' && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowProofModal(true)}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <Camera className="w-4 h-4 inline mr-2" />
                  Prendre une photo de livraison
                </button>
                <button
                  onClick={handleMarkAsDelivered}
                  disabled={isLoading || !proofPhoto}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Livraison...' : 'Marquer comme livré'}
                </button>
              </div>
            )}
          </div>
        )}

        {userType === 'client' && (
          <div className="space-y-3">
            {request.status === 'delivered' && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Livraison confirmée</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Paiement libéré au transporteur
                </p>
              </div>
            )}
            
            {request.status === 'picked_up' && (
              <div className="flex gap-2">
                <button
                  onClick={handleMarkAsDelivered}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Course terminée
                </button>
                <button
                  onClick={handleOpenDispute}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Signaler un problème
                </button>
              </div>
            )}
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Modal de prise de photo */}
      {showProofModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Preuve de livraison</h3>
            <p className="text-sm text-gray-600 mb-4">
              Prenez une photo pour confirmer la livraison
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleTakePhoto}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Prendre une photo
              </button>
              <button
                onClick={() => setShowProofModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportTracking;
