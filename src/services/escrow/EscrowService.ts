/**
 * 🛡️ SERVICE ESCROW 224SECURE - 224SOLUTIONS
 * Gestion complète du système de séquestre pour sécuriser les paiements
 */

export interface EscrowTransaction {
    id: string;
    invoiceId: string;
    clientId: string;
    driverId: string;
    amount: number;
    feePercent: number;
    feeAmount: number;
    totalAmount: number;
    status: 'pending' | 'released' | 'refunded' | 'disputed';
    disputeReason?: string;
    startLocation: string;
    endLocation: string;
    startCoordinates?: {
        latitude: number;
        longitude: number;
    };
    endCoordinates?: {
        latitude: number;
        longitude: number;
    };
    createdAt: number;
    releasedAt?: number;
    refundedAt?: number;
    disputedAt?: number;
    proofOfDelivery?: {
        photo?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
        timestamp: number;
    };
}

export interface EscrowInvoice {
    id: string;
    driverId: string;
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    amount: number;
    description: string;
    startLocation: string;
    endLocation: string;
    startCoordinates?: {
        latitude: number;
        longitude: number;
    };
    endCoordinates?: {
        latitude: number;
        longitude: number;
    };
    status: 'draft' | 'sent' | 'paid' | 'completed' | 'cancelled';
    paymentLink: string;
    qrCode?: string;
    createdAt: number;
    expiresAt: number;
    notes?: string;
}

export interface EscrowDispute {
    id: string;
    transactionId: string;
    clientId: string;
    driverId: string;
    reason: string;
    description: string;
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    resolution?: string;
    createdAt: number;
    resolvedAt?: number;
    evidence?: {
        photos: string[];
        messages: string[];
        coordinates: unknown[];
    };
}

export class EscrowService {
    private static instance: EscrowService;
    private activeTransactions: Map<string, EscrowTransaction> = new Map();
    private activeInvoices: Map<string, EscrowInvoice> = new Map();
    private disputes: Map<string, EscrowDispute> = new Map();
    private websocket: WebSocket | null = null;
    private isConnected = false;

    private constructor() { }

    public static getInstance(): EscrowService {
        if (!EscrowService.instance) {
            EscrowService.instance = new EscrowService();
        }
        return EscrowService.instance;
    }

    /**
     * Initialiser le service Escrow
     */
    public async initialize(): Promise<void> {
        try {
            await this.connectWebSocket();
            await this.loadActiveTransactions();
            console.log('🛡️ Service Escrow 224SECURE initialisé');
        } catch (error) {
            console.error('Erreur initialisation Escrow:', error);
            throw error;
        }
    }

    /**
     * Se connecter au WebSocket pour les notifications temps réel
     */
    private async connectWebSocket(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';
                this.websocket = new WebSocket(wsUrl);

                this.websocket.onopen = () => {
                    this.isConnected = true;
                    console.log('🛡️ WebSocket Escrow connecté');
                    resolve();
                };

                this.websocket.onmessage = (event) => {
                    this.handleWebSocketMessage(event);
                };

                this.websocket.onclose = () => {
                    this.isConnected = false;
                    console.log('🛡️ WebSocket Escrow déconnecté');
                    setTimeout(() => {
                        if (!this.isConnected) {
                            this.connectWebSocket();
                        }
                    }, 5000);
                };

                this.websocket.onerror = (error) => {
                    console.error('Erreur WebSocket Escrow:', error);
                    reject(error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Créer une facture dynamique par le livreur
     */
    public async createDynamicInvoice(
        driverId: string,
        amount: number,
        startLocation: string,
        endLocation: string,
        clientId?: string,
        clientName?: string,
        clientPhone?: string,
        startCoordinates?: { latitude: number; longitude: number },
        endCoordinates?: { latitude: number; longitude: number },
        notes?: string
    ): Promise<EscrowInvoice> {
        try {
            const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://224solutions.app'}/pay/${invoiceId}`;

            const invoice: EscrowInvoice = {
                id: invoiceId,
                driverId,
                clientId,
                clientName,
                clientPhone,
                amount,
                description: `Trajet de ${startLocation} vers ${endLocation}`,
                startLocation,
                endLocation,
                startCoordinates,
                endCoordinates,
                status: 'draft',
                paymentLink,
                createdAt: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 heures
                notes
            };

            // Sauvegarder en base
            const response = await fetch('/api/escrow/invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(invoice)
            });

            if (!response.ok) {
                throw new Error('Erreur création facture');
            }

            // Ajouter localement
            this.activeInvoices.set(invoiceId, invoice);

            // Générer le QR code
            await this.generateQRCode(invoice);

            console.log(`🛡️ Facture créée: ${invoiceId}`);
            return invoice;
        } catch (error) {
            console.error('Erreur création facture:', error);
            throw error;
        }
    }

    /**
     * Initier une transaction Escrow
     */
    public async initiateEscrow(
        invoiceId: string,
        clientId: string,
        paymentMethod: string,
        paymentData: unknown
    ): Promise<EscrowTransaction> {
        try {
            const invoice = this.activeInvoices.get(invoiceId);
            if (!invoice) {
                throw new Error('Facture non trouvée');
            }

            // Calculer les frais (1% du montant)
            const feePercent = 1.0;
            const feeAmount = Math.round(invoice.amount * (feePercent / 100));
            const totalAmount = invoice.amount + feeAmount;

            const transactionId = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const transaction: EscrowTransaction = {
                id: transactionId,
                invoiceId,
                clientId,
                driverId: invoice.driverId,
                amount: invoice.amount,
                feePercent,
                feeAmount,
                totalAmount,
                status: 'pending',
                startLocation: invoice.startLocation,
                endLocation: invoice.endLocation,
                startCoordinates: invoice.startCoordinates,
                endCoordinates: invoice.endCoordinates,
                createdAt: Date.now()
            };

            // Bloquer le paiement dans Escrow
            const response = await fetch('/api/escrow/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transaction,
                    paymentMethod,
                    paymentData
                })
            });

            if (!response.ok) {
                throw new Error('Erreur initiation Escrow');
            }

            // Mettre à jour la facture
            invoice.status = 'paid';
            invoice.clientId = clientId;
            this.activeInvoices.set(invoiceId, invoice);

            // Ajouter la transaction
            this.activeTransactions.set(transactionId, transaction);

            // Notifier toutes les parties
            await this.notifyEscrowInitiated(transaction);

            console.log(`🛡️ Transaction Escrow initiée: ${transactionId}`);
            return transaction;
        } catch (error) {
            console.error('Erreur initiation Escrow:', error);
            throw error;
        }
    }

    /**
     * Libérer le paiement au livreur
     */
    public async releasePayment(
        transactionId: string,
        proofOfDelivery?: {
            photo?: string;
            coordinates?: { latitude: number; longitude: number };
        }
    ): Promise<void> {
        try {
            const transaction = this.activeTransactions.get(transactionId);
            if (!transaction) {
                throw new Error('Transaction non trouvée');
            }

            if (transaction.status !== 'pending') {
                throw new Error('Transaction non en attente');
            }

            // Mettre à jour le statut
            transaction.status = 'released';
            transaction.releasedAt = Date.now();
            if (proofOfDelivery) {
                transaction.proofOfDelivery = {
                    ...proofOfDelivery,
                    timestamp: Date.now()
                };
            }

            // Libérer le paiement via l'API
            const response = await fetch('/api/escrow/release', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionId,
                    proofOfDelivery
                })
            });

            if (!response.ok) {
                throw new Error('Erreur libération paiement');
            }

            // Mettre à jour localement
            this.activeTransactions.set(transactionId, transaction);

            // Notifier toutes les parties
            await this.notifyPaymentReleased(transaction);

            console.log(`🛡️ Paiement libéré: ${transactionId}`);
        } catch (error) {
            console.error('Erreur libération paiement:', error);
            throw error;
        }
    }

    /**
     * Rembourser le client
     */
    public async refundPayment(
        transactionId: string,
        reason: string
    ): Promise<void> {
        try {
            const transaction = this.activeTransactions.get(transactionId);
            if (!transaction) {
                throw new Error('Transaction non trouvée');
            }

            if (transaction.status !== 'pending') {
                throw new Error('Transaction non en attente');
            }

            // Mettre à jour le statut
            transaction.status = 'refunded';
            transaction.refundedAt = Date.now();

            // Effectuer le remboursement via l'API
            const response = await fetch('/api/escrow/refund', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionId,
                    reason
                })
            });

            if (!response.ok) {
                throw new Error('Erreur remboursement');
            }

            // Mettre à jour localement
            this.activeTransactions.set(transactionId, transaction);

            // Notifier toutes les parties
            await this.notifyPaymentRefunded(transaction, reason);

            console.log(`🛡️ Paiement remboursé: ${transactionId}`);
        } catch (error) {
            console.error('Erreur remboursement:', error);
            throw error;
        }
    }

    /**
     * Ouvrir un litige
     */
    public async openDispute(
        transactionId: string,
        reason: string,
        description: string,
        evidence?: {
            photos: string[];
            messages: string[];
            coordinates: unknown[];
        }
    ): Promise<EscrowDispute> {
        try {
            const transaction = this.activeTransactions.get(transactionId);
            if (!transaction) {
                throw new Error('Transaction non trouvée');
            }

            const disputeId = `dispute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const dispute: EscrowDispute = {
                id: disputeId,
                transactionId,
                clientId: transaction.clientId,
                driverId: transaction.driverId,
                reason,
                description,
                status: 'open',
                createdAt: Date.now(),
                evidence
            };

            // Mettre à jour la transaction
            transaction.status = 'disputed';
            transaction.disputedAt = Date.now();
            transaction.disputeReason = reason;

            // Sauvegarder le litige
            const response = await fetch('/api/escrow/dispute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dispute)
            });

            if (!response.ok) {
                throw new Error('Erreur ouverture litige');
            }

            // Mettre à jour localement
            this.disputes.set(disputeId, dispute);
            this.activeTransactions.set(transactionId, transaction);

            // Notifier toutes les parties
            await this.notifyDisputeOpened(dispute);

            console.log(`🛡️ Litige ouvert: ${disputeId}`);
            return dispute;
        } catch (error) {
            console.error('Erreur ouverture litige:', error);
            throw error;
        }
    }

    /**
     * Résoudre un litige
     */
    public async resolveDispute(
        disputeId: string,
        resolution: string,
        action: 'release' | 'refund'
    ): Promise<void> {
        try {
            const dispute = this.disputes.get(disputeId);
            if (!dispute) {
                throw new Error('Litige non trouvé');
            }

            const transaction = this.activeTransactions.get(dispute.transactionId);
            if (!transaction) {
                throw new Error('Transaction non trouvée');
            }

            // Mettre à jour le litige
            dispute.status = 'resolved';
            dispute.resolution = resolution;
            dispute.resolvedAt = Date.now();

            // Mettre à jour la transaction selon l'action
            if (action === 'release') {
                transaction.status = 'released';
                transaction.releasedAt = Date.now();
            } else {
                transaction.status = 'refunded';
                transaction.refundedAt = Date.now();
            }

            // Sauvegarder les changements
            await fetch('/api/escrow/dispute/resolve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    disputeId,
                    resolution,
                    action
                })
            });

            // Mettre à jour localement
            this.disputes.set(disputeId, dispute);
            this.activeTransactions.set(dispute.transactionId, transaction);

            // Notifier toutes les parties
            await this.notifyDisputeResolved(dispute, resolution, action);

            console.log(`🛡️ Litige résolu: ${disputeId}`);
        } catch (error) {
            console.error('Erreur résolution litige:', error);
            throw error;
        }
    }

    /**
     * Générer un QR code pour la facture
     */
    private async generateQRCode(invoice: EscrowInvoice): Promise<void> {
        try {
            const response = await fetch('/api/escrow/qr-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invoiceId: invoice.id,
                    paymentLink: invoice.paymentLink
                })
            });

            if (response.ok) {
                const data = await response.json();
                invoice.qrCode = data.qrCode;
                this.activeInvoices.set(invoice.id, invoice);
            }
        } catch (error) {
            console.error('Erreur génération QR code:', error);
        }
    }

    /**
     * Charger les transactions actives
     */
    private async loadActiveTransactions(): Promise<void> {
        try {
            const response = await fetch('/api/escrow/transactions/active');
            if (response.ok) {
                const data = await response.json();
                data.transactions.forEach((transaction: EscrowTransaction) => {
                    this.activeTransactions.set(transaction.id, transaction);
                });
                console.log(`🛡️ ${data.transactions.length} transactions actives chargées`);
            }
        } catch (error) {
            console.error('Erreur chargement transactions:', error);
        }
    }

    /**
     * Gérer les messages WebSocket
     */
    private handleWebSocketMessage(event: MessageEvent): void {
        try {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'escrow_initiated':
                    this.handleEscrowInitiated(data.payload);
                    break;
                case 'escrow_released':
                    this.handleEscrowReleased(data.payload);
                    break;
                case 'escrow_refunded':
                    this.handleEscrowRefunded(data.payload);
                    break;
                case 'escrow_disputed':
                    this.handleEscrowDisputed(data.payload);
                    break;
                default:
                    console.log('Message Escrow non géré:', data.type);
            }
        } catch (error) {
            console.error('Erreur traitement message Escrow:', error);
        }
    }

    /**
     * Notifier l'initiation d'Escrow
     */
    private async notifyEscrowInitiated(transaction: EscrowTransaction): Promise<void> {
        const notifications = [
            {
                userId: transaction.clientId,
                type: 'escrow_initiated',
                title: 'Paiement sécurisé par 224SECURE',
                message: `Votre paiement de ${transaction.totalAmount} GNF est sécurisé. Le livreur sera payé après confirmation de la livraison.`,
                data: { transactionId: transaction.id }
            },
            {
                userId: transaction.driverId,
                type: 'escrow_initiated',
                title: 'Paiement reçu - En attente de validation',
                message: `Paiement de ${transaction.amount} GNF bloqué par 224SECURE. En attente de validation client.`,
                data: { transactionId: transaction.id }
            }
        ];

        for (const notification of notifications) {
            await this.sendNotification(notification);
        }
    }

    /**
     * Notifier la libération de paiement
     */
    private async notifyPaymentReleased(transaction: EscrowTransaction): Promise<void> {
        const notifications = [
            {
                userId: transaction.clientId,
                type: 'escrow_released',
                title: 'Paiement libéré au livreur',
                message: `Le paiement de ${transaction.amount} GNF a été libéré au livreur.`,
                data: { transactionId: transaction.id }
            },
            {
                userId: transaction.driverId,
                type: 'escrow_released',
                title: 'Paiement reçu !',
                message: `Vous avez reçu ${transaction.amount} GNF sur votre wallet.`,
                data: { transactionId: transaction.id }
            }
        ];

        for (const notification of notifications) {
            await this.sendNotification(notification);
        }
    }

    /**
     * Notifier le remboursement
     */
    private async notifyPaymentRefunded(transaction: EscrowTransaction, reason: string): Promise<void> {
        const notifications = [
            {
                userId: transaction.clientId,
                type: 'escrow_refunded',
                title: 'Remboursement effectué',
                message: `Votre paiement de ${transaction.totalAmount} GNF a été remboursé. Raison: ${reason}`,
                data: { transactionId: transaction.id }
            },
            {
                userId: transaction.driverId,
                type: 'escrow_refunded',
                title: 'Paiement remboursé au client',
                message: `Le paiement a été remboursé au client. Raison: ${reason}`,
                data: { transactionId: transaction.id }
            }
        ];

        for (const notification of notifications) {
            await this.sendNotification(notification);
        }
    }

    /**
     * Notifier l'ouverture d'un litige
     */
    private async notifyDisputeOpened(dispute: EscrowDispute): Promise<void> {
        const notifications = [
            {
                userId: dispute.clientId,
                type: 'escrow_disputed',
                title: 'Litige ouvert',
                message: `Un litige a été ouvert pour votre transaction. Raison: ${dispute.reason}`,
                data: { disputeId: dispute.id }
            },
            {
                userId: dispute.driverId,
                type: 'escrow_disputed',
                title: 'Litige ouvert',
                message: `Un litige a été ouvert pour votre transaction. Raison: ${dispute.reason}`,
                data: { disputeId: dispute.id }
            }
        ];

        for (const notification of notifications) {
            await this.sendNotification(notification);
        }
    }

    /**
     * Notifier la résolution d'un litige
     */
    private async notifyDisputeResolved(dispute: EscrowDispute, resolution: string, action: string): Promise<void> {
        const notifications = [
            {
                userId: dispute.clientId,
                type: 'escrow_dispute_resolved',
                title: 'Litige résolu',
                message: `Votre litige a été résolu: ${resolution}`,
                data: { disputeId: dispute.id, action }
            },
            {
                userId: dispute.driverId,
                type: 'escrow_dispute_resolved',
                title: 'Litige résolu',
                message: `Votre litige a été résolu: ${resolution}`,
                data: { disputeId: dispute.id, action }
            }
        ];

        for (const notification of notifications) {
            await this.sendNotification(notification);
        }
    }

    /**
     * Envoyer une notification
     */
    private async sendNotification(notification: unknown): Promise<void> {
        try {
            await fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(notification)
            });
        } catch (error) {
            console.error('Erreur envoi notification:', error);
        }
    }

    /**
     * Gestionnaires d'événements WebSocket
     */
    private handleEscrowInitiated(data: unknown): void {
        console.log('🛡️ Escrow initié:', data.transactionId);
        window.dispatchEvent(new CustomEvent('escrowInitiated', { detail: data }));
    }

    private handleEscrowReleased(data: unknown): void {
        console.log('🛡️ Escrow libéré:', data.transactionId);
        window.dispatchEvent(new CustomEvent('escrowReleased', { detail: data }));
    }

    private handleEscrowRefunded(data: unknown): void {
        console.log('🛡️ Escrow remboursé:', data.transactionId);
        window.dispatchEvent(new CustomEvent('escrowRefunded', { detail: data }));
    }

    private handleEscrowDisputed(data: unknown): void {
        console.log('🛡️ Escrow en litige:', data.disputeId);
        window.dispatchEvent(new CustomEvent('escrowDisputed', { detail: data }));
    }

    /**
     * Obtenir les transactions actives
     */
    public getActiveTransactions(): EscrowTransaction[] {
        return Array.from(this.activeTransactions.values());
    }

    /**
     * Obtenir les factures actives
     */
    public getActiveInvoices(): EscrowInvoice[] {
        return Array.from(this.activeInvoices.values());
    }

    /**
     * Obtenir les litiges ouverts
     */
    public getOpenDisputes(): EscrowDispute[] {
        return Array.from(this.disputes.values()).filter(d => d.status === 'open');
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

export default EscrowService;
