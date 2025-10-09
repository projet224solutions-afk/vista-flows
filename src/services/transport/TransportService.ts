/**
 * 🚚 SERVICE TRANSPORT COMPLET - 224SOLUTIONS
 * Gestion complète du système de transport/livreurs avec Escrow
 */

import GeolocationService, { Position } from '../geolocation/GeolocationService';
import EscrowService, { EscrowTransaction } from '../escrow/EscrowService';

export interface TransportUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  rating: number;
  totalTrips: number;
  isOnline: boolean;
  isAvailable: boolean;
  currentPosition?: Position;
  vehicleType: 'moto' | 'bike' | 'car' | 'truck';
  vehicleInfo: {
    model: string;
    color: string;
    plateNumber: string;
    year?: number;
  };
  lastSeen: number;
  status: 'online' | 'offline' | 'busy' | 'on_trip';
  earnings: number;
  commissionPaid: number;
}

export interface TransportRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientPhoto?: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupPosition: Position;
  deliveryPosition: Position;
  distance: number; // en mètres
  estimatedTime: number; // en minutes
  price: number; // prix de base
  fees: number; // frais 1%
  totalPrice: number; // prix total
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled' | 'disputed';
  createdAt: number;
  acceptedAt?: number;
  pickedUpAt?: number;
  deliveredAt?: number;
  transportUserId?: string;
  notes?: string;
  escrowTransactionId?: string;
  proofOfDelivery?: {
    photo?: string;
    coordinates?: Position;
    timestamp: number;
    clientSignature?: string;
  };
}

export interface TransportRoute {
  id: string;
  requestId: string;
  waypoints: Position[];
  distance: number;
  duration: number;
  polyline: string;
  instructions: string[];
  realTimeUpdates: {
    currentPosition: Position;
    progress: number; // 0-100
    estimatedArrival: number;
    lastUpdate: number;
  };
}

export interface TransportStats {
  totalTrips: number;
  totalEarnings: number;
  averageRating: number;
  totalDistance: number;
  totalTime: number;
  completedTrips: number;
  cancelledTrips: number;
  disputedTrips: number;
  averageTripTime: number;
  commissionEarned: number;
}

export class TransportService {
  private static instance: TransportService;
  private geolocationService: GeolocationService;
  private escrowService: EscrowService;
  private activeRequests: Map<string, TransportRequest> = new Map();
  private onlineTransportUsers: Map<string, TransportUser> = new Map();
  private transportHistory: TransportRequest[] = [];
  private activeRoutes: Map<string, TransportRoute> = new Map();
  private websocket: WebSocket | null = null;
  private isConnected = false;

  private constructor() {
    this.geolocationService = GeolocationService.getInstance();
    this.escrowService = EscrowService.getInstance();
  }

  public static getInstance(): TransportService {
    if (!TransportService.instance) {
      TransportService.instance = new TransportService();
    }
    return TransportService.instance;
  }

  /**
   * Initialiser le service de transport
   */
  public async initialize(): Promise<void> {
    try {
      await this.connectWebSocket();
      await this.loadOnlineTransportUsers();
      await this.loadActiveRequests();
      console.log('🚚 Service Transport initialisé');
    } catch (error) {
      console.error('Erreur initialisation service transport:', error);
      throw error;
    }
  }

  /**
   * Se connecter au WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
          this.isConnected = true;
          console.log('🚚 WebSocket Transport connecté');
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.websocket.onclose = () => {
          this.isConnected = false;
          console.log('🚚 WebSocket Transport déconnecté');
          setTimeout(() => {
            if (!this.isConnected) {
              this.connectWebSocket();
            }
          }, 5000);
        };

        this.websocket.onerror = (error) => {
          console.error('Erreur WebSocket Transport:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Créer une demande de transport
   */
  public async createTransportRequest(
    clientId: string,
    pickupAddress: string,
    deliveryAddress: string,
    pickupPosition: Position,
    deliveryPosition: Position,
    notes?: string,
    dynamicPricing?: boolean
  ): Promise<TransportRequest> {
    try {
      // Calculer la distance et le temps estimé
      const distance = this.geolocationService.calculateDistance(pickupPosition, deliveryPosition);
      const estimatedTime = Math.ceil(distance / 1000 * 2); // 2 minutes par km
      
      // Calculer le prix (tarif de base + frais 1%)
      const basePrice = this.calculateBasePrice(distance);
      const fees = Math.round(basePrice * 0.01); // 1% de frais
      const totalPrice = basePrice + fees;

      const requestId = `transport_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const request: TransportRequest = {
        id: requestId,
        clientId,
        clientName: 'Client', // À récupérer depuis la base
        clientPhone: '+224 XXX XX XX XX', // À récupérer depuis la base
        pickupAddress,
        deliveryAddress,
        pickupPosition,
        deliveryPosition,
        distance,
        estimatedTime,
        price: basePrice,
        fees,
        totalPrice,
        status: 'pending',
        createdAt: Date.now(),
        notes
      };

      // Sauvegarder en base
      const response = await fetch('/api/transport/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Erreur création demande de transport');
      }

      // Ajouter à la liste locale
      this.activeRequests.set(requestId, request);

      // Trouver le transporteur le plus proche
      const nearestTransportUser = await this.findNearestTransportUser(pickupPosition);
      
      if (nearestTransportUser) {
        // Envoyer la demande au transporteur le plus proche
        await this.sendTransportRequestToUser(request, nearestTransportUser.id);
      }

      console.log(`🚚 Demande de transport créée: ${requestId}`);
      return request;
    } catch (error) {
      console.error('Erreur création demande transport:', error);
      throw error;
    }
  }

  /**
   * Créer une facture dynamique par le transporteur
   */
  public async createDynamicTransportInvoice(
    transportUserId: string,
    amount: number,
    startLocation: string,
    endLocation: string,
    clientId?: string,
    clientName?: string,
    clientPhone?: string,
    startCoordinates?: Position,
    endCoordinates?: Position,
    notes?: string
  ): Promise<string> {
    try {
      // Créer la facture via le service Escrow
      const invoice = await this.escrowService.createDynamicInvoice(
        transportUserId,
        amount,
        startLocation,
        endLocation,
        clientId,
        clientName,
        clientPhone,
        startCoordinates,
        endCoordinates,
        notes
      );

      console.log(`🚚 Facture transport créée: ${invoice.id}`);
      return invoice.paymentLink;
    } catch (error) {
      console.error('Erreur création facture transport:', error);
      throw error;
    }
  }

  /**
   * Accepter une demande de transport
   */
  public async acceptTransportRequest(
    requestId: string, 
    transportUserId: string
  ): Promise<void> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request) {
        throw new Error('Demande de transport non trouvée');
      }

      // Mettre à jour le statut
      request.status = 'accepted';
      request.transportUserId = transportUserId;
      request.acceptedAt = Date.now();

      // Mettre à jour en base
      const response = await fetch(`/api/transport/request/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transportUserId,
          acceptedAt: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error('Erreur acceptation demande transport');
      }

      // Mettre à jour le statut du transporteur
      await this.updateTransportUserStatus(transportUserId, 'on_trip');

      // Initier la transaction Escrow
      const escrowTransaction = await this.escrowService.initiateEscrow(
        requestId, // Utiliser l'ID de la demande comme invoiceId
        request.clientId,
        'transport_payment',
        {
          requestId,
          transportUserId,
          amount: request.price,
          totalAmount: request.totalPrice
        }
      );

      // Lier la transaction Escrow
      request.escrowTransactionId = escrowTransaction.id;
      this.activeRequests.set(requestId, request);

      // Notifier le client
      await this.notifyClient(request.clientId, {
        type: 'transport_accepted',
        message: 'Votre demande de transport a été acceptée',
        requestId
      });

      console.log(`🚚 Demande de transport acceptée: ${requestId}`);
    } catch (error) {
      console.error('Erreur acceptation transport:', error);
      throw error;
    }
  }

  /**
   * Marquer comme récupéré
   */
  public async markAsPickedUp(requestId: string): Promise<void> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request) {
        throw new Error('Demande de transport non trouvée');
      }

      request.status = 'picked_up';
      request.pickedUpAt = Date.now();

      // Mettre à jour en base
      await fetch(`/api/transport/request/${requestId}/picked-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Notifier le client
      await this.notifyClient(request.clientId, {
        type: 'transport_picked_up',
        message: 'Vous avez été récupéré',
        requestId
      });

      console.log(`🚚 Client récupéré: ${requestId}`);
    } catch (error) {
      console.error('Erreur marquage récupéré:', error);
      throw error;
    }
  }

  /**
   * Marquer comme livré avec preuve
   */
  public async markAsDelivered(
    requestId: string,
    proofOfDelivery: {
      photo?: string;
      coordinates?: Position;
      clientSignature?: string;
    }
  ): Promise<void> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request) {
        throw new Error('Demande de transport non trouvée');
      }

      request.status = 'delivered';
      request.deliveredAt = Date.now();
      request.proofOfDelivery = {
        ...proofOfDelivery,
        timestamp: Date.now()
      };

      // Mettre à jour en base
      await fetch(`/api/transport/request/${requestId}/delivered`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proofOfDelivery: request.proofOfDelivery
        })
      });

      // Libérer le paiement Escrow
      if (request.escrowTransactionId) {
        await this.escrowService.releasePayment(
          request.escrowTransactionId,
          {
            photo: proofOfDelivery.photo,
            coordinates: proofOfDelivery.coordinates
          }
        );
      }

      // Mettre à jour le statut du transporteur
      if (request.transportUserId) {
        await this.updateTransportUserStatus(request.transportUserId, 'online');
      }

      // Notifier le client
      await this.notifyClient(request.clientId, {
        type: 'transport_delivered',
        message: 'Vous avez été livré',
        requestId
      });

      // Ajouter à l'historique
      this.transportHistory.push(request);
      this.activeRequests.delete(requestId);

      console.log(`🚚 Client livré: ${requestId}`);
    } catch (error) {
      console.error('Erreur marquage livré:', error);
      throw error;
    }
  }

  /**
   * Ouvrir un litige
   */
  public async openDispute(
    requestId: string,
    reason: string,
    description: string,
    evidence?: {
      photos: string[];
      messages: string[];
      coordinates: any[];
    }
  ): Promise<void> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request) {
        throw new Error('Demande de transport non trouvée');
      }

      // Mettre à jour le statut
      request.status = 'disputed';

      // Ouvrir le litige via Escrow
      if (request.escrowTransactionId) {
        await this.escrowService.openDispute(
          request.escrowTransactionId,
          reason,
          description,
          evidence
        );
      }

      // Mettre à jour en base
      await fetch(`/api/transport/request/${requestId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          description,
          evidence
        })
      });

      // Notifier toutes les parties
      await this.notifyClient(request.clientId, {
        type: 'transport_disputed',
        message: 'Un litige a été ouvert',
        requestId
      });

      if (request.transportUserId) {
        await this.notifyTransportUser(request.transportUserId, {
          type: 'transport_disputed',
          message: 'Un litige a été ouvert',
          requestId
        });
      }

      console.log(`🚚 Litige ouvert: ${requestId}`);
    } catch (error) {
      console.error('Erreur ouverture litige:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'un transporteur
   */
  public async updateTransportUserStatus(
    userId: string, 
    status: 'online' | 'offline' | 'busy' | 'on_trip',
    position?: Position
  ): Promise<void> {
    try {
      const response = await fetch('/api/transport/user/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          status,
          position,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error('Erreur mise à jour statut transporteur');
      }

      // Mettre à jour localement
      const transportUser = this.onlineTransportUsers.get(userId);
      if (transportUser) {
        transportUser.status = status;
        transportUser.isOnline = status === 'online';
        transportUser.isAvailable = status === 'online';
        if (position) {
          transportUser.currentPosition = position;
        }
        transportUser.lastSeen = Date.now();
        this.onlineTransportUsers.set(userId, transportUser);
      }

      // Envoyer via WebSocket
      if (this.websocket && this.isConnected) {
        this.websocket.send(JSON.stringify({
          type: 'transport_user_status',
          payload: {
            userId,
            status,
            position,
            timestamp: Date.now()
          }
        }));
      }

      console.log(`🚚 Statut transporteur ${userId} mis à jour: ${status}`);
    } catch (error) {
      console.error('Erreur mise à jour statut transporteur:', error);
      throw error;
    }
  }

  /**
   * Trouver le transporteur le plus proche
   */
  public async findNearestTransportUser(clientPosition: Position): Promise<TransportUser | null> {
    try {
      const onlineUsers = Array.from(this.onlineTransportUsers.values())
        .filter(user => user.isOnline && user.isAvailable && user.status === 'online');

      if (onlineUsers.length === 0) {
        return null;
      }

      let nearestUser: TransportUser | null = null;
      let minDistance = Infinity;

      for (const user of onlineUsers) {
        if (user.currentPosition) {
          const distance = this.geolocationService.calculateDistance(clientPosition, user.currentPosition);
          if (distance < minDistance) {
            minDistance = distance;
            nearestUser = user;
          }
        }
      }

      console.log(`🚚 Transporteur le plus proche trouvé: ${nearestUser?.name} (${Math.round(minDistance)}m)`);
      return nearestUser;
    } catch (error) {
      console.error('Erreur recherche transporteur proche:', error);
      return null;
    }
  }

  /**
   * Calculer le prix de base
   */
  private calculateBasePrice(distance: number): number {
    // Tarif de base: 500 GNF + 100 GNF par km
    const basePrice = 500;
    const pricePerKm = 100;
    const distanceKm = distance / 1000;
    
    return Math.round(basePrice + (distanceKm * pricePerKm));
  }

  /**
   * Envoyer une demande à un transporteur
   */
  private async sendTransportRequestToUser(
    request: TransportRequest, 
    transportUserId: string
  ): Promise<void> {
    try {
      // Envoyer via WebSocket
      if (this.websocket && this.isConnected) {
        this.websocket.send(JSON.stringify({
          type: 'transport_request',
          payload: {
            request,
            transportUserId
          }
        }));
      }

      // Envoyer notification push
      await this.sendPushNotification(transportUserId, {
        title: 'Nouvelle demande de transport',
        body: `Transport de ${request.pickupAddress} vers ${request.deliveryAddress}`,
        data: {
          requestId: request.id,
          type: 'transport_request'
        }
      });

      console.log(`🚚 Demande envoyée au transporteur ${transportUserId}`);
    } catch (error) {
      console.error('Erreur envoi demande transporteur:', error);
    }
  }

  /**
   * Notifier un client
   */
  private async notifyClient(clientId: string, notification: any): Promise<void> {
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: clientId,
          ...notification
        })
      });
    } catch (error) {
      console.error('Erreur notification client:', error);
    }
  }

  /**
   * Notifier un transporteur
   */
  private async notifyTransportUser(transportUserId: string, notification: any): Promise<void> {
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: transportUserId,
          ...notification
        })
      });
    } catch (error) {
      console.error('Erreur notification transporteur:', error);
    }
  }

  /**
   * Envoyer une notification push
   */
  private async sendPushNotification(userId: string, notification: any): Promise<void> {
    try {
      await fetch('/api/notifications/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...notification
        })
      });
    } catch (error) {
      console.error('Erreur notification push:', error);
    }
  }

  /**
   * Charger les transporteurs en ligne
   */
  private async loadOnlineTransportUsers(): Promise<void> {
    try {
      const response = await fetch('/api/transport/users/online');
      if (response.ok) {
        const users = await response.json();
        users.forEach((user: TransportUser) => {
          this.onlineTransportUsers.set(user.id, user);
        });
        console.log(`🚚 ${users.length} transporteurs en ligne chargés`);
      }
    } catch (error) {
      console.error('Erreur chargement transporteurs:', error);
    }
  }

  /**
   * Charger les demandes actives
   */
  private async loadActiveRequests(): Promise<void> {
    try {
      const response = await fetch('/api/transport/requests/active');
      if (response.ok) {
        const requests = await response.json();
        requests.forEach((request: TransportRequest) => {
          this.activeRequests.set(request.id, request);
        });
        console.log(`🚚 ${requests.length} demandes actives chargées`);
      }
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    }
  }

  /**
   * Gérer les messages WebSocket
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'transport_request':
          this.handleTransportRequest(data.payload);
          break;
        case 'transport_update':
          this.handleTransportUpdate(data.payload);
          break;
        case 'transport_user_status':
          this.handleTransportUserStatus(data.payload);
          break;
        case 'position_update':
          this.handlePositionUpdate(data.payload);
          break;
        default:
          console.log('Message Transport non géré:', data.type);
      }
    } catch (error) {
      console.error('Erreur traitement message Transport:', error);
    }
  }

  /**
   * Gestionnaires d'événements WebSocket
   */
  private handleTransportRequest(data: any): void {
    console.log('🚚 Nouvelle demande de transport reçue:', data.request.id);
    window.dispatchEvent(new CustomEvent('transportRequest', { detail: data }));
  }

  private handleTransportUpdate(data: any): void {
    console.log('🚚 Mise à jour transport:', data.requestId);
    window.dispatchEvent(new CustomEvent('transportUpdate', { detail: data }));
  }

  private handleTransportUserStatus(data: any): void {
    const { userId, status, position } = data;
    const user = this.onlineTransportUsers.get(userId);
    if (user) {
      user.status = status;
      user.isOnline = status === 'online';
      user.isAvailable = status === 'online';
      if (position) {
        user.currentPosition = position;
      }
      user.lastSeen = Date.now();
      this.onlineTransportUsers.set(userId, user);
    }
  }

  private handlePositionUpdate(data: any): void {
    const { userId, position } = data;
    const user = this.onlineTransportUsers.get(userId);
    if (user) {
      user.currentPosition = position;
      user.lastSeen = Date.now();
      this.onlineTransportUsers.set(userId, user);
    }
  }

  /**
   * Obtenir les transporteurs en ligne
   */
  public getOnlineTransportUsers(): TransportUser[] {
    return Array.from(this.onlineTransportUsers.values())
      .filter(user => user.isOnline);
  }

  /**
   * Obtenir les demandes actives
   */
  public getActiveRequests(): TransportRequest[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Obtenir l'historique des transports
   */
  public getTransportHistory(): TransportRequest[] {
    return [...this.transportHistory];
  }

  /**
   * Vérifier si connecté
   */
  public isConnectedToWebSocket(): boolean {
    return this.isConnected;
  }

  /**
   * Fermer la connexion
   */
  public disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
  }
}

export default TransportService;
