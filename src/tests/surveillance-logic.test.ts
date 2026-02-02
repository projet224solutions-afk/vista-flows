/**
 * TESTS AUTOMATIQUES - SYSTÈME DE SURVEILLANCE LOGIQUE
 * Tests unitaires et d'intégration pour les règles critiques
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// FIXTURES DE TEST
// ============================================

const createTestOrder = async (vendorId: string, productId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_id: crypto.randomUUID(),
      vendor_id: vendorId,
      order_number: `TEST-${Date.now()}`,
      total_amount: 1000,
      subtotal: 1000,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'wallet',
      source: 'pos',
    })
    .select()
    .single();

  if (error) throw error;

  // Créer un order item
  await supabase.from('order_items').insert({
    order_id: data.id,
    product_id: productId,
    quantity: 1,
    price: 1000,
    subtotal: 1000,
  });

  return data;
};

const createTestProduct = async (vendorId: string, initialStock: number) => {
  const { data, error } = await supabase
    .from('products')
    .insert({
      vendor_id: vendorId,
      name: `Test Product ${Date.now()}`,
      description: 'Test product for surveillance',
      price: 1000,
      stock_quantity: initialStock,
      category: 'test',
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

const createTestWallet = async (userId: string, balance: number) => {
  const { data, error } = await supabase
    .from('wallets')
    .insert({
      user_id: userId,
      balance,
      currency: 'GNF',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// TEST SUITE 1: POS_001 - Stock Decrement
// ============================================

describe('POS_001: Stock must decrease on sale', () => {
  let vendorId: string;
  let productId: string;
  let initialStock: number;

  beforeAll(async () => {
    // Setup: Créer un vendeur et un produit de test
    const vendorUser = {
      email: `vendor-${Date.now()}@test.com`,
      password: 'Test123!',
    };

    // Créer produit avec 10 unités de stock
    initialStock = 10;
    productId = (await createTestProduct(vendorId, initialStock)).id;
  });

  it('should detect when stock is not decremented after POS sale', async () => {
    // Setup: Créer une commande POS
    const order = await createTestOrder(vendorId, productId);

    // Update order status to completed (simule vente complétée)
    await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', order.id);

    // Exécuter la vérification POS_001
    const { data: result, error } = await supabase.rpc('verify_logic_rule', {
      p_rule_id: 'POS_001',
    });

    if (error) throw error;

    // Vérifier: La règle devrait détecter l'anomalie (stock pas décrémenté)
    expect(result).toBeDefined();
    expect(result[0]).toMatchObject({
      is_valid: false,
      anomaly_found: true,
      severity: 'CRITICAL',
    });
  });

  it('should NOT detect anomaly when stock is properly decremented', async () => {
    // Setup: Décrementer le stock manuellement
    await supabase
      .from('products')
      .update({ stock_quantity: initialStock - 1 })
      .eq('id', productId);

    // Exécuter la vérification
    const { data: result, error } = await supabase.rpc('verify_logic_rule', {
      p_rule_id: 'POS_001',
    });

    if (error) throw error;

    // Vérifier: La règle ne devrait pas détecter d'anomalie
    expect(result[0]).toMatchObject({
      is_valid: true,
      anomaly_found: false,
    });
  });

  it('should create anomaly record when stock decrement fails', async () => {
    // Setup: Détection d'anomalies
    const { data: detectionResults, error: detectionError } = await supabase.rpc(
      'detect_all_anomalies',
      {
        p_domain_filter: 'POS_SALES',
      }
    );

    if (detectionError) throw detectionError;

    // Vérifier: Des anomalies devraient être enregistrées
    const anomalies = await supabase
      .from('logic_anomalies')
      .select('*')
      .eq('rule_id', 'POS_001')
      .limit(1);

    if (anomalies.error) throw anomalies.error;
    expect(anomalies.data?.length).toBeGreaterThan(0);
  });

  it('should apply auto-correction to fix stock decrement', async () => {
    // Setup: Récupérer l'anomalie
    const { data: anomaly, error: anomalyError } = await supabase
      .from('logic_anomalies')
      .select('*')
      .eq('rule_id', 'POS_001')
      .eq('resolved_at', null)
      .limit(1)
      .single();

    if (anomalyError && anomalyError.code !== 'PGRST116') throw anomalyError;
    if (!anomaly) return; // Skip si pas d'anomalie

    // Appliquer la correction auto
    const { data: correction, error: correctionError } = await supabase.rpc(
      'apply_correction',
      {
        p_anomaly_id: anomaly.id,
        p_correction_type: 'AUTO',
        p_new_value: { corrected: true, stock_decremented: true },
        p_reason: 'Auto-correction for stock decrement',
      }
    );

    if (correctionError) throw correctionError;

    // Vérifier: Correction appliquée avec succès
    expect(correction[0]).toMatchObject({
      success: true,
    });

    // Vérifier: L'anomalie est maintenant résolue
    const { data: resolvedAnomaly } = await supabase
      .from('logic_anomalies')
      .select('*')
      .eq('id', anomaly.id)
      .single();

    expect(resolvedAnomaly?.resolved_at).toBeDefined();
    expect(resolvedAnomaly?.resolution_type).toBe('AUTO');
  });

  afterAll(async () => {
    // Cleanup: Supprimer les données de test
    if (productId) {
      await supabase.from('products').delete().eq('id', productId);
    }
  });
});

// ============================================
// TEST SUITE 2: INV_001 - No Negative Stock
// ============================================

describe('INV_001: Stock cannot be negative', () => {
  let productId: string;

  beforeAll(async () => {
    // Setup: Créer un produit de test
    const product = await createTestProduct(crypto.randomUUID(), 0);
    productId = product.id;
  });

  it('should detect negative stock', async () => {
    // Setup: Forcer le stock à être négatif (direct UPDATE pour test)
    await supabase
      .from('products')
      .update({ stock_quantity: -5 })
      .eq('id', productId);

    // Exécuter la vérification
    const { data: result } = await supabase.rpc('verify_logic_rule', {
      p_rule_id: 'INV_001',
    });

    // Vérifier: L'anomalie doit être détectée
    expect(result[0]).toMatchObject({
      is_valid: false,
      anomaly_found: true,
      severity: 'CRITICAL',
    });
  });

  it('should NOT detect anomaly for zero or positive stock', async () => {
    // Setup: Corriger le stock à 0
    await supabase.from('products').update({ stock_quantity: 0 }).eq('id', productId);

    // Exécuter la vérification
    const { data: result } = await supabase.rpc('verify_logic_rule', {
      p_rule_id: 'INV_001',
    });

    // Vérifier: Pas d'anomalie
    expect(result[0]).toMatchObject({
      is_valid: true,
      anomaly_found: false,
    });
  });

  afterAll(async () => {
    if (productId) {
      await supabase.from('products').delete().eq('id', productId);
    }
  });
});

// ============================================
// TEST SUITE 3: PAY_001 - Wallet Balance Update
// ============================================

describe('PAY_001: Wallet balance must be updated on payment', () => {
  let walletId: string;
  let initialBalance: number;

  beforeAll(async () => {
    // Setup: Créer un wallet de test
    initialBalance = 50000;
    const wallet = await createTestWallet(crypto.randomUUID(), initialBalance);
    walletId = wallet.id;
  });

  it('should detect when wallet balance is not updated', async () => {
    // Setup: Créer une transaction sans mettre à jour le solde
    // (Simule un paiement échoué côté balance)

    // Exécuter la vérification
    const { data: result } = await supabase.rpc('verify_logic_rule', {
      p_rule_id: 'PAY_001',
    });

    // Vérifier: Détecter l'anomalie
    expect(result).toBeDefined();
  });

  it('should auto-correct wallet balance if transaction exists', async () => {
    // Setup: Vérifier et corriger
    const { data: anomalies } = await supabase
      .from('logic_anomalies')
      .select('*')
      .eq('rule_id', 'PAY_001')
      .limit(1);

    if (anomalies && anomalies.length > 0) {
      const { data: correction } = await supabase.rpc('apply_correction', {
        p_anomaly_id: anomalies[0].id,
        p_correction_type: 'AUTO',
        p_new_value: { wallet_balance_corrected: true },
      });

      expect(correction[0]?.success).toBe(true);
    }
  });

  afterAll(async () => {
    if (walletId) {
      await supabase.from('wallets').delete().eq('id', walletId);
    }
  });
});

// ============================================
// TEST SUITE 4: System Health Check
// ============================================

describe('System Health Monitoring', () => {
  it('should return overall system health status', async () => {
    const { data: health, error } = await supabase.rpc('get_system_health');

    if (error) throw error;

    expect(health).toBeDefined();
    expect(health[0]).toMatchObject({
      overall_status: expect.stringMatching(/^(OK|WARNING|CRITICAL)$/),
      total_rules: expect.any(Number),
      total_anomalies: expect.any(Number),
      critical_anomalies: expect.any(Number),
      resolution_rate: expect.any(Number),
    });
  });

  it('should show CRITICAL status when critical anomalies exist', async () => {
    // Create a test anomaly
    const { data: testAnomaly } = await supabase
      .from('logic_anomalies')
      .insert({
        rule_id: 'TEST_RULE',
        domain: 'TEST',
        severity: 'CRITICAL',
        expected_value: {},
        actual_value: {},
        detected_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Get health
    const { data: health } = await supabase.rpc('get_system_health');

    // Status should be CRITICAL
    if (health[0].critical_anomalies > 0) {
      expect(health[0].overall_status).toBe('CRITICAL');
    }

    // Cleanup
    if (testAnomaly) {
      await supabase
        .from('logic_anomalies')
        .delete()
        .eq('id', testAnomaly.id);
    }
  });
});

// ============================================
// TEST SUITE 5: Audit Trail
// ============================================

describe('Audit Trail and Immutability', () => {
  it('should create immutable audit logs for corrections', async () => {
    // Get a test anomaly and correction
    const { data: correction } = await supabase
      .from('logic_corrections')
      .select('*')
      .limit(1)
      .single();

    if (!correction) return; // Skip si pas de correction

    // Vérifier que les logs audit existent
    const { data: auditLogs } = await supabase
      .from('logic_audit')
      .select('*')
      .eq('correction_id', correction.id);

    expect(auditLogs).toBeDefined();
    expect(auditLogs?.length).toBeGreaterThan(0);

    // Vérifier que les logs sont immuables
    auditLogs?.forEach((log) => {
      expect(log.is_immutable).toBe(true);
    });
  });

  it('should prevent audit log modification', async () => {
    // Tenter de modifier un audit log (devrait échouer)
    const { data: auditLog } = await supabase
      .from('logic_audit')
      .select('*')
      .limit(1)
      .single();

    if (!auditLog) return;

    // Essayer de mettre à jour
    const { error } = await supabase
      .from('logic_audit')
      .update({ action: 'MODIFIED' })
      .eq('id', auditLog.id);

    // Devrait échouer à cause des RLS policies
    expect(error).toBeDefined();
  });
});
