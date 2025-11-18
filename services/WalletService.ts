
// Service de gestion des wallets
import { supabase } from './supabase';
import type { Wallet } from './supabase';

export class WalletService {
  // Obtenir le solde d'un wallet
  static async getWalletBalance(userId: string) {
    const { data, error } = await supabase.rpc('get_wallet_balance', {
      p_user_id: userId
    });

    if (error) throw error;
    return data;
  }

  // Effectuer une transaction
  static async processTransaction(transactionData: {
    from_user_id: string;
    to_user_id: string;
    amount: number;
    transaction_type: string;
    description?: string;
  }) {
    const { data, error } = await supabase.rpc('process_transaction', {
      p_from_user_id: transactionData.from_user_id,
      p_to_user_id: transactionData.to_user_id,
      p_amount: transactionData.amount,
      p_transaction_type: transactionData.transaction_type,
      p_description: transactionData.description || null
    });

    if (error) throw error;
    return data;
  }

  // Obtenir l'historique des transactions
  static async getTransactionHistory(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        from_wallet:from_wallet_id(user_id),
        to_wallet:to_wallet_id(user_id)
      `)
      .or(`from_wallet.user_id.eq.${userId},to_wallet.user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Créditer un wallet
  static async creditWallet(userId: string, amount: number, description?: string) {
    const { data, error } = await supabase.rpc('process_transaction', {
      p_from_user_id: '00000000-0000-0000-0000-000000000000', // ID système
      p_to_user_id: userId,
      p_amount: amount,
      p_transaction_type: 'credit',
      p_description: description || 'Crédit système'
    });

    if (error) throw error;
    return data;
  }
}
