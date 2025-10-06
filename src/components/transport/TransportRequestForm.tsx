/**
 * 🚚 FORMULAIRE DE DEMANDE DE TRANSPORT
 * Interface client pour créer une demande de transport
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, DollarSign, Navigation, Users, Phone, MessageSquare } from 'lucide-react';
import GeolocationService from '../../services/geolocation/GeolocationService';
import TransportService, { TransportRequest } from '../../services/transport/TransportService';

interface TransportRequestFormProps {
  onRequestCreated?: (request: TransportRequest) => void;
  onCancel?: () => void;
  className?: string;
}

const TransportRequestForm: React.FC<TransportRequestFormProps> = ({
  onRequestCreated,
  onCancel,
  className = ''
}) => {
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupPosition, setPickupPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryPosition, setDeliveryPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [availableTransportUsers, setAvailableTransportUsers] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const geolocationService = GeolocationService.getInstance();
  const transportService = TransportService.getInstance();

  useEffect(() => {
    getCurrentLocation();
    loadAvailableTransportUsers();
  }, []);

  useEffect(() => {
    if (pickupPosition && deliveryPosition) {
      calculatePriceAndTime();
    }
  }, [pickupPosition, deliveryPosition]);

  const getCurrentLocation = async () => {
    try {
      const position = await geolocationService.getCurrentPosition();
      setCurrentLocation({
        lat: position.latitude,
        lng: position.longitude
      });
    } catch (error) {
      console.error('Erreur géolocalisation:', error);
    }
  };

  const loadAvailableTransportUsers = async () => {
    try {
      const users = transportService.getOnlineTransportUsers();
      setAvailableTransportUsers(users.length);
    } catch (error) {
      console.error('Erreur chargement transporteurs:', error);
    }
  };

  const calculatePriceAndTime = () => {
    if (pickupPosition && deliveryPosition) {
      const distance = geolocationService.calculateDistance(pickupPosition, deliveryPosition);
      const distanceKm = distance / 1000;
      
      // Calcul du prix: 500 GNF de base + 100 GNF par km
      const basePrice = 500;
      const pricePerKm = 100;
      const price = Math.round(basePrice + (distanceKm * pricePerKm));
      
      // Calcul du temps: 2 minutes par km
      const time = Math.ceil(distanceKm * 2);
      
      setEstimatedPrice(price);
      setEstimatedTime(time);
    }
  };

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setPickupPosition(currentLocation);
      setPickupAddress('Ma position actuelle');
    }
  };

  const handleCreateRequest = async () => {
    if (!pickupAddress || !deliveryAddress || !pickupPosition || !deliveryPosition) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const request = await transportService.createTransportRequest(
        'current_user_id', // À remplacer par l'ID utilisateur réel
        pickupAddress,
        deliveryAddress,
        pickupPosition,
        deliveryPosition,
        notes
      );

      console.log('🚚 Demande de transport créée:', request);
      
      if (onRequestCreated) {
        onRequestCreated(request);
      }
    } catch (error) {
      console.error('Erreur création demande:', error);
      setError('Erreur lors de la création de la demande');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Navigation className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Demande de Transport</h3>
          <p className="text-sm text-gray-600">Créez une demande de transport sécurisée</p>
        </div>
      </div>

      {/* Statut des transporteurs */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {availableTransportUsers} transporteur{availableTransportUsers > 1 ? 's' : ''} disponible{availableTransportUsers > 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-xs text-green-600 mt-1">
          Recherche automatique du transporteur le plus proche
        </p>
      </div>

      {/* Formulaire */}
      <div className="space-y-4">
        {/* Adresse de départ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Adresse de départ *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Ex: Conakry, Hamdallaye"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Adresse de destination */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Adresse de destination *
          </label>
          <input
            type="text"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Ex: Conakry, Kaloum"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Notes optionnelles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Notes (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instructions spéciales, description du colis..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Estimation prix et temps */}
        {(estimatedPrice > 0 || estimatedTime > 0) && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Prix estimé</p>
                <p className="text-lg font-bold text-green-600">{estimatedPrice} GNF</p>
                <p className="text-xs text-gray-500">+ 1% de frais = {Math.round(estimatedPrice * 1.01)} GNF</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Temps estimé</p>
                <p className="text-lg font-bold text-blue-600">{estimatedTime} min</p>
                <p className="text-xs text-gray-500">Temps de trajet</p>
              </div>
            </div>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleCreateRequest}
            disabled={isLoading || !pickupAddress || !deliveryAddress}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Création...
              </div>
            ) : (
              'Créer la demande'
            )}
          </button>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Informations de sécurité */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-blue-600">🛡️</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-800">Paiement sécurisé 224Secure</h4>
            <p className="text-xs text-blue-600 mt-1">
              Votre paiement est protégé jusqu'à la livraison confirmée. 
              En cas de problème, remboursement automatique garanti.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportRequestForm;
