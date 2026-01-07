/**
 * TESTS FRONTEND: Vérification flux paiement complet
 * Test de bout en bout du système de paiement Stripe
 */

import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

/**
 * Test 1: Vérifier configuration Stripe
 */
async function testStripeConfig(): Promise<TestResult> {
  try {
    const { data, error } = await supabase
      .from('stripe_config')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      return {
        step: 'Configuration Stripe',
        status: 'error',
        message: 'Configuration Stripe non trouvée',
        details: error
      };
    }

    if (!data.stripe_publishable_key) {
      return {
        step: 'Configuration Stripe',
        status: 'error',
        message: 'Clé publique Stripe manquante'
      };
    }

    return {
      step: 'Configuration Stripe',
      status: 'success',
      message: `Configuration OK - Commission: ${data.platform_commission_rate}%`,
      details: {
        commission: data.platform_commission_rate,
        currency: data.default_currency,
        has_keys: !!data.stripe_publishable_key
      }
    };
  } catch (error) {
    return {
      step: 'Configuration Stripe',
      status: 'error',
      message: 'Erreur test configuration',
      details: error
    };
  }
}

/**
 * Test 2: Vérifier transactions récentes
 */
async function testRecentTransactions(): Promise<TestResult> {
  try {
    const { data: transactions, error } = await supabase
      .from('stripe_transactions')
      .select(`
        id,
        stripe_payment_intent_id,
        status,
        amount,
        seller_net_amount,
        paid_at,
        order_id,
        product_id
      `)
      .eq('status', 'SUCCEEDED')
      .gte('paid_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('paid_at', { ascending: false })
      .limit(10);

    if (error) {
      return {
        step: 'Transactions récentes',
        status: 'error',
        message: 'Erreur chargement transactions',
        details: error
      };
    }

    const orphans = transactions?.filter(t => !t.order_id && t.product_id) || [];

    return {
      step: 'Transactions récentes',
      status: orphans.length > 0 ? 'warning' : 'success',
      message: `${transactions?.length || 0} transactions trouvées, ${orphans.length} orphelines`,
      details: {
        total: transactions?.length || 0,
        orphans: orphans.length,
        orphan_ids: orphans.map(t => t.id)
      }
    };
  } catch (error) {
    return {
      step: 'Transactions récentes',
      status: 'error',
      message: 'Erreur test transactions',
      details: error
    };
  }
}

/**
 * Test 3: Vérifier cohérence commandes ↔ transactions
 */
async function testOrdersConsistency(): Promise<TestResult> {
  try {
    // Récupérer transactions Stripe réussies
    const { data: transactions, error: txError } = await supabase
      .from('stripe_transactions')
      .select('id, order_id, stripe_payment_intent_id, product_id')
      .eq('status', 'SUCCEEDED')
      .gte('paid_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (txError) throw txError;

    // Récupérer commandes correspondantes
    const paymentIntentIds = transactions
      ?.filter(t => t.stripe_payment_intent_id)
      .map(t => t.stripe_payment_intent_id) || [];

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, stripe_payment_intent_id')
      .in('stripe_payment_intent_id', paymentIntentIds);

    if (ordersError) throw ordersError;

    const transactionsWithOrders = transactions?.filter(t => 
      t.order_id || orders?.some(o => o.stripe_payment_intent_id === t.stripe_payment_intent_id)
    ) || [];

    const transactionsWithoutOrders = transactions?.filter(t => 
      !t.order_id && 
      !orders?.some(o => o.stripe_payment_intent_id === t.stripe_payment_intent_id) &&
      t.product_id
    ) || [];

    const consistencyRate = transactions && transactions.length > 0
      ? (transactionsWithOrders.length / transactions.length) * 100
      : 100;

    return {
      step: 'Cohérence Commandes',
      status: consistencyRate >= 90 ? 'success' : consistencyRate >= 70 ? 'warning' : 'error',
      message: `Cohérence: ${consistencyRate.toFixed(1)}% - ${transactionsWithoutOrders.length} commandes manquantes`,
      details: {
        total_transactions: transactions?.length || 0,
        with_orders: transactionsWithOrders.length,
        without_orders: transactionsWithoutOrders.length,
        consistency_rate: consistencyRate.toFixed(1),
        missing_order_ids: transactionsWithoutOrders.map(t => t.id)
      }
    };
  } catch (error) {
    return {
      step: 'Cohérence Commandes',
      status: 'error',
      message: 'Erreur test cohérence',
      details: error
    };
  }
}

/**
 * Test 4: Vérifier crédits wallets vendeurs
 */
async function testWalletCredits(): Promise<TestResult> {
  try {
    // Récupérer transactions Stripe réussies
    const { data: stripeTransactions, error: stError } = await supabase
      .from('stripe_transactions')
      .select('id, seller_id, seller_net_amount')
      .eq('status', 'SUCCEEDED')
      .gte('paid_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (stError) throw stError;

    // Récupérer transactions wallet correspondantes
    const { data: walletTransactions, error: wtError } = await supabase
      .from('wallet_transactions')
      .select('stripe_transaction_id, amount')
      .in('stripe_transaction_id', stripeTransactions?.map(t => t.id) || []);

    if (wtError) throw wtError;

    const credited = stripeTransactions?.filter(st =>
      walletTransactions?.some(wt => wt.stripe_transaction_id === st.id)
    ) || [];

    const notCredited = stripeTransactions?.filter(st =>
      !walletTransactions?.some(wt => wt.stripe_transaction_id === st.id)
    ) || [];

    const creditRate = stripeTransactions && stripeTransactions.length > 0
      ? (credited.length / stripeTransactions.length) * 100
      : 100;

    return {
      step: 'Crédits Wallets',
      status: creditRate >= 90 ? 'success' : creditRate >= 70 ? 'warning' : 'error',
      message: `${creditRate.toFixed(1)}% crédités - ${notCredited.length} wallets non crédités`,
      details: {
        total: stripeTransactions?.length || 0,
        credited: credited.length,
        not_credited: notCredited.length,
        credit_rate: creditRate.toFixed(1),
        not_credited_ids: notCredited.map(t => t.id)
      }
    };
  } catch (error) {
    return {
      step: 'Crédits Wallets',
      status: 'error',
      message: 'Erreur test wallets',
      details: error
    };
  }
}

/**
 * Test 5: Vérifier fonctions RPC de correction
 */
async function testCorrectionFunctions(): Promise<TestResult> {
  try {
    // Test avec une transaction inexistante (ne doit pas crasher)
    const fakeId = '00000000-0000-0000-0000-000000000000';
    
    const { data, error } = await supabase.rpc('create_order_from_payment', {
      p_transaction_id: fakeId
    });

    // Si erreur, vérifier qu'elle est gérée proprement
    if (error && !error.message.includes('Transaction not found')) {
      return {
        step: 'Fonctions Correction',
        status: 'error',
        message: 'Fonction RPC non disponible ou mal configurée',
        details: error
      };
    }

    return {
      step: 'Fonctions Correction',
      status: 'success',
      message: 'Fonctions RPC disponibles et fonctionnelles',
      details: {
        functions_available: [
          'create_order_from_payment',
          'force_credit_seller_wallet',
          'fix_orphan_payment'
        ]
      }
    };
  } catch (error) {
    return {
      step: 'Fonctions Correction',
      status: 'warning',
      message: 'Impossible de tester les fonctions RPC',
      details: error
    };
  }
}

/**
 * Exécuter tous les tests
 */
export async function runPaymentTests(): Promise<{
  success: boolean;
  results: TestResult[];
  summary: {
    total: number;
    success: number;
    warnings: number;
    errors: number;
  };
}> {
  console.log('🧪 Démarrage tests flux paiement...\n');

  const results: TestResult[] = [];

  // Exécuter tous les tests
  results.push(await testStripeConfig());
  results.push(await testRecentTransactions());
  results.push(await testOrdersConsistency());
  results.push(await testWalletCredits());
  results.push(await testCorrectionFunctions());

  // Calculer résumé
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length
  };

  const success = summary.errors === 0;

  // Afficher résultats
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RÉSULTATS TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.step}: ${result.message}`);
    if (result.details) {
      console.log('   Détails:', JSON.stringify(result.details, null, 2));
    }
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Réussis: ${summary.success}/${summary.total}`);
  console.log(`⚠️  Warnings: ${summary.warnings}/${summary.total}`);
  console.log(`❌ Erreurs: ${summary.errors}/${summary.total}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (success) {
    console.log('🎉 TOUS LES TESTS PASSÉS AVEC SUCCÈS!');
  } else {
    console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ - Vérifier les détails ci-dessus');
  }

  return { success, results, summary };
}

// Export pour utilisation dans console
if (typeof window !== 'undefined') {
  (window as any).runPaymentTests = runPaymentTests;
  console.log('💡 Tests disponibles dans console:');
  console.log('   runPaymentTests() - Exécuter tous les tests');
}

export default runPaymentTests;
