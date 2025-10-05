/**
 * FONCTION TRANSFERT WALLET COMPLÈTE - 224SOLUTIONS
 * Gestion complète des transferts entre wallets
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TransferData {
    fromUserId: string;
    toUserEmail: string;
    amount: number;
    description?: string;
    currency?: string;
}

interface TransferResult {
    success: boolean;
    transactionId?: string;
    error?: string;
    newBalance?: number;
}

export class WalletTransferService {
    /**
     * Effectue un transfert entre wallets
     */
    static async transferFunds(transferData: TransferData): Promise<TransferResult> {
        try {
            console.log('💸 Début du transfert:', transferData);

            // 1. Vérifier que l'utilisateur destinataire existe
            const { data: receiverData, error: receiverError } = await supabase
                .from('profiles')
                .select('id, email')
                .eq('email', transferData.toUserEmail)
                .single();

            if (receiverError || !receiverData) {
                return {
                    success: false,
                    error: 'Utilisateur destinataire non trouvé'
                };
            }

            // 2. Vérifier le wallet de l'expéditeur
            const { data: senderWallet, error: senderError } = await supabase
                .from('wallets')
                .select('id, balance, currency')
                .eq('user_id', transferData.fromUserId)
                .eq('status', 'active')
                .single();

            if (senderError || !senderWallet) {
                return {
                    success: false,
                    error: 'Wallet expéditeur non trouvé'
                };
            }

            // 3. Vérifier le solde suffisant
            if (senderWallet.balance < transferData.amount) {
                return {
                    success: false,
                    error: 'Solde insuffisant'
                };
            }

            // 4. Créer ou récupérer le wallet du destinataire
            const { data: receiverWallet, error: receiverWalletError } = await supabase
                .from('wallets')
                .select('id, balance')
                .eq('user_id', receiverData.id)
                .eq('status', 'active')
                .single();

            if (receiverWalletError && receiverWalletError.code !== 'PGRST116') {
                return {
                    success: false,
                    error: 'Erreur lors de la récupération du wallet destinataire'
                };
            }

            // 5. Effectuer la transaction atomique
            const { data: transactionResult, error: transactionError } = await supabase
                .rpc('process_wallet_transaction', {
                    p_sender_id: transferData.fromUserId,
                    p_receiver_id: receiverData.id,
                    p_amount: transferData.amount,
                    p_currency: transferData.currency || 'GNF',
                    p_description: transferData.description || 'Transfert entre wallets'
                });

            if (transactionError) {
                console.error('Erreur transaction:', transactionError);
                return {
                    success: false,
                    error: transactionError.message || 'Erreur lors de la transaction'
                };
            }

            // 6. Récupérer le nouveau solde
            const { data: updatedWallet, error: balanceError } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', transferData.fromUserId)
                .single();

            if (balanceError) {
                console.error('Erreur récupération solde:', balanceError);
            }

            console.log('✅ Transfert réussi:', transactionResult);

            return {
                success: true,
                transactionId: transactionResult,
                newBalance: updatedWallet?.balance || 0
            };

        } catch (error) {
            console.error('❌ Erreur transfert:', error);
            return {
                success: false,
                error: error.message || 'Erreur inattendue lors du transfert'
            };
        }
    }

    /**
     * Vérifie si un utilisateur peut recevoir des transferts
     */
    static async canReceiveTransfer(userEmail: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', userEmail)
                .single();

            return !error && !!data;
        } catch (error) {
            console.error('Erreur vérification utilisateur:', error);
            return false;
        }
    }

    /**
     * Récupère l'historique des transferts
     */
    static async getTransferHistory(userId: string, limit: number = 20) {
        try {
            const { data, error } = await supabase
                .from('enhanced_transactions')
                .select(`
                    id,
                    amount,
                    currency,
                    method,
                    status,
                    created_at,
                    metadata,
                    sender:profiles!sender_id(id, email, full_name),
                    receiver:profiles!receiver_id(id, email, full_name)
                `)
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                .eq('method', 'wallet')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur récupération historique:', error);
            return [];
        }
    }
}

export default WalletTransferService;