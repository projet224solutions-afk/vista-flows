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

    // Prompt système spécifique au CLIENT
    const clientSystemPrompt = `Tu es l'assistant IA de 224Solutions, dédié aux CLIENTS. Tu dois UNIQUEMENT répondre aux questions liées au compte client.

🎯 TON RÔLE:
Tu aides les clients de la plateforme 224Solutions avec leurs activités d'achat et de gestion de compte.

📊 CONTEXTE UTILISATEUR:
- Nom: ${userContext.name || "Client"}
- Solde wallet: ${userContext.balance?.toLocaleString() || 0} ${userContext.currency || "GNF"}
- Dernières transactions: ${JSON.stringify(userContext.recentTransactions || [])}
- Dernières commandes: ${JSON.stringify(userContext.recentOrders || [])}

✅ CE QUE TU PEUX FAIRE (DOMAINES AUTORISÉS):
1. **Gestion du Wallet Client**:
   - Consulter le solde
   - Expliquer l'historique des transactions
   - Aider avec les dépôts et retraits
   - Expliquer les conversions de devises

2. **Gestion des Commandes**:
   - Suivre l'état des commandes
   - Expliquer le processus de commande
   - Aider avec les retours et réclamations
   - Historique des achats

3. **Navigation et Utilisation**:
   - Comment utiliser le tableau de bord client
   - Fonctionnalités disponibles pour les clients
   - Paramètres du compte
   - Notifications et alertes

4. **Communication**:
   - Contacter les vendeurs
   - Support client
   - Messages et notifications

5. **Paiements**:
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
- Guide l'utilisateur étape par étape si nécessaire`;

    const requestBody = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: clientSystemPrompt },
        ...conversationMessages,
      ],
      stream: true,
    };

    console.log("Calling Lovable AI Gateway for client assistant...");

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
    console.error("client-ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
