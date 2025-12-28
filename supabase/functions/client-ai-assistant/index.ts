import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fonction de recherche de produits
async function searchProducts(supabaseClient: any, query: string, category?: string, maxPrice?: number, minPrice?: number) {
  console.log("Searching products with:", { query, category, maxPrice, minPrice });
  
  let queryBuilder = supabaseClient
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      compare_at_price,
      images,
      category_id,
      stock_quantity,
      is_active,
      is_hot,
      is_new,
      rating,
      reviews_count,
      vendor:vendors(business_name, logo_url),
      category:categories(name)
    `)
    .eq('is_active', true)
    .gt('stock_quantity', 0);

  // Recherche textuelle
  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
  }

  // Filtres optionnels
  if (category) {
    const { data: cat } = await supabaseClient
      .from('categories')
      .select('id')
      .ilike('name', `%${category}%`)
      .limit(1)
      .single();
    
    if (cat) {
      queryBuilder = queryBuilder.eq('category_id', cat.id);
    }
  }

  if (maxPrice) {
    queryBuilder = queryBuilder.lte('price', maxPrice);
  }

  if (minPrice) {
    queryBuilder = queryBuilder.gte('price', minPrice);
  }

  const { data: products, error } = await queryBuilder
    .order('rating', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Product search error:", error);
    return [];
  }

  return products?.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description?.substring(0, 150) + (p.description?.length > 150 ? '...' : ''),
    price: p.price,
    oldPrice: p.compare_at_price,
    image: p.images?.[0] || null,
    vendor: p.vendor?.business_name || 'Vendeur 224',
    category: p.category?.name || 'Non catégorisé',
    stock: p.stock_quantity,
    rating: p.rating,
    reviewsCount: p.reviews_count,
    isHot: p.is_hot,
    isNew: p.is_new
  })) || [];
}

// Fonction pour obtenir les catégories disponibles
async function getCategories(supabaseClient: any) {
  const { data: categories } = await supabaseClient
    .from('categories')
    .select('id, name, description')
    .eq('is_active', true)
    .order('name');
  
  return categories || [];
}

// Fonction pour obtenir les produits populaires
async function getPopularProducts(supabaseClient: any, limit = 5) {
  const { data: products } = await supabaseClient
    .from('products')
    .select(`
      id, name, price, images, rating, reviews_count,
      vendor:vendors(business_name),
      category:categories(name)
    `)
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .order('reviews_count', { ascending: false })
    .limit(limit);

  return products?.map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    image: p.images?.[0],
    vendor: p.vendor?.business_name,
    category: p.category?.name,
    rating: p.rating,
    reviewsCount: p.reviews_count
  })) || [];
}

// Définition des outils disponibles pour l'IA
const tools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Rechercher des produits dans le marketplace par nom, description ou catégorie. Utilise cette fonction quand le client demande des produits, veut acheter quelque chose, ou cherche un article spécifique.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Terme de recherche (nom du produit, type d'article, etc.)"
          },
          category: {
            type: "string",
            description: "Catégorie de produit (ex: électronique, vêtements, alimentation)"
          },
          max_price: {
            type: "number",
            description: "Prix maximum en GNF"
          },
          min_price: {
            type: "number",
            description: "Prix minimum en GNF"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_categories",
      description: "Obtenir la liste des catégories de produits disponibles. Utilise cette fonction quand le client veut savoir quels types de produits sont disponibles.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_popular_products",
      description: "Obtenir les produits les plus populaires. Utilise cette fonction quand le client demande des recommandations ou les produits tendance.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Nombre de produits à retourner (max 10)"
          }
        },
        required: []
      }
    }
  }
];

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
    let userRole: string = "client";
    let userContext: any = {};
    
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
      
      if (userId) {
        // Récupérer le profil utilisateur
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('full_name, phone, email')
          .eq('id', userId)
          .single();
          
        // Récupérer le wallet
        const { data: wallet } = await supabaseClient
          .from('wallets')
          .select('id, balance, currency')
          .eq('user_id', userId)
          .single();
          
        // Récupérer les dernières transactions
        const { data: transactions } = await supabaseClient
          .from('wallet_transactions')
          .select('amount, transaction_type, status, created_at')
          .eq('wallet_id', wallet?.id || '')
          .order('created_at', { ascending: false })
          .limit(5);
          
        // Récupérer les dernières commandes
        const { data: orders } = await supabaseClient
          .from('orders')
          .select('order_number, status, total_amount, created_at')
          .eq('customer_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
          
        userContext = {
          name: profile?.full_name || "Client",
          balance: wallet?.balance || 0,
          currency: wallet?.currency || "GNF",
          recentTransactions: transactions || [],
          recentOrders: orders || []
        };
      }
    }

    const body = await req.json();
    const { message, messages, role = "client" } = body;
    
    let conversationMessages = [];
    if (message) {
      conversationMessages = [{ role: "user", content: message }];
    } else if (messages && Array.isArray(messages)) {
      conversationMessages = messages;
    } else {
      throw new Error("Message requis");
    }

    // Prompt système spécifique au CLIENT avec capacité de recherche
    const clientSystemPrompt = `Tu es l'assistant IA de 224Solutions, dédié aux CLIENTS. Tu dois UNIQUEMENT répondre aux questions liées au compte client.

🎯 TON RÔLE:
Tu aides les clients de la plateforme 224Solutions avec leurs activités d'achat et de gestion de compte.
Tu as accès à une fonction de RECHERCHE DE PRODUITS pour trouver des articles dans le marketplace.

📊 CONTEXTE UTILISATEUR:
- Nom: ${userContext.name || "Client"}
- Solde wallet: ${userContext.balance?.toLocaleString() || 0} ${userContext.currency || "GNF"}
- Dernières transactions: ${JSON.stringify(userContext.recentTransactions || [])}
- Dernières commandes: ${JSON.stringify(userContext.recentOrders || [])}

✅ CE QUE TU PEUX FAIRE (DOMAINES AUTORISÉS):
1. **🔍 RECHERCHE DE PRODUITS** (NOUVELLE CAPACITÉ):
   - Rechercher des produits par nom, description ou catégorie
   - Filtrer par prix (min/max)
   - Recommander des produits populaires
   - Montrer les catégories disponibles
   - UTILISE TOUJOURS la fonction search_products quand un client cherche un produit!

2. **Gestion du Wallet Client**:
   - Consulter le solde
   - Expliquer l'historique des transactions
   - Aider avec les dépôts et retraits
   - Expliquer les conversions de devises

3. **Gestion des Commandes**:
   - Suivre l'état des commandes
   - Expliquer le processus de commande
   - Aider avec les retours et réclamations
   - Historique des achats

4. **Navigation et Utilisation**:
   - Comment utiliser le tableau de bord client
   - Fonctionnalités disponibles pour les clients
   - Paramètres du compte
   - Notifications et alertes

5. **Communication**:
   - Contacter les vendeurs
   - Support client
   - Messages et notifications

6. **Paiements**:
   - Méthodes de paiement disponibles
   - Sécurité des transactions
   - Problèmes de paiement

❌ CE QUE TU NE DOIS PAS FAIRE:
- NE PAS répondre aux questions sur la gestion de boutique/vendeur
- NE PAS donner d'informations sur l'administration système
- NE PAS aider avec des fonctionnalités PDG/Admin
- NE PAS divulguer des informations sensibles du système
- Si on te pose des questions hors de ton domaine, réponds poliment:
  "Cette fonctionnalité est réservée aux vendeurs/administrateurs. En tant que client, je peux vous aider avec votre compte, vos commandes et votre wallet."

💡 STYLE DE RÉPONSE:
- Sois amical et professionnel
- Utilise des émojis pertinents
- Fournis des réponses claires et concises
- Propose des solutions pratiques
- Guide l'utilisateur étape par étape si nécessaire
- Quand tu présentes des produits, formate-les joliment avec prix, vendeur et description`;

    // Premier appel: demander à l'IA si elle veut utiliser des outils
    const initialRequest = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: clientSystemPrompt },
        ...conversationMessages,
      ],
      tools: tools,
      tool_choice: "auto"
    };

    console.log("Calling Lovable AI Gateway for client assistant with tools...");

    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(initialRequest),
    });

    if (!initialResponse.ok) {
      if (initialResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Veuillez réessayer." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (initialResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await initialResponse.text();
      console.error("AI gateway error:", initialResponse.status, errorText);
      throw new Error("Erreur du service IA");
    }

    const initialData = await initialResponse.json();
    const assistantMessage = initialData.choices?.[0]?.message;

    // Vérifier si l'IA veut utiliser des outils
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("AI wants to use tools:", assistantMessage.tool_calls);
      
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");
        
        let result;
        
        switch (functionName) {
          case "search_products":
            result = await searchProducts(supabaseClient, args.query, args.category, args.max_price, args.min_price);
            break;
          case "get_categories":
            result = await getCategories(supabaseClient);
            break;
          case "get_popular_products":
            result = await getPopularProducts(supabaseClient, args.limit || 5);
            break;
          default:
            result = { error: "Fonction inconnue" };
        }
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });
        
        console.log(`Tool ${functionName} result:`, result);
      }

      // Deuxième appel avec les résultats des outils (streaming)
      const finalRequest = {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: clientSystemPrompt },
          ...conversationMessages,
          assistantMessage,
          ...toolResults
        ],
        stream: true
      };

      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalRequest),
      });

      if (!finalResponse.ok) {
        throw new Error("Erreur lors de la génération de la réponse finale");
      }

      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Si pas d'outils utilisés, streamer directement
    const streamRequest = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: clientSystemPrompt },
        ...conversationMessages,
      ],
      stream: true,
    };

    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(streamRequest),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("client-ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
