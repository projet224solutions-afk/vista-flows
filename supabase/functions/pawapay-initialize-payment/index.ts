import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  currency: string;
  phone_number: string;
  correspondent: string;
  description: string;
  metadata?: Record<string, any>;
  return_url?: string;
}

// Correspondants PawaPay pour la Guinée
const GUINEA_CORRESPONDENTS = {
  orange_money: 'ORANGE_GIN',
  mtn_money: 'MTN_MOMO_GIN',
} as const;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAWAPAY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    // Vérifier l'API key PawaPay
    const pawapayApiKey = Deno.env.get('PAWAPAY_API_KEY');
    if (!pawapayApiKey) {
      throw new Error('PAWAPAY_API_KEY is not configured');
    }
    logStep('API key verified');

    // Initialiser Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Authentifier l'utilisateur
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }
    logStep('User authenticated', { userId: userData.user.id });

    // Parser la requête
    const body: PaymentRequest = await req.json();
    logStep('Request body', body);

    // Validation
    if (!body.amount || body.amount <= 0) {
      throw new Error('Invalid amount');
    }
    if (!body.phone_number) {
      throw new Error('Phone number is required');
    }
    if (!body.correspondent) {
      throw new Error('Correspondent (payment method) is required');
    }

    // Mapper le correspondent
    const correspondentCode = GUINEA_CORRESPONDENTS[body.correspondent as keyof typeof GUINEA_CORRESPONDENTS];
    if (!correspondentCode) {
      throw new Error(`Invalid correspondent: ${body.correspondent}. Supported: orange_money, mtn_money`);
    }

    // Formater le numéro de téléphone (format international sans +)
    let phoneNumber = body.phone_number.replace(/\s+/g, '').replace(/^(\+|00)/, '');
    if (!phoneNumber.startsWith('224')) {
      phoneNumber = '224' + phoneNumber.replace(/^0/, '');
    }
    logStep('Formatted phone number', { original: body.phone_number, formatted: phoneNumber });

    // Générer un ID unique pour le dépôt
    const depositId = crypto.randomUUID();
    const customerTimestamp = new Date().toISOString();

    // Déterminer l'environnement (sandbox ou production)
    // IMPORTANT: La clé peut être valide uniquement en sandbox OU en production.
    // On garde un choix par défaut mais on retente AUTOMATIQUEMENT sur l'autre environnement
    // dès qu'on détecte une erreur d'auth, même si le format d'erreur est différent.
    const baseUrlPrimary = pawapayApiKey.length > 50
      ? 'https://api.pawapay.io'
      : 'https://api.sandbox.pawapay.io';

    const baseUrlFallback = baseUrlPrimary === 'https://api.pawapay.io'
      ? 'https://api.sandbox.pawapay.io'
      : 'https://api.pawapay.io';

    logStep('PawaPay environment selected', {
      baseUrlPrimary,
      baseUrlFallback,
      apiKeyLength: pawapayApiKey.length,
    });

    // Construire la requête de dépôt PawaPay (API v2)
    // Docs: POST {baseUrl}/v2/deposits
    // IMPORTANT: PawaPay n'accepte que les caractères alphanumériques et espaces
    const rawMessage = (body.description || 'Paiement 224Solutions').trim();
    const customerMessage = rawMessage.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const safeCustomerMessage = (customerMessage.length >= 4 ? customerMessage : 'Paiement').substring(0, 22);
    logStep('Customer message sanitized', { rawMessage, customerMessage, safeCustomerMessage });

    const metadataArray = body.metadata
      ? Object.entries(body.metadata).map(([key, value]) => ({ [key]: value }))
      : [];

    const depositRequest = {
      depositId,
      payer: {
        type: 'MMO',
        accountDetails: {
          phoneNumber,
          provider: correspondentCode,
        },
      },
      clientReferenceId: depositId,
      customerMessage: safeCustomerMessage,
      amount: body.amount.toString(),
      currency: body.currency || 'GNF',
      metadata: metadataArray,
    };

    logStep('Deposit request', { ...depositRequest, payer: { ...depositRequest.payer, accountDetails: { ...depositRequest.payer.accountDetails, phoneNumber } } });

    const callPawaPay = async (baseUrl: string) => {
      logStep('Calling PawaPay', { baseUrl, path: '/v2/deposits' });
      const response = await fetch(`${baseUrl}/v2/deposits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pawapayApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(depositRequest),
      });

      const responseText = await response.text();
      logStep('PawaPay response', { status: response.status, body: responseText });
      return { response, responseText };
    };

    // Appeler l'API PawaPay (avec fallback si auth error)
    let { response, responseText } = await callPawaPay(baseUrlPrimary);

    if (!response.ok && response.status === 401) {
      let isAuthError = false;
      try {
        const err = JSON.parse(responseText);
        isAuthError =
          err?.errorCode === 2 ||
          /authentication/i.test(err?.errorMessage ?? '') ||
          err?.failureReason?.failureCode === 'AUTHENTICATION_ERROR' ||
          /api token/i.test(err?.failureReason?.failureMessage ?? '') ||
          /invalid/i.test(err?.failureReason?.failureMessage ?? '');
      } catch {
        // ignore parse errors
      }

      if (isAuthError) {
        logStep('Auth error on primary baseUrl, retrying with fallback', { baseUrlFallback });
        ({ response, responseText } = await callPawaPay(baseUrlFallback));
      }
    }

    if (!response.ok) {
      let errorMessage = 'PawaPay API error';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.errorMessage || JSON.stringify(errorData);
      } catch {
        errorMessage = responseText || `HTTP ${response.status}`;
      }
      throw new Error(`PawaPay error: ${errorMessage}`);
    }

    const depositResponse = JSON.parse(responseText);
    logStep('Deposit created', depositResponse);

    // Sauvegarder le paiement dans la base de données
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: insertError } = await supabaseAdmin
      .from('pawapay_payments')
      .insert({
        deposit_id: depositId,
        user_id: userData.user.id,
        amount: body.amount,
        currency: body.currency || 'GNF',
        correspondent: correspondentCode,
        phone_number: phoneNumber,
        status: depositResponse.status || 'PENDING',
        description: body.description,
        metadata: body.metadata || {},
        pawapay_response: depositResponse,
      });

    if (insertError) {
      logStep('Warning: Failed to save payment record', insertError);
    } else {
      logStep('Payment record saved');
    }

    return new Response(
      JSON.stringify({
        success: true,
        deposit_id: depositId,
        status: depositResponse.status || 'PENDING',
        message: 'Veuillez confirmer le paiement sur votre téléphone',
        correspondent: correspondentCode,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
