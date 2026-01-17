/**
 * 🤖 HOOK COPILOTE VENDEUR ENTERPRISE
 * Gestion des requêtes IA pour les vendeurs via edge function vendor-ai-assistant
 * Interface complète avec analyse dashboard, inventaire, ventes, clients
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: any;
  type?: 'analysis' | 'recommendation' | 'alert' | 'success' | 'error' | 'system';
}

export interface VendorCopilotState {
  messages: CopilotMessage[];
  loading: boolean;
  error: string | null;
  vendorContext: any | null;
}

export function useVendorCopilot() {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      content: '👋 Bonjour ! Je suis votre Copilote IA ENTERPRISE. Je peux analyser vos ventes, gérer votre inventaire, répondre aux avis clients, et optimiser votre boutique. Que puis-je faire pour vous ?',
      timestamp: new Date(),
      type: 'system',
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorContext, setVendorContext] = useState<any | null>(null);

  // Charger le contexte vendeur (ventes, inventaire, etc.)
  const loadVendorContext = useCallback(async (vendorId: string) => {
    try {
      // Charger les stats du vendeur
      const [ordersRes, productsRes, walletRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total_amount, status, created_at')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('products')
          .select('id, name, price, stock_quantity')
          .eq('vendor_id', vendorId)
          .limit(100),
        supabase
          .from('vendors')
          .select('user_id, business_name')
          .eq('id', vendorId)
          .single()
      ]);

      let walletBalance = 0;
      if (walletRes.data?.user_id) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', walletRes.data.user_id)
          .single();
        walletBalance = wallet?.balance || 0;
      }

      // Calculer les stats
      const orders = ordersRes.data || [];
      const products = productsRes.data || [];

      const totalRevenue = orders
        .filter(o => o.status === 'completed' || o.status === 'delivered')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

      const pendingOrders = orders.filter(o => 
        o.status === 'pending' || o.status === 'processing'
      ).length;

      const lowStockProducts = products.filter(p => 
        (p.stock_quantity || 0) < 10
      );

      const context = {
        vendorId,
        businessName: walletRes.data?.business_name || 'Boutique',
        totalOrders: orders.length,
        pendingOrders,
        totalRevenue,
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        lowStockProducts: lowStockProducts.slice(0, 5),
        walletBalance,
        recentOrders: orders.slice(0, 5)
      };

      setVendorContext(context);
      return context;
    } catch (err) {
      console.error('Erreur chargement contexte vendeur:', err);
      return null;
    }
  }, []);

  // Traiter une requête au copilote via l'edge function
  const processQuery = useCallback(async (query: string, vendorId: string) => {
    setLoading(true);
    setError(null);

    // Ajouter le message utilisateur
    const userMessage: CopilotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Charger le contexte si pas encore fait
      let context = vendorContext;
      if (!context || context.vendorId !== vendorId) {
        context = await loadVendorContext(vendorId);
      }

      // Récupérer le token d'accès
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }

      // Préparer l'historique des messages pour l'IA
      const messageHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      // Appeler l'edge function vendor-ai-assistant
      // IMPORTANT: stream: false pour recevoir JSON au lieu de SSE
      const { data, error: funcError } = await supabase.functions.invoke('vendor-ai-assistant', {
        body: {
          message: query,
          vendorContext: context,
          messages: [...messageHistory, { role: 'user', content: query }],
          stream: false // Mode JSON pour compatibilité avec invoke
        }
      });

      if (funcError) {
        console.error('Edge function error:', funcError);
        throw new Error(funcError.message || 'Erreur de communication avec l\'IA');
      }

      // Extraire la réponse - gérer différents formats
      let responseContent = '';
      
      if (data?.reply) {
        responseContent = data.reply;
      } else if (data?.message) {
        responseContent = data.message;
      } else if (data?.answer) {
        responseContent = data.answer;
      } else if (typeof data === 'string') {
        responseContent = data;
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        console.warn('Format de réponse inattendu:', data);
        responseContent = 'Je n\'ai pas pu générer une réponse. Veuillez reformuler votre question.';
      }

      // Ajouter la réponse de l'assistant
      const assistantMessage: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        type: 'analysis'
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      return responseContent;

    } catch (err: any) {
      console.error('Erreur processQuery:', err);
      setError(err.message);
      
      // Construire un message d'erreur informatif
      let errorContent = '❌ ';
      if (err.message?.includes('402')) {
        errorContent += 'Crédits IA insuffisants. Veuillez recharger vos crédits dans les paramètres.';
      } else if (err.message?.includes('429')) {
        errorContent += 'Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.';
      } else if (err.message?.includes('Session')) {
        errorContent += 'Session expirée. Veuillez vous reconnecter.';
      } else {
        errorContent += err.message || 'Une erreur est survenue lors de la communication avec l\'IA.';
      }
      
      // Ajouter un message d'erreur
      const errorMessage: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error(err.message || 'Erreur lors de la communication avec le Copilote');
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [vendorContext, messages, loadVendorContext]);

  // Effacer les messages
  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'system',
        content: '👋 Conversation réinitialisée. Comment puis-je vous aider ?',
        timestamp: new Date(),
        type: 'system',
      }
    ]);
    setError(null);
  }, []);

  // Générer une analyse automatique
  const generateAnalysis = useCallback(async (vendorId: string, analysisType: 'sales' | 'inventory' | 'performance' | 'reviews' | 'dashboard') => {
    const prompts = {
      sales: 'Analyse mes ventes des 30 derniers jours et donne-moi des recommandations pour augmenter mon chiffre d\'affaires.',
      inventory: 'Analyse mon inventaire et identifie les produits en rupture de stock ou à faible rotation.',
      performance: 'Évalue la performance globale de ma boutique et suggère des améliorations.',
      reviews: 'Analyse les avis clients récents et propose des réponses appropriées.',
      dashboard: 'Effectue une analyse complète de mon tableau de bord vendeur.'
    };

    return await processQuery(prompts[analysisType], vendorId);
  }, [processQuery]);

  // Analyser un client spécifique
  const analyzeCustomer = useCallback(async (customerId: string, vendorId: string) => {
    return await processQuery(`Analyse le client ${customerId} en détail: historique d'achats, valeur, comportement et recommandations.`, vendorId);
  }, [processQuery]);

  return {
    messages,
    loading,
    error,
    vendorContext,
    processQuery,
    clearMessages,
    generateAnalysis,
    analyzeCustomer,
    loadVendorContext
  };
}
