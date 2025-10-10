/**
 * 💰 SERVICE WALLET COMPLET - 224SOLUTIONS
 * Gestion complète des wallets avec commissions automatiques
 */

const { createClient } = require('@supabase/supabase-js');
const firebaseService = require('./firebase.service.cjs');
const { commissionConfig, paymentMethods } = require('../config/firebase.config');

class WalletService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    /**
     * 🏦 GESTION DES WALLETS
     */

    /**
     * Crée un wallet pour un nouvel utilisateur
     */
    async createWallet(userId, initialBalance = 1000) {
        try {
            console.log('💰 Création wallet pour utilisateur:', userId);

            // Utiliser la fonction Supabase pour créer le wallet
            const { data, error } = await this.supabase
                .rpc('create_user_wallet', {
                    p_user_id: userId,
                    p_initial_balance: initialBalance
                });

            if (error) {
                throw error;
            }

            console.log('✅ Wallet créé avec ID:', data);

            // Envoyer notification de bienvenue
            const user = await this.getUserById(userId);
            if (user && user.fcm_token) {
                await firebaseService.sendRegistrationSuccessNotification(
                    user.fcm_token,
                    `${user.first_name} ${user.last_name}`
                );
            }

            return {
                success: true,
                walletId: data,
                initialBalance
            };
        } catch (error) {
            console.error('❌ Erreur création wallet:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtient les informations d'un wallet
     */
    async getWallet(userId) {
        try {
            const { data, error } = await this.supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                throw error;
            }

            return { success: true, wallet: data };
        } catch (error) {
            console.error('❌ Erreur récupération wallet:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Met à jour le solde d'un wallet
     */
    async updateWalletBalance(walletId, newBalance) {
        try {
            const { data, error } = await this.supabase
                .from('wallets')
                .update({ 
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', walletId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return { success: true, wallet: data };
        } catch (error) {
            console.error('❌ Erreur mise à jour solde:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 💸 TRANSACTIONS AVEC COMMISSIONS
     */

    /**
     * Effectue un transfert entre wallets avec commission 1.5%
     */
    async transferMoney(senderId, receiverId, amount, description = null) {
        try {
            console.log('💸 Transfert:', senderId, '→', receiverId, amount);

            // Vérifier les utilisateurs
            const sender = await this.getUserById(senderId);
            const receiver = await this.getUserById(receiverId);

            if (!sender || !receiver) {
                throw new Error('Utilisateur expéditeur ou destinataire non trouvé');
            }

            // Valider le montant
            if (!this.validateAmount(amount, 'transfer')) {
                throw new Error('Montant invalide');
            }

            // Utiliser la fonction SQL existante pour traiter la transaction
            const { data: result, error } = await this.supabase
                .rpc('process_transaction', {
                    p_from_user_id: senderId,
                    p_to_user_id: receiverId,
                    p_amount: amount,
                    p_transaction_type: 'transfer',
                    p_description: description
                });

            if (error) {
                throw error;
            }
            if (result?.error) {
                throw new Error(result.error);
            }

            const transactionId = result?.transaction_id;

            // Envoyer notifications
            await this.notifyUserTransaction(senderId, {
                id: transactionId,
                amount,
                currency: 'GNF',
                type: 'transfer',
                recipientName: receiver ? `${receiver.prenom || ''} ${receiver.nom || ''}`.trim() : undefined
            });

            await this.notifyUserTransaction(receiverId, {
                id: transactionId,
                amount,
                currency: 'GNF',
                type: 'received',
                senderName: sender ? `${sender.prenom || ''} ${sender.nom || ''}`.trim() : undefined
            });

            console.log('✅ Transfert réussi, transaction ID:', transactionId);

            return {
                success: true,
                transactionId,
                amount
            };
        } catch (error) {
            console.error('❌ Erreur transfert:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Effectue un retrait avec frais fixes (1000 GNF + commission API)
     */
    async withdrawMoney(userId, amount, paymentMethod, paymentDetails) {
        try {
            console.log('💰 Retrait:', userId, amount, paymentMethod);

            // Vérifier l'utilisateur et wallet
            const user = await this.getUserById(userId);
            if (!user) throw new Error('Utilisateur non trouvé');
            const userWallet = await this.getWallet(userId);
            if (!userWallet.success) throw new Error('Wallet non trouvé');

            // Valider montant
            if (!this.validateAmount(amount, 'withdrawal')) throw new Error('Montant invalide');

            // Frais: fixe + pourcentage simple
            const fixedFee = 1000; // GNF
            const percentFee = Math.round(amount * commissionConfig.transferCommission);
            const totalFees = fixedFee + percentFee;
            const netAmount = amount - totalFees;

            if (userWallet.wallet.balance < amount) throw new Error('Solde insuffisant');

            // Insérer transaction pending
            const txPublicId = `WDR_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

            const { data: tx, error: txError } = await this.supabase
                .from('wallet_transactions')
                .insert({
                    transaction_id: txPublicId,
                    transaction_type: 'withdrawal',
                    amount: amount,
                    net_amount: netAmount,
                    fee: totalFees,
                    currency: 'GNF',
                    description: `Retrait via ${paymentMethod}`,
                    sender_wallet_id: userWallet.wallet.id,
                    status: 'pending'
                })
                .select()
                .single();
            if (txError) throw txError;

            // Débiter immédiatement le wallet
            const { error: debitError } = await this.supabase
                .from('wallets')
                .update({ balance: userWallet.wallet.balance - amount, updated_at: new Date().toISOString() })
                .eq('id', userWallet.wallet.id);
            if (debitError) throw debitError;

            // Traiter le retrait externe (simulé) puis mise à jour du statut
            const withdrawalResult = await this.processExternalWithdrawal(paymentMethod, netAmount, paymentDetails, tx.id);

            const { error: statusUpdateError } = await this.supabase
                .from('wallet_transactions')
                .update({ status: withdrawalResult.success ? 'completed' : 'failed', completed_at: new Date().toISOString() })
                .eq('id', tx.id);
            if (statusUpdateError) throw statusUpdateError;

            // En cas d'échec, rembourser le débit
            if (!withdrawalResult.success) {
                await this.supabase
                    .from('wallets')
                    .update({ balance: userWallet.wallet.balance, updated_at: new Date().toISOString() })
                    .eq('id', userWallet.wallet.id);
            }

            // Notifications
            await this.notifyUserWithdrawal(userId, {
                id: tx.id,
                amount,
                currency: 'GNF',
                method: paymentMethod,
                success: !!withdrawalResult.success,
                reason: withdrawalResult.success ? undefined : withdrawalResult.error
            });

            console.log('✅ Retrait traité, transaction ID:', tx.id);
            return { success: withdrawalResult.success, transactionId: txPublicId, amount, fees: totalFees, netAmount };
        } catch (error) {
            console.error('❌ Erreur retrait:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Effectue un dépôt sur un wallet
     */
    async depositMoney(userId, amount, paymentMethod, reference) {
        try {
            console.log('💳 Dépôt:', userId, amount, paymentMethod);

            if (!this.validateAmount(amount, 'deposit')) {
                throw new Error('Montant invalide');
            }

            // Récupérer le wallet utilisateur
            const wallet = await this.getWallet(userId);
            if (!wallet.success) {
                throw new Error('Wallet non trouvé');
            }

            // Générer un transaction_id lisible
            const txPublicId = `DEP_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

            // Insérer la transaction de dépôt
            const { data: tx, error: txError } = await this.supabase
                .from('wallet_transactions')
                .insert({
                    transaction_id: txPublicId,
                    transaction_type: 'deposit',
                    amount: amount,
                    net_amount: amount,
                    fee: 0,
                    currency: 'GNF',
                    description: `Dépôt via ${paymentMethod}${reference ? ' - ' + reference : ''}`,
                    receiver_wallet_id: wallet.wallet.id,
                    status: 'completed'
                })
                .select()
                .single();
            if (txError) throw txError;

            // Créditer le wallet
            const { error: creditError } = await this.supabase
                .from('wallets')
                .update({ balance: wallet.wallet.balance + amount, updated_at: new Date().toISOString() })
                .eq('id', wallet.wallet.id);
            if (creditError) throw creditError;

            // Notification
            await this.notifyUserTransaction(userId, {
                id: tx.id,
                amount,
                currency: 'GNF',
                type: 'deposit'
            });

            console.log('✅ Dépôt réussi, transaction ID:', tx.id);

            return {
                success: true,
                transactionId: txPublicId,
                amount
            };
        } catch (error) {
            console.error('❌ Erreur dépôt:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🌐 INTÉGRATIONS APIS EXTERNES
     */

    /**
     * Traite un retrait via une API externe
     */
    async processExternalWithdrawal(paymentMethod, amount, paymentDetails, transactionId) {
        try {
            switch (paymentMethod) {
                case paymentMethods.PAYPAL:
                    return await this.processPayPalWithdrawal(amount, paymentDetails, transactionId);
                
                case paymentMethods.STRIPE:
                    return await this.processStripeWithdrawal(amount, paymentDetails, transactionId);
                
                case paymentMethods.MOBILE_MONEY:
                    return await this.processMobileMoneyWithdrawal(amount, paymentDetails, transactionId);
                
                case paymentMethods.BANK_CARD:
                    return await this.processBankCardWithdrawal(amount, paymentDetails, transactionId);
                
                default:
                    throw new Error('Méthode de paiement non supportée');
            }
        } catch (error) {
            console.error('❌ Erreur traitement retrait externe:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Traite un retrait PayPal
     */
    async processPayPalWithdrawal(amount, paymentDetails, transactionId) {
        try {
            // Intégration PayPal API
            // Cette fonction devrait utiliser l'API PayPal pour effectuer le paiement
            console.log('💰 Traitement retrait PayPal:', amount, paymentDetails.email);
            
            // Simulation pour la démo
            const success = Math.random() > 0.1; // 90% de succès
            
            if (success) {
                // Mettre à jour la transaction avec la référence PayPal
                await this.supabase
                    .from('wallet_transactions')
                    .update({
                        reference_id: `PP_${Date.now()}`,
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', transactionId);
                
                return { success: true, reference: `PP_${Date.now()}` };
            } else {
                throw new Error('Échec du traitement PayPal');
            }
        } catch (error) {
            console.error('❌ Erreur PayPal:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Traite un retrait Stripe
     */
    async processStripeWithdrawal(amount, paymentDetails, transactionId) {
        try {
            console.log('💳 Traitement retrait Stripe:', amount);
            
            // Simulation pour la démo
            const success = Math.random() > 0.05; // 95% de succès
            
            if (success) {
                await this.supabase
                    .from('wallet_transactions')
                    .update({
                        reference_id: `ST_${Date.now()}`,
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', transactionId);
                
                return { success: true, reference: `ST_${Date.now()}` };
            } else {
                throw new Error('Échec du traitement Stripe');
            }
        } catch (error) {
            console.error('❌ Erreur Stripe:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Traite un retrait Mobile Money
     */
    async processMobileMoneyWithdrawal(amount, paymentDetails, transactionId) {
        try {
            console.log('📱 Traitement retrait Mobile Money:', amount, paymentDetails.phone);
            
            // Simulation pour la démo
            const success = Math.random() > 0.15; // 85% de succès
            
            if (success) {
                await this.supabase
                    .from('wallet_transactions')
                    .update({
                        reference_id: `MM_${Date.now()}`,
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', transactionId);
                
                return { success: true, reference: `MM_${Date.now()}` };
            } else {
                throw new Error('Échec du traitement Mobile Money');
            }
        } catch (error) {
            console.error('❌ Erreur Mobile Money:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Traite un retrait carte bancaire
     */
    async processBankCardWithdrawal(amount, paymentDetails, transactionId) {
        try {
            console.log('🏦 Traitement retrait carte bancaire:', amount);
            
            // Simulation pour la démo
            const success = Math.random() > 0.1; // 90% de succès
            
            if (success) {
                await this.supabase
                    .from('wallet_transactions')
                    .update({
                        reference_id: `BC_${Date.now()}`,
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', transactionId);
                
                return { success: true, reference: `BC_${Date.now()}` };
            } else {
                throw new Error('Échec du traitement carte bancaire');
            }
        } catch (error) {
            console.error('❌ Erreur carte bancaire:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 📊 HISTORIQUE ET STATISTIQUES
     */

    /**
     * Obtient l'historique des transactions d'un utilisateur
     */
    async getTransactionHistory(userId, limit = 50, offset = 0) {
        try {
            // Trouver le wallet de l'utilisateur
            const wallet = await this.getWallet(userId);
            if (!wallet.success) throw new Error('Wallet non trouvé');

            const { data, error } = await this.supabase
                .from('wallet_transactions')
                .select('*')
                .or(`sender_wallet_id.eq.${wallet.wallet.id},receiver_wallet_id.eq.${wallet.wallet.id}`)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                throw error;
            }

            return { success: true, transactions: data };
        } catch (error) {
            console.error('❌ Erreur historique transactions:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtient les statistiques d'un wallet
     */
    async getWalletStats(userId) {
        try {
            const { data, error } = await this.supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                throw error;
            }

            // Calculer des statistiques additionnelles
            const stats = {
                ...data,
                totalTransactions: data.total_received + data.total_sent + data.total_withdrawn,
                netBalance: data.total_received - data.total_sent - data.total_withdrawn,
                commissionRate: commissionConfig.transferCommission * 100
            };

            return { success: true, stats };
        } catch (error) {
            console.error('❌ Erreur stats wallet:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🛠️ UTILITAIRES
     */

    /**
     * Obtient un utilisateur par ID
     */
    async getUserById(userId) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('id, email, nom, prenom')
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('❌ Erreur récupération utilisateur:', error);
            return null;
        }
    }

    /**
     * Récupère les tokens FCM d'un utilisateur (optionnel)
     */
    async getUserFcmTokens(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_devices')
                .select('fcm_token')
                .eq('user_id', userId)
                .neq('fcm_token', null);
            if (error) return [];
            return (data || []).map((d) => d.fcm_token).filter(Boolean);
        } catch {
            return [];
        }
    }

    /**
     * Envoie une notification de transaction à un utilisateur si possible
     */
    async notifyUserTransaction(userId, payload) {
        try {
            const tokens = await this.getUserFcmTokens(userId);
            await Promise.all(tokens.map((t) => firebaseService.sendTransactionSuccessNotification(t, payload)));
        } catch (_) {
            // Ignorer les erreurs de notification
        }
    }

    /**
     * Envoie une notification de retrait (succès/échec)
     */
    async notifyUserWithdrawal(userId, payload) {
        try {
            const tokens = await this.getUserFcmTokens(userId);
            await Promise.all(tokens.map((t) => {
                if (payload.success) {
                    return firebaseService.sendWithdrawalApprovedNotification(t, payload);
                }
                return firebaseService.sendWithdrawalRejectedNotification(t, payload);
            }));
        } catch (_) {
            // Ignorer
        }
    }

    /**
     * Obtient une transaction par ID
     */
    async getTransactionById(transactionId) {
        try {
            const { data, error } = await this.supabase
                .from('wallet_transactions')
                .select('*')
                .eq('id', transactionId)
                .single();

            if (error) {
                throw error;
            }

            return { success: true, transaction: data };
        } catch (error) {
            console.error('❌ Erreur récupération transaction:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Valide un montant de transaction
     */
    validateAmount(amount, transactionType = 'transfer') {
        const config = commissionConfig;
        
        if (transactionType === 'transfer') {
            return amount >= config.minTransfer && amount <= config.maxTransfer;
        } else if (transactionType === 'withdrawal') {
            return amount >= config.minWithdrawal && amount <= config.maxWithdrawal;
        }
        
        return amount > 0;
    }
}

// Export singleton CommonJS
const walletService = new WalletService();
module.exports = walletService;


