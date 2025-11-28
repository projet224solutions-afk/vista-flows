import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { client_name, client_phone, client_address } = await req.json();

    if (!client_name || !client_phone || !client_address) {
      throw new Error('Client name, phone and address are required');
    }

    // Get vendor info
    const { data: vendorProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: vendor } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', user.id)
      .single();

    const vendorName = vendorProfile?.full_name || vendor?.business_name || 'Vendeur';
    const vendorEmail = vendorProfile?.email || '';
    const vendorPhone = vendorProfile?.phone || '';
    const companyName = vendor?.business_name || vendorName;

    // Generate contract number
    const contractNumber = `CNT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const creationDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    console.log('Calling Lovable AI to generate contract...');

    // Call Lovable AI to generate contract
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant juridique professionnel spécialisé dans la rédaction de contrats de vente en Guinée. 
Tu dois générer un contrat de vente complet, professionnel et conforme aux lois guinéennes.

Le contrat doit inclure:
1. Un en-tête avec le numéro et la date du contrat
2. Les parties (vendeur et acheteur)
3. L'objet du contrat
4. Les conditions générales de vente
5. Les clauses standards (garantie, conformité, litige)
6. Les modalités de paiement et livraison
7. Les conditions de résiliation
8. La loi applicable (droit guinéen)
9. Les signatures

Le contrat doit être structuré, professionnel et juridiquement solide. Utilise un langage formel et clair.`
          },
          {
            role: 'user',
            content: `Génère un contrat de vente complet avec les informations suivantes:

VENDEUR:
- Nom/Entreprise: ${companyName}
- Nom du représentant: ${vendorName}
- Email: ${vendorEmail}
- Téléphone: ${vendorPhone}

ACHETEUR:
- Nom: ${client_name}
- Téléphone: ${client_phone}
- Adresse: ${client_address}

INFORMATIONS CONTRAT:
- Numéro de contrat: ${contractNumber}
- Date de création: ${creationDate}
- Lieu: Conakry, Guinée

Génère un contrat de vente complet, professionnel et prêt à être signé.`
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Crédits épuisés. Veuillez ajouter des crédits à votre espace de travail.');
      }
      throw new Error(`Erreur API IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContract = aiData.choices?.[0]?.message?.content;

    if (!generatedContract) {
      throw new Error('Failed to generate contract content');
    }

    console.log('Contract generated successfully by AI');

    // Generate summary
    const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant qui résume les contrats. Crée un résumé court et clair en 3-4 phrases maximum.'
          },
          {
            role: 'user',
            content: `Résume ce contrat en quelques phrases clés:\n\n${generatedContract}`
          }
        ],
        temperature: 0.5,
        max_tokens: 200,
      }),
    });

    let contractSummary = 'Contrat de vente généré automatiquement';
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      contractSummary = summaryData.choices?.[0]?.message?.content || contractSummary;
    }

    // Insert into DB as draft (not final yet, vendor can modify)
    const { data: contract, error } = await supabase
      .from('contracts')
      .insert({
        vendor_id: user.id,
        contract_type: 'vente_ai',
        client_name,
        client_phone,
        client_info: client_address,
        contract_content: generatedContract,
        custom_fields: {
          contract_number: contractNumber,
          creation_date: creationDate,
          summary: contractSummary,
          generated_by_ai: true,
        },
        status: 'created',
        vendor_logo_url: vendor?.logo_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Contract saved to database:', contract.id);

    return new Response(
      JSON.stringify({
        success: true,
        contract,
        message: 'Contrat généré avec succès',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-contract-with-ai:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'An error occurred',
        success: false,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
