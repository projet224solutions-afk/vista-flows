/**
 * 🤖 SERVICE COPILOTE 224
 * Service frontend pour interagir avec le Copilote IA
 * Gestion des conversations, historique et actions métiers
 */

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://uakkxaibujzxdiqzpnpr.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4NzAsImV4cCI6MjA1MDU1MDg3MH0.8Q5YQ5YQ5YQ5YQ5YQ5YQ5YQ5YQ5YQ5YQ5YQ5YQ5YQ5YQ'
);

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
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  /**
   * Envoyer un message au Copilote
   */
  async sendMessage(message: string): Promise<CopiloteResponse> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch(`${this.baseURL}/api/copilot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'envoi du message');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur CopiloteService.sendMessage:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'historique des conversations
   */
  async getHistory(limit: number = 20): Promise<Message[]> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch(`${this.baseURL}/api/copilot/history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de l\'historique');
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Erreur CopiloteService.getHistory:', error);
      return [];
    }
  }

  /**
   * Effacer l'historique des conversations
   */
  async clearHistory(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch(`${this.baseURL}/api/copilot/clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'effacement de l\'historique');
      }
    } catch (error) {
      console.error('Erreur CopiloteService.clearHistory:', error);
      throw error;
    }
  }

  /**
   * Vérifier le statut du service Copilote
   */
  async getStatus(): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseURL}/api/copilot/status`);
      
      if (!response.ok) {
        throw new Error('Service Copilote indisponible');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur CopiloteService.getStatus:', error);
      throw error;
    }
  }

  /**
   * Actions métiers intégrées
   */
  async executeBusinessAction(action: BusinessAction): Promise<unknown> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch(`${this.baseURL}/api/copilot/business-action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(action)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'exécution de l\'action métier');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur CopiloteService.executeBusinessAction:', error);
      throw error;
    }
  }

  /**
   * Obtenir le solde du wallet
   */
  async getWalletBalance(): Promise<{ balance: number; currency: string }> {
    try {
      const { data: wallet, error } = await supabase
        .from('wallets')
        .select('balance, currency')
        .single();

      if (error) throw error;

      return wallet;
    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
      throw error;
    }
  }

  /**
   * Obtenir l'historique des transactions
   */
  async getTransactionHistory(limit: number = 10): Promise<unknown[]> {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
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

  /**
   * Simuler une conversion de devise
   */
  async simulateCurrencyConversion(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{
    originalAmount: number;
    convertedAmount: number;
    rate: number;
    fees: number;
    totalCost: number;
  }> {
    try {
      // Récupérer le taux de change depuis la base
      const { data: rate, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .single();

      if (error || !rate) {
        throw new Error('Taux de change non trouvé');
      }

      // Calculer la conversion
      const convertedAmount = amount * rate.rate;
      const fees = convertedAmount * 0.005; // 0.5% de frais
      const totalCost = amount + fees;

      return {
        originalAmount: amount,
        convertedAmount,
        rate: rate.rate,
        fees,
        totalCost
      };
    } catch (error) {
      console.error('Erreur lors de la simulation:', error);
      throw error;
    }
  }

  /**
   * Obtenir les taux de change actuels
   */
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

  /**
   * Créer une nouvelle session de conversation
   */
  async createSession(sessionName?: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('create_ai_session', {
          user_id_param: (await supabase.auth.getUser()).data.user?.id,
          session_name_param: sessionName
        });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erreur lors de la création de session:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques de l'IA
   */
  async getAIStats(): Promise<unknown> {
    try {
      const { data, error } = await supabase
        .rpc('get_ai_stats', {
          user_id_param: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
      throw error;
    }
  }

  /**
   * Nettoyer les anciens logs (fonction admin)
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_old_ai_logs');

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      throw error;
    }
  }
}

export const copiloteService = new CopiloteService();
export default copiloteService;
