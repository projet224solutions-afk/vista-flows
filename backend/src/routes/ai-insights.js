/**
 * 🤖 AI INSIGHTS SERVICE - 224SOLUTIONS
 * Service d'analyse IA pour générer des recommandations financières et opérationnelles
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

// Configuration Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Feature flag pour activer/désactiver les insights IA
const AI_INSIGHTS_ENABLED = process.env.AI_INSIGHTS_ENABLED === 'true';

// =====================================================
// 1. GÉNÉRATION D'INSIGHTS IA
// =====================================================

/**
 * GET /ai/insights
 * Récupère les insights IA générés
 */
router.get('/insights', async (req, res) => {
  try {
    if (!AI_INSIGHTS_ENABLED) {
      return res.status(403).json({ 
        error: 'Module Insights IA non activé' 
      });
    }

    const { range = '30d', type = 'all' } = req.query;

    // Récupérer les insights depuis la base de données
    const { data: insights, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erreur récupération insights:', error);
      return res.status(500).json({ 
        error: 'Erreur récupération insights' 
      });
    }

    // Filtrer par type si spécifié
    let filteredInsights = insights;
    if (type !== 'all') {
      filteredInsights = insights.filter(insight => insight.category === type);
    }

    res.json({
      success: true,
      insights: filteredInsights,
      total: filteredInsights.length,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur insights IA:', error);
    res.status(500).json({ 
      error: 'Erreur serveur interne' 
    });
  }
});

/**
 * POST /ai/insights/generate
 * Force la génération d'insights (pour les tests)
 */
router.post('/generate', async (req, res) => {
  try {
    if (!AI_INSIGHTS_ENABLED) {
      return res.status(403).json({ 
        error: 'Module Insights IA non activé' 
      });
    }

    const { force = false } = req.body;

    // Générer les insights
    const insights = await generateAIInsights(force);

    res.json({
      success: true,
      insights_generated: insights.length,
      insights: insights
    });

  } catch (error) {
    console.error('Erreur génération insights:', error);
    res.status(500).json({ 
      error: 'Erreur génération insights' 
    });
  }
});

// =====================================================
// 2. GÉNÉRATION D'INSIGHTS (LOGIQUE MÉTIER)
// =====================================================

/**
 * Génère les insights IA basés sur les données réelles
 */
async function generateAIInsights(force = false) {
  const insights = [];

  try {
    // 1. Analyse des transactions financières
    const financialInsights = await analyzeFinancialData();
    insights.push(...financialInsights);

    // 2. Analyse des utilisateurs
    const userInsights = await analyzeUserData();
    insights.push(...userInsights);

    // 3. Analyse des paiements
    const paymentInsights = await analyzePaymentData();
    insights.push(...paymentInsights);

    // 4. Analyse des vendeurs
    const vendorInsights = await analyzeVendorData();
    insights.push(...vendorInsights);

    // 5. Analyse de la sécurité
    const securityInsights = await analyzeSecurityData();
    insights.push(...securityInsights);

    // Sauvegarder les insights en base
    if (insights.length > 0) {
      const { error: insertError } = await supabase
        .from('ai_insights')
        .insert(insights);

      if (insertError) {
        console.error('Erreur sauvegarde insights:', insertError);
      }
    }

    return insights;

  } catch (error) {
    console.error('Erreur génération insights:', error);
    return [];
  }
}

/**
 * Analyse des données financières
 */
async function analyzeFinancialData() {
  const insights = [];

  try {
    // Récupérer les transactions des 30 derniers jours
    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .eq('status', 'completed');

    if (error) throw error;

    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const avgTransaction = totalRevenue / (transactions.length || 1);

    // Insight: Revenus élevés
    if (totalRevenue > 1000000) {
      insights.push({
        category: 'financial',
        type: 'revenue_high',
        title: 'Revenus élevés détectés',
        description: `Revenus totaux de ${totalRevenue.toLocaleString()} GNF sur 30 jours`,
        confidence: 0.9,
        priority: 'high',
        recommendation: 'Considérer l\'expansion des services',
        action_required: false,
        metadata: { total_revenue: totalRevenue, period: '30d' }
      });
    }

    // Insight: Transactions en baisse
    const { data: prevTransactions } = await supabase
      .from('wallet_transactions')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .eq('status', 'completed');

    if (prevTransactions && prevTransactions.length > 0) {
      const prevRevenue = prevTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const revenueChange = ((totalRevenue - prevRevenue) / prevRevenue) * 100;

      if (revenueChange < -10) {
        insights.push({
          category: 'financial',
          type: 'revenue_decline',
          title: 'Baisse des revenus détectée',
          description: `Baisse de ${Math.abs(revenueChange).toFixed(1)}% par rapport à la période précédente`,
          confidence: 0.8,
          priority: 'high',
          recommendation: 'Analyser les causes et mettre en place des mesures correctives',
          action_required: true,
          metadata: { revenue_change: revenueChange, current_revenue: totalRevenue, previous_revenue: prevRevenue }
        });
      }
    }

    return insights;

  } catch (error) {
    console.error('Erreur analyse financière:', error);
    return [];
  }
}

/**
 * Analyse des données utilisateurs
 */
async function analyzeUserData() {
  const insights = [];

  try {
    // Récupérer les statistiques utilisateurs
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) throw error;

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const newUsers = users.filter(u => 
      new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    // Insight: Croissance utilisateurs
    if (newUsers > 10) {
      insights.push({
        category: 'users',
        type: 'user_growth',
        title: 'Croissance utilisateurs forte',
        description: `${newUsers} nouveaux utilisateurs cette semaine`,
        confidence: 0.9,
        priority: 'medium',
        recommendation: 'Maintenir la stratégie d\'acquisition',
        action_required: false,
        metadata: { new_users: newUsers, total_users: totalUsers }
      });
    }

    // Insight: Taux d'activation faible
    const activationRate = (activeUsers / totalUsers) * 100;
    if (activationRate < 70) {
      insights.push({
        category: 'users',
        type: 'low_activation',
        title: 'Taux d\'activation faible',
        description: `Seulement ${activationRate.toFixed(1)}% des utilisateurs sont actifs`,
        confidence: 0.8,
        priority: 'high',
        recommendation: 'Mettre en place des campagnes de réactivation',
        action_required: true,
        metadata: { activation_rate: activationRate, active_users: activeUsers, total_users: totalUsers }
      });
    }

    return insights;

  } catch (error) {
    console.error('Erreur analyse utilisateurs:', error);
    return [];
  }
}

/**
 * Analyse des données de paiement
 */
async function analyzePaymentData() {
  const insights = [];

  try {
    // Récupérer les liens de paiement
    const { data: payments, error } = await supabase
      .from('payment_links')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const totalPayments = payments.length;
    const successfulPayments = payments.filter(p => p.status === 'success').length;
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;

    // Insight: Taux de succès faible
    const successRate = (successfulPayments / totalPayments) * 100;
    if (successRate < 80) {
      insights.push({
        category: 'payments',
        type: 'low_success_rate',
        title: 'Taux de succès des paiements faible',
        description: `Seulement ${successRate.toFixed(1)}% des paiements réussissent`,
        confidence: 0.9,
        priority: 'high',
        recommendation: 'Analyser les causes d\'échec et améliorer le processus',
        action_required: true,
        metadata: { success_rate: successRate, total_payments: totalPayments, successful: successfulPayments, failed: failedPayments }
      });
    }

    // Insight: Paiements en attente
    if (pendingPayments > 5) {
      insights.push({
        category: 'payments',
        type: 'pending_payments',
        title: 'Paiements en attente nombreux',
        description: `${pendingPayments} paiements en attente`,
        confidence: 0.8,
        priority: 'medium',
        recommendation: 'Relancer les clients pour finaliser les paiements',
        action_required: true,
        metadata: { pending_payments: pendingPayments }
      });
    }

    return insights;

  } catch (error) {
    console.error('Erreur analyse paiements:', error);
    return [];
  }
}

/**
 * Analyse des données vendeurs
 */
async function analyzeVendorData() {
  const insights = [];

  try {
    // Récupérer les vendeurs
    const { data: vendors, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'vendeur');

    if (error) throw error;

    const totalVendors = vendors.length;
    const activeVendors = vendors.filter(v => v.is_active).length;

    // Insight: Vendeurs inactifs
    const inactiveVendors = totalVendors - activeVendors;
    if (inactiveVendors > 0) {
      insights.push({
        category: 'vendors',
        type: 'inactive_vendors',
        title: 'Vendeurs inactifs détectés',
        description: `${inactiveVendors} vendeurs inactifs sur ${totalVendors}`,
        confidence: 0.9,
        priority: 'medium',
        recommendation: 'Contacter les vendeurs inactifs pour comprendre les raisons',
        action_required: true,
        metadata: { inactive_vendors: inactiveVendors, total_vendors: totalVendors }
      });
    }

    return insights;

  } catch (error) {
    console.error('Erreur analyse vendeurs:', error);
    return [];
  }
}

/**
 * Analyse des données de sécurité
 */
async function analyzeSecurityData() {
  const insights = [];

  try {
    // Récupérer les logs de sécurité
    const { data: securityLogs, error } = await supabase
      .from('auth_audit_logs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const failedLogins = securityLogs.filter(log => log.action === '2fa_verification_failed').length;
    const suspiciousActivity = securityLogs.filter(log => 
      log.action.includes('failed') || log.action.includes('error')
    ).length;

    // Insight: Tentatives de connexion échouées
    if (failedLogins > 10) {
      insights.push({
        category: 'security',
        type: 'failed_logins',
        title: 'Tentatives de connexion échouées nombreuses',
        description: `${failedLogins} tentatives de connexion échouées cette semaine`,
        confidence: 0.8,
        priority: 'high',
        recommendation: 'Renforcer la sécurité et surveiller les activités suspectes',
        action_required: true,
        metadata: { failed_logins: failedLogins }
      });
    }

    // Insight: Activité suspecte
    if (suspiciousActivity > 5) {
      insights.push({
        category: 'security',
        type: 'suspicious_activity',
        title: 'Activité suspecte détectée',
        description: `${suspiciousActivity} activités suspectes détectées`,
        confidence: 0.9,
        priority: 'critical',
        recommendation: 'Enquêter immédiatement sur les activités suspectes',
        action_required: true,
        metadata: { suspicious_activities: suspiciousActivity }
      });
    }

    return insights;

  } catch (error) {
    console.error('Erreur analyse sécurité:', error);
    return [];
  }
}

// =====================================================
// 3. CRON JOB POUR GÉNÉRATION AUTOMATIQUE
// =====================================================

// Tâche cron pour générer les insights toutes les 6 heures
if (AI_INSIGHTS_ENABLED) {
  cron.schedule('0 */6 * * *', async () => {
    console.log('🤖 Génération automatique des insights IA...');
    try {
      await generateAIInsights();
      console.log('✅ Insights IA générés avec succès');
    } catch (error) {
      console.error('❌ Erreur génération insights IA:', error);
    }
  });
}

module.exports = router;
