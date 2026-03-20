/**
 * EDGE FUNCTION: create-payment-intent
 * Créer une commande PayPal pour paiement par carte bancaire
 * 224SOLUTIONS - PayPal exclusif
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getPayPalAccessToken(clientId: string, secretKey: string): Promise<string> {
  const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${secretKey}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      amount,
      currency = 'USD',
      seller_id,
      order_id,
      service_id,
      product_id,
      metadata = {},
      return_url,
      cancel_url,
    } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!seller_id) {
      return new Response(
        JSON.stringify({ error: 'seller_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier vendeur
    const { data: seller, error: sellerError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', seller_id)
      .single();

    if (sellerError || !seller) {
      return new Response(
        JSON.stringify({ error: 'Seller not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validVendorRoles = ['VENDOR', 'vendeur', 'Vendeur', 'vendor'];
    if (!validVendorRoles.includes(seller.role)) {
      return new Response(
        JSON.stringify({ error: 'User is not a vendor', actual_role: seller.role }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Commission (5% par défaut)
    let commissionRate = 5;
    try {
      const { data: config } = await supabase
        .from('stripe_config')
        .select('platform_commission_rate')
        .limit(1)
        .single();
      if (config?.platform_commission_rate) {
        commissionRate = config.platform_commission_rate;
      }
    } catch (_) { /* use default */ }

    const commissionAmount = Math.round((amount * commissionRate) / 100);
    const totalAmountWithCommission = amount + commissionAmount;
    const sellerNetAmount = amount;

    // Convertir en devise compatible PayPal
    // GNF n'est pas supporté par PayPal, convertir en USD
    let paypalCurrency = currency.toUpperCase();
    let paypalAmount = totalAmountWithCommission;
    
    const unsupportedCurrencies = ['GNF', 'XOF', 'XAF'];
    if (unsupportedCurrencies.includes(paypalCurrency)) {
      // Taux approximatif GNF -> USD (1 USD ≈ 8600 GNF)
      // Pour XOF: 1 USD ≈ 600 XOF
      const rates: Record<string, number> = { 'GNF': 8600, 'XOF': 600, 'XAF': 600 };
      const rate = rates[paypalCurrency] || 8600;
      paypalAmount = Math.max(1, Math.round((totalAmountWithCommission / rate) * 100) / 100);
      paypalCurrency = 'USD';
    }

    // Format pour PayPal (2 décimales)
    const formattedAmount = paypalAmount.toFixed(2);

    console.log(`💰 Paiement PayPal:
      - Montant produit: ${amount} ${currency}
      - Commission (${commissionRate}%): ${commissionAmount} ${currency}
      - TOTAL CLIENT: ${totalAmountWithCommission} ${currency}
      - PayPal: ${formattedAmount} ${paypalCurrency}
    `);

    // PayPal credentials
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalSecretKey = Deno.env.get('PAYPAL_SECRET_KEY');
    
    if (!paypalClientId || !paypalSecretKey) {
      return new Response(
        JSON.stringify({ error: 'PayPal credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken(paypalClientId, paypalSecretKey);

    // Construire les URLs de retour
    const origin = return_url ? new URL(return_url).origin : req.headers.get('origin') || 'https://vista-flows.lovable.app';
    const successUrl = return_url || `${origin}/payment-success`;
    const cancelUrl = cancel_url || `${origin}/payment-cancelled`;

    // Créer PayPal Order
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: paypalCurrency,
          value: formattedAmount,
        },
        description: `Paiement 224Solutions - ${seller.full_name || 'Vendeur'}`,
        custom_id: JSON.stringify({
          buyer_id: user.id,
          seller_id,
          order_id: order_id || '',
          product_id: product_id || '',
          original_amount: totalAmountWithCommission,
          original_currency: currency,
        }),
      }],
      payment_source: {
        card: {
          experience_context: {
            return_url: successUrl,
            cancel_url: cancelUrl,
          }
        }
      },
      application_context: {
        brand_name: '224Solutions',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: successUrl,
        cancel_url: cancelUrl,
      },
    };

    const paypalResponse = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(orderPayload),
    });

    const paypalOrder = await paypalResponse.json();

    if (!paypalResponse.ok) {
      console.error('❌ PayPal Order error:', JSON.stringify(paypalOrder));
      return new Response(
        JSON.stringify({ error: 'PayPal order creation failed', details: paypalOrder }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ PayPal Order created:', paypalOrder.id);

    // Enregistrer transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('stripe_transactions')
      .insert({
        stripe_payment_intent_id: `paypal_${paypalOrder.id}`,
        buyer_id: user.id,
        seller_id: seller_id,
        amount: totalAmountWithCommission,
        currency: currency.toUpperCase(),
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_net_amount: sellerNetAmount,
        status: 'PENDING',
        order_id: order_id,
        service_id: service_id,
        product_id: product_id,
        payment_method: 'paypal_card',
        metadata: {
          paypal_order_id: paypalOrder.id,
          paypal_currency: paypalCurrency,
          paypal_amount: formattedAmount,
          product_amount: amount,
          total_amount: totalAmountWithCommission,
          ...metadata
        },
      })
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Error creating transaction:', transactionError);
    }

    // Trouver le lien d'approbation
    const approveLink = paypalOrder.links?.find((l: any) => l.rel === 'approve')?.href;
    const captureLink = paypalOrder.links?.find((l: any) => l.rel === 'capture')?.href;

    return new Response(
      JSON.stringify({
        success: true,
        paypal_order_id: paypalOrder.id,
        approve_url: approveLink,
        capture_url: captureLink,
        transaction_id: transaction?.id,
        product_amount: amount,
        commission_amount: commissionAmount,
        total_amount: totalAmountWithCommission,
        paypal_amount: formattedAmount,
        paypal_currency: paypalCurrency,
        currency: currency,
        seller_net_amount: sellerNetAmount,
        status: paypalOrder.status,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in create-payment-intent:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: 'Payment creation failed', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
