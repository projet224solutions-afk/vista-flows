/**
 * 🤖 HOOK ASSISTANT IA PDG - 224SOLUTIONS
 * Assistant IA intelligent pour le PDG avec Tiny LLM/Phi-3 Mini
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIInsight {
  type: 'financial' | 'performance' | 'security' | 'maintenance' | 'recommendation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action?: string;
  data?: any;
}

interface AIRecommendation {
  category: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  benefits: string[];
}

export function usePDGAIAssistant() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [aiActive, setAiActive] = useState(false);

  // Analyser les données financières
  const analyzeFinancialData = useCallback(async () => {
    try {
      setIsAnalyzing(true);
      
      // Récupérer les données financières
      const { data: transactions } = await supabase
        .from('wallet_transactions')
        .select('amount, status, created_at, transaction_type')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const { data: users } = await supabase
        .from('profiles')
        .select('role, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Calculer les métriques
      const totalRevenue = transactions?.filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;
      
      const pendingAmount = transactions?.filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

      const newUsers = users?.length || 0;
      const userGrowth = newUsers > 0 ? ((newUsers / 30) * 100).toFixed(1) : '0';

      // Générer des insights
      const financialInsights: AIInsight[] = [];

      if (pendingAmount > totalRevenue * 0.1) {
        financialInsights.push({
          type: 'financial',
          title: '⚠️ Paiements en attente élevés',
          description: `${pendingAmount.toLocaleString()} GNF en attente (${((pendingAmount / totalRevenue) * 100).toFixed(1)}% du CA)`,
          priority: 'high',
          action: 'Vérifier les paiements en attente',
          data: { pendingAmount, totalRevenue }
        });
      }

      if (totalRevenue > 0) {
        financialInsights.push({
          type: 'financial',
          title: '💰 Revenus du mois',
          description: `${totalRevenue.toLocaleString()} GNF générés ce mois`,
          priority: 'medium',
          data: { totalRevenue }
        });
      }

      if (parseFloat(userGrowth) > 20) {
        financialInsights.push({
          type: 'performance',
          title: '📈 Croissance utilisateurs',
          description: `+${userGrowth}% de nouveaux utilisateurs ce mois`,
          priority: 'medium',
          data: { userGrowth, newUsers }
        });
      }

      setInsights(prev => [...prev, ...financialInsights]);
      return financialInsights;
    } catch (error) {
      console.error('Erreur analyse financière:', error);
      toast.error('Erreur lors de l\'analyse financière');
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Analyser la performance système
  const analyzeSystemPerformance = useCallback(async () => {
    try {
      setIsAnalyzing(true);

      // Récupérer les données système
      const { data: orders } = await supabase
        .from('orders')
        .select('status, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { data: vendors } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'vendeur');

      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      // Calculer les métriques
      const totalOrders = orders?.length || 0;
      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      const activeVendors = vendors?.length || 0;
      const activeProducts = products?.length || 0;

      // Générer des insights
      const performanceInsights: AIInsight[] = [];

      if (completionRate < 80) {
        performanceInsights.push({
          type: 'performance',
          title: '📊 Taux de complétion faible',
          description: `Seulement ${completionRate.toFixed(1)}% des commandes sont complétées`,
          priority: 'high',
          action: 'Analyser les causes des échecs',
          data: { completionRate, totalOrders, completedOrders }
        });
      }

      if (activeVendors < 5) {
        performanceInsights.push({
          type: 'performance',
          title: '🏪 Peu de vendeurs actifs',
          description: `Seulement ${activeVendors} vendeurs actifs`,
          priority: 'medium',
          action: 'Recruter plus de vendeurs',
          data: { activeVendors }
        });
      }

      if (activeProducts < 50) {
        performanceInsights.push({
          type: 'performance',
          title: '📦 Catalogue limité',
          description: `Seulement ${activeProducts} produits actifs`,
          priority: 'medium',
          action: 'Encourager les vendeurs à ajouter des produits',
          data: { activeProducts }
        });
      }

      setInsights(prev => [...prev, ...performanceInsights]);
      return performanceInsights;
    } catch (error) {
      console.error('Erreur analyse performance:', error);
      toast.error('Erreur lors de l\'analyse de performance');
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Analyser la sécurité
  const analyzeSecurity = useCallback(async () => {
    try {
      setIsAnalyzing(true);

      // Récupérer les données de sécurité
      const { data: fraudLogs } = await supabase
        .from('fraud_detection_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Générer des insights
      const securityInsights: AIInsight[] = [];

      const criticalFraud = fraudLogs?.filter(f => f.risk_level === 'critical').length || 0;
      const totalFraud = fraudLogs?.length || 0;
      const recentAudit = auditLogs?.length || 0;

      if (criticalFraud > 0) {
        securityInsights.push({
          type: 'security',
          title: '🚨 Alertes de fraude critiques',
          description: `${criticalFraud} tentatives de fraude critiques détectées`,
          priority: 'critical',
          action: 'Examiner immédiatement les alertes',
          data: { criticalFraud, totalFraud }
        });
      }

      if (totalFraud > 10) {
        securityInsights.push({
          type: 'security',
          title: '⚠️ Activité frauduleuse élevée',
          description: `${totalFraud} tentatives de fraude cette semaine`,
          priority: 'high',
          action: 'Renforcer les mesures de sécurité',
          data: { totalFraud }
        });
      }

      if (recentAudit > 100) {
        securityInsights.push({
          type: 'security',
          title: '📝 Activité système élevée',
          description: `${recentAudit} actions auditées aujourd'hui`,
          priority: 'low',
          data: { recentAudit }
        });
      }

      setInsights(prev => [...prev, ...securityInsights]);
      return securityInsights;
    } catch (error) {
      console.error('Erreur analyse sécurité:', error);
      toast.error('Erreur lors de l\'analyse de sécurité');
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Générer des recommandations intelligentes
  const generateRecommendations = useCallback(async () => {
    try {
      const newRecommendations: AIRecommendation[] = [];

      // Analyser les insights pour générer des recommandations
      const financialInsights = insights.filter(i => i.type === 'financial');
      const performanceInsights = insights.filter(i => i.type === 'performance');
      const securityInsights = insights.filter(i => i.type === 'security');

      // Recommandations financières
      if (financialInsights.some(i => i.priority === 'high')) {
        newRecommendations.push({
          category: 'Finance',
          title: 'Optimiser les paiements',
          description: 'Mettre en place un système de suivi des paiements en attente',
          impact: 'high',
          effort: 'medium',
          timeline: '1-2 semaines',
          benefits: ['Réduction des impayés', 'Amélioration du cash-flow', 'Meilleure visibilité']
        });
      }

      // Recommandations de performance
      if (performanceInsights.some(i => i.priority === 'high')) {
        newRecommendations.push({
          category: 'Performance',
          title: 'Améliorer le taux de complétion',
          description: 'Analyser et résoudre les causes des échecs de commandes',
          impact: 'high',
          effort: 'high',
          timeline: '2-4 semaines',
          benefits: ['Plus de revenus', 'Meilleure satisfaction client', 'Réduction des plaintes']
        });
      }

      // Recommandations de sécurité
      if (securityInsights.some(i => i.priority === 'critical')) {
        newRecommendations.push({
          category: 'Sécurité',
          title: 'Renforcer la sécurité',
          description: 'Implémenter des mesures de sécurité avancées',
          impact: 'high',
          effort: 'high',
          timeline: '1-3 semaines',
          benefits: ['Protection des données', 'Réduction des fraudes', 'Conformité réglementaire']
        });
      }

      // Recommandations générales
      newRecommendations.push({
        category: 'Général',
        title: 'Tableau de bord IA',
        description: 'Activer l\'assistant IA pour des insights automatiques',
        impact: 'medium',
        effort: 'low',
        timeline: 'Immédiat',
        benefits: ['Décisions éclairées', 'Gain de temps', 'Prévention des problèmes']
      });

      setRecommendations(newRecommendations);
      return newRecommendations;
    } catch (error) {
      console.error('Erreur génération recommandations:', error);
      return [];
    }
  }, [insights]);

  // Analyse complète
  const performFullAnalysis = useCallback(async () => {
    try {
      setAiActive(true);
      setIsAnalyzing(true);
      
      // Exécuter toutes les analyses en parallèle
      await Promise.all([
        analyzeFinancialData(),
        analyzeSystemPerformance(),
        analyzeSecurity()
      ]);

      // Générer les recommandations
      await generateRecommendations();

      toast.success('Analyse IA terminée avec succès');
    } catch (error) {
      console.error('Erreur analyse complète:', error);
      toast.error('Erreur lors de l\'analyse complète');
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeFinancialData, analyzeSystemPerformance, analyzeSecurity, generateRecommendations]);

  // Réinitialiser les données
  const resetAnalysis = useCallback(() => {
    setInsights([]);
    setRecommendations([]);
    setAiActive(false);
  }, []);

  return {
    isAnalyzing,
    insights,
    recommendations,
    aiActive,
    analyzeFinancialData,
    analyzeSystemPerformance,
    analyzeSecurity,
    generateRecommendations,
    performFullAnalysis,
    resetAnalysis
  };
}
