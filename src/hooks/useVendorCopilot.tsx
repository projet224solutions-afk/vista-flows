/**
 * 🤖 HOOK COPILOTE VENDEUR ENTERPRISE
 * Interface React pour l'analyse ultra-professionnelle du vendeur
 * Équivalent Amazon Seller Central / Shopify Plus Analytics
 */

import { useState } from 'react';
import { VendorCopilotService, VendorDashboardAnalysis, CustomerDetailedAnalysis } from '@/services/VendorCopilotService';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: any;
  type?: 'analysis' | 'recommendation' | 'alert' | 'success' | 'error' | 'system';
}

export const useVendorCopilot = () => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: '1',
      role: 'system',
      content: '👋 Bonjour ! Je suis votre IA ENTERPRISE de 224Solutions. Je peux analyser en profondeur TOUTES les sections de votre interface vendeur : produits, inventaire, commandes, finances, clients, réputation, livraisons, POS, marketing, support, et plus encore. Que souhaitez-vous analyser ?',
      timestamp: new Date(),
      type: 'system',
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<VendorDashboardAnalysis | null>(null);

  /**
   * 📊 ANALYSE COMPLÈTE DE L'INTERFACE VENDEUR
   */
  const analyzeFullDashboard = async (vendorId: string) => {
    setLoading(true);
    setError(null);

    const userMessage: CopilotMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: 'Effectue une analyse complète de mon interface vendeur',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const analysis = await VendorCopilotService.analyzeVendorDashboard(vendorId);

      if (!analysis) {
        throw new Error('Impossible de récupérer les données du vendeur');
      }

      setCurrentAnalysis(analysis);

      const responseMessage: CopilotMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: formatFullAnalysis(analysis),
        timestamp: new Date(),
        data: analysis,
        type: 'analysis',
      };

      setMessages(prev => [...prev, responseMessage]);

      // Ajouter les recommandations si nécessaire
      const recommendations = generateRecommendations(analysis);
      if (recommendations.length > 0) {
        const recMessage: CopilotMessage = {
          id: `msg-${Date.now() + 2}`,
          role: 'assistant',
          content: formatRecommendations(recommendations),
          timestamp: new Date(),
          data: { recommendations },
          type: 'recommendation',
        };
        setMessages(prev => [...prev, recMessage]);
      }

      return analysis;

    } catch (err: any) {
      console.error('❌ Erreur analyse:', err);
      setError(err.message);

      const errorMessage: CopilotMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `❌ **Erreur lors de l'analyse**\n\n${err.message}\n\nVeuillez réessayer ou contacter le support si le problème persiste.`,
        timestamp: new Date(),
        type: 'error',
      };
      setMessages(prev => [...prev, errorMessage]);

      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * � ANALYSER UN CLIENT SPÉCIFIQUE
   */
  const analyzeSpecificCustomer = async (customerId: string, vendorId: string) => {
    setLoading(true);
    setError(null);

    const userMessage: CopilotMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: `Analyse le client ${customerId}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const analysis = await VendorCopilotService.analyzeCustomer(customerId, vendorId);

      if (!analysis) {
        throw new Error('Client non trouvé ou inaccessible');
      }

      const responseMessage: CopilotMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: formatCustomerAnalysis(analysis),
        timestamp: new Date(),
        data: { type: 'customer', analysis },
        type: 'analysis',
      };

      setMessages(prev => [...prev, responseMessage]);

      return analysis;

    } catch (err: any) {
      console.error('❌ Erreur analyse client:', err);
      setError(err.message);

      const errorMessage: CopilotMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `❌ **Erreur lors de l'analyse du client**\n\n${err.message}`,
        timestamp: new Date(),
        type: 'error',
      };
      setMessages(prev => [...prev, errorMessage]);

      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * �💬 TRAITER UNE QUESTION INTELLIGENTE
   */
  const processQuery = async (query: string, vendorId: string) => {
    setLoading(true);
    setError(null);

    const userMessage: CopilotMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const lowerQuery = query.toLowerCase();

      // 🔍 Détection d'un ID client (UUID)
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const clientIdMatch = query.match(uuidRegex);
      
      if ((lowerQuery.includes('client') || lowerQuery.includes('analyse')) && clientIdMatch) {
        // Analyser un client spécifique
        const customerId = clientIdMatch[0];
        await analyzeSpecificCustomer(customerId, vendorId);
        return;
      }

      // Détection d'intention
      if (lowerQuery.includes('combien') && lowerQuery.includes('produit')) {
        // Question sur le nombre de produits
        if (!currentAnalysis) {
          await analyzeFullDashboard(vendorId);
        } else {
          const responseMessage: CopilotMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: formatProductsInfo(currentAnalysis),
            timestamp: new Date(),
            type: 'analysis',
          };
          setMessages(prev => [...prev, responseMessage]);
        }
      } else if (lowerQuery.includes('analyse') || lowerQuery.includes('dashboard') || lowerQuery.includes('interface')) {
        // Analyse complète
        await analyzeFullDashboard(vendorId);
      } else if (lowerQuery.includes('vente') || lowerQuery.includes('commande')) {
        // Info sur les ventes
        if (!currentAnalysis) {
          await analyzeFullDashboard(vendorId);
        } else {
          const responseMessage: CopilotMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: formatOrdersInfo(currentAnalysis),
            timestamp: new Date(),
            type: 'analysis',
          };
          setMessages(prev => [...prev, responseMessage]);
        }
      } else if (lowerQuery.includes('client')) {
        // Info sur les clients
        if (!currentAnalysis) {
          await analyzeFullDashboard(vendorId);
        } else {
          const responseMessage: CopilotMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: formatCustomersInfo(currentAnalysis),
            timestamp: new Date(),
            type: 'analysis',
          };
          setMessages(prev => [...prev, responseMessage]);
        }
      } else if (lowerQuery.includes('finance') || lowerQuery.includes('wallet') || lowerQuery.includes('solde')) {
        // Info financières
        if (!currentAnalysis) {
          await analyzeFullDashboard(vendorId);
        } else {
          const responseMessage: CopilotMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: formatFinancesInfo(currentAnalysis),
            timestamp: new Date(),
            type: 'analysis',
          };
          setMessages(prev => [...prev, responseMessage]);
        }
      } else if (lowerQuery.includes('inventaire') || lowerQuery.includes('stock')) {
        // Info sur l'inventaire
        if (!currentAnalysis) {
          await analyzeFullDashboard(vendorId);
        } else {
          const responseMessage: CopilotMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: formatInventoryInfo(currentAnalysis),
            timestamp: new Date(),
            type: 'analysis',
          };
          setMessages(prev => [...prev, responseMessage]);
        }
      } else {
        // Question générique - analyse complète
        await analyzeFullDashboard(vendorId);
      }

    } catch (err: any) {
      console.error('❌ Erreur traitement:', err);
      setError(err.message);

      const errorMessage: CopilotMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `❌ Erreur: ${err.message}`,
        timestamp: new Date(),
        type: 'error',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🗑️ RÉINITIALISER LA CONVERSATION
   */
  const clearMessages = () => {
    setMessages([
      {
        id: '1',
        role: 'system',
        content: '👋 Conversation réinitialisée. Comment puis-je vous aider ?',
        timestamp: new Date(),
        type: 'system',
      }
    ]);
    setCurrentAnalysis(null);
    setError(null);
  };

  return {
    messages,
    loading,
    error,
    currentAnalysis,
    analyzeFullDashboard,
    analyzeSpecificCustomer,
    processQuery,
    clearMessages,
  };
};

// =====================================================
// FORMATTERS - RÉPONSES ULTRA-PROFESSIONNELLES
// =====================================================

/**
 * � FORMAT ANALYSE CLIENT DÉTAILLÉE
 */
function formatCustomerAnalysis(analysis: CustomerDetailedAnalysis): string {
  const statusEmoji = getCustomerStatusEmoji(analysis.customer_status);
  const segmentEmoji = getSegmentEmoji(analysis.customer_segment);
  const firstTimeEmoji = analysis.is_first_time_buyer ? '🆕' : '🔄';

  return `
# 👤 **ANALYSE CLIENT DÉTAILLÉE**

${firstTimeEmoji} **${analysis.is_first_time_buyer ? 'NOUVEAU CLIENT' : 'CLIENT RÉCURRENT'}**
${statusEmoji} **Statut:** ${analysis.customer_status.toUpperCase()}
${segmentEmoji} **Segment:** ${analysis.customer_segment.toUpperCase()}
⭐ **Score fidélité:** ${analysis.loyalty_score}/100

---

## 📋 **IDENTITÉ**

**Nom complet:** ${analysis.full_name}
**Email:** ${analysis.email}
**Téléphone:** ${analysis.phone}
**ID Client:** \`${analysis.customer_id}\`
**Inscrit le:** ${new Date(analysis.created_at).toLocaleDateString('fr-FR')}

---

## 📍 **LOCALISATION**

🌍 **Pays:** ${analysis.country}
🏙️ **Ville:** ${analysis.city}
🏠 **Adresse:** ${analysis.address}

${analysis.addresses.length > 1 ? `
**Autres adresses (${analysis.addresses.length - 1}):**
${analysis.addresses.slice(1).map((addr, i) => 
  `${i + 2}. ${addr.street}, ${addr.city}, ${addr.country} ${addr.is_default ? '(Par défaut)' : ''}`
).join('\n')}
` : ''}

---

## 🛒 **HISTORIQUE D'ACHATS**

${analysis.is_first_time_buyer ? `
🆕 **Ce client n'a encore JAMAIS effectué d'achat sur la plateforme !**

C'est une excellente opportunité pour:
- Offrir une remise de bienvenue
- Assurer un service exceptionnel
- Fidéliser dès le premier achat
` : `
**Total commandes:** ${analysis.total_orders}
• ✅ Complétées: ${analysis.completed_orders}
• ⏳ En cours: ${analysis.pending_orders}
• ❌ Annulées: ${analysis.cancelled_orders}

**Chronologie:**
• 📅 Premier achat: ${analysis.first_order_date ? new Date(analysis.first_order_date).toLocaleDateString('fr-FR') : 'N/A'}
• 📅 Dernier achat: ${analysis.last_order_date ? new Date(analysis.last_order_date).toLocaleDateString('fr-FR') : 'N/A'}
• ⏱️ Dernière commande il y a: **${analysis.days_since_last_order} jours**

**Items achetés:** ${analysis.total_items_purchased} produits au total
`}

---

## 💰 **VALEUR CLIENT**

${analysis.is_first_time_buyer ? `
**Aucune transaction encore effectuée.**

*Potentiel de revenus à développer.*
` : `
• **Total dépensé:** ${analysis.total_spent.toLocaleString()} GNF
• **Panier moyen:** ${analysis.average_order_value.toLocaleString()} GNF
• **Plus grosse commande:** ${analysis.largest_order_value.toLocaleString()} GNF
• **Fréquence d'achat:** ${analysis.purchase_frequency.toFixed(2)} commandes/mois

${analysis.orders_with_this_vendor > 0 ? `
✅ **A déjà commandé chez vous:** ${analysis.orders_with_this_vendor} fois
` : `
⚠️ **N'a JAMAIS commandé chez vous** (mais a acheté chez d'autres vendeurs)
`}

${analysis.favorite_vendor_name ? `
🏆 **Vendeur favori:** ${analysis.favorite_vendor_name}
` : ''}
`}

---

## 💳 **PAIEMENT**

**Méthode préférée:** ${analysis.preferred_payment_method}

---

## 📊 **SEGMENTATION & COMPORTEMENT**

**Segment client:** ${getSegmentLabel(analysis.customer_segment)}
**Statut:** ${getStatusLabel(analysis.customer_status)}
**Score de fidélité:** ${analysis.loyalty_score}/100 ${getLoyaltyLevel(analysis.loyalty_score)}

**Durée de vie:** ${analysis.customer_lifetime_days} jours (${Math.floor(analysis.customer_lifetime_days / 30)} mois)

---

## 💡 **RECOMMANDATIONS**

${generateCustomerRecommendations(analysis)}

---

✅ **Analyse terminée** - ${new Date().toLocaleTimeString('fr-FR')}
  `.trim();
}

/**
 * �📊 FORMAT ANALYSE COMPLÈTE
 */
function formatFullAnalysis(analysis: VendorDashboardAnalysis): string {
  const healthEmoji = getHealthEmoji(analysis.health_scores.overall_health);
  const riskEmoji = getRiskEmoji(analysis.health_scores.risk_level);

  return `
# 📊 **ANALYSE COMPLÈTE DE VOTRE INTERFACE VENDEUR**

${healthEmoji} **Score de santé globale: ${analysis.health_scores.overall_health}/100**
${riskEmoji} **Niveau de risque: ${analysis.health_scores.risk_level.toUpperCase()}**

---

## 🏪 **IDENTITÉ & ABONNEMENT**

**Boutique:** ${analysis.shop_name}
**Type:** ${analysis.business_type}
**Email:** ${analysis.email}
**Membre depuis:** ${new Date(analysis.created_at).toLocaleDateString('fr-FR')}

**Plan:** ${analysis.subscription.plan.toUpperCase()}
**Statut:** ${analysis.subscription.status}
**Utilisation produits:** ${analysis.subscription.usage_limits.products_current}/${analysis.subscription.usage_limits.products_max}

---

## 📦 **CATALOGUE PRODUITS**

• **Total produits:** ${analysis.products.total}
• **Actifs:** ${analysis.products.active} | **Inactifs:** ${analysis.products.inactive}
• **Rupture de stock:** ${analysis.products.out_of_stock}
• **Stock faible:** ${analysis.products.low_stock}
• **Prix moyen:** ${analysis.products.average_price.toLocaleString()} GNF
• **Valeur inventaire:** ${analysis.products.total_inventory_value.toLocaleString()} GNF

**🏆 Top 3 bestsellers:**
${analysis.products.bestsellers.slice(0, 3).map((p, i) => 
  `${i + 1}. **${p.name}** - ${p.sales_30d} ventes (${p.revenue_30d.toLocaleString()} GNF)`
).join('\n')}

---

## 🛒 **COMMANDES & VENTES**

• **Commandes totales:** ${analysis.orders.total_orders}
• **Revenus totaux:** ${analysis.orders.total_revenue.toLocaleString()} GNF
• **Panier moyen:** ${analysis.orders.average_order_value.toLocaleString()} GNF

**📈 Période récente:**
• **Aujourd'hui:** ${analysis.orders.orders_today} commandes (${analysis.orders.revenue_today.toLocaleString()} GNF)
• **Cette semaine:** ${analysis.orders.orders_week} commandes (${analysis.orders.revenue_week.toLocaleString()} GNF)
• **Ce mois:** ${analysis.orders.orders_month} commandes (${analysis.orders.revenue_month.toLocaleString()} GNF)

**📊 Statuts:**
• En attente: ${analysis.orders.pending_orders}
• Confirmées: ${analysis.orders.confirmed_orders}
• Livrées: ${analysis.orders.delivered_orders}
• Annulées: ${analysis.orders.cancelled_orders}

---

## 💰 **FINANCES & WALLET**

• **Solde disponible:** ${analysis.finances.wallet_balance.toLocaleString()} GNF
• **Solde en attente:** ${analysis.finances.pending_balance.toLocaleString()} GNF
• **Revenus ce mois:** ${analysis.finances.revenue_this_month.toLocaleString()} GNF
• **Revenus totaux:** ${analysis.finances.revenue_lifetime.toLocaleString()} GNF
• **Retraits effectués:** ${analysis.finances.total_withdrawals.toLocaleString()} GNF
• **Taux paiement réussi:** ${analysis.finances.payment_success_rate}%

---

## 👥 **CLIENTS**

• **Total clients:** ${analysis.customers.total_customers}
• **Nouveaux (30j):** ${analysis.customers.new_customers_30d}
• **Clients fidèles:** ${analysis.customers.returning_customers}
• **Taux fidélisation:** ${analysis.customers.customer_retention_rate}%
• **Valeur vie client moyenne:** ${analysis.customers.average_lifetime_value.toLocaleString()} GNF

---

## ⭐ **RÉPUTATION & AVIS**

• **Note globale:** ${analysis.reputation.overall_rating}/5 ⭐
• **Total avis:** ${analysis.reputation.total_reviews}
• **5 étoiles:** ${analysis.reputation.reviews_5_stars} | **4 étoiles:** ${analysis.reputation.reviews_4_stars}
• **Taux de réponse:** ${analysis.reputation.response_rate}%
• **Avis en attente:** ${analysis.reputation.pending_reviews}

**Sentiment:**
• 👍 Positif: ${analysis.reputation.sentiment_positive}
• 😐 Neutre: ${analysis.reputation.sentiment_neutral}
• 👎 Négatif: ${analysis.reputation.sentiment_negative}

---

## 🚚 **LIVRAISONS**

• **Total livraisons:** ${analysis.deliveries.total_deliveries}
• **Réussies:** ${analysis.deliveries.successful_deliveries}
• **Échouées:** ${analysis.deliveries.failed_deliveries}
• **En transit:** ${analysis.deliveries.in_transit}
• **Taux de succès:** ${analysis.deliveries.success_rate}%
• **COD:** ${analysis.deliveries.cod_orders} | **Prépayé:** ${analysis.deliveries.prepaid_orders}

---

## 📊 **INVENTAIRE**

• **Items totaux:** ${analysis.inventory.total_items}
• **Valeur totale:** ${analysis.inventory.total_value.toLocaleString()} GNF
• **Risque rupture:** ${analysis.inventory.stockout_risk_count} produits
• **Surstock:** ${analysis.inventory.overstock_count} produits
• **Alertes réapprovisionnement:** ${analysis.inventory.reorder_alerts}

---

## 🎯 **SCORES DÉTAILLÉS**

• **Santé inventaire:** ${analysis.health_scores.inventory_health}/100
• **Santé financière:** ${analysis.health_scores.financial_health}/100
• **Satisfaction client:** ${analysis.health_scores.customer_satisfaction}/100
• **Efficacité opérationnelle:** ${analysis.health_scores.operational_efficiency}/100
• **Trajectoire croissance:** ${analysis.health_scores.growth_trajectory}/100

${analysis.health_scores.alerts.length > 0 ? `
---

## ⚠️ **ALERTES ACTIVES**

${analysis.health_scores.alerts.map(alert => 
  `${getAlertEmoji(alert.severity)} **${alert.category}:** ${alert.message}\n   → Action: ${alert.action}`
).join('\n\n')}
` : ''}

---

✅ **Analyse terminée** - Données actualisées à ${new Date().toLocaleTimeString('fr-FR')}
  `.trim();
}

/**
 * 📦 FORMAT INFO PRODUITS
 */
function formatProductsInfo(analysis: VendorDashboardAnalysis): string {
  return `
# 📦 **ANALYSE DE VOS PRODUITS**

Vous avez actuellement **${analysis.products.total} produits** dans votre boutique.

**Détails:**
• ✅ Actifs: ${analysis.products.active}
• ❌ Inactifs: ${analysis.products.inactive}
• 📦 Rupture de stock: ${analysis.products.out_of_stock}
• ⚠️ Stock faible: ${analysis.products.low_stock}

**Valeur:**
• Prix moyen: ${analysis.products.average_price.toLocaleString()} GNF
• Valeur totale inventaire: ${analysis.products.total_inventory_value.toLocaleString()} GNF

**🏆 Vos bestsellers (30 derniers jours):**
${analysis.products.bestsellers.map((p, i) => 
  `${i + 1}. **${p.name}**\n   → ${p.sales_30d} ventes | ${p.revenue_30d.toLocaleString()} GNF`
).join('\n\n')}

${analysis.products.low_stock > 0 || analysis.products.out_of_stock > 0 ? 
`⚠️ **Action requise:** ${analysis.products.out_of_stock + analysis.products.low_stock} produits nécessitent un réapprovisionnement.` 
: '✅ Tous vos produits sont en stock suffisant.'}
  `.trim();
}

/**
 * 🛒 FORMAT INFO COMMANDES
 */
function formatOrdersInfo(analysis: VendorDashboardAnalysis): string {
  return `
# 🛒 **ANALYSE DE VOS VENTES**

**Performances globales:**
• Total commandes: ${analysis.orders.total_orders}
• Revenus totaux: ${analysis.orders.total_revenue.toLocaleString()} GNF
• Panier moyen: ${analysis.orders.average_order_value.toLocaleString()} GNF

**📈 Performances récentes:**

**Aujourd'hui:**
• ${analysis.orders.orders_today} commandes
• ${analysis.orders.revenue_today.toLocaleString()} GNF de revenus

**Cette semaine:**
• ${analysis.orders.orders_week} commandes
• ${analysis.orders.revenue_week.toLocaleString()} GNF de revenus

**Ce mois:**
• ${analysis.orders.orders_month} commandes
• ${analysis.orders.revenue_month.toLocaleString()} GNF de revenus

**📊 Statut des commandes:**
• ⏳ En attente: ${analysis.orders.pending_orders}
• ✅ Confirmées: ${analysis.orders.confirmed_orders}
• 📦 Livrées: ${analysis.orders.delivered_orders}
• ❌ Annulées: ${analysis.orders.cancelled_orders}

${analysis.orders.pending_orders > 0 ? 
`⚠️ **Action requise:** Vous avez ${analysis.orders.pending_orders} commandes en attente de traitement.` 
: '✅ Toutes vos commandes sont traitées.'}
  `.trim();
}

/**
 * 👥 FORMAT INFO CLIENTS
 */
function formatCustomersInfo(analysis: VendorDashboardAnalysis): string {
  return `
# 👥 **ANALYSE DE VOS CLIENTS**

**Base clients:**
• Total: ${analysis.customers.total_customers} clients
• Nouveaux (30j): ${analysis.customers.new_customers_30d}
• Clients fidèles: ${analysis.customers.returning_customers}
• Taux de fidélisation: ${analysis.customers.customer_retention_rate}%

**Valeur clients:**
• Valeur vie moyenne: ${analysis.customers.average_lifetime_value.toLocaleString()} GNF

**🏆 Top clients:**
${analysis.customers.top_customers.map((c, i) => 
  `${i + 1}. ${c.name}\n   → ${c.orders_count} commandes | ${c.total_spent.toLocaleString()} GNF dépensés`
).join('\n\n')}

${analysis.customers.customer_retention_rate < 30 ? 
`⚠️ **Attention:** Votre taux de fidélisation est faible (${analysis.customers.customer_retention_rate}%). Envisagez des programmes de fidélité.` 
: analysis.customers.customer_retention_rate > 60 ?
`✅ Excellent taux de fidélisation ! Vos clients reviennent régulièrement.`
: ''}
  `.trim();
}

/**
 * 💰 FORMAT INFO FINANCES
 */
function formatFinancesInfo(analysis: VendorDashboardAnalysis): string {
  return `
# 💰 **ANALYSE FINANCIÈRE**

**Soldes:**
• 💵 Disponible: ${analysis.finances.wallet_balance.toLocaleString()} GNF
• ⏳ En attente: ${analysis.finances.pending_balance.toLocaleString()} GNF

**Revenus:**
• Ce mois: ${analysis.finances.revenue_this_month.toLocaleString()} GNF
• Total: ${analysis.finances.revenue_lifetime.toLocaleString()} GNF

**Transactions:**
• Retraits effectués: ${analysis.finances.total_withdrawals.toLocaleString()} GNF
• Dépôts: ${analysis.finances.total_deposits.toLocaleString()} GNF

**Paiements:**
• Taux de succès: ${analysis.finances.payment_success_rate}%
• Paiements échoués: ${analysis.finances.failed_payments}

**Méthodes activées:**
${analysis.finances.payment_methods.map(m => `• ${m}`).join('\n')}

${analysis.finances.wallet_balance < 10000 ? 
`⚠️ **Alerte:** Votre solde wallet est faible. Surveillez vos paiements.` 
: analysis.finances.wallet_balance > 100000 ?
`✅ Excellent ! Vous disposez d'une bonne trésorerie.`
: ''}
  `.trim();
}

/**
 * 📊 FORMAT INFO INVENTAIRE
 */
function formatInventoryInfo(analysis: VendorDashboardAnalysis): string {
  return `
# 📊 **ANALYSE INVENTAIRE**

**Stock actuel:**
• Items totaux: ${analysis.inventory.total_items}
• Valeur totale: ${analysis.inventory.total_value.toLocaleString()} GNF

**Alertes:**
• ⚠️ Risque rupture: ${analysis.inventory.stockout_risk_count} produits
• 📦 Surstock: ${analysis.inventory.overstock_count} produits
• 🔔 Alertes réapprovisionnement: ${analysis.inventory.reorder_alerts}

**Santé inventaire: ${analysis.health_scores.inventory_health}/100**

${analysis.inventory.stockout_risk_count > 0 ? 
`⚠️ **Action urgente:** ${analysis.inventory.stockout_risk_count} produits risquent la rupture de stock !` 
: '✅ Votre inventaire est bien géré.'}
  `.trim();
}

/**
 * 💡 FORMAT RECOMMANDATIONS
 */
function formatRecommendations(recommendations: any[]): string {
  return `
# 💡 **RECOMMANDATIONS INTELLIGENTES**

${recommendations.map((rec, i) => 
  `${i + 1}. ${getPriorityEmoji(rec.priority)} **${rec.title}** (${rec.priority.toUpperCase()})
   
   ${rec.description}
   
   📊 Impact potentiel: ${rec.potential_impact}
   🎯 Action: ${rec.action_required}
`).join('\n---\n\n')}
  `.trim();
}

/**
 * 🎯 GÉNÉRATION RECOMMANDATIONS INTELLIGENTES
 */
function generateRecommendations(analysis: VendorDashboardAnalysis): any[] {
  const recommendations: any[] = [];

  // Produits en rupture de stock
  if (analysis.products.out_of_stock > 0) {
    recommendations.push({
      type: 'inventory',
      priority: 'critical',
      title: 'Produits en rupture de stock',
      description: `${analysis.products.out_of_stock} produits sont actuellement en rupture de stock. Cela impacte directement vos ventes.`,
      potential_impact: 'Perte de revenus estimée: 15-30% sur ces produits',
      action_required: 'Réapprovisionner immédiatement les produits en rupture',
    });
  }

  // Stock faible
  if (analysis.inventory.stockout_risk_count > 0) {
    recommendations.push({
      type: 'inventory',
      priority: 'high',
      title: 'Risque de rupture de stock',
      description: `${analysis.inventory.stockout_risk_count} produits ont un stock critique (≤5 unités).`,
      potential_impact: 'Rupture imminente si non traité',
      action_required: 'Planifier le réapprovisionnement cette semaine',
    });
  }

  // Commandes en attente
  if (analysis.orders.pending_orders > 5) {
    recommendations.push({
      type: 'orders',
      priority: 'high',
      title: 'Commandes en attente',
      description: `${analysis.orders.pending_orders} commandes attendent d'être traitées.`,
      potential_impact: 'Risque d\'insatisfaction client',
      action_required: 'Traiter les commandes en attente sous 24h',
    });
  }

  // Avis sans réponse
  if (analysis.reputation.pending_reviews > 3) {
    recommendations.push({
      type: 'reputation',
      priority: 'medium',
      title: 'Avis clients sans réponse',
      description: `${analysis.reputation.pending_reviews} avis clients attendent une réponse de votre part.`,
      potential_impact: 'Amélioration engagement client +20%',
      action_required: 'Répondre aux avis, notamment les négatifs',
    });
  }

  // Taux de fidélisation faible
  if (analysis.customers.customer_retention_rate < 30) {
    recommendations.push({
      type: 'marketing',
      priority: 'medium',
      title: 'Fidélisation client faible',
      description: `Seulement ${analysis.customers.customer_retention_rate}% de vos clients reviennent.`,
      potential_impact: 'Augmentation revenus potentielle: +40%',
      action_required: 'Mettre en place un programme de fidélité',
    });
  }

  // Solde wallet faible
  if (analysis.finances.wallet_balance < 10000) {
    recommendations.push({
      type: 'finances',
      priority: 'medium',
      title: 'Trésorerie faible',
      description: 'Votre solde wallet est inférieur à 10,000 GNF.',
      potential_impact: 'Risque de rupture de trésorerie',
      action_required: 'Surveiller les encaissements ou effectuer un dépôt',
    });
  }

  // Opportunité marketing
  if (analysis.marketing.active_campaigns === 0 && analysis.products.total > 5) {
    recommendations.push({
      type: 'marketing',
      priority: 'low',
      title: 'Aucune campagne marketing active',
      description: 'Vous pourriez augmenter vos ventes avec des promotions ciblées.',
      potential_impact: 'Augmentation ventes potentielle: +25%',
      action_required: 'Créer une campagne promotionnelle',
    });
  }

  return recommendations;
}

// =====================================================
// UTILITAIRES
// =====================================================

function getHealthEmoji(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  if (score >= 40) return '🟠';
  return '🔴';
}

function getRiskEmoji(level: string): string {
  switch (level) {
    case 'low': return '🟢';
    case 'medium': return '🟡';
    case 'high': return '🟠';
    case 'critical': return '🔴';
    default: return '⚪';
  }
}

function getAlertEmoji(severity: string): string {
  switch (severity) {
    case 'info': return 'ℹ️';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    case 'critical': return '🚨';
    default: return '•';
  }
}

function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case 'critical': return '🚨';
    case 'high': return '🔴';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '•';
  }
}

// =====================================================
// UTILITAIRES CLIENT
// =====================================================

function getCustomerStatusEmoji(status: string): string {
  switch (status) {
    case 'new': return '🆕';
    case 'active': return '✅';
    case 'at_risk': return '⚠️';
    case 'inactive': return '😴';
    case 'loyal': return '💎';
    default: return '•';
  }
}

function getSegmentEmoji(segment: string): string {
  switch (segment) {
    case 'vip': return '👑';
    case 'regular': return '⭐';
    case 'occasional': return '🔵';
    case 'one_time': return '🔸';
    default: return '•';
  }
}

function getSegmentLabel(segment: string): string {
  switch (segment) {
    case 'vip': return '👑 VIP (15+ commandes ou >500K GNF)';
    case 'regular': return '⭐ Régulier (5-14 commandes)';
    case 'occasional': return '🔵 Occasionnel (2-4 commandes)';
    case 'one_time': return '🔸 Achat unique';
    default: return 'Non défini';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'new': return '🆕 Nouveau (0 commandes)';
    case 'active': return '✅ Actif (dernière commande <30j)';
    case 'at_risk': return '⚠️ À risque (dernière commande 30-90j)';
    case 'inactive': return '😴 Inactif (>90j sans commande)';
    case 'loyal': return '💎 Fidèle (10+ commandes, fréquent)';
    default: return 'Non défini';
  }
}

function getLoyaltyLevel(score: number): string {
  if (score >= 80) return '🏆 Excellent';
  if (score >= 60) return '⭐ Très bon';
  if (score >= 40) return '👍 Bon';
  if (score >= 20) return '📊 Moyen';
  return '📉 Faible';
}

function generateCustomerRecommendations(analysis: CustomerDetailedAnalysis): string {
  const recommendations: string[] = [];

  if (analysis.is_first_time_buyer) {
    recommendations.push(`
🆕 **NOUVEAU CLIENT - ACTIONS PRIORITAIRES**

1. **Offrir une remise de bienvenue** (10-15%)
2. **Assurer une livraison rapide** pour créer une première impression positive
3. **Envoyer un message de remerciement** après l'achat
4. **Proposer un programme de fidélité** dès maintenant
5. **Demander un avis** après réception pour engagement
    `);
  } else {
    // Client existant
    if (analysis.customer_status === 'inactive') {
      recommendations.push(`
😴 **CLIENT INACTIF** (${analysis.days_since_last_order} jours sans achat)

**Actions urgentes:**
1. 📧 **Email de réactivation** avec offre spéciale
2. 💰 **Code promo exclusif** 15-20% pour revenir
3. 📱 **SMS personnalisé** rappelant les nouveaux produits
4. 🎁 **Cadeau surprise** si commande dans les 7 jours
      `);
    } else if (analysis.customer_status === 'at_risk') {
      recommendations.push(`
⚠️ **CLIENT À RISQUE** (${analysis.days_since_last_order} jours)

**Prévenir le départ:**
1. 📧 Email "On vous a manqué ?"
2. 🔔 Notification nouveautés pertinentes
3. 💬 Sondage satisfaction (pourquoi moins d'achats ?)
4. 🎁 Offre spéciale limitée
      `);
    } else if (analysis.customer_status === 'loyal') {
      recommendations.push(`
💎 **CLIENT FIDÈLE** - Entretenir la relation

**Actions d'excellence:**
1. 🎁 **Récompenses VIP** (produits exclusifs, early access)
2. 🌟 **Programme ambassadeur** (parrainage récompensé)
3. 💌 **Communication privilégiée** (avant-premières, événements)
4. 🎂 **Cadeau anniversaire** client
      `);
    }

    // Recommandations basées sur le comportement
    if (analysis.orders_with_this_vendor === 0 && analysis.total_orders > 0) {
      recommendations.push(`
🔍 **CLIENT POTENTIEL** (achète chez vos concurrents)

**Stratégie d'acquisition:**
1. 💰 Offre de bienvenue agressive (-20%)
2. 🚚 Livraison gratuite première commande
3. ⭐ Mettre en avant vos avantages vs concurrents
4. 💬 Service client proactif
      `);
    }

    if (analysis.average_order_value < 50000 && analysis.total_orders >= 3) {
      recommendations.push(`
📈 **OPPORTUNITÉ UPSELL** (panier moyen: ${analysis.average_order_value.toLocaleString()} GNF)

**Augmenter la valeur:**
1. 🎁 Seuil livraison gratuite à 50,000 GNF
2. 📦 Lots/bundles promotionnels
3. 💎 Programme fidélité basé sur le montant
4. 🔝 Suggestions produits complémentaires
      `);
    }
  }

  return recommendations.join('\n\n---\n\n') || '✅ Aucune action spécifique requise pour le moment.';
}
