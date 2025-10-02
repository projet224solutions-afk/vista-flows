/**
 * 💰 SERVICE WALLET - 224SOLUTIONS
 * Service professionnel pour la gestion automatique des portefeuilles utilisateurs
 * Création automatique à l'inscription et intégration complète
 */

import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Types
export interface Wallet {
    id: string;
    user_id: string;
    balance: number;
    currency: string;
    status: 'active' | 'suspended' | 'closed';
    wallet_address: string;
    created_at: string;
    updated_at: string;
}

export interface Transaction {
    id: string;
    wallet_id: string;
    type: 'credit' | 'debit' | 'transfer';
    amount: number;
    currency: string;
    description: string;
    reference: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    from_wallet_id?: string;
    to_wallet_id?: string;
    metadata?: any;
    created_at: string;
    updated_at: string;
}

export interface WalletStats {
    totalBalance: number;
    totalTransactions: number;
    totalCredits: number;
    totalDebits: number;
    pendingTransactions: number;
    monthlyVolume: number;
}

class WalletService {
    private static instance: WalletService;

    static getInstance(): WalletService {
        if (!WalletService.instance) {
            WalletService.instance = new WalletService();
        }
        return WalletService.instance;
    }

    // =====================================================
    // CRÉATION AUTOMATIQUE DE WALLET
    // =====================================================

    /**
     * Crée automatiquement un wallet pour un nouvel utilisateur
     */
    async createUserWallet(userId: string, userEmail: string): Promise<Wallet | null> {
        try {
            // Vérifier si l'utilisateur a déjà un wallet
            const existingWallet = await this.getUserWallet(userId);
            if (existingWallet) {
                console.log('✅ Wallet existe déjà pour l\'utilisateur:', userId);
                return existingWallet;
            }

            // Générer une adresse wallet unique
            const walletAddress = this.generateWalletAddress(userId);

            // Créer le wallet
            const { data, error } = await supabase
                .from('wallets')
                .insert({
                    user_id: userId,
                    balance: 0,
                    currency: 'FCFA',
                    status: 'active',
                    wallet_address: walletAddress
                })
                .select()
                .single();

            if (error) throw error;

            // Créer une transaction d'ouverture
            await this.createTransaction({
                wallet_id: data.id,
                type: 'credit',
                amount: 0,
                currency: 'FCFA',
                description: 'Ouverture de compte wallet 224Solutions',
                reference: `OPENING_${Date.now()}`,
                status: 'completed'
            });

            console.log('✅ Wallet créé automatiquement pour:', userEmail);
            toast.success('Portefeuille 224Solutions créé avec succès');

            return data as Wallet;
        } catch (error) {
            console.error('❌ Erreur création wallet automatique:', error);
            toast.error('Erreur lors de la création du portefeuille');
            return null;
        }
    }

    /**
     * Génère une adresse wallet unique
     */
    private generateWalletAddress(userId: string): string {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 15);
        const userPart = userId.substring(0, 8);
        return `224SOL_${userPart}_${timestamp}_${random}`.toUpperCase();
    }

    // =====================================================
    // GESTION DES WALLETS
    // =====================================================

    /**
     * Récupère le wallet d'un utilisateur
     */
    async getUserWallet(userId: string): Promise<Wallet | null> {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return data as Wallet || null;
        } catch (error) {
            console.error('❌ Erreur récupération wallet:', error);
            return null;
        }
    }

    /**
     * Met à jour le solde d'un wallet
     */
    async updateWalletBalance(walletId: string, newBalance: number): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('wallets')
                .update({
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', walletId);

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('❌ Erreur mise à jour solde:', error);
            return false;
        }
    }

    /**
     * Suspend ou réactive un wallet
     */
    async updateWalletStatus(walletId: string, status: Wallet['status']): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('wallets')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', walletId);

            if (error) throw error;

            toast.success(`Wallet ${status === 'active' ? 'activé' : 'suspendu'}`);
            return true;
        } catch (error) {
            console.error('❌ Erreur mise à jour statut wallet:', error);
            toast.error('Erreur lors de la mise à jour du wallet');
            return false;
        }
    }

    // =====================================================
    // GESTION DES TRANSACTIONS
    // =====================================================

    /**
     * Crée une nouvelle transaction
     */
    async createTransaction(transactionData: Partial<Transaction>): Promise<Transaction | null> {
        try {
            const { data, error } = await supabase
                .from('wallet_transactions')
                .insert({
                    ...transactionData,
                    reference: transactionData.reference || `TXN_${Date.now()}`,
                    status: transactionData.status || 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            return data as Transaction;
        } catch (error) {
            console.error('❌ Erreur création transaction:', error);
            return null;
        }
    }

    /**
     * Effectue un transfert entre wallets
     */
    async transferFunds(
        fromWalletId: string,
        toWalletId: string,
        amount: number,
        description: string
    ): Promise<boolean> {
        try {
            // Vérifier les wallets
            const [fromWallet, toWallet] = await Promise.all([
                this.getWalletById(fromWalletId),
                this.getWalletById(toWalletId)
            ]);

            if (!fromWallet || !toWallet) {
                throw new Error('Wallet source ou destination introuvable');
            }

            if (fromWallet.balance < amount) {
                throw new Error('Solde insuffisant');
            }

            // Créer les transactions
            const reference = `TRANSFER_${Date.now()}`;

            const [debitTxn, creditTxn] = await Promise.all([
                this.createTransaction({
                    wallet_id: fromWalletId,
                    type: 'debit',
                    amount,
                    currency: fromWallet.currency,
                    description: `Transfert vers ${toWallet.wallet_address}`,
                    reference,
                    to_wallet_id: toWalletId,
                    status: 'completed'
                }),
                this.createTransaction({
                    wallet_id: toWalletId,
                    type: 'credit',
                    amount,
                    currency: toWallet.currency,
                    description: `Transfert depuis ${fromWallet.wallet_address}`,
                    reference,
                    from_wallet_id: fromWalletId,
                    status: 'completed'
                })
            ]);

            if (!debitTxn || !creditTxn) {
                throw new Error('Erreur lors de la création des transactions');
            }

            // Mettre à jour les soldes
            await Promise.all([
                this.updateWalletBalance(fromWalletId, fromWallet.balance - amount),
                this.updateWalletBalance(toWalletId, toWallet.balance + amount)
            ]);

            toast.success('Transfert effectué avec succès');
            return true;
        } catch (error) {
            console.error('❌ Erreur transfert:', error);
            toast.error(`Erreur transfert: ${error.message}`);
            return false;
        }
    }

    /**
     * Récupère un wallet par ID
     */
    private async getWalletById(walletId: string): Promise<Wallet | null> {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('id', walletId)
                .single();

            if (error) throw error;

            return data as Wallet;
        } catch (error) {
            console.error('❌ Erreur récupération wallet par ID:', error);
            return null;
        }
    }

    /**
     * Récupère l'historique des transactions d'un wallet
     */
    async getWalletTransactions(
        walletId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<Transaction[]> {
        try {
            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('wallet_id', walletId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            return data as Transaction[] || [];
        } catch (error) {
            console.error('❌ Erreur récupération transactions:', error);
            return [];
        }
    }

    // =====================================================
    // STATISTIQUES
    // =====================================================

    /**
     * Récupère les statistiques d'un wallet
     */
    async getWalletStats(walletId: string): Promise<WalletStats> {
        try {
            const [wallet, transactions] = await Promise.all([
                this.getWalletById(walletId),
                this.getWalletTransactions(walletId, 1000) // Récupérer plus pour les stats
            ]);

            if (!wallet) {
                throw new Error('Wallet introuvable');
            }

            const totalCredits = transactions
                .filter(t => t.type === 'credit' && t.status === 'completed')
                .reduce((sum, t) => sum + t.amount, 0);

            const totalDebits = transactions
                .filter(t => t.type === 'debit' && t.status === 'completed')
                .reduce((sum, t) => sum + t.amount, 0);

            const pendingTransactions = transactions
                .filter(t => t.status === 'pending').length;

            // Transactions du mois en cours
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyVolume = transactions
                .filter(t => {
                    const txnDate = new Date(t.created_at);
                    return txnDate.getMonth() === currentMonth &&
                        txnDate.getFullYear() === currentYear &&
                        t.status === 'completed';
                })
                .reduce((sum, t) => sum + t.amount, 0);

            return {
                totalBalance: wallet.balance,
                totalTransactions: transactions.length,
                totalCredits,
                totalDebits,
                pendingTransactions,
                monthlyVolume
            };
        } catch (error) {
            console.error('❌ Erreur récupération statistiques wallet:', error);
            return {
                totalBalance: 0,
                totalTransactions: 0,
                totalCredits: 0,
                totalDebits: 0,
                pendingTransactions: 0,
                monthlyVolume: 0
            };
        }
    }

    // =====================================================
    // INTÉGRATION AVEC L'INSCRIPTION
    // =====================================================

    /**
     * Hook à appeler lors de l'inscription d'un utilisateur
     */
    async onUserRegistration(userId: string, userEmail: string): Promise<void> {
        try {
            console.log('🔄 Création automatique du wallet pour:', userEmail);

            // Créer le wallet automatiquement
            const wallet = await this.createUserWallet(userId, userEmail);

            if (wallet) {
                console.log('✅ Wallet créé avec succès:', wallet.wallet_address);

                // Optionnel: Bonus de bienvenue
                await this.createTransaction({
                    wallet_id: wallet.id,
                    type: 'credit',
                    amount: 1000, // Bonus de 1000 FCFA
                    currency: 'FCFA',
                    description: 'Bonus de bienvenue 224Solutions',
                    reference: `WELCOME_${Date.now()}`,
                    status: 'completed'
                });

                // Mettre à jour le solde
                await this.updateWalletBalance(wallet.id, 1000);

                toast.success('🎉 Bonus de bienvenue de 1000 FCFA ajouté !');
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'inscription wallet:', error);
        }
    }

    // =====================================================
    // UTILITAIRES
    // =====================================================

    /**
     * Valide un montant de transaction
     */
    validateAmount(amount: number): boolean {
        return amount > 0 && amount <= 10000000; // Max 10M FCFA
    }

    /**
     * Formate un montant en FCFA
     */
    formatAmount(amount: number, currency: string = 'FCFA'): string {
        return `${amount.toLocaleString('fr-FR')} ${currency}`;
    }

    /**
     * Génère un QR code pour le wallet (pour les paiements)
     */
    generateWalletQR(walletAddress: string): string {
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletAddress)}`;
    }
}

export const walletService = WalletService.getInstance();
export default walletService;
