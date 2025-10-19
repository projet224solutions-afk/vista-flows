import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AIInsight {
  type: 'warning' | 'info' | 'success';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export const usePDGAIAssistant = () => {
  const [aiActive, setAiActive] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Activer l'IA par défaut
    setAiActive(true);
    loadInitialInsights();
  }, []);

  const loadInitialInsights = async () => {
    setLoading(true);
    try {
      // Charger les insights initiaux depuis la base de données
      const { data: fraudLogs } = await supabase
        .from('fraud_detection_logs')
        .select('*')
        .eq('reviewed', false)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      const newInsights: AIInsight[] = [];

      if (fraudLogs && fraudLogs.length > 0) {
        newInsights.push({
          type: 'warning',
          message: `${fraudLogs.length} alertes de fraude non traitées détectées`,
          priority: 'high'
        });
      }

      if (auditLogs && auditLogs.length > 10) {
        newInsights.push({
          type: 'info',
          message: 'Activité administrative élevée détectée',
          priority: 'medium'
        });
      }

      setInsights(newInsights);
    } catch (error) {
      console.error('Erreur chargement insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshInsights = async () => {
    await loadInitialInsights();
  };

  const toggleAI = () => {
    setAiActive(prev => !prev);
  };

  return {
    aiActive,
    insights,
    loading,
    refreshInsights,
    toggleAI
  };
};
