/**
 * 🚚 TABLEAU DE BORD TRANSPORT
 * Interface complète pour gestion des transports
 */

import React, { useState, useEffect } from 'react';
import { Navigation, Users, MapPin, Clock, DollarSign, Phone, MessageSquare, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import TransportService, { TransportRequest, TransportUser } from '../../services/transport/TransportService';
import TransportRequestForm from './TransportRequestForm';
import TransportTracking from './TransportTracking';

interface TransportDashboardProps {
  userType: 'client' | 'transport' | 'admin';
  userId?: string;
  className?: string;
}

const TransportDashboard: React.FC<TransportDashboardProps> = ({
  userType,
  userId,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [transportUsers, setTransportUsers] = useState<TransportUser[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<TransportRequest | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    totalEarnings: 0,
    onlineTransportUsers: 0
  });

  const transportService = TransportService.getInstance();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Actualiser toutes les 10 secondes
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Charger les demandes
      const requestsResponse = await fetch('/api/transport/requests');
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setRequests(requestsData);
        
        // Calculer les statistiques
        setStats({
          totalRequests: requestsData.length,
          activeRequests: requestsData.filter((r: TransportRequest) => 
            ['pending', 'accepted', 'picked_up'].includes(r.status)
          ).length,
          completedRequests: requestsData.filter((r: TransportRequest) => 
            r.status === 'delivered'
          ).length,
          totalEarnings: requestsData
            .filter((r: TransportRequest) => r.status === 'delivered')
            .reduce((sum: number, r: TransportRequest) => sum + r.price, 0),
          onlineTransportUsers: transportService.getOnlineTransportUsers().length
        });
      }

      // Charger les transporteurs (pour admin)
      if (userType === 'admin') {
        const usersResponse = await fetch('/api/transport/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setTransportUsers(usersData);
        }
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRequest = (request: TransportRequest) => {
    setRequests(prev => [request, ...prev]);
    setShowRequestForm(false);
    setSelectedRequest(request);
  };

  const handleRequestClick = (request: TransportRequest) => {
    setSelectedRequest(request);
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

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* En-tête */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {userType === 'client' && 'Mes Transports'}
                {userType === 'transport' && 'Mes Courses'}
                {userType === 'admin' && 'Gestion Transport'}
              </h2>
              <p className="text-sm text-gray-600">
                {userType === 'client' && 'Demandez et suivez vos transports'}
                {userType === 'transport' && 'Gérez vos courses et clients'}
                {userType === 'admin' && 'Supervisez tous les transports'}
              </p>
            </div>
          </div>
          
          {userType === 'client' && (
            <button
              onClick={() => setShowRequestForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nouvelle demande
            </button>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Total</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.totalRequests}</p>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Actives</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.activeRequests}</p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Terminées</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.completedRequests}</p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Gains</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.totalEarnings} GNF</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Demandes
          </button>
          
          {userType === 'admin' && (
            <button
              onClick={() => setActiveTab('transporters')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transporters'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Transporteurs
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Statistiques
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="p-6">
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">Chargement...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8">
                <Navigation className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Aucune demande de transport</p>
                {userType === 'client' && (
                  <button
                    onClick={() => setShowRequestForm(true)}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Créer une demande
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    onClick={() => handleRequestClick(request)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusText(request.status)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatTime(request.createdAt)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-gray-700">{request.pickupAddress}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-700">{request.deliveryAddress}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">
                              {Math.round(request.distance / 1000)} km
                            </span>
                            <span className="text-sm text-gray-600">
                              {request.estimatedTime} min
                            </span>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {request.totalPrice} GNF
                          </span>
                        </div>
                      </div>
                      
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transporters' && userType === 'admin' && (
          <div className="space-y-4">
            {transportUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Aucun transporteur enregistré</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {transportUsers.map((user) => (
                  <div key={user.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{user.name}</h4>
                        <p className="text-sm text-gray-600">
                          {user.vehicleType} • {user.vehicleInfo.model}
                        </p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Note</span>
                        <span className="font-medium">⭐ {user.rating}/5</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Courses</span>
                        <span className="font-medium">{user.totalTrips}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Gains</span>
                        <span className="font-medium text-green-600">{user.earnings} GNF</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 bg-blue-100 text-blue-600 py-2 px-3 rounded-lg text-sm hover:bg-blue-200 transition-colors">
                        <Phone className="w-4 h-4 inline mr-1" />
                        Appeler
                      </button>
                      <button className="flex-1 bg-green-100 text-green-600 py-2 px-3 rounded-lg text-sm hover:bg-green-200 transition-colors">
                        <MessageSquare className="w-4 h-4 inline mr-1" />
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Taux de réussite</span>
                    <span className="font-bold text-blue-800">95%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Temps moyen</span>
                    <span className="font-bold text-blue-800">12 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Distance moyenne</span>
                    <span className="font-bold text-blue-800">3.2 km</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Revenus</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-green-600">Aujourd'hui</span>
                    <span className="font-bold text-green-800">45,000 GNF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Cette semaine</span>
                    <span className="font-bold text-green-800">320,000 GNF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Ce mois</span>
                    <span className="font-bold text-green-800">1,250,000 GNF</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-purple-50 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Sécurité</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-purple-600">Litiges</span>
                    <span className="font-bold text-purple-800">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Résolus</span>
                    <span className="font-bold text-purple-800">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">En cours</span>
                    <span className="font-bold text-purple-800">1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de création de demande */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <TransportRequestForm
              onRequestCreated={handleCreateRequest}
              onCancel={() => setShowRequestForm(false)}
            />
          </div>
        </div>
      )}

      {/* Modal de suivi */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Suivi de Transport</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <TransportTracking
              requestId={selectedRequest.id}
              userType={userType === 'admin' ? 'client' : userType}
              onComplete={() => {
                setSelectedRequest(null);
                loadData();
              }}
              onDispute={() => {
                setSelectedRequest(null);
                loadData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportDashboard;
