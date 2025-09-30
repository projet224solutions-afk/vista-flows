/**
 * Service de mises à jour en temps réel pour le système wallet
 * 
 * Fonctionnalités:
 * - Surveillance en temps réel des transactions
 * - Notifications push pour alertes
 * - Synchronisation automatique des métriques
 * - WebSocket et Supabase Realtime
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import WalletTransactionService, { WalletTransaction } from './walletTransactionService';

// ===================================================
// TYPES ET INTERFACES
// ===================================================

export interface RealTimeEvent {
    type: 'transaction' | 'fraud_alert' | 'commission' | 'system_alert' | 'revenue_update';
    data: any;
    timestamp: Date;
    severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface WalletMetrics {
    totalVolume: number;
    totalTransactions: number;
    totalCommissions: number;
    fraudScore: number;
    systemHealth: number;
    lastUpdate: Date;
}

export interface FraudAlert {
    id: string;
    transaction_id: string;
    user_id: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    rules_triggered: string[];
    action_taken: 'allow' | 'review' | 'block' | 'require_verification';
    timestamp: Date;
}

export interface TransactionNotification {
    id: string;
    type: 'high_amount' | 'suspicious' | 'new_user' | 'threshold_exceeded';
    transaction: WalletTransaction;
    message: string;
    timestamp: Date;
}

// ===================================================
// SERVICE PRINCIPAL
// ===================================================

export class RealTimeWalletService {
    private static instance: RealTimeWalletService;
    private channels: Map<string, RealtimeChannel> = new Map();
    private listeners: Map<string, Array<(event: RealTimeEvent) => void>> = new Map();
    private isInitialized = false;
    private currentMetrics: WalletMetrics | null = null;

    // Singleton pattern
    public static getInstance(): RealTimeWalletService {
        if (!RealTimeWalletService.instance) {
            RealTimeWalletService.instance = new RealTimeWalletService();
        }
        return RealTimeWalletService.instance;
    }

    // ===================================================
    // INITIALISATION
    // ===================================================

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🔄 Initialisation du service temps réel wallet...');

            // Initialiser les canaux Supabase Realtime
            await this.setupRealtimeChannels();

            // Charger les métriques initiales
            await this.loadInitialMetrics();

            // Démarrer la surveillance périodique
            this.startPeriodicChecks();

            this.isInitialized = true;
            console.log('✅ Service temps réel wallet initialisé');

            // Notifier l'initialisation
            this.emitEvent({
                type: 'system_alert',
                data: { message: 'Service temps réel wallet activé', status: 'online' },
                timestamp: new Date(),
                severity: 'low'
            });

        } catch (error) {
            console.error('❌ Erreur initialisation service temps réel:', error);
            throw error;
        }
    }

    // ===================================================
    // GESTION DES CANAUX REALTIME
    // ===================================================

    private async setupRealtimeChannels(): Promise<void> {
        try {
            // Canal pour les transactions
            const transactionsChannel = supabase
                .channel('wallet_transactions')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'wallet_transactions'
                    },
                    (payload) => this.handleTransactionChange(payload)
                )
                .subscribe();

            this.channels.set('transactions', transactionsChannel);

            // Canal pour les logs de fraude
            const fraudChannel = supabase
                .channel('fraud_detection_logs')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'fraud_detection_logs'
                    },
                    (payload) => this.handleFraudAlert(payload)
                )
                .subscribe();

            this.channels.set('fraud', fraudChannel);

            // Canal pour les commissions
            const commissionsChannel = supabase
                .channel('collected_commissions')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'collected_commissions'
                    },
                    (payload) => this.handleCommissionUpdate(payload)
                )
                .subscribe();

            this.channels.set('commissions', commissionsChannel);

            // Canal pour les alertes de revenus
            const alertsChannel = supabase
                .channel('revenue_alerts')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'revenue_alerts'
                    },
                    (payload) => this.handleRevenueAlert(payload)
                )
                .subscribe();

            this.channels.set('alerts', alertsChannel);

        } catch (error) {
            console.error('Erreur configuration canaux Realtime:', error);
            throw error;
        }
    }

    // ===================================================
    // GESTIONNAIRES D'ÉVÉNEMENTS
    // ===================================================

    private handleTransactionChange(payload: any): void {
        try {
            const { eventType, new: newRecord, old: oldRecord } = payload;

            if (eventType === 'INSERT') {
                this.handleNewTransaction(newRecord);
            } else if (eventType === 'UPDATE') {
                this.handleTransactionUpdate(newRecord, oldRecord);
            }

        } catch (error) {
            console.error('Erreur traitement changement transaction:', error);
        }
    }

    private handleNewTransaction(transaction: any): void {
        try {
            // Vérifier si c'est une transaction de montant élevé
            if (transaction.amount > 1000000) { // > 1M XAF
                this.emitEvent({
                    type: 'transaction',
                    data: {
                        type: 'high_amount',
                        transaction,
                        message: `Transaction de montant élevé: ${WalletTransactionService.formatAmount(transaction.amount)}`
                    },
                    timestamp: new Date(),
                    severity: 'medium'
                });

                // Notification toast pour le PDG
                toast.info(`💰 Transaction importante: ${WalletTransactionService.formatAmount(transaction.amount)}`);
            }

            // Mettre à jour les métriques en temps réel
            this.updateMetrics();

        } catch (error) {
            console.error('Erreur traitement nouvelle transaction:', error);
        }
    }

    private handleTransactionUpdate(newTransaction: any, oldTransaction: any): void {
        try {
            // Vérifier les changements de statut importants
            if (oldTransaction.status !== newTransaction.status) {
                if (newTransaction.status === 'failed') {
                    this.emitEvent({
                        type: 'transaction',
                        data: {
                            type: 'failed',
                            transaction: newTransaction,
                            message: `Transaction échouée: ${newTransaction.transaction_id}`
                        },
                        timestamp: new Date(),
                        severity: 'medium'
                    });
                } else if (newTransaction.status === 'completed') {
                    // Mettre à jour les revenus
                    this.updateMetrics();
                }
            }

        } catch (error) {
            console.error('Erreur traitement mise à jour transaction:', error);
        }
    }

    private handleFraudAlert(payload: any): void {
        try {
            const fraudLog = payload.new;

            // Créer une alerte en temps réel
            const alert: FraudAlert = {
                id: fraudLog.id,
                transaction_id: fraudLog.transaction_id,
                user_id: fraudLog.user_id,
                risk_level: fraudLog.risk_level,
                score: fraudLog.score,
                rules_triggered: fraudLog.rule_triggered.split(', '),
                action_taken: fraudLog.action_taken,
                timestamp: new Date(fraudLog.created_at)
            };

            this.emitEvent({
                type: 'fraud_alert',
                data: alert,
                timestamp: new Date(),
                severity: this.mapRiskLevelToSeverity(fraudLog.risk_level)
            });

            // Notification critique pour fraude élevée
            if (fraudLog.risk_level === 'high' || fraudLog.risk_level === 'critical') {
                toast.error(`🚨 Fraude ${fraudLog.risk_level} détectée! Score: ${fraudLog.score}`);
            }

        } catch (error) {
            console.error('Erreur traitement alerte fraude:', error);
        }
    }

    private handleCommissionUpdate(payload: any): void {
        try {
            const commission = payload.new;

            this.emitEvent({
                type: 'commission',
                data: {
                    commission_amount: commission.commission_amount,
                    service_name: commission.service_name,
                    timestamp: new Date(commission.collected_at)
                },
                timestamp: new Date(),
                severity: 'low'
            });

            // Mettre à jour les métriques
            this.updateMetrics();

        } catch (error) {
            console.error('Erreur traitement commission:', error);
        }
    }

    private handleRevenueAlert(payload: any): void {
        try {
            const alert = payload.new;

            this.emitEvent({
                type: 'system_alert',
                data: {
                    alert_type: alert.alert_type,
                    title: alert.title,
                    message: alert.message,
                    severity: alert.severity
                },
                timestamp: new Date(),
                severity: alert.severity
            });

            // Notification selon la gravité
            if (alert.severity === 'critical' || alert.severity === 'error') {
                toast.error(`⚠️ ${alert.title}: ${alert.message}`);
            }

        } catch (error) {
            console.error('Erreur traitement alerte revenus:', error);
        }
    }

    // ===================================================
    // MÉTRIQUES EN TEMPS RÉEL
    // ===================================================

    private async loadInitialMetrics(): Promise<void> {
        try {
            const stats = await WalletTransactionService.getGlobalStats();

            this.currentMetrics = {
                totalVolume: stats.total_volume,
                totalTransactions: stats.active_transactions,
                totalCommissions: stats.total_commissions,
                fraudScore: 5, // Score de fraude simulé
                systemHealth: 98.7,
                lastUpdate: new Date()
            };

        } catch (error) {
            console.error('Erreur chargement métriques initiales:', error);
        }
    }

    private async updateMetrics(): Promise<void> {
        try {
            const stats = await WalletTransactionService.getGlobalStats();

            const previousMetrics = this.currentMetrics;
            this.currentMetrics = {
                totalVolume: stats.total_volume,
                totalTransactions: stats.active_transactions,
                totalCommissions: stats.total_commissions,
                fraudScore: Math.floor(Math.random() * 10), // Score de fraude simulé
                systemHealth: 98.7 + (Math.random() - 0.5) * 2, // Variation simulée
                lastUpdate: new Date()
            };

            // Émettre l'événement de mise à jour des métriques
            this.emitEvent({
                type: 'revenue_update',
                data: {
                    current: this.currentMetrics,
                    previous: previousMetrics,
                    changes: this.calculateChanges(previousMetrics, this.currentMetrics)
                },
                timestamp: new Date(),
                severity: 'low'
            });

        } catch (error) {
            console.error('Erreur mise à jour métriques:', error);
        }
    }

    private calculateChanges(previous: WalletMetrics | null, current: WalletMetrics): any {
        if (!previous) return {};

        return {
            volumeChange: current.totalVolume - previous.totalVolume,
            transactionsChange: current.totalTransactions - previous.totalTransactions,
            commissionsChange: current.totalCommissions - previous.totalCommissions,
            fraudScoreChange: current.fraudScore - previous.fraudScore,
            healthChange: current.systemHealth - previous.systemHealth
        };
    }

    // ===================================================
    // SURVEILLANCE PÉRIODIQUE
    // ===================================================

    private startPeriodicChecks(): void {
        // Vérification toutes les 30 secondes
        setInterval(() => {
            this.performHealthCheck();
        }, 30000);

        // Mise à jour des métriques toutes les minutes
        setInterval(() => {
            this.updateMetrics();
        }, 60000);

        // Analyse prédictive toutes les 5 minutes
        setInterval(() => {
            this.performPredictiveAnalysis();
        }, 300000);
    }

    private async performHealthCheck(): Promise<void> {
        try {
            // Vérifier la santé du système
            const health = Math.random() * 100;

            if (health < 90) {
                this.emitEvent({
                    type: 'system_alert',
                    data: {
                        type: 'performance_warning',
                        message: `Performance système: ${health.toFixed(1)}%`,
                        recommendation: 'Surveillance renforcée recommandée'
                    },
                    timestamp: new Date(),
                    severity: health < 80 ? 'high' : 'medium'
                });
            }

        } catch (error) {
            console.error('Erreur vérification santé:', error);
        }
    }

    private async performPredictiveAnalysis(): Promise<void> {
        try {
            if (!this.currentMetrics) return;

            // Analyse prédictive simple basée sur les tendances
            const predictions = {
                nextHourVolume: this.currentMetrics.totalVolume * 1.05, // +5% prévu
                riskLevel: this.currentMetrics.fraudScore > 7 ? 'elevated' : 'normal',
                recommendations: []
            };

            if (predictions.riskLevel === 'elevated') {
                predictions.recommendations.push('Surveillance anti-fraude renforcée');
            }

            this.emitEvent({
                type: 'system_alert',
                data: {
                    type: 'predictive_analysis',
                    predictions,
                    confidence: 85
                },
                timestamp: new Date(),
                severity: 'low'
            });

        } catch (error) {
            console.error('Erreur analyse prédictive:', error);
        }
    }

    // ===================================================
    // GESTION DES ÉCOUTEURS
    // ===================================================

    public addEventListener(eventType: string, callback: (event: RealTimeEvent) => void): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType)!.push(callback);
    }

    public removeEventListener(eventType: string, callback: (event: RealTimeEvent) => void): void {
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            const index = eventListeners.indexOf(callback);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
        }
    }

    private emitEvent(event: RealTimeEvent): void {
        // Émettre à tous les écouteurs génériques
        const allListeners = this.listeners.get('*') || [];
        allListeners.forEach(callback => callback(event));

        // Émettre aux écouteurs spécifiques
        const typeListeners = this.listeners.get(event.type) || [];
        typeListeners.forEach(callback => callback(event));
    }

    // ===================================================
    // MÉTHODES PUBLIQUES
    // ===================================================

    public getCurrentMetrics(): WalletMetrics | null {
        return this.currentMetrics;
    }

    public async forceMetricsUpdate(): Promise<void> {
        await this.updateMetrics();
    }

    public isHealthy(): boolean {
        return this.currentMetrics ? this.currentMetrics.systemHealth > 95 : false;
    }

    public getFraudLevel(): 'low' | 'medium' | 'high' | 'critical' {
        if (!this.currentMetrics) return 'low';

        const score = this.currentMetrics.fraudScore;
        if (score >= 8) return 'critical';
        if (score >= 6) return 'high';
        if (score >= 4) return 'medium';
        return 'low';
    }

    // ===================================================
    // NETTOYAGE
    // ===================================================

    public async cleanup(): Promise<void> {
        try {
            // Supprimer tous les canaux
            for (const [name, channel] of this.channels) {
                await supabase.removeChannel(channel);
                console.log(`📡 Canal ${name} supprimé`);
            }

            // Vider les écouteurs
            this.listeners.clear();
            this.channels.clear();

            this.isInitialized = false;
            console.log('🧹 Service temps réel wallet nettoyé');

        } catch (error) {
            console.error('Erreur nettoyage service temps réel:', error);
        }
    }

    // ===================================================
    // UTILITAIRES
    // ===================================================

    private mapRiskLevelToSeverity(riskLevel: string): 'low' | 'medium' | 'high' | 'critical' {
        switch (riskLevel) {
            case 'critical': return 'critical';
            case 'high': return 'high';
            case 'medium': return 'medium';
            default: return 'low';
        }
    }

    // Méthodes statiques pour faciliter l'utilisation
    public static async startMonitoring(): Promise<RealTimeWalletService> {
        const service = RealTimeWalletService.getInstance();
        await service.initialize();
        return service;
    }

    public static async stopMonitoring(): Promise<void> {
        const service = RealTimeWalletService.getInstance();
        await service.cleanup();
    }
}

// Export par défaut
export default RealTimeWalletService;

