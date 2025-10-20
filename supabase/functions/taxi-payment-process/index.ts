/**
 * EDGE FUNCTION: PROCESSUS DE PAIEMENT TAXI-MOTO
 * Gère les paiements multi-canaux: Carte, Orange Money, MTN Money, Wallet, Cash
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { tripId, paymentMethod, amount, customerId, driverId, idempotencyKey } = await req.json()

    console.log(`[Taxi Payment] Processing: ${paymentMethod} - ${amount} GNF - Trip: ${tripId}`)

    // Vérifier doublon avec idempotency key
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('taxi_transactions')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .single()

      if (existing) {
        console.log('[Taxi Payment] Duplicate detected, returning existing transaction')
        return new Response(
          JSON.stringify({ success: true, transaction: existing, duplicate: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Créer transaction initiale
    const { data: transaction, error: txError } = await supabase
      .from('taxi_transactions')
      .insert({
        ride_id: tripId,
        customer_id: customerId,
        driver_id: driverId,
        amount,
        payment_method: paymentMethod,
        status: 'pending',
        idempotency_key: idempotencyKey,
        currency: 'GNF'
      })
      .select()
      .single()

    if (txError) throw txError

    let paymentResult

    // Traiter selon le mode de paiement
    switch (paymentMethod) {
      case 'wallet': {
        paymentResult = await processWalletPayment(supabase, customerId, driverId, amount, tripId)
        break
      }
      
      case 'card': {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) throw new Error('Stripe not configured')
        paymentResult = await processCardPayment(stripeKey, amount, customerId, tripId)
        break
      }
      
      case 'orange_money': {
        paymentResult = await processOrangeMoneyPayment(customerId, amount, tripId)
        break
      }
      
      case 'mtn_money': {
        paymentResult = await processMTNMoneyPayment(customerId, amount, tripId)
        break
      }
      
      case 'cash': {
        paymentResult = { status: 'pending', message: 'Cash payment pending driver confirmation' }
        break
      }
      
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`)
    }

    // Mettre à jour la transaction
    const finalStatus = paymentResult.status === 'completed' ? 'completed' : paymentResult.status
    
    const { error: updateError } = await supabase
      .from('taxi_transactions')
      .update({
        status: finalStatus,
        external_ref: paymentResult.ref,
        metadata: paymentResult.metadata || {},
        completed_at: finalStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', transaction.id)

    if (updateError) throw updateError

    // Si paiement réussi, mettre à jour la course
    if (finalStatus === 'completed') {
      await supabase
        .from('taxi_trips')
        .update({
          payment_status: 'paid',
          payment_method: paymentMethod
        })
        .eq('id', tripId)

      // Notifier le conducteur
      await supabase.rpc('create_taxi_notification', {
        p_user_id: (await supabase.from('taxi_drivers').select('user_id').eq('id', driverId).single()).data?.user_id,
        p_type: 'payment_received',
        p_title: 'Paiement reçu',
        p_body: `Paiement de ${amount} GNF reçu pour la course`,
        p_data: { tripId, amount, method: paymentMethod },
        p_ride_id: tripId
      })
    }

    console.log(`[Taxi Payment] Success: ${finalStatus}`)

    return new Response(
      JSON.stringify({
        success: true,
        transaction: { ...transaction, status: finalStatus },
        payment: paymentResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Taxi Payment] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Traitement Wallet 224Solutions
 */
async function processWalletPayment(supabase: any, customerId: string, driverId: string, amount: number, tripId: string) {
  // Vérifier le solde
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', customerId)
    .eq('currency', 'GNF')
    .single()

  if (!wallet || wallet.balance < amount) {
    return { status: 'failed', message: 'Insufficient balance' }
  }

  // Débiter le client
  await supabase
    .from('wallets')
    .update({ balance: wallet.balance - amount })
    .eq('user_id', customerId)
    .eq('currency', 'GNF')

  // Calculer les parts (85% conducteur, 15% plateforme)
  const driverShare = Math.round(amount * 0.85)
  const platformFee = amount - driverShare

  // Créditer le conducteur
  const { data: driverData } = await supabase
    .from('taxi_drivers')
    .select('user_id')
    .eq('id', driverId)
    .single()

  if (driverData) {
    await supabase.rpc('credit_wallet', {
      receiver_user_id: driverData.user_id,
      credit_amount: driverShare
    })
  }

  return {
    status: 'completed',
    ref: `WALLET-${Date.now()}`,
    metadata: { driverShare, platformFee }
  }
}

/**
 * Traitement Carte Bancaire (Stripe)
 */
async function processCardPayment(stripeKey: string, amount: number, customerId: string, tripId: string) {
  const amountInCents = Math.round(amount) // GNF n'a pas de centimes

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: amountInCents.toString(),
      currency: 'gnf',
      'metadata[customer_id]': customerId,
      'metadata[trip_id]': tripId,
    }),
  })

  const paymentIntent = await response.json()

  if (!response.ok) {
    throw new Error(`Stripe error: ${paymentIntent.error?.message || 'Unknown error'}`)
  }

  return {
    status: 'processing',
    ref: paymentIntent.id,
    metadata: {
      client_secret: paymentIntent.client_secret,
      status: paymentIntent.status
    }
  }
}

/**
 * Traitement Orange Money
 */
async function processOrangeMoneyPayment(customerId: string, amount: number, tripId: string) {
  const orangeApiKey = Deno.env.get('ORANGE_MONEY_API_KEY')
  const orangeUrl = Deno.env.get('ORANGE_MONEY_API_URL')

  if (!orangeApiKey || !orangeUrl) {
    return { status: 'failed', message: 'Orange Money not configured' }
  }

  // TODO: Implémenter l'API Orange Money réelle
  // Pour l'instant, retourner un statut processing
  console.log('[Orange Money] Payment initiated:', { customerId, amount, tripId })

  return {
    status: 'processing',
    ref: `OM-${Date.now()}`,
    metadata: { provider: 'orange_money' }
  }
}

/**
 * Traitement MTN Money
 */
async function processMTNMoneyPayment(customerId: string, amount: number, tripId: string) {
  const mtnApiKey = Deno.env.get('MTN_MONEY_API_KEY')
  const mtnUrl = Deno.env.get('MTN_MONEY_API_URL')

  if (!mtnApiKey || !mtnUrl) {
    return { status: 'failed', message: 'MTN Money not configured' }
  }

  // TODO: Implémenter l'API MTN Money réelle
  console.log('[MTN Money] Payment initiated:', { customerId, amount, tripId })

  return {
    status: 'processing',
    ref: `MTN-${Date.now()}`,
    metadata: { provider: 'mtn_money' }
  }
}
