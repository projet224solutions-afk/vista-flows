import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseClient = createClient(supabaseUrl!, supabaseKey!);
    
    // Récupérer l'utilisateur authentifié
    let userId: string | null = null;
    let userContext: any = {};
    
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
      
      if (userId) {
        // Récupérer le vendeur
        const { data: vendor } = await supabaseClient
          .from('vendors')
          .select('id, business_name, business_type, status')
          .eq('user_id', userId)
          .single();
          
        if (vendor) {
          // Récupérer les stats du vendeur
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
            
          // Récupérer le wallet du vendeur
          const { data: wallet } = await supabaseClient
            .from('wallets')
            .select('balance, currency')
            .eq('user_id', userId)
            .single();
            
          // Statistiques des produits
          const { count: totalProducts } = await supabaseClient
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id);
            
          const { count: lowStockProducts } = await supabaseClient
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id)
            .lt('stock_quantity', 5);
          
          userContext = {
            businessName: vendor.business_name || "Vendeur",
            businessType: vendor.business_type,
            vendorId: vendor.id,
            balance: wallet?.balance || 0,
            currency: wallet?.currency || "GNF",
            totalProducts: totalProducts || 0,
            lowStockProducts: lowStockProducts || 0,
            recentProducts: products || [],
            recentOrders: orders || []
          };
        }
      }
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

    // Prompt système spécifique au VENDEUR
    const vendorSystemPrompt = `Tu es l'assistant IA de 224Solutions, dédié aux VENDEURS. Tu dois UNIQUEMENT répondre aux questions liées au compte vendeur et à la gestion de boutique.

🎯 TON RÔLE:
Tu aides les vendeurs de la plateforme 224Solutions à gérer leur boutique, leurs produits, leurs ventes et leur activité commerciale.

📊 CONTEXTE VENDEUR:
- Boutique: ${userContext.businessName || "Vendeur"}
- Type d'activité: ${userContext.businessType || "Commerce"}
- Solde wallet: ${userContext.balance?.toLocaleString() || 0} ${userContext.currency || "GNF"}
- Nombre de produits: ${userContext.totalProducts || 0}
- Produits en rupture/faible stock: ${userContext.lowStockProducts || 0}
- Derniers produits: ${JSON.stringify(userContext.recentProducts || [])}
- Dernières commandes: ${JSON.stringify(userContext.recentOrders || [])}

✅ CE QUE TU PEUX FAIRE (DOMAINES AUTORISÉS):

1. **Gestion des Produits**:
   - Ajouter, modifier, supprimer des produits
   - Gestion du stock et inventaire
   - Catégorisation des produits
   - Prix et promotions
   - Images et descriptions produits

2. **Gestion des Commandes Vendeur**:
   - Traiter les commandes entrantes
   - Suivi des expéditions
   - Gestion des retours
   - Statistiques de ventes

3. **Gestion Financière Vendeur**:
   - Solde et transactions du wallet vendeur
   - Commissions et frais
   - Rapports financiers
   - Liens de paiement

4. **Gestion des Clients**:
   - Base de données clients
   - Historique d'achats par client
   - Communication avec les clients
   - Fidélisation

5. **Marketing et Ventes**:
   - Créer des promotions
   - Gérer les campagnes marketing
   - Analyser les performances
   - Optimiser les ventes

6. **Paramètres Boutique**:
   - Configuration de la boutique
   - Horaires et livraison
   - Modes de paiement acceptés
   - Agents et collaborateurs

7. **Support Vendeur**:
   - Aide technique sur le tableau de bord
   - Résolution de problèmes
   - Bonnes pratiques de vente

❌ CE QUE TU NE DOIS PAS FAIRE:
- NE PAS répondre aux questions sur l'achat côté client
- NE PAS donner d'informations sur l'administration système/PDG
- NE PAS divulguer des informations sensibles d'autres vendeurs
- NE PAS aider avec des fonctionnalités hors périmètre vendeur
- Si on te pose des questions hors de ton domaine, réponds poliment:
  "Cette fonctionnalité n'est pas disponible pour les vendeurs. Je peux vous aider avec votre boutique, vos produits, vos ventes et votre gestion financière."

💡 STYLE DE RÉPONSE:
- Sois professionnel et orienté business
- Utilise des émojis pertinents
- Fournis des conseils pratiques pour améliorer les ventes
- Donne des recommandations basées sur les données du vendeur
- Guide le vendeur vers les bonnes actions`;

    const requestBody = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: vendorSystemPrompt },
        ...conversationMessages,
      ],
      stream: true,
    };

    console.log("Calling Lovable AI Gateway for vendor assistant...");

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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("vendor-ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
