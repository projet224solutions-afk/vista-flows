import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  currency?: string;
  description?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  return_url?: string;
  metadata?: Record<string, unknown>;
  payment_type?: 'checkout' | 'mobile_money';
  mobile_operator?: 'OM' | 'MOMO' | 'MOOV' | 'WAVE';
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return jsonResponse({ success: false, error: 'Non authentifié' }, 401);
    }

    const body: PaymentRequest = await req.json();
    const {
      amount,
      currency = 'GNF',
      description,
      customer_name,
      customer_email,
      customer_phone,
      return_url,
      metadata,
      payment_type = 'checkout',
      mobile_operator,
    } = body;

    if (!amount || amount <= 0) {
      return jsonResponse({ success: false, error: 'Montant invalide' }, 200);
    }

    const apiKey = Deno.env.get('CINETPAY_API_KEY');
    const siteId = Deno.env.get('CINETPAY_SITE_ID');

    if (!apiKey || !siteId) {
      console.error('CinetPay configuration manquante');
      return jsonResponse({ success: false, error: 'Configuration de paiement manquante' }, 500);
    }

    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const origin = req.headers.get('origin') || 'https://224solutions.app';
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cinetpay-webhook`;

    // Forcer l'univers (checkout CinetPay)
    const channels = payment_type === 'mobile_money' ? 'MOBILE_MONEY' : 'ALL';

    const amountRounded = Math.round(amount);
    // Règle CinetPay: montant multiple de 5 (sauf USD)
    if (currency !== 'USD' && amountRounded % 5 !== 0) {
      return jsonResponse({
        success: false,
        error: 'Montant invalide: doit être un multiple de 5',
        details: { amount: amountRounded, currency },
      });
    }

    // Mobile Money (Guinée): forcer l'opérateur via payment_method quand fourni
    let paymentMethod: string | null = null;
    if (payment_type === 'mobile_money') {
      if (!mobile_operator) {
        return jsonResponse({
          success: false,
          error: 'Opérateur Mobile Money requis (Orange/MTN)',
        });
      }
      if (currency === 'GNF') {
        if (mobile_operator === 'OM') paymentMethod = 'OMGN';
        if (mobile_operator === 'MOMO') paymentMethod = 'MTNGN';
      }
      if (!paymentMethod) {
        return jsonResponse({
          success: false,
          error: 'Opérateur Mobile Money non supporté pour cette devise',
          details: { currency, mobile_operator },
        });
      }
    }

    // Téléphone: on l'envoie en +224XXXXXXXXX (utile pour le push / préremplissage)
    let customerPhoneNumber: string | null = null;
    if (customer_phone) {
      const cleaned = customer_phone.replace(/\s/g, '').replace(/^\+/, '');
      const local = cleaned.replace(/^0/, '').replace(/^224/, '');
      if (/^\d{9}$/.test(local)) {
        customerPhoneNumber = `+224${local}`;
      } else if (payment_type === 'mobile_money') {
        return jsonResponse({
          success: false,
          error: 'Numéro invalide (attendu: 9 chiffres, ex: 624039029)',
          details: { customer_phone },
        });
      }
    } else if (payment_type === 'mobile_money') {
      return jsonResponse({
        success: false,
        error: 'Numéro Mobile Money requis',
      });
    }

    // Payload strictement minimal (évite 624 "CB"), + payment_method pour forcer Orange/MTN
    const cinetpayPayload: Record<string, unknown> = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: transactionId,
      amount: amountRounded,
      currency,
      description: (description || 'Paiement 224Solutions').toString().replace(/[#$&_\/]/g, ' '),
      return_url: return_url || `${origin}/payment-success`,
      notify_url: notifyUrl,
      channels,
      lang: 'fr',
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
      ...(customerPhoneNumber ? { customer_phone_number: customerPhoneNumber } : {}),
      lock_phone_number: false,
      metadata: JSON.stringify({
        user_id: user.id,
        payment_type,
        mobile_operator,
        payment_method: paymentMethod,
        customer_phone,
        ...metadata,
      }),
    };

    console.log('Initializing CinetPay payment:', {
      transactionId,
      amount: amountRounded,
      currency,
      channels,
      payment_type,
      mobile_operator,
      has_customer_phone: Boolean(customer_phone),
    });

    let cinetpayResponse: Response;
    try {
      cinetpayResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cinetpayPayload),
      });
    } catch (fetchError) {
      console.error('CinetPay fetch error:', fetchError);
      return jsonResponse({
        success: false,
        error: 'Erreur réseau lors de l\'appel à CinetPay',
        details: fetchError instanceof Error ? fetchError.message : String(fetchError),
      });
    }

    const cinetpayData = await cinetpayResponse.json();
    console.log('CinetPay response:', cinetpayData);

    if (cinetpayData?.code !== '201') {
      console.error('CinetPay error:', cinetpayData);
      return jsonResponse({
        success: false,
        error: `${cinetpayData?.message || 'Erreur CinetPay'}${cinetpayData?.description ? `: ${cinetpayData.description}` : ''}`,
        details: cinetpayData,
      });
    }

    const { error: dbError } = await supabaseClient.from('cinetpay_payments').insert({
      user_id: user.id,
      transaction_id: transactionId,
      payment_token: cinetpayData.data?.payment_token,
      amount: amountRounded,
      currency,
      status: 'pending',
      description,
      metadata: metadata,
    });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return jsonResponse({
      success: true,
      transaction_id: transactionId,
      payment_url: cinetpayData.data?.payment_url,
      payment_token: cinetpayData.data?.payment_token,
    });
  } catch (error) {
    console.error('Error in cinetpay-initialize-payment:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
