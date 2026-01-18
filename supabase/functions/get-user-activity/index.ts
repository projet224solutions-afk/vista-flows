/**
 * 🔍 EDGE FUNCTION: RÉCUPÉRATION COMPLÈTE DES ACTIVITÉS UTILISATEUR
 * Permet aux PDG de voir tout l'historique d'un utilisateur
 * Bypass les RLS en utilisant le service_role
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper pour déterminer le role_type à partir du custom_id
function getRoleTypeFromCustomId(customId: string): string | null {
  const prefix = customId.substring(0, 3).toUpperCase();
  const prefixMap: Record<string, string> = {
    'VND': 'vendor',
    'CLT': 'client',
    'DRV': 'driver',
    'AGT': 'agent',
    'PDG': 'pdg',
    'TRS': 'transitaire',
    'WRK': 'worker',
    'BST': 'bureau'
  };
  return prefixMap[prefix] || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Créer client avec le token de l'utilisateur pour vérifier son rôle
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    // Vérifier que l'utilisateur est authentifié
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      console.log('Auth error or no user:', authError)
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Vérifier le rôle admin/PDG dans profiles (les rôles autorisés: admin, pdg, agent)
    const { data: profile } = await userClient.from('profiles').select('role').eq('id', user.id).single()
    console.log('User role:', profile?.role)
    const allowedRoles = ['admin', 'pdg', 'agent']
    if (!profile || !allowedRoles.includes(profile.role as string)) {
      return new Response(JSON.stringify({ error: 'Accès réservé aux administrateurs' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Récupérer le customId de la requête
    const { customId } = await req.json()
    if (!customId) {
      return new Response(JSON.stringify({ error: 'ID utilisateur requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Créer client admin pour bypasser les RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const trimmedId = customId.trim().toUpperCase()

    // 1. Trouver l'utilisateur dans user_ids
    const { data: userIdData, error: userIdError } = await adminClient
      .from('user_ids')
      .select('*')
      .eq('custom_id', trimmedId)
      .maybeSingle()

    if (userIdError) {
      console.error('Error finding user:', userIdError)
      return new Response(JSON.stringify({ error: 'Erreur lors de la recherche' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!userIdData) {
      return new Response(JSON.stringify({ error: `Aucun utilisateur trouvé avec l'ID: ${trimmedId}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = userIdData.user_id
    const roleType = getRoleTypeFromCustomId(trimmedId)

    // 2. Récupérer le profil complet
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    // 3. Récupérer le wallet
    const { data: wallet } = await adminClient
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // 4. Récupérer les transactions (envoyées et reçues)
    const { data: sentTransactions } = await adminClient
      .from('wallet_transactions')
      .select('*')
      .eq('sender_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    const { data: receivedTransactions } = await adminClient
      .from('wallet_transactions')
      .select('*')
      .eq('receiver_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    // 5. Récupérer les commandes
    const { data: orders } = await adminClient
      .from('orders')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    // 6. Récupérer l'historique de connexion
    const { data: loginHistory } = await adminClient
      .from('auth_attempts_log')
      .select('*')
      .eq('identifier', userProfile?.email || '')
      .order('attempted_at', { ascending: false })
      .limit(50)

    // 7. Récupérer les logs d'audit
    const { data: auditLogs } = await adminClient
      .from('audit_logs')
      .select('*')
      .eq('actor_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    // 8. Récupérer les messages envoyés
    const { data: messages } = await adminClient
      .from('messages')
      .select('id, recipient_id, content, type, status, created_at')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    // 9. Récupérer les livraisons
    const { data: deliveriesAsClient } = await adminClient
      .from('deliveries')
      .select('id, status, pickup_address, delivery_address, price, created_at')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(25)

    const { data: deliveriesAsDriver } = await adminClient
      .from('deliveries')
      .select('id, status, pickup_address, delivery_address, price, created_at')
      .eq('driver_id', userId)
      .order('created_at', { ascending: false })
      .limit(25)

    const deliveries = [...(deliveriesAsClient || []), ...(deliveriesAsDriver || [])]

    // 10. Récupérer les courses (rides)
    const { data: ridesAsCustomer } = await adminClient
      .from('rides')
      .select('id, status, pickup_address, destination_address, actual_fare, estimated_fare, created_at')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(25)

    const { data: ridesAsDriver } = await adminClient
      .from('rides')
      .select('id, status, pickup_address, destination_address, actual_fare, estimated_fare, created_at')
      .eq('driver_id', userId)
      .order('created_at', { ascending: false })
      .limit(25)

    const rides = [...(ridesAsCustomer || []), ...(ridesAsDriver || [])]

    // 11. Récupérer les avis
    const { data: reviews } = await adminClient
      .from('product_reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    // 12. Info vendeur (si applicable)
    let vendorInfo = null
    if (roleType === 'vendor') {
      const { data: vendor } = await adminClient
        .from('vendors')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (vendor) {
        const { count: productCount } = await adminClient
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)

        vendorInfo = {
          id: vendor.id,
          business_name: vendor.business_name,
          business_type: vendor.business_type,
          is_active: vendor.is_active,
          total_products: productCount || 0,
          created_at: vendor.created_at
        }
      }
    }

    // 13. Info chauffeur (si applicable)
    let driverInfo = null
    if (roleType === 'driver') {
      const { data: driver } = await adminClient
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (driver) {
        driverInfo = {
          id: driver.id,
          vehicle_type: driver.vehicle_type,
          license_number: driver.license_number,
          status: driver.status,
          total_deliveries: driver.total_deliveries,
          rating: driver.rating,
          created_at: driver.created_at
        }
      }
    }

    // Calculer les statistiques
    const allTransactions = [
      ...(sentTransactions || []).map(t => ({ ...t, direction: 'sent' })),
      ...(receivedTransactions || []).map(t => ({ ...t, direction: 'received' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const totalSpent = (sentTransactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0)
    const totalReceived = (receivedTransactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0)
    const totalOrdersAmount = (orders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
    
    const reviewRatings = (reviews || []).map(r => r.rating).filter(Boolean)
    const averageRating = reviewRatings.length > 0 
      ? reviewRatings.reduce((a, b) => a + b, 0) / reviewRatings.length 
      : 0

    const registrationDate = userProfile?.created_at || userIdData.created_at
    const accountAge = registrationDate 
      ? Math.floor((Date.now() - new Date(registrationDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Trouver la dernière activité
    const allDates = [
      ...(allTransactions.map(t => t.created_at)),
      ...(orders || []).map(o => o.created_at),
      ...(messages || []).map(m => m.created_at),
      ...(auditLogs || []).map(a => a.created_at)
    ].filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    // Construire la réponse
    const summary = {
      profile: userProfile,
      customId: trimmedId,
      roleType,
      
      wallet: wallet ? {
        id: String(wallet.id),
        balance: Number(wallet.balance) || 0,
        currency: wallet.currency || 'GNF',
        status: wallet.wallet_status || 'active',
        created_at: wallet.created_at
      } : null,
      
      transactions: allTransactions.slice(0, 100).map(t => ({
        id: String(t.id),
        type: t.transaction_type || 'transfer',
        amount: Number(t.amount) || 0,
        currency: t.currency || 'GNF',
        status: t.status || 'completed',
        description: t.description,
        sender_user_id: t.sender_user_id,
        receiver_user_id: t.receiver_user_id,
        created_at: t.created_at,
        metadata: t.metadata
      })),
      totalTransactions: allTransactions.length,
      totalSpent,
      totalReceived,
      
      orders: (orders || []).map(o => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        total_amount: Number(o.total_amount) || 0,
        created_at: o.created_at,
        updated_at: o.updated_at
      })),
      totalOrders: (orders || []).length,
      totalOrdersAmount,
      
      loginHistory: (loginHistory || []).map(l => ({
        id: l.id,
        ip_address: l.ip_address,
        user_agent: l.user_agent,
        success: l.success ?? false,
        attempted_at: l.attempted_at,
        role: l.role
      })),
      totalLogins: (loginHistory || []).filter(l => l.success).length,
      lastLogin: (loginHistory || [])[0]?.attempted_at || null,
      
      auditLogs: (auditLogs || []).map(a => ({
        id: a.id,
        action: a.action,
        target_type: a.target_type,
        target_id: a.target_id,
        ip_address: a.ip_address,
        user_agent: a.user_agent,
        data_json: a.data_json,
        created_at: a.created_at
      })),
      totalAuditEvents: (auditLogs || []).length,
      
      messages: (messages || []).map(m => ({
        id: m.id,
        recipient_id: m.recipient_id,
        content_preview: ((m.content as string) || '').substring(0, 50) + '...',
        type: m.type,
        status: m.status,
        created_at: m.created_at
      })),
      totalMessages: (messages || []).length,
      
      deliveries: deliveries.map(d => ({
        id: d.id,
        status: d.status,
        pickup_address: typeof d.pickup_address === 'object' ? JSON.stringify(d.pickup_address) : String(d.pickup_address || ''),
        delivery_address: typeof d.delivery_address === 'object' ? JSON.stringify(d.delivery_address) : String(d.delivery_address || ''),
        price: Number(d.price) || 0,
        created_at: d.created_at
      })),
      
      rides: rides.map(r => ({
        id: r.id,
        status: r.status,
        pickup_address: typeof r.pickup_address === 'object' ? JSON.stringify(r.pickup_address) : String(r.pickup_address || ''),
        destination_address: typeof r.destination_address === 'object' ? JSON.stringify(r.destination_address) : String(r.destination_address || ''),
        fare: Number(r.actual_fare || r.estimated_fare) || 0,
        created_at: r.created_at
      })),
      
      reviews: (reviews || []).map(r => ({
        id: r.id,
        rating: r.rating,
        content: r.content,
        product_id: r.product_id,
        created_at: r.created_at
      })),
      totalReviews: (reviews || []).length,
      averageRating,
      
      vendorInfo,
      driverInfo,
      
      accountAge,
      registrationDate,
      lastActivity: allDates[0] || null
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in get-user-activity:', error)
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
