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

    const apiKey = (Deno.env.get('CINETPAY_API_KEY') ?? '').trim();
    const siteIdRaw = (Deno.env.get('CINETPAY_SITE_ID') ?? '').trim();

    if (!apiKey || !siteIdRaw) {
      console.error('CinetPay configuration manquante ou invalide', { hasKey: Boolean(apiKey), siteIdRaw });
      return jsonResponse({ success: false, error: 'Configuration de paiement manquante' }, 500);
    }

    // URL de retour: ne jamais dépendre du domaine "preview" (souvent non autorisé côté CinetPay)
    const appBaseUrl = (Deno.env.get('APP_BASE_URL') ?? 'https://224solutions.app').trim() || 'https://224solutions.app';
    const safeReturnUrl =
      return_url && return_url.startsWith(appBaseUrl)
        ? return_url
        : `${appBaseUrl}/payment-success`;

    // transaction_id: format court, alphanumérique, stable (évite rejets silencieux)
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
    const transactionId = `TXN${ts}${rnd}`;
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

    // Téléphone: on conserve le format local (9 chiffres) puis on dérive les formats requis par CinetPay
    let customerPhoneLocal: string | null = null;
    if (customer_phone) {
      const cleaned = customer_phone.replace(/\s/g, '').replace(/^\+/, '');
      const local = cleaned.replace(/^0/, '').replace(/^224/, '');
      if (/^\d{9}$/.test(local)) {
        customerPhoneLocal = local;
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

    const customerPhoneDigitsWithCountry = customerPhoneLocal ? `224${customerPhoneLocal}` : null;
    const customerPhonePlusE164 = customerPhoneLocal ? `+224${customerPhoneLocal}` : null;

    // Payload strictement minimal (évite 624 "CB"), + payment_method pour forcer Orange/MTN quand nécessaire
    const basePayload: Record<string, unknown> = {
      apikey: apiKey,
      site_id: siteIdRaw,
      transaction_id: transactionId,
      amount: amountRounded,
      currency,
      description: (description || 'Paiement 224Solutions').toString().replace(/[#$&_\/]/g, ' '),
      return_url: safeReturnUrl,
      notify_url: notifyUrl,
      channels,
      lang: 'fr',
      ...(customer_name ? { customer_name } : {}),
      ...(customer_email ? { customer_email } : {}),
      metadata: JSON.stringify({
        user_id: user.id,
        payment_type,
        mobile_operator,
        payment_method: paymentMethod,
        customer_phone,
        ...metadata,
      }),
    };

    const callCinetPay = async (payload: Record<string, unknown>, attemptLabel: string) => {
      console.log('CinetPay payload (safe):', {
        attempt: attemptLabel,
        site_id: payload.site_id,
        transaction_id: payload.transaction_id,
        amount: payload.amount,
        currency: payload.currency,
        channels: payload.channels,
        payment_method: (payload as any).payment_method ?? null,
        has_customer_name: Boolean((payload as any).customer_name),
        has_customer_email: Boolean((payload as any).customer_email),
        has_customer_phone_number: Boolean((payload as any).customer_phone_number),
        lock_phone_number: (payload as any).lock_phone_number ?? null,
        return_url: payload.return_url,
        notify_url: payload.notify_url,
      });

      let resp: Response;
      try {
        resp = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (fetchError) {
        console.error('CinetPay fetch error:', fetchError);
        return {
          ok: false as const,
          data: null as any,
          networkError: fetchError instanceof Error ? fetchError.message : String(fetchError),
        };
      }

      let data: any = null;
      try {
        data = await resp.json();
      } catch (e) {
        const text = await resp.text().catch(() => '');
        console.error('CinetPay invalid JSON response:', { status: resp.status, text });
        return { ok: false as const, data: { code: 'HTTP_' + resp.status, message: 'INVALID_RESPONSE', description: text } };
      }

      console.log('CinetPay response:', { attempt: attemptLabel, http: resp.status, ...data });
      return { ok: true as const, data };
    };

    // Tentative 1: Mobile Money (format +224 + lock_phone_number=true) / sinon checkout standard
    const attempt1Payload: Record<string, unknown> = {
      ...basePayload,
      ...(payment_type === 'mobile_money' && paymentMethod ? { payment_method: paymentMethod } : {}),
      ...(payment_type === 'mobile_money' && customerPhonePlusE164 ? { customer_phone_number: customerPhonePlusE164, lock_phone_number: true } : {}),
    };

    console.log('Initializing CinetPay payment:', {
      transactionId,
      amount: amountRounded,
      currency,
      channels: attempt1Payload.channels,
      payment_type,
      mobile_operator,
      payment_method: (attempt1Payload as any).payment_method ?? null,
      customer_phone_number: customerPhonePlusE164 ? `+224***${customerPhoneLocal?.slice(-3)}` : null,
      lock_phone_number: (attempt1Payload as any).lock_phone_number ?? null,
      return_url: safeReturnUrl,
      notify_url: notifyUrl,
    });

    let cinetpayData: any = null;

    const r1 = await callCinetPay(attempt1Payload, 'attempt_1');
    if (!r1.ok) {
      return jsonResponse({
        success: false,
        error: 'Erreur réseau lors de l\'appel à CinetPay',
        details: r1.networkError,
      });
    }
    cinetpayData = r1.data;

    // Tentative 2: si 624 en mobile money, réessayer avec digits-only + lock_phone_number=false
    if (payment_type === 'mobile_money' && cinetpayData?.code === '624') {
      const attempt2Payload: Record<string, unknown> = {
        ...basePayload,
        ...(paymentMethod ? { payment_method: paymentMethod } : {}),
        ...(customerPhoneDigitsWithCountry ? { customer_phone_number: customerPhoneDigitsWithCountry } : {}),
        lock_phone_number: false,
      };

      console.warn('CinetPay returned 624, retrying with digits-only phone format...');
      const r2 = await callCinetPay(attempt2Payload, 'attempt_2_digits_only');
      if (r2.ok) cinetpayData = r2.data;
    }

    // Tentative 3: si toujours 624, fallback checkout (ALL) sans forçage opérateur
    if (payment_type === 'mobile_money' && cinetpayData?.code === '624') {
      const attempt3Payload: Record<string, unknown> = {
        ...basePayload,
        channels: 'ALL',
        lock_phone_number: false,
      };

      console.warn('CinetPay still returned 624, falling back to generic checkout (ALL) without operator forcing...');
      const r3 = await callCinetPay(attempt3Payload, 'attempt_3_fallback_all');
      if (r3.ok) cinetpayData = r3.data;
    }

    if (cinetpayData?.code !== '201') {
      console.error('CinetPay error:', cinetpayData);

      // Diagnostic 624: vérifier si la paire (apikey, site_id) est acceptée par l'endpoint check
      if (cinetpayData?.code === '624') {
        try {
          const checkResp = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apikey: apiKey,
              site_id: siteIdRaw,
              transaction_id: transactionId,
            }),
          });

          const checkText = await checkResp.text();
          let checkBody: unknown = checkText;
          try {
            checkBody = JSON.parse(checkText);
          } catch {
            // ignore
          }

          console.warn('CinetPay diagnostic /payment/check:', {
            http: checkResp.status,
            body: checkBody,
          });
        } catch (e) {
          console.warn('CinetPay diagnostic /payment/check failed:', e);
        }
      }

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
