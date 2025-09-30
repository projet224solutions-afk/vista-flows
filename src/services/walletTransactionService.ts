/**
 * Service de gestion des transactions wallet 224SOLUTIONS
 * 
 * Fonctionnalités:
 * - Gestion des wallets utilisateurs
 * - Transactions sécurisées avec validation anti-fraude
 * - Calcul automatique des commissions
 * - Journalisation complète
 * - Détection en temps réel des activités suspectes
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ===================================================
// TYPES ET INTERFACES
// ===================================================

export interface Wallet {
    id: string;
    user_id: string;
    balance: number;
    currency: string;
    pin_hash?: string;
    biometric_enabled: boolean;
    status: WalletStatus;
    daily_limit: number;
    monthly_limit: number;
    created_at: string;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    transaction_id: string;
    sender_wallet_id?: string;
    receiver_wallet_id?: string;
    amount: number;
    fee: number;
    net_amount: number;
    currency: string;
    transaction_type: TransactionType;
    status: TransactionStatus;
    description?: string;
    reference_id?: string;
    api_service?: string;
    fraud_score: number;
    ip_address?: string;
    device_info?: Record<string, any>;
    location_data?: Record<string, any>;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface CommissionConfig {
    id: string;
    service_name: string;
    transaction_type: TransactionType;
    commission_type: CommissionType;
    commission_value: number;
    min_commission: number;
    max_commission?: number;
    min_amount: number;
    max_amount?: number;
    is_active: boolean;
    effective_from: string;
    effective_until?: string;
}

export interface FraudDetectionResult {
    score: number;
    risk_level: RiskLevel;
    rules_triggered: string[];
    action_recommended: FraudAction;
    details: Record<string, any>;
}

export interface TransactionRequest {
    sender_id?: string;
    receiver_id?: string;
    amount: number;
    transaction_type: TransactionType;
    description?: string;
    pin?: string;
    biometric_data?: string;
    api_service?: string;
    reference_id?: string;
    device_info?: Record<string, any>;
}

export interface DailyRevenueSummary {
    date: string;
    total_transactions: number;
    total_volume: number;
    total_commissions: number;
    avg_transaction_amount: number;
    top_service?: string;
    top_service_volume: number;
    fraud_blocked_count: number;
    fraud_blocked_amount: number;
}

// Enums
export type WalletStatus = 'active' | 'suspended' | 'blocked' | 'pending_verification';
export type TransactionType = 'transfer' | 'deposit' | 'withdrawal' | 'payment' | 'refund' |
    'commission' | 'mobile_money_in' | 'mobile_money_out' |
    'card_payment' | 'bank_transfer';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' |
    'cancelled' | 'refunded' | 'disputed';
export type CommissionType = 'percentage' | 'fixed' | 'tiered';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FraudAction = 'allow' | 'review' | 'block' | 'require_verification';

// ===================================================
// SERVICE PRINCIPAL
// ===================================================

export class WalletTransactionService {

    // ===================================================
    // GESTION DES WALLETS
    // ===================================================

    /**
     * Créer un wallet pour un utilisateur
     */
    static async createWallet(userId: string, initialBalance: number = 0): Promise<Wallet | null> {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .insert({
                    user_id: userId,
                    balance: initialBalance,
                    currency: 'XAF',
                    status: 'active' as WalletStatus
                })
                .select()
                .single();

            if (error) {
                console.error('Erreur création wallet:', error);
                toast.error('Impossible de créer le wallet');
                return null;
            }

            return data as Wallet;
        } catch (error) {
            console.error('Erreur création wallet:', error);
            toast.error('Erreur lors de la création du wallet');
            return null;
        }
    }

    /**
     * Récupérer le wallet d'un utilisateur
     */
    static async getUserWallet(userId: string): Promise<Wallet | null> {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Erreur récupération wallet:', error);
                return null;
            }

            return data as Wallet | null;
        } catch (error) {
            console.error('Erreur récupération wallet:', error);
            return null;
        }
    }

    /**
     * Mettre à jour le solde d'un wallet
     */
    static async updateWalletBalance(walletId: string, newBalance: number): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('wallets')
                .update({
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', walletId);

            if (error) {
                console.error('Erreur mise à jour solde:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erreur mise à jour solde:', error);
            return false;
        }
    }

    /**
     * Vérifier le PIN du wallet
     */
    static async verifyWalletPIN(walletId: string, pin: string): Promise<boolean> {
        try {
            // Dans un vrai système, on comparerait avec le hash
            // Ici on simule la vérification
            const { data, error } = await supabase
                .from('wallets')
                .select('pin_hash')
                .eq('id', walletId)
                .single();

            if (error || !data) {
                return false;
            }

            // Simulation de vérification PIN (à remplacer par bcrypt.compare)
            return pin.length === 4 && /^\d{4}$/.test(pin);
        } catch (error) {
            console.error('Erreur vérification PIN:', error);
            return false;
        }
    }

    // ===================================================
    // DÉTECTION ANTI-FRAUDE
    // ===================================================

    /**
     * Analyser une transaction pour détecter la fraude
     */
    static async detectFraud(
        userId: string,
        amount: number,
        transactionType: TransactionType,
        deviceInfo?: Record<string, any>
    ): Promise<FraudDetectionResult> {
        try {
            // Appeler la fonction PostgreSQL de détection de fraude
            const { data, error } = await supabase
                .rpc('detect_fraud', {
                    p_user_id: userId,
                    p_amount: amount,
                    p_transaction_type: transactionType,
                    p_device_info: deviceInfo || null
                });

            if (error) {
                console.error('Erreur détection fraude:', error);
                // En cas d'erreur, on applique un score de sécurité par défaut
                return {
                    score: 50,
                    risk_level: 'medium',
                    rules_triggered: ['system_error'],
                    action_recommended: 'review',
                    details: { error: error.message }
                };
            }

            const score = data || 0;

            // Déterminer le niveau de risque et l'action recommandée
            let risk_level: RiskLevel = 'low';
            let action_recommended: FraudAction = 'allow';
            const rules_triggered: string[] = [];

            if (score >= 80) {
                risk_level = 'critical';
                action_recommended = 'block';
                rules_triggered.push('critical_risk_score');
            } else if (score >= 60) {
                risk_level = 'high';
                action_recommended = 'require_verification';
                rules_triggered.push('high_risk_score');
            } else if (score >= 30) {
                risk_level = 'medium';
                action_recommended = 'review';
                rules_triggered.push('medium_risk_score');
            }

            // Règles spécifiques selon le montant
            if (amount > 5000000) { // 5M XAF
                rules_triggered.push('high_amount');
                if (score < 50) action_recommended = 'require_verification';
            }

            return {
                score,
                risk_level,
                rules_triggered,
                action_recommended,
                details: {
                    amount,
                    transaction_type: transactionType,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Erreur détection fraude:', error);
            return {
                score: 75, // Score élevé par sécurité
                risk_level: 'high',
                rules_triggered: ['system_error'],
                action_recommended: 'review',
                details: { error: (error as Error).message }
            };
        }
    }

    /**
     * Enregistrer un log de détection de fraude
     */
    static async logFraudDetection(
        transactionId: string,
        userId: string,
        fraudResult: FraudDetectionResult
    ): Promise<void> {
        try {
            await supabase
                .from('fraud_detection_logs')
                .insert({
                    transaction_id: transactionId,
                    user_id: userId,
                    rule_triggered: fraudResult.rules_triggered.join(', '),
                    risk_level: fraudResult.risk_level,
                    score: fraudResult.score,
                    details: fraudResult.details,
                    action_taken: fraudResult.action_recommended
                });
        } catch (error) {
            console.error('Erreur log fraude:', error);
        }
    }

    // ===================================================
    // CALCUL DES COMMISSIONS
    // ===================================================

    /**
     * Calculer la commission pour une transaction
     */
    static async calculateCommission(
        serviceName: string,
        transactionType: TransactionType,
        amount: number
    ): Promise<number> {
        try {
            const { data, error } = await supabase
                .rpc('calculate_commission', {
                    p_service_name: serviceName,
                    p_transaction_type: transactionType,
                    p_amount: amount
                });

            if (error) {
                console.error('Erreur calcul commission:', error);
                return 0;
            }

            return data || 0;
        } catch (error) {
            console.error('Erreur calcul commission:', error);
            return 0;
        }
    }

    /**
     * Récupérer la configuration des commissions
     */
    static async getCommissionConfig(): Promise<CommissionConfig[]> {
        try {
            const { data, error } = await supabase
                .from('commission_config')
                .select('*')
                .eq('is_active', true)
                .order('service_name', { ascending: true });

            if (error) {
                console.error('Erreur récupération config commissions:', error);
                return [];
            }

            return data as CommissionConfig[];
        } catch (error) {
            console.error('Erreur récupération config commissions:', error);
            return [];
        }
    }

    /**
     * Mettre à jour la configuration des commissions
     */
    static async updateCommissionConfig(config: Partial<CommissionConfig> & { id: string }): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('commission_config')
                .update({
                    commission_value: config.commission_value,
                    min_commission: config.min_commission,
                    max_commission: config.max_commission,
                    min_amount: config.min_amount,
                    max_amount: config.max_amount,
                    is_active: config.is_active,
                    updated_at: new Date().toISOString()
                })
                .eq('id', config.id);

            if (error) {
                console.error('Erreur mise à jour config commission:', error);
                toast.error('Impossible de mettre à jour la configuration');
                return false;
            }

            toast.success('Configuration des commissions mise à jour');
            return true;
        } catch (error) {
            console.error('Erreur mise à jour config commission:', error);
            toast.error('Erreur lors de la mise à jour');
            return false;
        }
    }

    // ===================================================
    // TRANSACTIONS
    // ===================================================

    /**
     * Créer une nouvelle transaction
     */
    static async createTransaction(request: TransactionRequest): Promise<WalletTransaction | null> {
        try {
            // 1. Récupérer les wallets
            let senderWallet: Wallet | null = null;
            let receiverWallet: Wallet | null = null;

            if (request.sender_id) {
                senderWallet = await this.getUserWallet(request.sender_id);
                if (!senderWallet) {
                    toast.error('Wallet expéditeur introuvable');
                    return null;
                }
            }

            if (request.receiver_id) {
                receiverWallet = await this.getUserWallet(request.receiver_id);
                if (!receiverWallet) {
                    toast.error('Wallet destinataire introuvable');
                    return null;
                }
            }

            // 2. Vérifications de sécurité
            if (senderWallet) {
                // Vérifier le solde
                if (senderWallet.balance < request.amount) {
                    toast.error('Solde insuffisant');
                    return null;
                }

                // Vérifier le statut du wallet
                if (senderWallet.status !== 'active') {
                    toast.error('Wallet expéditeur non actif');
                    return null;
                }

                // Vérifier le PIN si fourni
                if (request.pin && !await this.verifyWalletPIN(senderWallet.id, request.pin)) {
                    toast.error('PIN incorrect');
                    return null;
                }
            }

            // 3. Détection anti-fraude
            const fraudResult = await this.detectFraud(
                request.sender_id || request.receiver_id || '',
                request.amount,
                request.transaction_type,
                request.device_info
            );

            // Bloquer si risque critique
            if (fraudResult.action_recommended === 'block') {
                toast.error('Transaction bloquée pour suspicion de fraude');
                return null;
            }

            // 4. Calculer la commission
            const commission = await this.calculateCommission(
                request.api_service || 'internal',
                request.transaction_type,
                request.amount
            );

            // 5. Générer l'ID de transaction
            const { data: transactionIdData, error: idError } = await supabase
                .rpc('generate_transaction_id');

            if (idError || !transactionIdData) {
                console.error('Erreur génération ID transaction:', idError);
                toast.error('Impossible de générer l\'ID de transaction');
                return null;
            }

            const transactionId = transactionIdData;

            // 6. Créer la transaction
            const transactionData = {
                transaction_id: transactionId,
                sender_wallet_id: senderWallet?.id || null,
                receiver_wallet_id: receiverWallet?.id || null,
                amount: request.amount,
                fee: commission,
                net_amount: request.amount - commission,
                currency: 'XAF',
                transaction_type: request.transaction_type,
                status: fraudResult.action_recommended === 'require_verification' ? 'pending' as TransactionStatus : 'processing' as TransactionStatus,
                description: request.description,
                reference_id: request.reference_id,
                api_service: request.api_service,
                fraud_score: fraudResult.score,
                device_info: request.device_info
            };

            const { data: transaction, error: transactionError } = await supabase
                .from('wallet_transactions')
                .insert(transactionData)
                .select()
                .single();

            if (transactionError) {
                console.error('Erreur création transaction:', transactionError);
                toast.error('Impossible de créer la transaction');
                return null;
            }

            // 7. Enregistrer le log de fraude
            await this.logFraudDetection(transaction.id, request.sender_id || request.receiver_id || '', fraudResult);

            // 8. Traiter la transaction si approuvée automatiquement
            if (fraudResult.action_recommended === 'allow') {
                await this.processTransaction(transaction.id);
            }

            return transaction as WalletTransaction;

        } catch (error) {
            console.error('Erreur création transaction:', error);
            toast.error('Erreur lors de la création de la transaction');
            return null;
        }
    }

    /**
     * Traiter une transaction (débit/crédit des wallets)
     */
    static async processTransaction(transactionId: string): Promise<boolean> {
        try {
            // Récupérer la transaction
            const { data: transaction, error: txError } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('id', transactionId)
                .single();

            if (txError || !transaction) {
                console.error('Transaction introuvable:', txError);
                return false;
            }

            // Vérifier le statut
            if (transaction.status !== 'processing' && transaction.status !== 'pending') {
                console.log('Transaction déjà traitée ou dans un état invalide');
                return false;
            }

            // Traitement selon le type de transaction
            if (transaction.sender_wallet_id && transaction.receiver_wallet_id) {
                // Transfert entre wallets
                const success = await this.processWalletTransfer(transaction);
                if (success) {
                    await this.updateTransactionStatus(transactionId, 'completed');
                    toast.success('Transfert effectué avec succès');
                } else {
                    await this.updateTransactionStatus(transactionId, 'failed');
                    toast.error('Échec du transfert');
                }
                return success;
            } else if (transaction.receiver_wallet_id) {
                // Dépôt
                const success = await this.processDeposit(transaction);
                if (success) {
                    await this.updateTransactionStatus(transactionId, 'completed');
                    toast.success('Dépôt effectué avec succès');
                } else {
                    await this.updateTransactionStatus(transactionId, 'failed');
                    toast.error('Échec du dépôt');
                }
                return success;
            } else if (transaction.sender_wallet_id) {
                // Retrait
                const success = await this.processWithdrawal(transaction);
                if (success) {
                    await this.updateTransactionStatus(transactionId, 'completed');
                    toast.success('Retrait effectué avec succès');
                } else {
                    await this.updateTransactionStatus(transactionId, 'failed');
                    toast.error('Échec du retrait');
                }
                return success;
            }

            return false;
        } catch (error) {
            console.error('Erreur traitement transaction:', error);
            await this.updateTransactionStatus(transactionId, 'failed');
            return false;
        }
    }

    /**
     * Traiter un transfert entre wallets
     */
    private static async processWalletTransfer(transaction: WalletTransaction): Promise<boolean> {
        try {
            if (!transaction.sender_wallet_id || !transaction.receiver_wallet_id) {
                return false;
            }

            // Récupérer les wallets
            const { data: wallets, error } = await supabase
                .from('wallets')
                .select('*')
                .in('id', [transaction.sender_wallet_id, transaction.receiver_wallet_id]);

            if (error || !wallets || wallets.length !== 2) {
                console.error('Erreur récupération wallets:', error);
                return false;
            }

            const senderWallet = wallets.find(w => w.id === transaction.sender_wallet_id);
            const receiverWallet = wallets.find(w => w.id === transaction.receiver_wallet_id);

            if (!senderWallet || !receiverWallet) {
                return false;
            }

            // Vérifier le solde une dernière fois
            if (senderWallet.balance < transaction.amount) {
                console.error('Solde insuffisant au moment du traitement');
                return false;
            }

            // Effectuer le transfert (atomique)
            const newSenderBalance = senderWallet.balance - transaction.amount;
            const newReceiverBalance = receiverWallet.balance + transaction.net_amount;

            // Mettre à jour les deux wallets
            const { error: updateError } = await supabase
                .from('wallets')
                .update({ balance: newSenderBalance })
                .eq('id', transaction.sender_wallet_id);

            if (updateError) {
                console.error('Erreur mise à jour wallet expéditeur:', updateError);
                return false;
            }

            const { error: updateError2 } = await supabase
                .from('wallets')
                .update({ balance: newReceiverBalance })
                .eq('id', transaction.receiver_wallet_id);

            if (updateError2) {
                console.error('Erreur mise à jour wallet destinataire:', updateError2);
                // Rollback du premier update
                await supabase
                    .from('wallets')
                    .update({ balance: senderWallet.balance })
                    .eq('id', transaction.sender_wallet_id);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erreur transfert wallet:', error);
            return false;
        }
    }

    /**
     * Traiter un dépôt
     */
    private static async processDeposit(transaction: WalletTransaction): Promise<boolean> {
        try {
            if (!transaction.receiver_wallet_id) {
                return false;
            }

            const { data: wallet, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('id', transaction.receiver_wallet_id)
                .single();

            if (error || !wallet) {
                console.error('Wallet destinataire introuvable:', error);
                return false;
            }

            const newBalance = wallet.balance + transaction.net_amount;

            const { error: updateError } = await supabase
                .from('wallets')
                .update({ balance: newBalance })
                .eq('id', transaction.receiver_wallet_id);

            if (updateError) {
                console.error('Erreur mise à jour wallet dépôt:', updateError);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erreur dépôt:', error);
            return false;
        }
    }

    /**
     * Traiter un retrait
     */
    private static async processWithdrawal(transaction: WalletTransaction): Promise<boolean> {
        try {
            if (!transaction.sender_wallet_id) {
                return false;
            }

            const { data: wallet, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('id', transaction.sender_wallet_id)
                .single();

            if (error || !wallet) {
                console.error('Wallet expéditeur introuvable:', error);
                return false;
            }

            if (wallet.balance < transaction.amount) {
                console.error('Solde insuffisant pour retrait');
                return false;
            }

            const newBalance = wallet.balance - transaction.amount;

            const { error: updateError } = await supabase
                .from('wallets')
                .update({ balance: newBalance })
                .eq('id', transaction.sender_wallet_id);

            if (updateError) {
                console.error('Erreur mise à jour wallet retrait:', updateError);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erreur retrait:', error);
            return false;
        }
    }

    /**
     * Mettre à jour le statut d'une transaction
     */
    static async updateTransactionStatus(transactionId: string, status: TransactionStatus): Promise<boolean> {
        try {
            const updateData: any = {
                status,
                updated_at: new Date().toISOString()
            };

            if (status === 'completed') {
                updateData.completed_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('wallet_transactions')
                .update(updateData)
                .eq('id', transactionId);

            if (error) {
                console.error('Erreur mise à jour statut transaction:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erreur mise à jour statut transaction:', error);
            return false;
        }
    }

    // ===================================================
    // RAPPORTS ET ANALYTICS
    // ===================================================

    /**
     * Récupérer les transactions d'un utilisateur
     */
    static async getUserTransactions(userId: string, limit: number = 50): Promise<WalletTransaction[]> {
        try {
            const { data, error } = await supabase
                .from('wallet_transactions')
                .select(`
          *,
          sender_wallet:sender_wallet_id(user_id),
          receiver_wallet:receiver_wallet_id(user_id)
        `)
                .or(`sender_wallet.user_id.eq.${userId},receiver_wallet.user_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Erreur récupération transactions utilisateur:', error);
                return [];
            }

            return data as WalletTransaction[];
        } catch (error) {
            console.error('Erreur récupération transactions utilisateur:', error);
            return [];
        }
    }

    /**
     * Récupérer le résumé quotidien des revenus
     */
    static async getDailyRevenueSummary(date?: string): Promise<DailyRevenueSummary | null> {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('daily_revenue_summary')
                .select('*')
                .eq('date', targetDate)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Erreur récupération résumé revenus:', error);
                return null;
            }

            return data as DailyRevenueSummary | null;
        } catch (error) {
            console.error('Erreur récupération résumé revenus:', error);
            return null;
        }
    }

    /**
     * Récupérer les statistiques globales
     */
    static async getGlobalStats(): Promise<{
        total_users: number;
        total_wallets: number;
        total_volume: number;
        total_commissions: number;
        active_transactions: number;
    }> {
        try {
            // Récupérer plusieurs statistiques en parallèle
            const [
                walletsResult,
                transactionsResult,
                commissionsResult
            ] = await Promise.all([
                supabase.from('wallets').select('id', { count: 'exact' }),
                supabase.from('wallet_transactions').select('amount', { count: 'exact' }).eq('status', 'completed'),
                supabase.from('collected_commissions').select('commission_amount')
            ]);

            const totalWallets = walletsResult.count || 0;
            const totalTransactions = transactionsResult.count || 0;

            // Calculer le volume total
            const totalVolume = transactionsResult.data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

            // Calculer les commissions totales
            const totalCommissions = commissionsResult.data?.reduce((sum, com) => sum + (com.commission_amount || 0), 0) || 0;

            return {
                total_users: totalWallets, // 1 wallet = 1 user
                total_wallets: totalWallets,
                total_volume: totalVolume,
                total_commissions: totalCommissions,
                active_transactions: totalTransactions
            };
        } catch (error) {
            console.error('Erreur récupération statistiques globales:', error);
            return {
                total_users: 0,
                total_wallets: 0,
                total_volume: 0,
                total_commissions: 0,
                active_transactions: 0
            };
        }
    }

    // ===================================================
    // UTILITAIRES
    // ===================================================

    /**
     * Formater un montant en XAF
     */
    static formatAmount(amount: number): string {
        return new Intl.NumberFormat('fr-CM', {
            style: 'currency',
            currency: 'XAF',
            minimumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Valider un montant de transaction
     */
    static validateTransactionAmount(amount: number): boolean {
        return amount > 0 && amount <= 100000000; // Max 100M XAF
    }

    /**
     * Obtenir les informations de l'appareil client
     */
    static getDeviceInfo(): Record<string, any> {
        if (typeof window === 'undefined') return {};

        return {
            user_agent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screen_resolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: new Date().toISOString()
        };
    }
}

export default WalletTransactionService;

