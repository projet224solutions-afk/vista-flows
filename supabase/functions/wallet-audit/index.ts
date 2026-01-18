/**
 * 🔐 EDGE FUNCTION: AUDIT COMPLET ET CORRECTION DES WALLETS
 * Permet au PDG de:
 * - Diagnostiquer les problèmes de wallet
 * - Vérifier l'intégrité des soldes
 * - Corriger les divergences
 * - Vérifier les signatures API de paiement
 * - Voir l'historique complet des opérations wallet
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WalletAuditResult {
  success: boolean
  walletFound: boolean
  wallet: any
  transactions: any[]
  issues: WalletIssue[]
  calculatedBalance: number
  storedBalance: number
  balanceDifference: number
  isBalanceCorrect: boolean
  apiSignatures: ApiSignatureCheck[]
  recommendations: string[]
  logs: WalletLogEntry[]
  suspiciousActivities: any[]
  reconciliationHistory: any[]
  paymentMethods: any[]
  summary: AuditSummary
}

interface WalletIssue {
  type: 'critical' | 'warning' | 'info'
  code: string
  message: string
  details?: any
  canAutoFix: boolean
}

interface ApiSignatureCheck {
  api: string
  status: 'valid' | 'invalid' | 'unknown' | 'expired'
  lastChecked: string
  details?: string
}

interface WalletLogEntry {
  id: string
  action: string
  amount?: number
  old_balance?: number
  new_balance?: number
  created_at: string
  metadata?: any
}

interface AuditSummary {
  totalIncoming: number
  totalOutgoing: number
  expectedBalance: number
  actualBalance: number
  transactionCount: number
  successfulTransactions: number
  failedTransactions: number
  pendingTransactions: number
  lastActivity: string | null
  walletAge: number
  healthScore: number
}

// Déterminer le role_type depuis le custom_id
function getRoleTypeFromCustomId(customId: string): string | null {
  const prefix = customId.substring(0, 3).toUpperCase()
  const prefixMap: Record<string, string> = {
    'VND': 'vendor',
    'CLT': 'client',
    'DRV': 'driver',
    'AGT': 'agent',
    'PDG': 'pdg',
    'TRS': 'transitaire',
    'WRK': 'worker',
    'BST': 'bureau'
  }
  return prefixMap[prefix] || null
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

    // Créer client utilisateur pour vérifier le rôle
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      console.log('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Vérifier rôle admin/PDG
    const { data: profile } = await userClient.from('profiles').select('role').eq('id', user.id).single()
    const allowedRoles = ['admin', 'pdg']
    if (!profile || !allowedRoles.includes(profile.role as string)) {
      return new Response(JSON.stringify({ error: 'Accès réservé aux administrateurs' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { action, customId, userId: targetUserId, fixAction } = body

    // Client admin pour bypasser RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // =========== ACTIONS ===========
    switch (action) {
      case 'audit': {
        // Audit complet d'un wallet
        const result = await performWalletAudit(adminClient, customId, targetUserId)
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'fix': {
        // Corriger un problème spécifique
        const result = await fixWalletIssue(adminClient, customId, targetUserId, fixAction, user.id)
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'verify-signatures': {
        // Vérifier les signatures API de paiement
        const result = await verifyPaymentSignatures(adminClient)
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'reconcile': {
        // Réconcilier le solde
        const result = await reconcileBalance(adminClient, customId, targetUserId, user.id)
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'create-wallet': {
        // Créer un wallet manquant
        const result = await createMissingWallet(adminClient, customId, targetUserId, user.id)
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'get-all-wallets': {
        // Liste tous les wallets avec problèmes
        const result = await getAllWalletsWithIssues(adminClient)
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Action non reconnue' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

  } catch (error) {
    console.error('Error in wallet-audit:', error)
    return new Response(JSON.stringify({ error: 'Erreur interne', details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// =========== FONCTIONS D'AUDIT ===========

async function performWalletAudit(client: any, customId?: string, userId?: string): Promise<WalletAuditResult> {
  const issues: WalletIssue[] = []
  const recommendations: string[] = []

  // Trouver l'utilisateur
  let targetUserId = userId
  let customIdFound = customId

  if (customId && !userId) {
    const { data: userIdData } = await client
      .from('user_ids')
      .select('*')
      .eq('custom_id', customId.toUpperCase())
      .maybeSingle()
    
    if (!userIdData) {
      return {
        success: false,
        walletFound: false,
        wallet: null,
        transactions: [],
        issues: [{ type: 'critical', code: 'USER_NOT_FOUND', message: `Utilisateur ${customId} non trouvé`, canAutoFix: false }],
        calculatedBalance: 0,
        storedBalance: 0,
        balanceDifference: 0,
        isBalanceCorrect: false,
        apiSignatures: [],
        recommendations: ['Vérifier que l\'ID utilisateur est correct'],
        logs: [],
        suspiciousActivities: [],
        reconciliationHistory: [],
        paymentMethods: [],
        summary: { totalIncoming: 0, totalOutgoing: 0, expectedBalance: 0, actualBalance: 0, transactionCount: 0, successfulTransactions: 0, failedTransactions: 0, pendingTransactions: 0, lastActivity: null, walletAge: 0, healthScore: 0 }
      }
    }
    targetUserId = userIdData.user_id
    customIdFound = customId.toUpperCase()
  }

  if (!targetUserId) {
    return {
      success: false,
      walletFound: false,
      wallet: null,
      transactions: [],
      issues: [{ type: 'critical', code: 'NO_USER_ID', message: 'Aucun ID utilisateur fourni', canAutoFix: false }],
      calculatedBalance: 0,
      storedBalance: 0,
      balanceDifference: 0,
      isBalanceCorrect: false,
      apiSignatures: [],
      recommendations: ['Fournir un customId ou userId valide'],
      logs: [],
      suspiciousActivities: [],
      reconciliationHistory: [],
      paymentMethods: [],
      summary: { totalIncoming: 0, totalOutgoing: 0, expectedBalance: 0, actualBalance: 0, transactionCount: 0, successfulTransactions: 0, failedTransactions: 0, pendingTransactions: 0, lastActivity: null, walletAge: 0, healthScore: 0 }
    }
  }

  console.log('Auditing wallet for user:', targetUserId, 'customId:', customIdFound)

  // Récupérer le wallet
  const { data: wallet, error: walletError } = await client
    .from('wallets')
    .select('*')
    .eq('user_id', targetUserId)
    .maybeSingle()

  if (walletError) {
    console.error('Wallet error:', walletError)
  }

  if (!wallet) {
    issues.push({
      type: 'critical',
      code: 'WALLET_MISSING',
      message: 'Aucun wallet trouvé pour cet utilisateur',
      canAutoFix: true
    })
    recommendations.push('Créer un wallet pour cet utilisateur via l\'action "create-wallet"')
  }

  // Récupérer toutes les transactions
  const { data: sentTx } = await client
    .from('wallet_transactions')
    .select('*')
    .eq('sender_user_id', targetUserId)
    .order('created_at', { ascending: false })

  const { data: receivedTx } = await client
    .from('wallet_transactions')
    .select('*')
    .eq('receiver_user_id', targetUserId)
    .order('created_at', { ascending: false })

  // Aussi vérifier d'autres tables de transactions
  const { data: p2pSent } = await client
    .from('p2p_transactions')
    .select('*')
    .eq('sender_id', targetUserId)

  const { data: p2pReceived } = await client
    .from('p2p_transactions')
    .select('*')
    .eq('receiver_id', targetUserId)

  const { data: djomySent } = await client
    .from('djomy_payments')
    .select('*')
    .eq('payer_user_id', targetUserId)
    .eq('status', 'completed')

  const { data: djomyReceived } = await client
    .from('djomy_payments')
    .select('*')
    .eq('receiver_user_id', targetUserId)
    .eq('status', 'completed')

  const { data: financialTx } = await client
    .from('financial_transactions')
    .select('*')
    .eq('user_id', targetUserId)

  const { data: stripeTx } = await client
    .from('stripe_transactions')
    .select('*')
    .eq('user_id', targetUserId)

  const { data: stripeWalletTx } = await client
    .from('stripe_wallet_transactions')
    .select('*')
    .eq('user_id', targetUserId)

  // Récupérer les logs wallet
  const { data: walletLogs } = await client
    .from('wallet_logs')
    .select('*')
    .eq('wallet_id', wallet?.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Récupérer les activités suspectes
  const { data: suspiciousActivities } = await client
    .from('wallet_suspicious_activities')
    .select('*')
    .eq('wallet_id', wallet?.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Récupérer l'historique de réconciliation
  const { data: reconciliationHistory } = await client
    .from('balance_reconciliation')
    .select('*')
    .eq('wallet_id', wallet?.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Récupérer les méthodes de paiement
  const { data: paymentMethods } = await client
    .from('wallet_payment_methods')
    .select('*')
    .eq('wallet_id', wallet?.id)

  // Calculer le solde attendu
  let totalIncoming = 0
  let totalOutgoing = 0
  let successfulTx = 0
  let failedTx = 0
  let pendingTx = 0

  // Wallet transactions
  for (const tx of (receivedTx || [])) {
    if (tx.status === 'completed') {
      totalIncoming += Number(tx.amount) || 0
      successfulTx++
    } else if (tx.status === 'failed') {
      failedTx++
    } else if (tx.status === 'pending') {
      pendingTx++
    }
  }

  for (const tx of (sentTx || [])) {
    if (tx.status === 'completed') {
      totalOutgoing += Number(tx.amount) || 0
      successfulTx++
    } else if (tx.status === 'failed') {
      failedTx++
    } else if (tx.status === 'pending') {
      pendingTx++
    }
  }

  // P2P
  for (const tx of (p2pReceived || [])) {
    if (tx.status === 'completed') totalIncoming += Number(tx.amount) || 0
  }
  for (const tx of (p2pSent || [])) {
    if (tx.status === 'completed') totalOutgoing += Number(tx.amount) || 0
  }

  // Djomy
  for (const tx of (djomyReceived || [])) {
    totalIncoming += Number(tx.amount) || 0
  }
  for (const tx of (djomySent || [])) {
    totalOutgoing += Number(tx.amount) || 0
  }

  // Stripe wallet transactions
  for (const tx of (stripeWalletTx || [])) {
    if (tx.transaction_type === 'deposit' && tx.status === 'completed') {
      totalIncoming += Number(tx.amount) || 0
    } else if (tx.transaction_type === 'withdrawal' && tx.status === 'completed') {
      totalOutgoing += Number(tx.amount) || 0
    }
  }

  const expectedBalance = totalIncoming - totalOutgoing
  const storedBalance = Number(wallet?.balance) || 0
  const balanceDifference = Math.abs(storedBalance - expectedBalance)
  const isBalanceCorrect = balanceDifference < 0.01 // Tolérance pour arrondis

  // Vérifier les problèmes
  if (wallet) {
    if (!isBalanceCorrect) {
      issues.push({
        type: balanceDifference > 1000 ? 'critical' : 'warning',
        code: 'BALANCE_MISMATCH',
        message: `Divergence de solde détectée: ${balanceDifference.toFixed(2)} ${wallet.currency}`,
        details: { stored: storedBalance, expected: expectedBalance, difference: balanceDifference },
        canAutoFix: true
      })
      recommendations.push('Effectuer une réconciliation du solde via l\'action "reconcile"')
    }

    if (wallet.is_blocked) {
      issues.push({
        type: 'warning',
        code: 'WALLET_BLOCKED',
        message: 'Le wallet est bloqué',
        details: { reason: wallet.blocked_reason, blockedAt: wallet.blocked_at },
        canAutoFix: true
      })
    }

    if (wallet.wallet_status !== 'active') {
      issues.push({
        type: 'warning',
        code: 'WALLET_INACTIVE',
        message: `Statut du wallet: ${wallet.wallet_status}`,
        canAutoFix: true
      })
    }

    // Vérifier les activités suspectes non résolues
    const unresolvedSuspicious = (suspiciousActivities || []).filter((a: any) => !a.is_resolved)
    if (unresolvedSuspicious.length > 0) {
      issues.push({
        type: 'critical',
        code: 'SUSPICIOUS_ACTIVITIES',
        message: `${unresolvedSuspicious.length} activité(s) suspecte(s) non résolue(s)`,
        details: unresolvedSuspicious,
        canAutoFix: false
      })
      recommendations.push('Examiner et résoudre les activités suspectes manuellement')
    }

    // Vérifier les transactions en attente depuis longtemps
    const oldPendingTx = (sentTx || []).concat(receivedTx || []).filter((tx: any) => {
      if (tx.status !== 'pending') return false
      const age = Date.now() - new Date(tx.created_at).getTime()
      return age > 24 * 60 * 60 * 1000 // Plus de 24h
    })
    if (oldPendingTx.length > 0) {
      issues.push({
        type: 'warning',
        code: 'OLD_PENDING_TX',
        message: `${oldPendingTx.length} transaction(s) en attente depuis plus de 24h`,
        details: oldPendingTx.map((tx: any) => ({ id: tx.id, amount: tx.amount, created_at: tx.created_at })),
        canAutoFix: false
      })
    }
  }

  // Combiner toutes les transactions
  const allTransactions = [
    ...(sentTx || []).map((tx: any) => ({ ...tx, _source: 'wallet_transactions', _direction: 'sent' })),
    ...(receivedTx || []).map((tx: any) => ({ ...tx, _source: 'wallet_transactions', _direction: 'received' })),
    ...(p2pSent || []).map((tx: any) => ({ ...tx, _source: 'p2p_transactions', _direction: 'sent' })),
    ...(p2pReceived || []).map((tx: any) => ({ ...tx, _source: 'p2p_transactions', _direction: 'received' })),
    ...(djomySent || []).map((tx: any) => ({ ...tx, _source: 'djomy_payments', _direction: 'sent' })),
    ...(djomyReceived || []).map((tx: any) => ({ ...tx, _source: 'djomy_payments', _direction: 'received' })),
    ...(financialTx || []).map((tx: any) => ({ ...tx, _source: 'financial_transactions' })),
    ...(stripeTx || []).map((tx: any) => ({ ...tx, _source: 'stripe_transactions' })),
    ...(stripeWalletTx || []).map((tx: any) => ({ ...tx, _source: 'stripe_wallet_transactions' })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const lastActivity = allTransactions[0]?.created_at || null
  const walletAge = wallet?.created_at 
    ? Math.floor((Date.now() - new Date(wallet.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Calculer le score de santé
  let healthScore = 100
  for (const issue of issues) {
    if (issue.type === 'critical') healthScore -= 30
    else if (issue.type === 'warning') healthScore -= 10
  }
  healthScore = Math.max(0, healthScore)

  // Vérifier les signatures API
  const apiSignatures = await checkApiSignatures(client)

  return {
    success: true,
    walletFound: !!wallet,
    wallet,
    transactions: allTransactions.slice(0, 200),
    issues,
    calculatedBalance: expectedBalance,
    storedBalance,
    balanceDifference,
    isBalanceCorrect,
    apiSignatures,
    recommendations,
    logs: (walletLogs || []).map((l: any) => ({
      id: l.id,
      action: l.action,
      amount: l.amount,
      old_balance: l.old_balance,
      new_balance: l.new_balance,
      created_at: l.created_at,
      metadata: l.metadata
    })),
    suspiciousActivities: suspiciousActivities || [],
    reconciliationHistory: reconciliationHistory || [],
    paymentMethods: paymentMethods || [],
    summary: {
      totalIncoming,
      totalOutgoing,
      expectedBalance,
      actualBalance: storedBalance,
      transactionCount: allTransactions.length,
      successfulTransactions: successfulTx,
      failedTransactions: failedTx,
      pendingTransactions: pendingTx,
      lastActivity,
      walletAge,
      healthScore
    }
  }
}

async function checkApiSignatures(client: any): Promise<ApiSignatureCheck[]> {
  const signatures: ApiSignatureCheck[] = []

  // Vérifier les connexions API
  const { data: apiConnections } = await client
    .from('api_connections')
    .select('*')
    .in('api_provider', ['stripe', 'djomy', 'orange_money', 'paypal'])

  for (const api of (apiConnections || [])) {
    const isExpired = api.expires_at && new Date(api.expires_at) < new Date()
    const status = isExpired ? 'expired' : (api.status === 'active' ? 'valid' : 'invalid')
    
    signatures.push({
      api: `${api.api_provider}:${api.api_name}`,
      status,
      lastChecked: api.last_request_at || api.updated_at,
      details: api.status
    })
  }

  // Vérifier STRIPE
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  signatures.push({
    api: 'Stripe API Key',
    status: stripeKey ? 'valid' : 'unknown',
    lastChecked: new Date().toISOString(),
    details: stripeKey ? 'Clé configurée' : 'Clé non configurée'
  })

  // Vérifier DJOMY
  const djomyKey = Deno.env.get('DJOMY_API_KEY')
  signatures.push({
    api: 'Djomy API Key',
    status: djomyKey ? 'valid' : 'unknown',
    lastChecked: new Date().toISOString(),
    details: djomyKey ? 'Clé configurée' : 'Clé non configurée'
  })

  return signatures
}

async function fixWalletIssue(client: any, customId: string | undefined, userId: string | undefined, fixAction: string, adminId: string) {
  // Trouver l'utilisateur
  let targetUserId = userId
  if (customId && !userId) {
    const { data: userIdData } = await client
      .from('user_ids')
      .select('user_id')
      .eq('custom_id', customId.toUpperCase())
      .maybeSingle()
    targetUserId = userIdData?.user_id
  }

  if (!targetUserId) {
    return { success: false, error: 'Utilisateur non trouvé' }
  }

  const { data: wallet } = await client
    .from('wallets')
    .select('*')
    .eq('user_id', targetUserId)
    .maybeSingle()

  switch (fixAction) {
    case 'unblock': {
      if (!wallet) return { success: false, error: 'Wallet non trouvé' }
      
      const { error } = await client
        .from('wallets')
        .update({ 
          is_blocked: false, 
          blocked_reason: null, 
          blocked_at: null,
          wallet_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id)

      if (error) return { success: false, error: error.message }

      // Log l'action
      await client.from('admin_action_logs').insert({
        admin_id: adminId,
        action_type: 'wallet_unblock',
        target_type: 'wallet',
        target_id: wallet.id,
        old_value: { is_blocked: true, reason: wallet.blocked_reason },
        new_value: { is_blocked: false }
      })

      return { success: true, message: 'Wallet débloqué avec succès' }
    }

    case 'activate': {
      if (!wallet) return { success: false, error: 'Wallet non trouvé' }
      
      const { error } = await client
        .from('wallets')
        .update({ 
          wallet_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id)

      if (error) return { success: false, error: error.message }

      await client.from('admin_action_logs').insert({
        admin_id: adminId,
        action_type: 'wallet_activate',
        target_type: 'wallet',
        target_id: wallet.id,
        old_value: { status: wallet.wallet_status },
        new_value: { status: 'active' }
      })

      return { success: true, message: 'Wallet activé avec succès' }
    }

    default:
      return { success: false, error: 'Action de correction non reconnue' }
  }
}

async function reconcileBalance(client: any, customId: string | undefined, userId: string | undefined, adminId: string) {
  // Trouver l'utilisateur
  let targetUserId = userId
  if (customId && !userId) {
    const { data: userIdData } = await client
      .from('user_ids')
      .select('user_id')
      .eq('custom_id', customId.toUpperCase())
      .maybeSingle()
    targetUserId = userIdData?.user_id
  }

  if (!targetUserId) {
    return { success: false, error: 'Utilisateur non trouvé' }
  }

  const { data: wallet } = await client
    .from('wallets')
    .select('*')
    .eq('user_id', targetUserId)
    .maybeSingle()

  if (!wallet) {
    return { success: false, error: 'Wallet non trouvé' }
  }

  // Recalculer le solde attendu
  const { data: receivedTx } = await client
    .from('wallet_transactions')
    .select('amount')
    .eq('receiver_user_id', targetUserId)
    .eq('status', 'completed')

  const { data: sentTx } = await client
    .from('wallet_transactions')
    .select('amount')
    .eq('sender_user_id', targetUserId)
    .eq('status', 'completed')

  const { data: p2pReceived } = await client
    .from('p2p_transactions')
    .select('amount')
    .eq('receiver_id', targetUserId)
    .eq('status', 'completed')

  const { data: p2pSent } = await client
    .from('p2p_transactions')
    .select('amount')
    .eq('sender_id', targetUserId)
    .eq('status', 'completed')

  const { data: stripeDeposits } = await client
    .from('stripe_wallet_transactions')
    .select('amount')
    .eq('user_id', targetUserId)
    .eq('transaction_type', 'deposit')
    .eq('status', 'completed')

  const { data: stripeWithdrawals } = await client
    .from('stripe_wallet_transactions')
    .select('amount')
    .eq('user_id', targetUserId)
    .eq('transaction_type', 'withdrawal')
    .eq('status', 'completed')

  const totalIncoming = 
    (receivedTx || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0) +
    (p2pReceived || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0) +
    (stripeDeposits || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

  const totalOutgoing = 
    (sentTx || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0) +
    (p2pSent || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0) +
    (stripeWithdrawals || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

  const calculatedBalance = totalIncoming - totalOutgoing
  const storedBalance = Number(wallet.balance) || 0
  const difference = storedBalance - calculatedBalance

  // Enregistrer la réconciliation
  await client.from('balance_reconciliation').insert({
    wallet_id: wallet.id,
    wallet_type: 'user',
    stored_balance: storedBalance,
    calculated_balance: calculatedBalance,
    difference,
    is_reconciled: true,
    reconciled_by: adminId,
    reconciled_at: new Date().toISOString(),
    reconciliation_action: 'balance_adjustment'
  })

  // Mettre à jour le solde
  const { error } = await client
    .from('wallets')
    .update({ 
      balance: calculatedBalance,
      updated_at: new Date().toISOString()
    })
    .eq('id', wallet.id)

  if (error) {
    return { success: false, error: error.message }
  }

  // Log l'action
  await client.from('admin_action_logs').insert({
    admin_id: adminId,
    action_type: 'wallet_reconcile',
    target_type: 'wallet',
    target_id: wallet.id,
    old_value: { balance: storedBalance },
    new_value: { balance: calculatedBalance, difference }
  })

  return { 
    success: true, 
    message: 'Solde réconcilié avec succès',
    oldBalance: storedBalance,
    newBalance: calculatedBalance,
    difference
  }
}

async function createMissingWallet(client: any, customId: string | undefined, userId: string | undefined, adminId: string) {
  // Trouver l'utilisateur
  let targetUserId = userId
  if (customId && !userId) {
    const { data: userIdData } = await client
      .from('user_ids')
      .select('user_id')
      .eq('custom_id', customId.toUpperCase())
      .maybeSingle()
    targetUserId = userIdData?.user_id
  }

  if (!targetUserId) {
    return { success: false, error: 'Utilisateur non trouvé' }
  }

  // Vérifier que le wallet n'existe pas déjà
  const { data: existingWallet } = await client
    .from('wallets')
    .select('id')
    .eq('user_id', targetUserId)
    .maybeSingle()

  if (existingWallet) {
    return { success: false, error: 'Un wallet existe déjà pour cet utilisateur' }
  }

  // Créer le wallet
  const { data: newWallet, error } = await client
    .from('wallets')
    .insert({
      user_id: targetUserId,
      balance: 0,
      currency: 'GNF',
      wallet_status: 'active',
      is_blocked: false,
      daily_limit: 5000000,
      monthly_limit: 50000000
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Log l'action
  await client.from('admin_action_logs').insert({
    admin_id: adminId,
    action_type: 'wallet_create',
    target_type: 'wallet',
    target_id: newWallet.id,
    new_value: { user_id: targetUserId, created_by: 'admin_audit' }
  })

  return { 
    success: true, 
    message: 'Wallet créé avec succès',
    wallet: newWallet
  }
}

async function getAllWalletsWithIssues(client: any) {
  // Récupérer tous les utilisateurs sans wallet
  const { data: allUserIds } = await client
    .from('user_ids')
    .select('user_id, custom_id')
    .limit(500)

  const { data: allWallets } = await client
    .from('wallets')
    .select('user_id, id, balance, wallet_status, is_blocked, currency, created_at')

  const walletUserIds = new Set((allWallets || []).map((w: any) => w.user_id))
  
  const usersWithoutWallet = (allUserIds || []).filter((u: any) => !walletUserIds.has(u.user_id))
  
  // Wallets avec problèmes
  const problematicWallets = (allWallets || []).filter((w: any) => 
    w.is_blocked || 
    w.wallet_status !== 'active' ||
    Number(w.balance) < 0
  )

  // Récupérer les activités suspectes non résolues
  const { data: unresolvedSuspicious } = await client
    .from('wallet_suspicious_activities')
    .select('wallet_id, activity_type, risk_level, created_at')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(50)

  return {
    success: true,
    usersWithoutWallet: usersWithoutWallet.slice(0, 100),
    problematicWallets,
    unresolvedSuspiciousActivities: unresolvedSuspicious || [],
    stats: {
      totalUsers: (allUserIds || []).length,
      totalWallets: (allWallets || []).length,
      usersWithoutWalletCount: usersWithoutWallet.length,
      problematicWalletsCount: problematicWallets.length,
      unresolvedSuspiciousCount: (unresolvedSuspicious || []).length
    }
  }
}

async function verifyPaymentSignatures(client: any) {
  const signatures = await checkApiSignatures(client)
  
  // Vérifier les webhooks récents
  const { data: recentWebhooks } = await client
    .from('api_usage_logs')
    .select('*')
    .ilike('endpoint', '%webhook%')
    .order('created_at', { ascending: false })
    .limit(50)

  // Calculer les stats
  const validSignatures = signatures.filter(s => s.status === 'valid').length
  const invalidSignatures = signatures.filter(s => s.status === 'invalid').length
  const expiredSignatures = signatures.filter(s => s.status === 'expired').length

  return {
    success: true,
    signatures,
    recentWebhooks: recentWebhooks || [],
    stats: {
      total: signatures.length,
      valid: validSignatures,
      invalid: invalidSignatures,
      expired: expiredSignatures,
      healthStatus: invalidSignatures === 0 && expiredSignatures === 0 ? 'healthy' : 'needs_attention'
    }
  }
}
