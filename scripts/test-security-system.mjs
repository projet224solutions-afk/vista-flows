// 🧪 Test du système de défense et riposte
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('🧪 Tests du système de défense et riposte\n');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Vérifier les tables
  console.log('📊 Test 1: Vérification des tables...');
  totalTests++;
  try {
    const tables = [
      'security_incidents',
      'security_alerts',
      'blocked_ips',
      'security_keys',
      'security_snapshots',
      'security_playbooks',
      'security_audit_logs',
      'security_detection_rules',
      'security_metrics'
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) throw new Error(`Table ${table} non trouvée: ${error.message}`);
    }
    console.log('✅ Toutes les tables existent\n');
    passedTests++;
  } catch (error) {
    console.error('❌ Erreur:', error.message, '\n');
  }

  // Test 2: Créer un incident test
  console.log('🚨 Test 2: Création d\'un incident...');
  totalTests++;
  try {
    const { data, error } = await supabase.rpc('create_security_incident', {
      p_incident_type: 'brute_force',
      p_severity: 'high',
      p_title: 'Test Incident - Brute Force',
      p_description: 'Test de création d\'incident',
      p_source_ip: '192.168.1.100',
      p_target_service: 'authentication',
      p_indicators: { test: true }
    });

    if (error) throw error;
    console.log('✅ Incident créé avec succès:', data, '\n');
    passedTests++;
  } catch (error) {
    console.error('❌ Erreur:', error.message, '\n');
  }

  // Test 3: Bloquer une IP
  console.log('🚫 Test 3: Blocage d\'IP...');
  totalTests++;
  try {
    const { data, error } = await supabase.rpc('block_ip_address', {
      p_ip_address: '192.168.1.200',
      p_reason: 'Test de blocage automatique',
      p_incident_id: null,
      p_expires_hours: 1
    });

    if (error) throw error;
    console.log('✅ IP bloquée avec succès:', data, '\n');
    passedTests++;
  } catch (error) {
    console.error('❌ Erreur:', error.message, '\n');
  }

  // Test 4: Vérifier les stats
  console.log('📈 Test 4: Lecture des statistiques...');
  totalTests++;
  try {
    const { data, error } = await supabase.from('security_stats').select('*').single();
    if (error) throw error;
    console.log('✅ Statistiques:', JSON.stringify(data, null, 2), '\n');
    passedTests++;
  } catch (error) {
    console.error('❌ Erreur:', error.message, '\n');
  }

  // Test 5: Créer une alerte
  console.log('⚠️ Test 5: Création d\'une alerte...');
  totalTests++;
  try {
    const { error } = await supabase.from('security_alerts').insert({
      alert_type: 'rate_limit',
      severity: 'medium',
      message: 'Test alerte - Rate limit dépassé',
      source: '192.168.1.50',
      auto_action_taken: 'ALERT'
    });

    if (error) throw error;
    console.log('✅ Alerte créée avec succès\n');
    passedTests++;
  } catch (error) {
    console.error('❌ Erreur:', error.message, '\n');
  }

  // Résumé
  console.log('=' .repeat(50));
  console.log(`\n📊 RÉSUMÉ DES TESTS`);
  console.log(`✅ Tests réussis: ${passedTests}/${totalTests}`);
  console.log(`📈 Taux de réussite: ${Math.round((passedTests / totalTests) * 100)}%\n`);

  if (passedTests === totalTests) {
    console.log('🎉 Tous les tests sont passés! Le système est opérationnel.\n');
  } else {
    console.log('⚠️ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.\n');
  }
}

runTests().catch(error => {
  console.error('❌ Erreur inattendue:', error);
  process.exit(1);
});
