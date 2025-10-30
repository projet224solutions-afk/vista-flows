/**
 * 🤖 SERVICE COPILOTE 224
 * Service frontend pour interagir avec le Copilote IA via Supabase
 */

import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface UserContext {
  name: string;
  role: string;
  balance: number;
  currency: string;
}

export interface CopiloteResponse {
  reply: string;
  timestamp: string;
  user_context: UserContext;
}

export interface BusinessAction {
  type: 'wallet_balance' | 'transaction_history' | 'finance_simulation' | 'rate_show' | 'rate_edit';
  data: Record<string, unknown>;
  result?: unknown;
}

class CopiloteService {
  async sendMessage(message: string): Promise<CopiloteResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('pdg-ai-assistant', {
        body: { action: 'chat', message }
      });

      if (error) throw new Error(error.message || 'Erreur lors de l\'envoi du message');

      return {
        reply: data.reply || data.message || 'Réponse reçue',
        timestamp: new Date().toISOString(),
        user_context: data.user_context || { name: 'PDG', role: 'admin', balance: 0, currency: 'GNF' }
      };
    } catch (error) {
      console.error('Erreur CopiloteService.sendMessage:', error);
      throw error;
    }
  }

  async getHistory(limit: number = 20): Promise<Message[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('copilot_conversations')
        .select('*')
        .eq('pdg_user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const messages: Message[] = [];
      (data || []).forEach(conv => {
        messages.push({ id: `${conv.id}-in`, role: 'user', content: conv.message_in, timestamp: conv.created_at });
        messages.push({ id: `${conv.id}-out`, role: 'assistant', content: conv.message_out, timestamp: conv.created_at });
      });

      return messages.reverse();
    } catch (error) {
      console.error('Erreur CopiloteService.getHistory:', error);
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('copilot_conversations')
        .delete()
        .eq('pdg_user_id', user.user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur CopiloteService.clearHistory:', error);
      throw error;
    }
  }

  async getStatus(): Promise<unknown> {
    try {
      const { data, error } = await supabase.functions.invoke('pdg-ai-assistant', {
        body: { action: 'status' }
      });

      if (error) throw error;
      return data || { status: 'online', version: '2.0' };
    } catch (error) {
      console.error('Erreur CopiloteService.getStatus:', error);
      throw error;
    }
  }

  async executeBusinessAction(action: BusinessAction): Promise<unknown> {
    try {
      const { data, error } = await supabase.functions.invoke('pdg-ai-assistant', {
        body: { action: 'business_action', businessAction: action }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur CopiloteService.executeBusinessAction:', error);
      throw error;
    }
  }

  async getWalletBalance(): Promise<{ balance: number; currency: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Non authentifié');

      const { data: wallet, error } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', user.user.id)
        .single();

      if (error) throw error;
      return wallet;
    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
      throw error;
    }
  }

  async getTransactionHistory(limit: number = 10): Promise<unknown[]> {
    try {
      const { data: transactions, error } = await supabase
        .from('enhanced_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return transactions || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      throw error;
    }
  }

  async simulateCurrencyConversion(amount: number, fromCurrency: string, toCurrency: string) {
    try {
      const { data: rate, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .single();

      if (error || !rate) throw new Error('Taux de change non trouvé');

      const convertedAmount = amount * rate.rate;
      const fees = convertedAmount * 0.005;

      return {
        originalAmount: amount,
        convertedAmount,
        rate: rate.rate,
        fees,
        totalCost: amount + fees
      };
    } catch (error) {
      console.error('Erreur lors de la simulation:', error);
      throw error;
    }
  }

  async getExchangeRates(): Promise<unknown[]> {
    try {
      const { data: rates, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return rates || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des taux:', error);
      throw error;
    }
  }

  async analyzeSystem(): Promise<CopiloteResponse> {
    try {
      const [transactionsData, profilesData, walletsData] = await Promise.all([
        supabase.from('enhanced_transactions').select('*').limit(50),
        supabase.from('profiles').select('*').limit(100),
        supabase.from('wallets').select('*').limit(50)
      ]);

      const transactions = transactionsData.data || [];
      const profiles = profilesData.data || [];
      const wallets = walletsData.data || [];

      const completedTransactions = transactions.filter(t => t.status === 'completed');
      const totalRevenue = completedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      const analysisMessage = `
📊 ANALYSE SYSTÈME 224SOLUTIONS
- ${profiles.length} utilisateurs
- ${transactions.length} transactions (${completedTransactions.length} complétées)
- Revenu: ${totalRevenue.toLocaleString()} GNF
- ${wallets.length} wallets actifs
`;

      return await this.sendMessage(analysisMessage);
    } catch (error) {
      console.error('❌ Erreur analyse système:', error);
      throw error;
    }
  }

  async getAIStats(): Promise<unknown> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Non authentifié');

      const { count } = await supabase
        .from('copilot_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('pdg_user_id', user.user.id);

      return { total_conversations: count || 0, service_status: 'online' };
    } catch (error) {
      return { total_conversations: 0, service_status: 'offline' };
    }
  }

  async cleanupOldLogs(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await supabase
      .from('copilot_conversations')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());
  }
}

export const copiloteService = new CopiloteService();
export default copiloteService;
