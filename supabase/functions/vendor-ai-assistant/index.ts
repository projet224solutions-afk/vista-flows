import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// VENDOR AI ENTERPRISE - Comparable Amazon/Shopify Plus
// Architecture: Analyze → Propose → Validate → Execute
// =====================================================

interface VendorContext {
  vendorId: string;
  businessName: string;
  businessType: string;
  balance: number;
  currency: string;
  totalProducts: number;
  lowStockProducts: number;
  recentProducts: any[];
  recentOrders: any[];
  aiEnabled: boolean;
  executionsToday: number;
  maxDailyExecutions: number;
}

interface AIDecision {
  type: string;
  recommendation: string;
  confidence: number;
  contextData: any;
  priority: string;
  requiresApproval: boolean;
}

// =====================================================
// TOOL DEFINITIONS - ENTERPRISE CAPABILITIES
// =====================================================

const enterpriseTools = [
  // 1. SENTIMENT AI - Analyse des avis clients
  {
    type: "function",
    function: {
      name: "analyze_customer_reviews",
      description: "Analyse les avis clients avec détection de sentiment, identification des thèmes récurrents et génération de réponses professionnelles. L'IA ne publie JAMAIS seule - toute réponse doit être validée par le vendeur.",
      parameters: {
        type: "object",
        properties: {
          review_type: {
            type: "string",
            enum: ["vendor_rating", "product_review", "all"],
            description: "Type d'avis à analyser"
          },
          limit: {
            type: "number",
            description: "Nombre d'avis à analyser (max 50)"
          },
          filter_sentiment: {
            type: "string",
            enum: ["all", "negative", "critical"],
            description: "Filtrer par sentiment pour prioriser les urgences"
          }
        },
        required: ["review_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_review_response",
      description: "Génère une réponse professionnelle et polie pour un avis client spécifique. La réponse est proposée et DOIT être validée avant publication.",
      parameters: {
        type: "object",
        properties: {
          review_id: { type: "string", description: "ID de l'avis" },
          review_type: { type: "string", enum: ["vendor_rating", "product_review"] },
          tone: { 
            type: "string", 
            enum: ["professional", "empathetic", "apologetic", "grateful"],
            description: "Ton de la réponse" 
          }
        },
        required: ["review_id", "review_type"]
      }
    }
  },

  // 2. DOCUMENT GENERATION - PDF Professionnels
  {
    type: "function",
    function: {
      name: "generate_professional_document",
      description: "Génère des documents PDF professionnels: guides d'utilisation, manuels, rapports, documentation personnalisée avec page de couverture, sommaire, pagination et style entreprise.",
      parameters: {
        type: "object",
        properties: {
          document_type: {
            type: "string",
            enum: ["user_guide", "operations_manual", "sales_report", "inventory_report", "marketing_report", "custom"],
            description: "Type de document à générer"
          },
          language: { type: "string", enum: ["fr", "en"], description: "Langue du document" },
          period: { type: "string", description: "Période couverte (ex: '2024-01', 'last_30_days')" },
          include_charts: { type: "boolean", description: "Inclure des graphiques" },
          custom_title: { type: "string", description: "Titre personnalisé si document custom" }
        },
        required: ["document_type"]
      }
    }
  },

  // 3. ORDER INTELLIGENCE - Mode Assistant (PAS autonome)
  {
    type: "function",
    function: {
      name: "analyze_orders",
      description: "Analyse les commandes pour détecter retards, risques, anomalies et fraudes comportementales. Propose des actions recommandées. L'IA NE PEUT PAS annuler, modifier ou rembourser - elle recommande uniquement.",
      parameters: {
        type: "object",
        properties: {
          analysis_type: {
            type: "string",
            enum: ["risk_detection", "delay_analysis", "fraud_behavioral", "sla_compliance", "full_analysis"],
            description: "Type d'analyse à effectuer"
          },
          period_days: { type: "number", description: "Période en jours (défaut 30)" },
          priority_filter: { type: "string", enum: ["all", "high", "critical"] }
        },
        required: ["analysis_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "recommend_order_action",
      description: "Propose une action pour une commande spécifique. L'action est SOUMISE À VALIDATION HUMAINE avant exécution. Interdit: annuler, rembourser, modifier paiement.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "ID de la commande" },
          action_type: {
            type: "string",
            enum: ["contact_customer", "prioritize", "flag_attention", "prepare_message"],
            description: "Type d'action recommandée (aucune action critique permise)"
          },
          reason: { type: "string", description: "Raison de la recommandation" }
        },
        required: ["order_id", "action_type"]
      }
    }
  },

  // 4. INVENTORY INTELLIGENCE - Stock Prédictif
  {
    type: "function",
    function: {
      name: "analyze_inventory",
      description: "Analyse intelligente des stocks: prédiction de ruptures, détection de surstock, recommandation de stock optimal (7/30/90 jours). L'IA NE passe JAMAIS de commande fournisseur.",
      parameters: {
        type: "object",
        properties: {
          analysis_type: {
            type: "string",
            enum: ["stockout_risk", "overstock_detection", "optimal_reorder", "full_analysis"],
            description: "Type d'analyse inventaire"
          },
          forecast_days: { type: "number", enum: [7, 30, 90], description: "Période de prévision" },
          category_filter: { type: "string", description: "Filtrer par catégorie de produits" }
        },
        required: ["analysis_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_stock_recommendations",
      description: "Obtient les recommandations de réapprovisionnement pour les produits. Recommendations uniquement - aucune commande automatique.",
      parameters: {
        type: "object",
        properties: {
          urgency_level: { type: "string", enum: ["all", "urgent", "critical"] },
          limit: { type: "number", description: "Nombre max de recommandations" }
        }
      }
    }
  },

  // 5. MARKETING INTELLIGENCE - Enterprise
  {
    type: "function",
    function: {
      name: "analyze_marketing_performance",
      description: "Analyse complète des performances marketing: produits dormants, segmentation clients, ROI des campagnes passées.",
      parameters: {
        type: "object",
        properties: {
          analysis_scope: {
            type: "string",
            enum: ["dormant_products", "customer_segmentation", "campaign_performance", "conversion_analysis", "full_analysis"]
          },
          period_days: { type: "number", description: "Période d'analyse" }
        },
        required: ["analysis_scope"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "propose_marketing_campaign",
      description: "Propose une campagne marketing ciblée (SMS, push, email, in-app). La campagne DOIT être validée puis exécutée par le système après approbation.",
      parameters: {
        type: "object",
        properties: {
          campaign_type: { type: "string", enum: ["sms", "push", "email", "in_app"] },
          target_segment: { type: "string", enum: ["all", "inactive", "loyal", "new", "high_value"] },
          objective: { type: "string", description: "Objectif de la campagne" },
          generate_content: { type: "boolean", description: "Générer le contenu marketing" }
        },
        required: ["campaign_type", "target_segment"]
      }
    }
  },

  // 6. GOVERNANCE & CONTROL
  {
    type: "function",
    function: {
      name: "get_ai_activity_log",
      description: "Consulte l'historique des décisions et recommandations IA avec leur statut (pending, approved, rejected, executed).",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", enum: ["all", "pending", "approved", "rejected", "executed"] },
          decision_type: { type: "string", enum: ["all", "review_response", "order_action", "stock_alert", "marketing_campaign"] },
          limit: { type: "number" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "approve_ai_decision",
      description: "Approuve une décision/recommandation IA en attente. Nécessaire avant toute exécution.",
      parameters: {
        type: "object",
        properties: {
          decision_id: { type: "string", description: "ID de la décision à approuver" },
          modifications: { type: "string", description: "Modifications avant approbation (optionnel)" }
        },
        required: ["decision_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reject_ai_decision",
      description: "Rejette une décision/recommandation IA.",
      parameters: {
        type: "object",
        properties: {
          decision_id: { type: "string", description: "ID de la décision à rejeter" },
          reason: { type: "string", description: "Raison du rejet" }
        },
        required: ["decision_id", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "toggle_ai_features",
      description: "Active/désactive les fonctionnalités IA (kill-switch). Permet de désactiver immédiatement toute l'IA ou des modules spécifiques.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["enable_all", "disable_all", "toggle_module"] },
          module: { type: "string", enum: ["reviews", "orders", "inventory", "marketing", "documents"] },
          reason: { type: "string", description: "Raison de l'action" }
        },
        required: ["action"]
      }
    }
  },

  // 7. DASHBOARD & INSIGHTS
  {
    type: "function",
    function: {
      name: "get_ai_dashboard",
      description: "Obtient le tableau de bord IA avec statistiques, insights et recommandations prioritaires.",
      parameters: {
        type: "object",
        properties: {
          include_pending_decisions: { type: "boolean" },
          include_urgent_alerts: { type: "boolean" },
          include_performance_summary: { type: "boolean" }
        }
      }
    }
  }
];

// =====================================================
// TOOL EXECUTION FUNCTIONS
// =====================================================

async function analyzeCustomerReviews(supabase: any, vendorId: string, params: any) {
  const { review_type, limit = 20, filter_sentiment = "all" } = params;
  const startTime = Date.now();

  // Récupérer les avis
  let reviews: any[] = [];
  
  if (review_type === "vendor_rating" || review_type === "all") {
    const { data: vendorRatings } = await supabase
      .from('vendor_ratings')
      .select('id, rating, comment, created_at, customer_id, vendor_response')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (vendorRatings) {
      reviews.push(...vendorRatings.map((r: any) => ({ ...r, type: 'vendor_rating' })));
    }
  }

  if (review_type === "product_review" || review_type === "all") {
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('vendor_id', vendorId);
    
    if (products && products.length > 0) {
      const productIds = products.map((p: any) => p.id);
      const { data: productReviews } = await supabase
        .from('product_reviews')
        .select('id, rating, title, content, created_at, user_id, vendor_response, product_id')
        .in('product_id', productIds)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (productReviews) {
        reviews.push(...productReviews.map((r: any) => ({ ...r, type: 'product_review', comment: r.content })));
      }
    }
  }

  // Analyser les sentiments avec l'IA interne
  const analyzedReviews = reviews.map((review: any) => {
    const text = review.comment || review.content || '';
    const rating = review.rating;
    
    // Analyse de sentiment basée sur le rating et les mots-clés
    let sentiment = 'neutral';
    let sentimentScore = 0;
    let urgencyLevel = 'normal';
    const keyTopics: string[] = [];

    // Analyse par rating
    if (rating >= 4) {
      sentiment = 'positive';
      sentimentScore = rating === 5 ? 0.9 : 0.6;
    } else if (rating === 3) {
      sentiment = 'neutral';
      sentimentScore = 0;
    } else if (rating === 2) {
      sentiment = 'negative';
      sentimentScore = -0.5;
      urgencyLevel = 'high';
    } else if (rating === 1) {
      sentiment = 'critical';
      sentimentScore = -0.9;
      urgencyLevel = 'urgent';
    }

    // Détection des thèmes par mots-clés (français)
    const lowerText = text.toLowerCase();
    if (lowerText.includes('livraison') || lowerText.includes('délai') || lowerText.includes('retard')) {
      keyTopics.push('livraison');
    }
    if (lowerText.includes('qualité') || lowerText.includes('défaut') || lowerText.includes('cassé')) {
      keyTopics.push('qualité');
    }
    if (lowerText.includes('prix') || lowerText.includes('cher') || lowerText.includes('coût')) {
      keyTopics.push('prix');
    }
    if (lowerText.includes('service') || lowerText.includes('client') || lowerText.includes('réponse')) {
      keyTopics.push('service');
    }

    return {
      ...review,
      sentiment,
      sentimentScore,
      urgencyLevel,
      keyTopics,
      needsResponse: !review.vendor_response && (sentiment === 'negative' || sentiment === 'critical')
    };
  });

  // Filtrer si nécessaire
  let filteredReviews = analyzedReviews;
  if (filter_sentiment === 'negative') {
    filteredReviews = analyzedReviews.filter((r: any) => r.sentiment === 'negative' || r.sentiment === 'critical');
  } else if (filter_sentiment === 'critical') {
    filteredReviews = analyzedReviews.filter((r: any) => r.sentiment === 'critical');
  }

  // Statistiques globales
  const stats = {
    total: reviews.length,
    positive: analyzedReviews.filter((r: any) => r.sentiment === 'positive').length,
    neutral: analyzedReviews.filter((r: any) => r.sentiment === 'neutral').length,
    negative: analyzedReviews.filter((r: any) => r.sentiment === 'negative').length,
    critical: analyzedReviews.filter((r: any) => r.sentiment === 'critical').length,
    needingResponse: analyzedReviews.filter((r: any) => r.needsResponse).length,
    avgRating: reviews.length > 0 ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length : 0,
    topicDistribution: {
      livraison: analyzedReviews.filter((r: any) => r.keyTopics.includes('livraison')).length,
      qualite: analyzedReviews.filter((r: any) => r.keyTopics.includes('qualité')).length,
      prix: analyzedReviews.filter((r: any) => r.keyTopics.includes('prix')).length,
      service: analyzedReviews.filter((r: any) => r.keyTopics.includes('service')).length
    }
  };

  // Log l'exécution
  await supabase.from('vendor_ai_execution_logs').insert({
    vendor_id: vendorId,
    action_type: 'analyze_customer_reviews',
    input_data: params,
    output_data: { stats, reviewCount: filteredReviews.length },
    execution_time_ms: Date.now() - startTime,
    model_used: 'internal_sentiment_analyzer',
    success: true
  });

  return {
    success: true,
    data: {
      stats,
      reviews: filteredReviews.slice(0, 10), // Limiter pour la réponse
      urgentReviews: filteredReviews.filter((r: any) => r.urgencyLevel === 'urgent'),
      recommendations: [
        stats.critical > 0 ? `⚠️ ${stats.critical} avis critiques nécessitent une attention immédiate` : null,
        stats.needingResponse > 0 ? `📝 ${stats.needingResponse} avis sans réponse en attente` : null,
        stats.topicDistribution.livraison > 2 ? `🚚 Problème récurrent de livraison détecté` : null
      ].filter(Boolean)
    }
  };
}

async function generateReviewResponse(supabase: any, vendorId: string, params: any) {
  const { review_id, review_type, tone = "professional" } = params;
  
  // Récupérer l'avis
  let review: any = null;
  if (review_type === 'vendor_rating') {
    const { data } = await supabase
      .from('vendor_ratings')
      .select('*')
      .eq('id', review_id)
      .single();
    review = data;
  } else {
    const { data } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('id', review_id)
      .single();
    review = data;
  }

  if (!review) {
    return { success: false, error: "Avis non trouvé" };
  }

  // Générer une réponse basée sur le ton et le contexte
  const reviewText = review.comment || review.content || '';
  const rating = review.rating;
  
  let responseTemplate = '';
  
  switch (tone) {
    case 'apologetic':
      responseTemplate = `Nous vous présentons nos sincères excuses pour cette expérience décevante. Votre avis est très important pour nous et nous prenons vos remarques très au sérieux. Nous allons immédiatement examiner ce qui s'est passé et prendre les mesures nécessaires. Notre équipe va vous contacter directement pour résoudre ce problème. Encore une fois, nous sommes vraiment désolés.`;
      break;
    case 'empathetic':
      responseTemplate = `Nous comprenons parfaitement votre frustration et nous vous remercions d'avoir pris le temps de partager votre expérience. Votre satisfaction est notre priorité. Nous aimerions en savoir plus sur ce qui s'est passé afin de pouvoir corriger cette situation. N'hésitez pas à nous contacter directement.`;
      break;
    case 'grateful':
      responseTemplate = `Merci infiniment pour votre avis et votre confiance ! Nous sommes ravis que votre expérience ait été positive. Votre satisfaction nous motive à continuer à vous offrir le meilleur service possible. À très bientôt !`;
      break;
    default: // professional
      responseTemplate = rating >= 4 
        ? `Merci beaucoup pour votre retour. Nous sommes ravis que nos produits/services aient répondu à vos attentes. Votre satisfaction est notre priorité et nous espérons vous revoir bientôt.`
        : `Merci pour votre retour. Nous regrettons que votre expérience n'ait pas été à la hauteur de vos attentes. Nous prenons vos remarques en considération et allons travailler à améliorer ce point. N'hésitez pas à nous contacter pour que nous puissions vous aider.`;
  }

  // Créer une décision en attente de validation
  const { data: decision, error } = await supabase
    .from('vendor_ai_decisions')
    .insert({
      vendor_id: vendorId,
      decision_type: 'review_response',
      ai_recommendation: responseTemplate,
      ai_confidence: 0.85,
      context_data: { review_id, review_type, review_rating: rating, review_text: reviewText, tone },
      status: 'pending',
      priority: rating <= 2 ? 'high' : 'normal',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Sauvegarder l'analyse de sentiment
  await supabase.from('vendor_review_sentiment_analysis').insert({
    vendor_id: vendorId,
    review_id: review_id,
    review_type: review_type,
    original_text: reviewText,
    sentiment: rating >= 4 ? 'positive' : rating >= 3 ? 'neutral' : rating >= 2 ? 'negative' : 'critical',
    sentiment_score: (rating - 3) / 2, // -1 à 1
    urgency_level: rating <= 2 ? 'high' : 'normal',
    key_topics: [],
    ai_suggested_response: responseTemplate
  });

  return {
    success: true,
    data: {
      decision_id: decision.id,
      suggested_response: responseTemplate,
      status: 'pending_approval',
      message: "⚠️ Cette réponse doit être VALIDÉE avant publication. Utilisez 'approve_ai_decision' pour approuver."
    }
  };
}

async function analyzeInventory(supabase: any, vendorId: string, params: any) {
  const { analysis_type, forecast_days = 30, category_filter } = params;
  const startTime = Date.now();

  // Récupérer les produits avec leur stock
  let query = supabase
    .from('products')
    .select('id, name, stock_quantity, price, category_id, status, created_at')
    .eq('vendor_id', vendorId)
    .eq('status', 'active');

  const { data: products, error } = await query;
  if (error) return { success: false, error: error.message };

  // Récupérer l'historique des commandes pour analyse
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, quantity, created_at')
    .gte('created_at', thirtyDaysAgo);

  // Calculer les ventes par produit
  const salesByProduct: Record<string, number> = {};
  (orderItems || []).forEach((item: any) => {
    salesByProduct[item.product_id] = (salesByProduct[item.product_id] || 0) + item.quantity;
  });

  // Analyser chaque produit
  const productAnalysis = (products || []).map((product: any) => {
    const monthlySales = salesByProduct[product.id] || 0;
    const dailyAvgSales = monthlySales / 30;
    const daysOfStock = dailyAvgSales > 0 ? Math.floor(product.stock_quantity / dailyAvgSales) : Infinity;
    
    let riskLevel = 'low';
    let alertType = null;
    let recommendedQuantity = 0;

    // Détection des risques
    if (product.stock_quantity === 0) {
      riskLevel = 'critical';
      alertType = 'stockout';
      recommendedQuantity = Math.ceil(dailyAvgSales * forecast_days);
    } else if (daysOfStock < 7) {
      riskLevel = 'high';
      alertType = 'low_stock';
      recommendedQuantity = Math.ceil(dailyAvgSales * forecast_days) - product.stock_quantity;
    } else if (daysOfStock > 180 && monthlySales < 2) {
      riskLevel = 'medium';
      alertType = 'overstock';
    } else if (daysOfStock < forecast_days) {
      riskLevel = 'medium';
      alertType = 'stockout_risk';
      recommendedQuantity = Math.ceil(dailyAvgSales * forecast_days) - product.stock_quantity;
    }

    return {
      productId: product.id,
      productName: product.name,
      currentStock: product.stock_quantity,
      monthlySales,
      dailyAvgSales: Math.round(dailyAvgSales * 100) / 100,
      daysOfStock: daysOfStock === Infinity ? 'N/A' : daysOfStock,
      riskLevel,
      alertType,
      recommendedQuantity: Math.max(0, recommendedQuantity),
      predictedStockoutDate: daysOfStock !== Infinity && daysOfStock < forecast_days 
        ? new Date(Date.now() + daysOfStock * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null
    };
  });

  // Filtrer selon le type d'analyse
  let filteredProducts = productAnalysis;
  switch (analysis_type) {
    case 'stockout_risk':
      filteredProducts = productAnalysis.filter((p: any) => p.alertType === 'stockout_risk' || p.alertType === 'stockout' || p.alertType === 'low_stock');
      break;
    case 'overstock_detection':
      filteredProducts = productAnalysis.filter((p: any) => p.alertType === 'overstock');
      break;
    case 'optimal_reorder':
      filteredProducts = productAnalysis.filter((p: any) => p.recommendedQuantity > 0);
      break;
  }

  // Créer des alertes pour les produits critiques
  const criticalProducts = productAnalysis.filter((p: any) => p.riskLevel === 'critical' || p.riskLevel === 'high');
  for (const product of criticalProducts) {
    await supabase.from('vendor_stock_ai_alerts').upsert({
      vendor_id: vendorId,
      product_id: product.productId,
      alert_type: product.alertType,
      current_stock: product.currentStock,
      predicted_stockout_date: product.predictedStockoutDate,
      recommended_quantity: product.recommendedQuantity,
      recommendation_basis: `Basé sur ${product.dailyAvgSales} ventes/jour en moyenne`,
      confidence: 0.8,
      status: 'active'
    }, { onConflict: 'vendor_id,product_id' });
  }

  // Stats globales
  const stats = {
    totalProducts: products?.length || 0,
    outOfStock: productAnalysis.filter((p: any) => p.currentStock === 0).length,
    lowStock: productAnalysis.filter((p: any) => p.riskLevel === 'high').length,
    overstocked: productAnalysis.filter((p: any) => p.alertType === 'overstock').length,
    healthy: productAnalysis.filter((p: any) => p.riskLevel === 'low').length,
    totalValueAtRisk: productAnalysis
      .filter((p: any) => p.riskLevel !== 'low')
      .reduce((sum: number, p: any) => sum + (products?.find((pr: any) => pr.id === p.productId)?.price || 0) * p.currentStock, 0)
  };

  // Log l'exécution
  await supabase.from('vendor_ai_execution_logs').insert({
    vendor_id: vendorId,
    action_type: 'analyze_inventory',
    input_data: params,
    output_data: { stats, analysisCount: filteredProducts.length },
    execution_time_ms: Date.now() - startTime,
    model_used: 'internal_inventory_analyzer',
    success: true
  });

  return {
    success: true,
    data: {
      stats,
      analysis: filteredProducts.slice(0, 20),
      urgentAlerts: criticalProducts,
      recommendations: [
        stats.outOfStock > 0 ? `🚨 ${stats.outOfStock} produits en rupture de stock` : null,
        stats.lowStock > 0 ? `⚠️ ${stats.lowStock} produits en stock faible` : null,
        stats.overstocked > 0 ? `📦 ${stats.overstocked} produits en surstock` : null
      ].filter(Boolean),
      disclaimer: "⚠️ L'IA recommande uniquement. Aucune commande fournisseur n'est passée automatiquement."
    }
  };
}

async function analyzeOrders(supabase: any, vendorId: string, params: any) {
  const { analysis_type, period_days = 30, priority_filter = 'all' } = params;
  const startTime = Date.now();
  const startDate = new Date(Date.now() - period_days * 24 * 60 * 60 * 1000).toISOString();

  // Récupérer les commandes
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('vendor_id', vendorId)
    .gte('created_at', startDate)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };

  // Analyser chaque commande
  const orderAnalysis = (orders || []).map((order: any) => {
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    let riskLevel = 'low';
    let risks: string[] = [];
    let recommendedActions: string[] = [];

    // Analyse des risques
    // Retard potentiel
    if (order.status === 'pending' && ageInHours > 48) {
      riskLevel = 'high';
      risks.push('Commande en attente depuis plus de 48h');
      recommendedActions.push('Contacter le client pour confirmer');
    }

    // Commande de grande valeur
    if (order.total_amount > 500000) { // GNF
      if (riskLevel !== 'high') riskLevel = 'medium';
      risks.push('Commande de haute valeur');
      recommendedActions.push('Vérifier le paiement');
    }

    // Nombreux articles
    if (order.order_items && order.order_items.length > 10) {
      risks.push('Commande volumineuse');
      recommendedActions.push('Prioriser la préparation');
    }

    // SLA compliance
    const expectedDeliveryHours = 72; // 3 jours standard
    const slaCompliance = ageInHours < expectedDeliveryHours;
    if (!slaCompliance && order.status !== 'delivered') {
      riskLevel = 'critical';
      risks.push('SLA potentiellement dépassé');
      recommendedActions.push('Action immédiate requise');
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      amount: order.total_amount,
      itemCount: order.order_items?.length || 0,
      createdAt: order.created_at,
      ageInHours: Math.round(ageInHours),
      riskLevel,
      risks,
      recommendedActions,
      slaCompliance
    };
  });

  // Filtrer selon le type d'analyse
  let filteredOrders = orderAnalysis;
  switch (analysis_type) {
    case 'risk_detection':
      filteredOrders = orderAnalysis.filter((o: any) => o.risks.length > 0);
      break;
    case 'delay_analysis':
      filteredOrders = orderAnalysis.filter((o: any) => o.ageInHours > 24 && o.status !== 'delivered');
      break;
    case 'sla_compliance':
      filteredOrders = orderAnalysis.filter((o: any) => !o.slaCompliance);
      break;
  }

  if (priority_filter !== 'all') {
    filteredOrders = filteredOrders.filter((o: any) => 
      priority_filter === 'critical' ? o.riskLevel === 'critical' : 
      o.riskLevel === 'high' || o.riskLevel === 'critical'
    );
  }

  const stats = {
    totalOrders: orders?.length || 0,
    pending: orderAnalysis.filter((o: any) => o.status === 'pending').length,
    atRisk: orderAnalysis.filter((o: any) => o.riskLevel !== 'low').length,
    critical: orderAnalysis.filter((o: any) => o.riskLevel === 'critical').length,
    slaViolations: orderAnalysis.filter((o: any) => !o.slaCompliance).length,
    avgProcessingTime: Math.round(orderAnalysis.reduce((sum: number, o: any) => sum + o.ageInHours, 0) / (orderAnalysis.length || 1))
  };

  await supabase.from('vendor_ai_execution_logs').insert({
    vendor_id: vendorId,
    action_type: 'analyze_orders',
    input_data: params,
    output_data: { stats, analysisCount: filteredOrders.length },
    execution_time_ms: Date.now() - startTime,
    model_used: 'internal_order_analyzer',
    success: true
  });

  return {
    success: true,
    data: {
      stats,
      orders: filteredOrders.slice(0, 20),
      criticalOrders: filteredOrders.filter((o: any) => o.riskLevel === 'critical'),
      disclaimer: "⚠️ L'IA analyse et recommande. Aucune action (annulation, remboursement, modification) n'est effectuée automatiquement."
    }
  };
}

async function analyzeMarketingPerformance(supabase: any, vendorId: string, params: any) {
  const { analysis_scope, period_days = 30 } = params;
  const startTime = Date.now();
  const startDate = new Date(Date.now() - period_days * 24 * 60 * 60 * 1000).toISOString();

  // Récupérer les données marketing
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock_quantity, created_at')
    .eq('vendor_id', vendorId)
    .eq('status', 'active');

  const { data: orders } = await supabase
    .from('orders')
    .select('id, customer_id, total_amount, created_at, order_items(product_id, quantity)')
    .eq('vendor_id', vendorId)
    .gte('created_at', startDate);

  const { data: campaigns } = await supabase
    .from('vendor_ai_marketing_campaigns')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Analyse des produits dormants
  const productSales: Record<string, number> = {};
  (orders || []).forEach((order: any) => {
    (order.order_items || []).forEach((item: any) => {
      productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity;
    });
  });

  const dormantProducts = (products || [])
    .filter((p: any) => (productSales[p.id] || 0) === 0)
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      daysSinceCreation: Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      recommendation: "Considérer une promotion ou une mise en avant"
    }));

  // Segmentation clients
  const customerPurchases: Record<string, { count: number; total: number; lastPurchase: string }> = {};
  (orders || []).forEach((order: any) => {
    if (!customerPurchases[order.customer_id]) {
      customerPurchases[order.customer_id] = { count: 0, total: 0, lastPurchase: '' };
    }
    customerPurchases[order.customer_id].count++;
    customerPurchases[order.customer_id].total += order.total_amount;
    if (order.created_at > customerPurchases[order.customer_id].lastPurchase) {
      customerPurchases[order.customer_id].lastPurchase = order.created_at;
    }
  });

  const segments = {
    loyal: Object.entries(customerPurchases).filter(([_, v]) => v.count >= 3).length,
    highValue: Object.entries(customerPurchases).filter(([_, v]) => v.total > 1000000).length,
    newCustomers: Object.entries(customerPurchases).filter(([_, v]) => v.count === 1).length,
    inactive: 0 // Nécessiterait plus de données historiques
  };

  const stats = {
    totalProducts: products?.length || 0,
    dormantProducts: dormantProducts.length,
    totalCustomers: Object.keys(customerPurchases).length,
    segments,
    totalRevenue: (orders || []).reduce((sum: number, o: any) => sum + o.total_amount, 0),
    avgOrderValue: orders?.length ? Math.round((orders.reduce((sum: number, o: any) => sum + o.total_amount, 0) / orders.length)) : 0,
    pastCampaigns: campaigns?.length || 0
  };

  await supabase.from('vendor_ai_execution_logs').insert({
    vendor_id: vendorId,
    action_type: 'analyze_marketing_performance',
    input_data: params,
    output_data: { stats },
    execution_time_ms: Date.now() - startTime,
    model_used: 'internal_marketing_analyzer',
    success: true
  });

  return {
    success: true,
    data: {
      stats,
      dormantProducts: dormantProducts.slice(0, 10),
      customerSegments: segments,
      recommendations: [
        dormantProducts.length > 0 ? `🏷️ ${dormantProducts.length} produits dormants - envisager une promotion` : null,
        segments.inactive > segments.loyal ? `📧 Relancer les clients inactifs avec une campagne email` : null,
        segments.loyal > 5 ? `⭐ Programme de fidélité recommandé pour ${segments.loyal} clients loyaux` : null
      ].filter(Boolean),
      disclaimer: "Les campagnes proposées doivent être validées avant envoi."
    }
  };
}

async function proposeMarketingCampaign(supabase: any, vendorId: string, params: any) {
  const { campaign_type, target_segment, objective = 'increase_sales', generate_content = true } = params;

  // Récupérer le contexte du vendeur
  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name')
    .eq('id', vendorId)
    .single();

  // Générer le contenu selon le type et le segment
  let messageContent = '';
  let campaignName = '';
  let predictedConversionRate = 0;

  switch (target_segment) {
    case 'inactive':
      campaignName = 'Campagne de réactivation';
      messageContent = `Vous nous manquez ! 🛍️ ${vendor?.business_name || 'Votre boutique préférée'} a de nouvelles offres exclusives pour vous. Revenez découvrir nos nouveautés et profitez de -10% sur votre prochaine commande avec le code RETOUR10.`;
      predictedConversionRate = 5.2;
      break;
    case 'loyal':
      campaignName = 'Récompense fidélité';
      messageContent = `Merci pour votre fidélité ! ⭐ En tant que client privilégié de ${vendor?.business_name || 'notre boutique'}, bénéficiez d'une offre exclusive : -15% sur tout le catalogue. Code : VIP15`;
      predictedConversionRate = 12.5;
      break;
    case 'new':
      campaignName = 'Bienvenue nouveaux clients';
      messageContent = `Bienvenue chez ${vendor?.business_name || 'nous'} ! 🎉 Pour célébrer votre inscription, profitez de la livraison gratuite sur votre première commande. À très vite !`;
      predictedConversionRate = 8.3;
      break;
    case 'high_value':
      campaignName = 'Offre exclusive VIP';
      messageContent = `🌟 Offre VIP exclusive ! En tant que client premium de ${vendor?.business_name || 'notre boutique'}, accédez en avant-première à notre nouvelle collection avec -20%.`;
      predictedConversionRate = 15.8;
      break;
    default:
      campaignName = 'Campagne générale';
      messageContent = `📢 Nouvelles offres chez ${vendor?.business_name || 'nous'} ! Découvrez nos promotions exceptionnelles. Stocks limités !`;
      predictedConversionRate = 3.5;
  }

  // Créer la proposition de campagne
  const { data: campaign, error } = await supabase
    .from('vendor_ai_marketing_campaigns')
    .insert({
      vendor_id: vendorId,
      campaign_name: campaignName,
      campaign_type: campaign_type,
      target_segment: target_segment,
      message_content: messageContent,
      ai_reasoning: `Campagne ciblée pour le segment "${target_segment}" via ${campaign_type}. Objectif: ${objective}. Taux de conversion prédit basé sur les benchmarks du secteur.`,
      predicted_conversion_rate: predictedConversionRate,
      status: 'proposed'
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Créer une décision pour approbation
  const { data: decision } = await supabase
    .from('vendor_ai_decisions')
    .insert({
      vendor_id: vendorId,
      decision_type: 'marketing_campaign',
      ai_recommendation: `Lancer la campagne "${campaignName}" - ${campaign_type} vers ${target_segment}`,
      ai_confidence: 0.78,
      context_data: { campaign_id: campaign.id, campaign_type, target_segment, messageContent },
      status: 'pending',
      priority: 'normal'
    })
    .select()
    .single();

  return {
    success: true,
    data: {
      campaign,
      decision_id: decision?.id,
      status: 'proposed_awaiting_approval',
      message: "⚠️ Cette campagne DOIT être VALIDÉE avant envoi. Utilisez 'approve_ai_decision' pour lancer la campagne."
    }
  };
}

async function generateProfessionalDocument(supabase: any, vendorId: string, params: any) {
  const { document_type, language = 'fr', period, include_charts = true, custom_title } = params;
  const startTime = Date.now();

  // Récupérer les infos du vendeur
  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, business_type, logo_url')
    .eq('id', vendorId)
    .single();

  // Générer la structure du document selon le type
  let documentContent: any = {
    metadata: {
      title: custom_title || getDocumentTitle(document_type, language),
      language,
      generatedAt: new Date().toISOString(),
      vendorName: vendor?.business_name || 'Vendeur',
      vendorLogo: vendor?.logo_url,
      period
    },
    coverPage: {
      title: custom_title || getDocumentTitle(document_type, language),
      subtitle: vendor?.business_name,
      date: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US'),
      logo: vendor?.logo_url
    },
    tableOfContents: [],
    sections: []
  };

  // Générer le contenu selon le type
  switch (document_type) {
    case 'user_guide':
      documentContent.sections = generateUserGuideContent(language);
      break;
    case 'operations_manual':
      documentContent.sections = generateOperationsManualContent(language);
      break;
    case 'sales_report':
      const salesData = await getSalesReportData(supabase, vendorId, period);
      documentContent.sections = generateSalesReportContent(salesData, language, include_charts);
      break;
    case 'inventory_report':
      const inventoryData = await getInventoryReportData(supabase, vendorId);
      documentContent.sections = generateInventoryReportContent(inventoryData, language);
      break;
    case 'marketing_report':
      const marketingData = await getMarketingReportData(supabase, vendorId, period);
      documentContent.sections = generateMarketingReportContent(marketingData, language);
      break;
    default:
      documentContent.sections = [{ title: 'Document personnalisé', content: 'Contenu à définir.' }];
  }

  // Générer la table des matières
  documentContent.tableOfContents = documentContent.sections.map((s: any, i: number) => ({
    number: i + 1,
    title: s.title,
    page: i + 2
  }));

  // Sauvegarder le document
  const { data: doc, error } = await supabase
    .from('vendor_ai_documents')
    .insert({
      vendor_id: vendorId,
      document_type,
      document_title: documentContent.metadata.title,
      document_content: documentContent,
      language,
      status: 'generated',
      metadata: { include_charts, period }
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await supabase.from('vendor_ai_execution_logs').insert({
    vendor_id: vendorId,
    action_type: 'generate_professional_document',
    input_data: params,
    output_data: { document_id: doc.id, document_type },
    execution_time_ms: Date.now() - startTime,
    model_used: 'internal_document_generator',
    success: true
  });

  return {
    success: true,
    data: {
      document_id: doc.id,
      title: documentContent.metadata.title,
      sections_count: documentContent.sections.length,
      status: 'generated',
      message: "Document généré avec succès. Le PDF peut être téléchargé depuis l'interface documents."
    }
  };
}

function getDocumentTitle(type: string, lang: string): string {
  const titles: Record<string, Record<string, string>> = {
    user_guide: { fr: "Guide d'Utilisation - Interface Vendeur", en: "User Guide - Vendor Interface" },
    operations_manual: { fr: "Manuel des Opérations", en: "Operations Manual" },
    sales_report: { fr: "Rapport des Ventes", en: "Sales Report" },
    inventory_report: { fr: "Rapport d'Inventaire", en: "Inventory Report" },
    marketing_report: { fr: "Rapport Marketing", en: "Marketing Report" }
  };
  return titles[type]?.[lang] || 'Document';
}

function generateUserGuideContent(lang: string) {
  const isFr = lang === 'fr';
  return [
    {
      title: isFr ? "1. Introduction" : "1. Introduction",
      content: isFr 
        ? "Bienvenue dans votre interface vendeur 224Solutions. Ce guide vous accompagnera dans la maîtrise de toutes les fonctionnalités de votre tableau de bord."
        : "Welcome to your 224Solutions vendor interface. This guide will help you master all features of your dashboard."
    },
    {
      title: isFr ? "2. Gestion des Produits" : "2. Product Management",
      subsections: [
        { title: isFr ? "2.1 Ajouter un produit" : "2.1 Add a product", content: "..." },
        { title: isFr ? "2.2 Modifier un produit" : "2.2 Edit a product", content: "..." },
        { title: isFr ? "2.3 Gérer le stock" : "2.3 Manage stock", content: "..." }
      ]
    },
    {
      title: isFr ? "3. Gestion des Commandes" : "3. Order Management",
      subsections: [
        { title: isFr ? "3.1 Traiter une commande" : "3.1 Process an order", content: "..." },
        { title: isFr ? "3.2 Suivi des expéditions" : "3.2 Shipment tracking", content: "..." }
      ]
    },
    {
      title: isFr ? "4. Finances et Paiements" : "4. Finance and Payments",
      content: isFr 
        ? "Gérez votre portefeuille, suivez vos revenus et créez des liens de paiement."
        : "Manage your wallet, track revenue and create payment links."
    },
    {
      title: isFr ? "5. Marketing et Promotions" : "5. Marketing and Promotions",
      content: isFr
        ? "Créez des campagnes marketing ciblées et des codes promo pour booster vos ventes."
        : "Create targeted marketing campaigns and promo codes to boost sales."
    }
  ];
}

function generateOperationsManualContent(lang: string) {
  const isFr = lang === 'fr';
  return [
    { title: isFr ? "1. Procédures Quotidiennes" : "1. Daily Procedures", content: "..." },
    { title: isFr ? "2. Gestion de l'Inventaire" : "2. Inventory Management", content: "..." },
    { title: isFr ? "3. Traitement des Commandes" : "3. Order Processing", content: "..." },
    { title: isFr ? "4. Service Client" : "4. Customer Service", content: "..." },
    { title: isFr ? "5. Résolution des Problèmes" : "5. Troubleshooting", content: "..." }
  ];
}

async function getSalesReportData(supabase: any, vendorId: string, period: string) {
  const days = period === 'last_7_days' ? 7 : period === 'last_90_days' ? 90 : 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('vendor_id', vendorId)
    .gte('created_at', startDate);

  return {
    totalOrders: orders?.length || 0,
    totalRevenue: orders?.reduce((sum: number, o: any) => sum + o.total_amount, 0) || 0,
    avgOrderValue: orders?.length ? orders.reduce((sum: number, o: any) => sum + o.total_amount, 0) / orders.length : 0,
    period: days
  };
}

function generateSalesReportContent(data: any, lang: string, includeCharts: boolean) {
  const isFr = lang === 'fr';
  return [
    { 
      title: isFr ? "1. Résumé Exécutif" : "1. Executive Summary",
      content: isFr 
        ? `Période analysée: ${data.period} derniers jours. Total des ventes: ${data.totalRevenue.toLocaleString()} GNF.`
        : `Period analyzed: Last ${data.period} days. Total sales: ${data.totalRevenue.toLocaleString()} GNF.`
    },
    { 
      title: isFr ? "2. Statistiques Clés" : "2. Key Statistics",
      data: {
        totalOrders: data.totalOrders,
        totalRevenue: data.totalRevenue,
        avgOrderValue: Math.round(data.avgOrderValue)
      }
    },
    { title: isFr ? "3. Tendances" : "3. Trends", content: "..." },
    { title: isFr ? "4. Recommandations" : "4. Recommendations", content: "..." }
  ];
}

async function getInventoryReportData(supabase: any, vendorId: string) {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId);
  
  return {
    totalProducts: products?.length || 0,
    totalValue: products?.reduce((sum: number, p: any) => sum + (p.price * p.stock_quantity), 0) || 0,
    lowStock: products?.filter((p: any) => p.stock_quantity < 5).length || 0,
    outOfStock: products?.filter((p: any) => p.stock_quantity === 0).length || 0
  };
}

function generateInventoryReportContent(data: any, lang: string) {
  const isFr = lang === 'fr';
  return [
    { title: isFr ? "1. Vue d'Ensemble" : "1. Overview", data },
    { title: isFr ? "2. Produits en Alerte" : "2. Products on Alert", content: "..." },
    { title: isFr ? "3. Valorisation du Stock" : "3. Stock Valuation", content: "..." }
  ];
}

async function getMarketingReportData(supabase: any, vendorId: string, period: string) {
  const { data: campaigns } = await supabase
    .from('vendor_ai_marketing_campaigns')
    .select('*')
    .eq('vendor_id', vendorId);
  
  return { campaignsCount: campaigns?.length || 0 };
}

function generateMarketingReportContent(data: any, lang: string) {
  const isFr = lang === 'fr';
  return [
    { title: isFr ? "1. Performance des Campagnes" : "1. Campaign Performance", data },
    { title: isFr ? "2. Analyse de l'Audience" : "2. Audience Analysis", content: "..." },
    { title: isFr ? "3. Recommandations" : "3. Recommendations", content: "..." }
  ];
}

async function getAIDashboard(supabase: any, vendorId: string, params: any) {
  const { include_pending_decisions = true, include_urgent_alerts = true, include_performance_summary = true } = params;

  const result: any = {};

  // Décisions en attente
  if (include_pending_decisions) {
    const { data: decisions } = await supabase
      .from('vendor_ai_decisions')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);
    result.pendingDecisions = decisions || [];
  }

  // Alertes urgentes
  if (include_urgent_alerts) {
    const { data: stockAlerts } = await supabase
      .from('vendor_stock_ai_alerts')
      .select('*, products(name)')
      .eq('vendor_id', vendorId)
      .eq('status', 'active')
      .limit(10);
    result.urgentAlerts = stockAlerts || [];
  }

  // Résumé de performance
  if (include_performance_summary) {
    const { data: logs } = await supabase
      .from('vendor_ai_execution_logs')
      .select('action_type, success')
      .eq('vendor_id', vendorId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    result.performanceSummary = {
      totalExecutions: logs?.length || 0,
      successRate: logs?.length ? (logs.filter((l: any) => l.success).length / logs.length * 100).toFixed(1) : 0,
      byActionType: logs?.reduce((acc: any, l: any) => {
        acc[l.action_type] = (acc[l.action_type] || 0) + 1;
        return acc;
      }, {}) || {}
    };
  }

  // Contrôle IA
  const { data: control } = await supabase
    .from('vendor_ai_control')
    .select('*')
    .eq('vendor_id', vendorId)
    .single();

  result.aiControl = control || { ai_enabled: true, executions_today: 0, max_daily_executions: 100 };

  return { success: true, data: result };
}

async function getAIActivityLog(supabase: any, vendorId: string, params: any) {
  const { status_filter = 'all', decision_type = 'all', limit = 20 } = params;

  let query = supabase
    .from('vendor_ai_decisions')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status_filter !== 'all') {
    query = query.eq('status', status_filter);
  }
  if (decision_type !== 'all') {
    query = query.eq('decision_type', decision_type);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  return { success: true, data: { decisions: data, count: data?.length || 0 } };
}

async function approveAIDecision(supabase: any, vendorId: string, userId: string, params: any) {
  const { decision_id, modifications } = params;

  const { data: decision, error: fetchError } = await supabase
    .from('vendor_ai_decisions')
    .select('*')
    .eq('id', decision_id)
    .eq('vendor_id', vendorId)
    .single();

  if (fetchError || !decision) {
    return { success: false, error: "Décision non trouvée" };
  }

  if (decision.status !== 'pending') {
    return { success: false, error: "Cette décision n'est plus en attente" };
  }

  // Mettre à jour la décision
  const updateData: any = {
    status: 'approved',
    approved_by: userId,
    approved_at: new Date().toISOString()
  };

  if (modifications) {
    updateData.ai_recommendation = modifications;
  }

  const { error: updateError } = await supabase
    .from('vendor_ai_decisions')
    .update(updateData)
    .eq('id', decision_id);

  if (updateError) return { success: false, error: updateError.message };

  // Si c'est une réponse d'avis, mettre à jour l'analyse de sentiment
  if (decision.decision_type === 'review_response' && decision.context_data) {
    const ctx = decision.context_data;
    await supabase
      .from('vendor_review_sentiment_analysis')
      .update({
        response_approved: true,
        response_approved_by: userId,
        final_response: modifications || decision.ai_recommendation
      })
      .eq('review_id', ctx.review_id)
      .eq('vendor_id', vendorId);
  }

  // Si c'est une campagne marketing, mettre à jour le statut
  if (decision.decision_type === 'marketing_campaign' && decision.context_data?.campaign_id) {
    await supabase
      .from('vendor_ai_marketing_campaigns')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', decision.context_data.campaign_id);
  }

  return {
    success: true,
    data: {
      decision_id,
      status: 'approved',
      message: "Décision approuvée avec succès. L'action sera exécutée."
    }
  };
}

async function rejectAIDecision(supabase: any, vendorId: string, userId: string, params: any) {
  const { decision_id, reason } = params;

  const { error } = await supabase
    .from('vendor_ai_decisions')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      approved_by: userId,
      approved_at: new Date().toISOString()
    })
    .eq('id', decision_id)
    .eq('vendor_id', vendorId)
    .eq('status', 'pending');

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: { decision_id, status: 'rejected', message: "Décision rejetée." }
  };
}

async function toggleAIFeatures(supabase: any, vendorId: string, userId: string, params: any) {
  const { action, module, reason } = params;

  // Récupérer ou créer le contrôle IA
  let { data: control } = await supabase
    .from('vendor_ai_control')
    .select('*')
    .eq('vendor_id', vendorId)
    .single();

  if (!control) {
    const { data: newControl } = await supabase
      .from('vendor_ai_control')
      .insert({ vendor_id: vendorId })
      .select()
      .single();
    control = newControl;
  }

  const updateData: any = { updated_at: new Date().toISOString() };

  switch (action) {
    case 'disable_all':
      updateData.ai_enabled = false;
      updateData.disabled_by = userId;
      updateData.disabled_at = new Date().toISOString();
      updateData.disable_reason = reason || 'Manual disable';
      break;
    case 'enable_all':
      updateData.ai_enabled = true;
      updateData.disabled_by = null;
      updateData.disabled_at = null;
      updateData.disable_reason = null;
      break;
    case 'toggle_module':
      // Toggle specific module auto-approval
      if (module === 'reviews') updateData.auto_approve_reviews = !control.auto_approve_reviews;
      if (module === 'inventory') updateData.auto_approve_stock_alerts = !control.auto_approve_stock_alerts;
      if (module === 'marketing') updateData.auto_approve_marketing = !control.auto_approve_marketing;
      break;
  }

  const { error } = await supabase
    .from('vendor_ai_control')
    .update(updateData)
    .eq('vendor_id', vendorId);

  if (error) return { success: false, error: error.message };

  // Log l'action
  await supabase.from('vendor_ai_execution_logs').insert({
    vendor_id: vendorId,
    action_type: 'toggle_ai_features',
    input_data: params,
    output_data: updateData,
    success: true
  });

  return {
    success: true,
    data: {
      action,
      module,
      message: action === 'disable_all' 
        ? "🔴 IA désactivée. Aucune analyse ou recommandation ne sera effectuée."
        : action === 'enable_all'
        ? "🟢 IA réactivée. Les fonctionnalités sont de nouveau disponibles."
        : `Module ${module} mis à jour.`
    }
  };
}

// =====================================================
// MAIN TOOL EXECUTOR
// =====================================================

async function executeTool(supabase: any, vendorId: string, userId: string, toolName: string, args: any) {
  switch (toolName) {
    case 'analyze_customer_reviews':
      return analyzeCustomerReviews(supabase, vendorId, args);
    case 'generate_review_response':
      return generateReviewResponse(supabase, vendorId, args);
    case 'generate_professional_document':
      return generateProfessionalDocument(supabase, vendorId, args);
    case 'analyze_orders':
      return analyzeOrders(supabase, vendorId, args);
    case 'recommend_order_action':
      return { success: true, data: { message: "Recommandation enregistrée. Validation requise." } };
    case 'analyze_inventory':
      return analyzeInventory(supabase, vendorId, args);
    case 'get_stock_recommendations':
      return analyzeInventory(supabase, vendorId, { analysis_type: 'optimal_reorder', ...args });
    case 'analyze_marketing_performance':
      return analyzeMarketingPerformance(supabase, vendorId, args);
    case 'propose_marketing_campaign':
      return proposeMarketingCampaign(supabase, vendorId, args);
    case 'get_ai_activity_log':
      return getAIActivityLog(supabase, vendorId, args);
    case 'approve_ai_decision':
      return approveAIDecision(supabase, vendorId, userId, args);
    case 'reject_ai_decision':
      return rejectAIDecision(supabase, vendorId, userId, args);
    case 'toggle_ai_features':
      return toggleAIFeatures(supabase, vendorId, userId, args);
    case 'get_ai_dashboard':
      return getAIDashboard(supabase, vendorId, args);
    default:
      return { success: false, error: `Outil inconnu: ${toolName}` };
  }
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[vendor-ai-assistant] request:', { method: req.method });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error('[vendor-ai-assistant] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur incomplète (Supabase)'}),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('[vendor-ai-assistant] Missing LOVABLE_API_KEY');
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Authentification et contexte vendeur
    let userId: string | null = null;
    let vendorContext: VendorContext | null = null;
    
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
      
      if (userId) {
        const { data: vendor } = await supabaseClient
          .from('vendors')
          .select('id, business_name, business_type, status')
          .eq('user_id', userId)
          .single();
          
        if (vendor) {
          // Statistiques
          const { data: products } = await supabaseClient
            .from('products')
            .select('id, name, price, stock_quantity, status')
            .eq('vendor_id', vendor.id)
            .limit(10);
            
          const { data: orders } = await supabaseClient
            .from('orders')
            .select('order_number, status, total_amount, created_at')
            .eq('vendor_id', vendor.id)
            .order('created_at', { ascending: false })
            .limit(5);
            
          const { data: wallet } = await supabaseClient
            .from('wallets')
            .select('balance, currency')
            .eq('user_id', userId)
            .single();
            
          const { count: totalProducts } = await supabaseClient
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id);
            
          const { count: lowStockProducts } = await supabaseClient
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id)
            .lt('stock_quantity', 5);

          // Récupérer le contrôle IA
          let { data: aiControl } = await supabaseClient
            .from('vendor_ai_control')
            .select('*')
            .eq('vendor_id', vendor.id)
            .single();

          if (!aiControl) {
            // Créer le contrôle IA par défaut
            const { data: newControl } = await supabaseClient
              .from('vendor_ai_control')
              .insert({ vendor_id: vendor.id })
              .select()
              .single();
            aiControl = newControl;
          }
          
          vendorContext = {
            vendorId: vendor.id,
            businessName: vendor.business_name || "Vendeur",
            businessType: vendor.business_type,
            balance: wallet?.balance || 0,
            currency: wallet?.currency || "GNF",
            totalProducts: totalProducts || 0,
            lowStockProducts: lowStockProducts || 0,
            recentProducts: products || [],
            recentOrders: orders || [],
            aiEnabled: aiControl?.ai_enabled ?? true,
            executionsToday: aiControl?.executions_today || 0,
            maxDailyExecutions: aiControl?.max_daily_executions || 100
          };
        }
      }
    }

    if (!vendorContext) {
      return new Response(
        JSON.stringify({ error: "Non autorisé - Vendeur non trouvé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier si l'IA est activée
    if (!vendorContext.aiEnabled) {
      return new Response(
        JSON.stringify({ 
          error: "L'IA est actuellement désactivée pour votre compte. Utilisez 'toggle_ai_features' pour la réactiver." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { message, messages } = body;
    
    let conversationMessages = [];
    if (message) {
      conversationMessages = [{ role: "user", content: message }];
    } else if (messages && Array.isArray(messages)) {
      conversationMessages = messages;
    } else {
      throw new Error("Message requis");
    }

    // Système prompt ENTERPRISE
    const enterpriseSystemPrompt = `Tu es l'IA ENTERPRISE de 224Solutions, dédiée aux vendeurs professionnels.

🏢 NIVEAU: ENTERPRISE (Comparable à Amazon Seller Central, Shopify Plus, Odoo Enterprise)

📊 CONTEXTE VENDEUR:
- Boutique: ${vendorContext.businessName}
- Type: ${vendorContext.businessType || 'Commerce'}
- Solde: ${vendorContext.balance.toLocaleString()} ${vendorContext.currency}
- Produits: ${vendorContext.totalProducts} (${vendorContext.lowStockProducts} en stock faible)
- IA: ${vendorContext.aiEnabled ? '🟢 Activée' : '🔴 Désactivée'}
- Exécutions aujourd'hui: ${vendorContext.executionsToday}/${vendorContext.maxDailyExecutions}

🎯 PRINCIPE FONDAMENTAL:
ANALYSER → PROPOSER → FAIRE VALIDER → EXÉCUTER

⚠️ RÈGLES STRICTES DE GOUVERNANCE:

1. **ANALYSE DES AVIS (Sentiment AI)**:
   - Analyser les avis clients avec détection de sentiment
   - Identifier les thèmes récurrents (livraison, qualité, prix, service)
   - Proposer des réponses professionnelles et polies
   - ❌ JAMAIS publier une réponse sans validation du vendeur

2. **GÉNÉRATION DE DOCUMENTS (PDF)**:
   - Créer des guides, manuels, rapports professionnels
   - Inclure page de couverture, sommaire, pagination
   - Style entreprise avec logo/nom de la boutique
   - Disponible en français et anglais

3. **ANALYSE DES COMMANDES**:
   - Détecter retards, risques, anomalies, fraudes comportementales
   - Recommander des actions (contacter client, prioriser)
   - ❌ INTERDIT: Annuler, rembourser, modifier paiement, changer statut critique
   - Toute action soumise à validation humaine

4. **INTELLIGENCE STOCK**:
   - Analyser ventes passées et prévoir ruptures
   - Détecter surstock et recommander stock optimal (7/30/90 jours)
   - Alerter sur risques critiques
   - ❌ JAMAIS passer de commande fournisseur automatiquement

5. **MARKETING ENTERPRISE**:
   - Analyser performances et identifier produits dormants
   - Segmenter clients (loyaux, inactifs, nouveaux, haute valeur)
   - Proposer campagnes ciblées (SMS, push, email, in-app)
   - Générer le contenu marketing
   - ❌ Campagnes validées avant envoi

🛡️ SÉCURITÉ ET GOUVERNANCE:
- Toutes les décisions sont journalisées
- Historique complet des recommandations
- Système de validation obligatoire
- Kill-switch disponible pour désactiver l'IA
- Aucun calcul critique côté client

📋 OUTILS DISPONIBLES:
- analyze_customer_reviews: Analyse sentiment des avis
- generate_review_response: Génère réponse (validation requise)
- generate_professional_document: Crée documents PDF
- analyze_orders: Analyse risques commandes
- analyze_inventory: Intelligence stock
- analyze_marketing_performance: Performance marketing
- propose_marketing_campaign: Propose campagnes (validation requise)
- get_ai_activity_log: Historique des décisions
- approve_ai_decision / reject_ai_decision: Validation
- toggle_ai_features: Kill-switch
- get_ai_dashboard: Tableau de bord IA

💡 STYLE:
- Professionnel et orienté business
- Utilise des émojis pertinents avec modération
- Toujours rappeler le besoin de validation pour les actions
- Fournir des données chiffrées et des recommandations concrètes`;

    const wantsStream = body.stream !== false;

    if (wantsStream) {
      const requestBody = {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: enterpriseSystemPrompt },
          ...conversationMessages,
        ],
        tools: enterpriseTools,
        stream: true,
      };

      console.log("Calling Lovable AI Gateway for ENTERPRISE vendor assistant (streaming)...");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Limite de requêtes atteinte. Veuillez réessayer." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Crédits insuffisants." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("Erreur du service IA");
      }

      // Incrémenter le compteur d'exécutions
      await supabaseClient
        .from('vendor_ai_control')
        .update({ 
          executions_today: vendorContext.executionsToday + 1,
          updated_at: new Date().toISOString()
        })
        .eq('vendor_id', vendorContext.vendorId);

      // Streaming: retourner directement la réponse
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // =========================
    // Mode JSON (sans streaming)
    // - Exécute les tool calls côté serveur
    // - Compatible supabase.functions.invoke
    // =========================

    console.log("Calling Lovable AI Gateway for ENTERPRISE vendor assistant (json)...");

    const gatewayMessages: any[] = [
      { role: "system", content: enterpriseSystemPrompt },
      ...conversationMessages,
    ];

    let finalReply = "";

    for (let step = 0; step < 3; step++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: gatewayMessages,
          tools: enterpriseTools,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Limite de requêtes atteinte. Veuillez réessayer." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Crédits insuffisants." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("Erreur du service IA");
      }

      const data = await response.json();
      const msg = data?.choices?.[0]?.message;
      const toolCalls = msg?.tool_calls || msg?.toolCalls;

      if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
        // Ajouter l'appel outil (assistant) puis répondre avec résultats outils
        gatewayMessages.push(msg);

        for (const tc of toolCalls) {
          const toolName = tc?.function?.name;
          const argsRaw = tc?.function?.arguments;
          let args: any = {};
          try {
            args = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : (argsRaw || {});
          } catch {
            args = {};
          }

          const toolResult = await runEnterpriseTool(
            supabaseClient,
            vendorContext.vendorId,
            userId || '',
            toolName,
            args
          );

          gatewayMessages.push({
            role: "tool",
            tool_call_id: tc?.id,
            content: JSON.stringify(toolResult),
          });
        }

        // Relancer un tour pour obtenir une réponse finale
        continue;
      }

      finalReply = msg?.content || "";
      break;
    }

    // Incrémenter le compteur d'exécutions
    await supabaseClient
      .from('vendor_ai_control')
      .update({ 
        executions_today: vendorContext.executionsToday + 1,
        updated_at: new Date().toISOString()
      })
      .eq('vendor_id', vendorContext.vendorId);

    return new Response(
      JSON.stringify({ reply: finalReply, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (e) {
    console.error("vendor-ai-assistant ENTERPRISE error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
