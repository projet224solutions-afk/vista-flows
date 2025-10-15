/**
 * 🚚 SERVICE DE LIVRAISON - 224SOLUTIONS
 * Gestion complète du système de livreur/taxi moto
 */

import GeolocationService, { Position } from '../geolocation/GeolocationService';

export interface DeliveryUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    photo?: string;
    rating: number;
    totalDeliveries: number;
    isOnline: boolean;
    isAvailable: boolean;
    currentPosition?: Position;
    vehicleType: 'moto' | 'bike' | 'car';
    vehicleInfo: {
        model: string;
        color: string;
        plateNumber: string;
    };
    lastSeen: number;
    status: 'online' | 'offline' | 'busy' | 'on_delivery';
}

export interface DeliveryRequest {
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
    status: 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
    createdAt: number;
    acceptedAt?: number;
    pickedUpAt?: number;
    deliveredAt?: number;
    deliveryUserId?: string;
    notes?: string;
}

export interface DeliveryRoute {
    id: string;
    deliveryId: string;
    waypoints: Position[];
    distance: number;
    duration: number;
    polyline: string; // Encoded polyline pour Mapbox
    instructions: string[];
}

export interface DeliveryStats {
    totalDeliveries: number;
    totalEarnings: number;
    averageRating: number;
    totalDistance: number;
    totalTime: number;
    completedDeliveries: number;
    cancelledDeliveries: number;
    averageDeliveryTime: number;
}

export class DeliveryService {
    private static instance: DeliveryService;
    private geolocationService: GeolocationService;
    private activeDeliveries: Map<string, DeliveryRequest> = new Map();
    private onlineDeliveryUsers: Map<string, DeliveryUser> = new Map();
    private deliveryHistory: DeliveryRequest[] = [];
    private websocket: WebSocket | null = null;
    private isConnected = false;

    private constructor() {
        this.geolocationService = GeolocationService.getInstance();
    }

    public static getInstance(): DeliveryService {
        if (!DeliveryService.instance) {
            DeliveryService.instance = new DeliveryService();
        }
        return DeliveryService.instance;
    }

    /**
     * Initialiser le service de livraison
     */
    public async initialize(): Promise<void> {
        try {
            // Se connecter au WebSocket pour les mises à jour temps réel
            await this.connectWebSocket();

            // Charger les livreurs en ligne
            await this.loadOnlineDeliveryUsers();

            console.log('🚚 Service de livraison initialisé');
        } catch (error) {
            console.error('Erreur initialisation service livraison:', error);
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
                    console.log('🚚 WebSocket livraison connecté');
                    resolve();
                };

                this.websocket.onmessage = (event) => {
                    this.handleWebSocketMessage(event);
                };

                this.websocket.onclose = () => {
                    this.isConnected = false;
                    console.log('🚚 WebSocket livraison déconnecté');
                    // Tentative de reconnexion
                    setTimeout(() => {
                        if (!this.isConnected) {
                            this.connectWebSocket();
                        }
                    }, 5000);
                };

                this.websocket.onerror = (error) => {
                    console.error('Erreur WebSocket livraison:', error);
                    reject(error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Gérer les messages WebSocket
     */
    private handleWebSocketMessage(event: MessageEvent): void {
        try {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'delivery_request':
                    this.handleDeliveryRequest(data.payload);
                    break;
                case 'delivery_update':
                    this.handleDeliveryUpdate(data.payload);
                    break;
                case 'delivery_user_status':
                    this.handleDeliveryUserStatus(data.payload);
                    break;
                case 'position_update':
                    this.handlePositionUpdate(data.payload);
                    break;
                default:
                    console.log('Message WebSocket non géré:', data.type);
            }
        } catch (error) {
            console.error('Erreur traitement message WebSocket:', error);
        }
    }

    /**
     * Mettre à jour le statut d'un livreur
     */
    public async updateDeliveryUserStatus(
        userId: string,
        status: 'online' | 'offline' | 'busy' | 'on_delivery',
        position?: Position
    ): Promise<void> {
        try {
            const response = await fetch('/api/delivery/status', {
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
                throw new Error('Erreur mise à jour statut livreur');
            }

            // Mettre à jour localement
            const deliveryUser = this.onlineDeliveryUsers.get(userId);
            if (deliveryUser) {
                deliveryUser.status = status;
                deliveryUser.isOnline = status === 'online';
                deliveryUser.isAvailable = status === 'online';
                if (position) {
                    deliveryUser.currentPosition = position;
                }
                deliveryUser.lastSeen = Date.now();
                this.onlineDeliveryUsers.set(userId, deliveryUser);
            }

            // Envoyer via WebSocket
            if (this.websocket && this.isConnected) {
                this.websocket.send(JSON.stringify({
                    type: 'delivery_user_status',
                    payload: {
                        userId,
                        status,
                        position,
                        timestamp: Date.now()
                    }
                }));
            }

            console.log(`🚚 Statut livreur ${userId} mis à jour: ${status}`);
        } catch (error) {
            console.error('Erreur mise à jour statut livreur:', error);
            throw error;
        }
    }

    /**
     * Créer une demande de livraison
     */
    public async createDeliveryRequest(
        clientId: string,
        pickupAddress: string,
        deliveryAddress: string,
        pickupPosition: Position,
        deliveryPosition: Position,
        notes?: string
    ): Promise<DeliveryRequest> {
        try {
            // Calculer la distance et le temps estimé
            const distance = this.geolocationService.calculateDistance(pickupPosition, deliveryPosition);
            const estimatedTime = Math.ceil(distance / 1000 * 2); // 2 minutes par km

            // Calculer le prix (tarif de base + frais 1%)
            const basePrice = this.calculateBasePrice(distance);
            const fees = Math.round(basePrice * 0.01); // 1% de frais
            const totalPrice = basePrice + fees;

            const deliveryRequest: DeliveryRequest = {
                id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
            const response = await fetch('/api/delivery/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(deliveryRequest)
            });

            if (!response.ok) {
                throw new Error('Erreur création demande de livraison');
            }

            // Ajouter à la liste locale
            this.activeDeliveries.set(deliveryRequest.id, deliveryRequest);

            // Trouver le livreur le plus proche
            const nearestDeliveryUser = await this.findNearestDeliveryUser(pickupPosition);

            if (nearestDeliveryUser) {
                // Envoyer la demande au livreur le plus proche
                await this.sendDeliveryRequestToUser(deliveryRequest, nearestDeliveryUser.id);
            }

            console.log(`🚚 Demande de livraison créée: ${deliveryRequest.id}`);
            return deliveryRequest;
        } catch (error) {
            console.error('Erreur création demande livraison:', error);
            throw error;
        }
    }

    /**
     * Trouver le livreur le plus proche
     */
    public async findNearestDeliveryUser(clientPosition: Position): Promise<DeliveryUser | null> {
        try {
            const onlineUsers = Array.from(this.onlineDeliveryUsers.values())
                .filter(user => user.isOnline && user.isAvailable && user.status === 'online');

            if (onlineUsers.length === 0) {
                return null;
            }

            let nearestUser: DeliveryUser | null = null;
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

            console.log(`🚚 Livreur le plus proche trouvé: ${nearestUser?.name} (${Math.round(minDistance)}m)`);
            return nearestUser;
        } catch (error) {
            console.error('Erreur recherche livreur proche:', error);
            return null;
        }
    }

    /**
     * Accepter une demande de livraison
     */
    public async acceptDeliveryRequest(
        deliveryId: string,
        deliveryUserId: string
    ): Promise<void> {
        try {
            const delivery = this.activeDeliveries.get(deliveryId);
            if (!delivery) {
                throw new Error('Demande de livraison non trouvée');
            }

            // Mettre à jour le statut
            delivery.status = 'accepted';
            delivery.deliveryUserId = deliveryUserId;
            delivery.acceptedAt = Date.now();

            // Mettre à jour en base
            const response = await fetch(`/api/delivery/request/${deliveryId}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deliveryUserId,
                    acceptedAt: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error('Erreur acceptation demande livraison');
            }

            // Mettre à jour le statut du livreur
            await this.updateDeliveryUserStatus(deliveryUserId, 'on_delivery');

            // Notifier le client
            await this.notifyClient(delivery.clientId, {
                type: 'delivery_accepted',
                message: 'Votre demande de livraison a été acceptée',
                deliveryId
            });

            console.log(`🚚 Demande de livraison acceptée: ${deliveryId}`);
        } catch (error) {
            console.error('Erreur acceptation livraison:', error);
            throw error;
        }
    }

    /**
     * Marquer comme récupéré
     */
    public async markAsPickedUp(deliveryId: string): Promise<void> {
        try {
            const delivery = this.activeDeliveries.get(deliveryId);
            if (!delivery) {
                throw new Error('Demande de livraison non trouvée');
            }

            delivery.status = 'picked_up';
            delivery.pickedUpAt = Date.now();

            // Mettre à jour en base
            await fetch(`/api/delivery/request/${deliveryId}/picked-up`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            // Notifier le client
            await this.notifyClient(delivery.clientId, {
                type: 'delivery_picked_up',
                message: 'Votre colis a été récupéré',
                deliveryId
            });

            console.log(`🚚 Colis récupéré: ${deliveryId}`);
        } catch (error) {
            console.error('Erreur marquage récupéré:', error);
            throw error;
        }
    }

    /**
     * Marquer comme livré
     */
    public async markAsDelivered(deliveryId: string): Promise<void> {
        try {
            const delivery = this.activeDeliveries.get(deliveryId);
            if (!delivery) {
                throw new Error('Demande de livraison non trouvée');
            }

            delivery.status = 'delivered';
            delivery.deliveredAt = Date.now();

            // Mettre à jour en base
            await fetch(`/api/delivery/request/${deliveryId}/delivered`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            // Traiter le paiement
            await this.processPayment(delivery);

            // Mettre à jour le statut du livreur
            if (delivery.deliveryUserId) {
                await this.updateDeliveryUserStatus(delivery.deliveryUserId, 'online');
            }

            // Notifier le client
            await this.notifyClient(delivery.clientId, {
                type: 'delivery_delivered',
                message: 'Votre colis a été livré',
                deliveryId
            });

            // Ajouter à l'historique
            this.deliveryHistory.push(delivery);
            this.activeDeliveries.delete(deliveryId);

            console.log(`🚚 Colis livré: ${deliveryId}`);
        } catch (error) {
            console.error('Erreur marquage livré:', error);
            throw error;
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
     * Envoyer une demande à un livreur
     */
    private async sendDeliveryRequestToUser(
        delivery: DeliveryRequest,
        deliveryUserId: string
    ): Promise<void> {
        try {
            // Envoyer via WebSocket
            if (this.websocket && this.isConnected) {
                this.websocket.send(JSON.stringify({
                    type: 'delivery_request',
                    payload: {
                        delivery,
                        deliveryUserId
                    }
                }));
            }

            // Envoyer notification push
            await this.sendPushNotification(deliveryUserId, {
                title: 'Nouvelle demande de livraison',
                body: `Livraison de ${delivery.pickupAddress} vers ${delivery.deliveryAddress}`,
                data: {
                    deliveryId: delivery.id,
                    type: 'delivery_request'
                }
            });

            console.log(`🚚 Demande envoyée au livreur ${deliveryUserId}`);
        } catch (error) {
            console.error('Erreur envoi demande livreur:', error);
        }
    }

    /**
     * Notifier un client
     */
    private async notifyClient(clientId: string, notification: unknown): Promise<void> {
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
     * Envoyer une notification push
     */
    private async sendPushNotification(userId: string, notification: unknown): Promise<void> {
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
     * Traiter le paiement
     */
    private async processPayment(delivery: DeliveryRequest): Promise<void> {
        try {
            // Créditer le livreur (montant net)
            await fetch('/api/wallet/credit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: delivery.deliveryUserId,
                    amount: delivery.price,
                    currency: 'GNF',
                    description: `Livraison ${delivery.id}`,
                    transactionType: 'delivery_payment'
                })
            });

            // Créditer le système (frais 1%)
            await fetch('/api/wallet/credit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: 'system',
                    amount: delivery.fees,
                    currency: 'GNF',
                    description: `Frais livraison ${delivery.id}`,
                    transactionType: 'delivery_fees'
                })
            });

            console.log(`💰 Paiement traité: ${delivery.price} GNF au livreur, ${delivery.fees} GNF de frais`);
        } catch (error) {
            console.error('Erreur traitement paiement:', error);
            throw error;
        }
    }

    /**
     * Charger les livreurs en ligne
     */
    private async loadOnlineDeliveryUsers(): Promise<void> {
        try {
            const response = await fetch('/api/delivery/users/online');
            if (response.ok) {
                const users = await response.json();
                users.forEach((user: DeliveryUser) => {
                    this.onlineDeliveryUsers.set(user.id, user);
                });
                console.log(`🚚 ${users.length} livreurs en ligne chargés`);
            }
        } catch (error) {
            console.error('Erreur chargement livreurs:', error);
        }
    }

    /**
     * Gérer les demandes de livraison
     */
    private handleDeliveryRequest(data: unknown): void {
        console.log('🚚 Nouvelle demande de livraison reçue:', data.delivery.id);
        // Émettre un événement pour l'interface utilisateur
        window.dispatchEvent(new CustomEvent('deliveryRequest', { detail: data }));
    }

    /**
     * Gérer les mises à jour de livraison
     */
    private handleDeliveryUpdate(data: unknown): void {
        console.log('🚚 Mise à jour livraison:', data.deliveryId);
        // Émettre un événement pour l'interface utilisateur
        window.dispatchEvent(new CustomEvent('deliveryUpdate', { detail: data }));
    }

    /**
     * Gérer les mises à jour de statut des livreurs
     */
    private handleDeliveryUserStatus(data: unknown): void {
        const { userId, status, position } = data;
        const user = this.onlineDeliveryUsers.get(userId);
        if (user) {
            user.status = status;
            user.isOnline = status === 'online';
            user.isAvailable = status === 'online';
            if (position) {
                user.currentPosition = position;
            }
            user.lastSeen = Date.now();
            this.onlineDeliveryUsers.set(userId, user);
        }
    }

    /**
     * Gérer les mises à jour de position
     */
    private handlePositionUpdate(data: unknown): void {
        const { userId, position } = data;
        const user = this.onlineDeliveryUsers.get(userId);
        if (user) {
            user.currentPosition = position;
            user.lastSeen = Date.now();
            this.onlineDeliveryUsers.set(userId, user);
        }
    }

    /**
     * Obtenir les livreurs en ligne
     */
    public getOnlineDeliveryUsers(): DeliveryUser[] {
        return Array.from(this.onlineDeliveryUsers.values())
            .filter(user => user.isOnline);
    }

    /**
     * Obtenir les livraisons actives
     */
    public getActiveDeliveries(): DeliveryRequest[] {
        return Array.from(this.activeDeliveries.values());
    }

    /**
     * Obtenir l'historique des livraisons
     */
    public getDeliveryHistory(): DeliveryRequest[] {
        return [...this.deliveryHistory];
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

export default DeliveryService;
