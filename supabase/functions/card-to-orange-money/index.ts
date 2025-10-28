import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  cardId: string
  phoneNumber: string
  amount: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('❌ Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: RequestBody = await req.json()
    const { cardId, phoneNumber, amount } = body

    console.log('💳→📱 Transfert carte vers Orange Money:', { cardId, phoneNumber, amount, userId: user.id })

    // Étape 1: Appeler la fonction DB pour débiter la carte
    const { data: transactionId, error: dbError } = await supabaseClient.rpc('process_card_to_om', {
      p_user_id: user.id,
      p_card_id: cardId,
      p_phone_number: phoneNumber,
      p_amount: amount
    })

    if (dbError) {
      console.error('❌ Erreur DB:', dbError)
      return new Response(
        JSON.stringify({ error: dbError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Transaction créée:', transactionId)

    // Étape 2: Appeler l'API Orange Money (simulé pour le moment)
    // TODO: Intégrer vraie API Orange Money
    const omApiKey = Deno.env.get('ORANGE_MONEY_API_KEY')
    
    let omResponse: {
      success: boolean;
      transactionId: string | null;
      message: string;
    } = {
      success: true,
      transactionId: `OM${Date.now()}`,
      message: 'Transfert vers Orange Money réussi'
    }

    if (omApiKey) {
      try {
        // Appel réel à l'API Orange Money
        const omApiUrl = Deno.env.get('ORANGE_MONEY_API_URL') || 'https://api.orange.com/orange-money-webpay/dev/v1'
        
        const omRes = await fetch(`${omApiUrl}/webpayment`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${omApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            merchant_key: omApiKey,
            currency: 'GNF',
            order_id: transactionId,
            amount: amount,
            return_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/card-to-orange-money/callback`,
            cancel_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/card-to-orange-money/cancel`,
            notif_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/card-to-orange-money/notify`,
            lang: 'fr',
            reference: transactionId
          })
        })

        if (!omRes.ok) {
          throw new Error(`Orange Money API error: ${omRes.statusText}`)
        }

        omResponse = await omRes.json() as typeof omResponse
        console.log('✅ Réponse Orange Money:', omResponse)
      } catch (omError: any) {
        console.error('⚠️ Erreur API Orange Money:', omError)
        omResponse = {
          success: false,
          transactionId: null,
          message: omError?.message || 'Erreur inconnue'
        }
      }
    } else {
      console.log('⚠️ Mode simulation - Orange Money API Key non configurée')
    }

    // Étape 3: Mettre à jour la transaction avec la réponse Orange Money
    const { error: updateError } = await supabaseClient
      .from('financial_transactions')
      .update({
        status: omResponse.success ? 'completed' : 'failed',
        completed_at: omResponse.success ? new Date().toISOString() : null,
        api_response: omResponse,
        error_message: omResponse.success ? null : omResponse.message
      })
      .eq('id', transactionId)

    if (updateError) {
      console.error('⚠️ Erreur mise à jour transaction:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: omResponse.success,
        transactionId,
        omTransactionId: omResponse.transactionId,
        message: omResponse.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Erreur serveur:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
