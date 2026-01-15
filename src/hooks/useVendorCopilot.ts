/**
 * 🤖 HOOK COPILOTE VENDEUR ENTERPRISE
 * Gestion des requêtes IA pour les vendeurs avec contexte complet
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface VendorCopilotState {
  messages: CopilotMessage[];
  loading: boolean;
  error: string | null;
  vendorContext: any | null;
}

export function useVendorCopilot() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
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
          .select('user_id')
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

  // Traiter une requête au copilote
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

      // Appeler l'edge function vendor-ai-assistant
      const { data, error: funcError } = await supabase.functions.invoke('vendor-ai-assistant', {
        body: {
          message: query,
          vendorContext: context,
          messages: messages.map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (funcError) {
        throw new Error(funcError.message || 'Erreur de communication avec l\'IA');
      }

      // Ajouter la réponse de l'assistant
      const assistantMessage: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.reply || data?.message || 'Je n\'ai pas pu générer de réponse.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (err: any) {
      console.error('Erreur processQuery:', err);
      setError(err.message);
      
      // Ajouter un message d'erreur
      const errorMessage: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ ${err.message || 'Une erreur est survenue'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error(err.message || 'Erreur lors de la communication avec le Copilote');
    } finally {
      setLoading(false);
    }
  }, [vendorContext, messages, loadVendorContext]);

  // Effacer les messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Générer une analyse automatique
  const generateAnalysis = useCallback(async (vendorId: string, analysisType: 'sales' | 'inventory' | 'performance') => {
    const prompts = {
      sales: 'Analyse mes ventes des 30 derniers jours et donne-moi des recommandations pour augmenter mon chiffre d\'affaires.',
      inventory: 'Analyse mon inventaire et identifie les produits en rupture de stock ou à faible rotation.',
      performance: 'Évalue la performance globale de ma boutique et suggère des améliorations.'
    };

    await processQuery(prompts[analysisType], vendorId);
  }, [processQuery]);

  return {
    messages,
    loading,
    error,
    vendorContext,
    processQuery,
    clearMessages,
    generateAnalysis,
    loadVendorContext
  };
}
