import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Créer le client Supabase avec le service_role pour contourner RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Créer un client normal pour valider l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header manquant')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Erreur authentification:', authError)
      throw new Error('Non authentifié')
    }

    console.log('✅ Utilisateur authentifié:', user.id)

    // Vérifier si le wallet existe déjà
    const { data: existingWallet, error: checkError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency')
      .eq('user_id', user.id)
      .maybeSingle()

    if (checkError) {
      console.error('❌ Erreur vérification wallet:', checkError)
      throw checkError
    }

    if (existingWallet) {
      console.log('ℹ️ Wallet existe déjà:', existingWallet.id)
      return new Response(
        JSON.stringify({
          success: true,
          wallet: existingWallet,
          message: 'Wallet déjà existant'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Créer le wallet avec service_role pour contourner RLS
    console.log('📝 Création wallet pour user:', user.id)
    
    const { data: newWallet, error: createError } = await supabaseAdmin
      .from('wallets')
      .insert({
        user_id: user.id,
        balance: 0,
        currency: 'GNF',
        wallet_status: 'active'
      })
      .select('id, balance, currency, wallet_status')
      .single()

    if (createError) {
      console.error('❌ Erreur création wallet:', createError)
      throw createError
    }

    console.log('✅ Wallet créé avec succès:', newWallet.id)

    // Logger la création dans une table d'audit si elle existe
    try {
      await supabaseAdmin
        .from('wallet_creation_logs')
        .insert({
          user_id: user.id,
          wallet_id: newWallet.id,
          created_via: 'initialize-wallet-function',
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      // Ne pas échouer si la table de logs n'existe pas
      console.warn('⚠️ Table wallet_creation_logs non trouvée:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        wallet: newWallet,
        message: 'Wallet créé avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    )

  } catch (error) {
    console.error('❌ Erreur fonction initialize-wallet:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'initialisation du wallet'
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
