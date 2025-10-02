/**
 * 💰 SERVICE WALLET - 224SOLUTIONS
 * Service pour la gestion des portefeuilles utilisateurs
 * Intégration avec Supabase et création automatique
 */

import { supabase } from '@/lib/supabase';

// =====================================================
// TYPES ET INTERFACES
// =====================================================

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

export interface WalletSettings {
  id: string;
  user_id: string;
  notify_on_credit: boolean;
  notify_on_debit: boolean;
  notify_on_low_balance: boolean;
  low_balance_threshold: number;
  require_pin_for_transfers: boolean;
  daily_transfer_limit: number;
  monthly_transfer_limit: number;
}

// =====================================================
// SERVICE WALLET
// =====================================================

class WalletService {
  // Récupérer le wallet d'un utilisateur
  async getUserWallet(userId: string): Promise<Wallet | null> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Aucun wallet trouvé, on peut en créer un
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Erreur récupération wallet:', error);
      return null;
    }
  }

  // Créer un wallet pour un utilisateur
  async createUserWallet(userId: string, userEmail: string): Promise<Wallet | null> {
    try {
      // Générer une adresse wallet unique
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
      const walletAddress = `224SOL_${userId.substring(0, 8)}_${timestamp}_${randomSuffix}`;

      const { data, error } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          wallet_address: walletAddress,
          balance: 1000.00, // Bonus de bienvenue
          currency: 'FCFA',
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Créer la transaction de bonus de bienvenue
      if (data) {
        await this.createTransaction({
          wallet_id: data.id,
          type: 'credit',
          amount: 1000.00,
          currency: 'FCFA',
          description: 'Bonus de bienvenue 224Solutions',
          reference: `WELCOME_${timestamp}`,
          status: 'completed'
        });
      }

      console.log('✅ Wallet créé avec succès:', walletAddress);
      return data;
    } catch (error) {
      console.error('❌ Erreur création wallet:', error);
      return null;
    }
  }

  // Récupérer les transactions d'un wallet
  async getWalletTransactions(walletId: string, limit: number = 50): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération transactions:', error);
      return [];
    }
  }

  // Créer une transaction
  async createTransaction(transactionData: Partial<Transaction>): Promise<Transaction | null> {
    try {
      const reference = transactionData.reference || `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert({
          ...transactionData,
          reference
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erreur création transaction:', error);
      return null;
    }
  }

  // Effectuer un transfert entre wallets
  async transferFunds(fromWalletId: string, toWalletId: string, amount: number, description: string): Promise<boolean> {
    try {
      // Vérifier le solde du wallet source
      const { data: fromWallet, error: fromError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', fromWalletId)
        .single();

      if (fromError || !fromWallet || fromWallet.balance < amount) {
        throw new Error('Solde insuffisant');
      }

      // Créer la transaction de transfert
      const reference = `TRANSFER_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: fromWalletId,
          type: 'transfer',
          amount,
          currency: 'FCFA',
          description,
          reference,
          status: 'completed',
          from_wallet_id: fromWalletId,
          to_wallet_id: toWalletId
        });

      if (transactionError) throw transactionError;

      // Mettre à jour les soldes (ceci devrait être fait via une fonction SQL pour l'atomicité)
      const { error: updateFromError } = await supabase
        .from('wallets')
        .update({ balance: fromWallet.balance - amount })
        .eq('id', fromWalletId);

      if (updateFromError) throw updateFromError;

      const { data: toWallet, error: toWalletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', toWalletId)
        .single();

      if (toWalletError || !toWallet) throw new Error('Wallet destinataire introuvable');

      const { error: updateToError } = await supabase
        .from('wallets')
        .update({ balance: toWallet.balance + amount })
        .eq('id', toWalletId);

      if (updateToError) throw updateToError;

      return true;
    } catch (error) {
      console.error('❌ Erreur transfert:', error);
      return false;
    }
  }

  // Obtenir les statistiques d'un wallet
  async getWalletStats(walletId: string): Promise<WalletStats> {
    try {
      const { data: transactions, error } = await supabase
        .from('wallet_transactions')
        .select('type, amount, status, created_at')
        .eq('wallet_id', walletId);

      if (error) throw error;

      const stats: WalletStats = {
        totalBalance: 0,
        totalTransactions: transactions?.length || 0,
        totalCredits: 0,
        totalDebits: 0,
        pendingTransactions: 0,
        monthlyVolume: 0
      };

      if (transactions) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        transactions.forEach(tx => {
          if (tx.status === 'completed') {
            if (tx.type === 'credit') {
              stats.totalCredits += tx.amount;
            } else if (tx.type === 'debit') {
              stats.totalDebits += tx.amount;
            }

            // Volume mensuel
            const txDate = new Date(tx.created_at);
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
              stats.monthlyVolume += tx.amount;
            }
          } else if (tx.status === 'pending') {
            stats.pendingTransactions++;
          }
        });
      }

      // Récupérer le solde actuel
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .single();

      stats.totalBalance = wallet?.balance || 0;

      return stats;
    } catch (error) {
      console.error('❌ Erreur statistiques wallet:', error);
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

  // Mettre à jour le statut d'un wallet
  async updateWalletStatus(walletId: string, status: Wallet['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('wallets')
        .update({ status })
        .eq('id', walletId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour statut wallet:', error);
      return false;
    }
  }

  // Fonction appelée lors de l'inscription d'un utilisateur
  async onUserRegistration(userId: string, userEmail: string): Promise<void> {
    try {
      // Vérifier si l'utilisateur a déjà un wallet
      const existingWallet = await this.getUserWallet(userId);

      if (!existingWallet) {
        await this.createUserWallet(userId, userEmail);
        console.log('✅ Wallet créé automatiquement pour:', userEmail);
      }
    } catch (error) {
      console.error('❌ Erreur création wallet inscription:', error);
    }
  }

  // Utilitaires
  formatAmount(amount: number, currency: string = 'FCFA'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'FCFA' ? 'XOF' : currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 10000000; // Max 10M FCFA
  }

  generateWalletQR(walletAddress: string): string {
    // Génération simple d'URL QR (à améliorer avec une vraie lib QR)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletAddress)}`;
  }
}

// Export de l'instance singleton
const walletService = new WalletService();
export default walletService;