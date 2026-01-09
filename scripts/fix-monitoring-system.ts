/**
 * 🔧 SCRIPT DE RÉPARATION AUTOMATIQUE - Monitoring System
 * 224Solutions - Diagnostic et correction en 1 clic
 * 
 * Usage: npm run fix:monitoring
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  test: string;
  status: '✅' | '⚠️' | '❌';
  message: string;
  fix?: string;
}

const results: TestResult[] = [];

/**
 * Test 1: Vérifier connexion Supabase
 */
async function testSupabaseConnection() {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error && error.code === '42P01') {
      results.push({
        test: 'Connexion Supabase',
        status: '⚠️',
        message: 'Table profiles manquante',
        fix: 'npx supabase db push'
      });
    } else if (error) {
      results.push({
        test: 'Connexion Supabase',
        status: '❌',
        message: `Erreur: ${error.message}`,
        fix: 'Vérifier variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY'
      });
    } else {
      results.push({
        test: 'Connexion Supabase',
        status: '✅',
        message: 'Connexion établie'
      });
    }
  } catch (e) {
    results.push({
      test: 'Connexion Supabase',
      status: '❌',
      message: `Exception: ${e}`,
      fix: 'Vérifier configuration .env'
    });
  }
}

/**
 * Test 2: Vérifier tables de monitoring
 */
async function testMonitoringTables() {
  const tables = ['error_logs', 'system_health_logs', 'alerts', 'security_monitoring'];
  const missing: string[] = [];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error && error.code === '42P01') {
        missing.push(table);
      }
    } catch {
      missing.push(table);
    }
  }
  
  if (missing.length === 0) {
    results.push({
      test: 'Tables Monitoring',
      status: '✅',
      message: `${tables.length} tables présentes`
    });
  } else {
    results.push({
      test: 'Tables Monitoring',
      status: '❌',
      message: `${missing.length} tables manquantes: ${missing.join(', ')}`,
      fix: 'Exécuter migration: npx supabase db push'
    });
  }
}

/**
 * Test 3: Compter erreurs critiques
 */
async function testCriticalErrors() {
  try {
    const { count, error } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .eq('level', 'critical')
      .eq('resolved', false);
    
    if (error) {
      results.push({
        test: 'Erreurs Critiques',
        status: '⚠️',
        message: 'Impossible de compter (table manquante ?)',
        fix: 'Créer table error_logs'
      });
    } else if (count === null || count === 0) {
      results.push({
        test: 'Erreurs Critiques',
        status: '✅',
        message: 'Aucune erreur critique'
      });
    } else {
      results.push({
        test: 'Erreurs Critiques',
        status: '⚠️',
        message: `${count} erreurs non résolues`,
        fix: 'Exécuter: SELECT * FROM error_logs WHERE level=\'critical\' AND resolved=false;'
      });
    }
  } catch (e) {
    results.push({
      test: 'Erreurs Critiques',
      status: '❌',
      message: `Exception: ${e}`
    });
  }
}

/**
 * Test 4: Vérifier derniers health checks
 */
async function testHealthChecks() {
  try {
    const { data, error } = await supabase
      .from('system_health_logs')
      .select('timestamp, overall_status')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      results.push({
        test: 'Health Checks',
        status: '⚠️',
        message: 'Aucun health check enregistré',
        fix: 'Configurer cron job pour health checks'
      });
    } else {
      const lastCheck = new Date(data.timestamp);
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - lastCheck.getTime()) / 60000);
      
      if (minutesAgo > 10) {
        results.push({
          test: 'Health Checks',
          status: '⚠️',
          message: `Dernier check il y a ${minutesAgo}min (status: ${data.overall_status})`,
          fix: 'Relancer monitoring: npm run monitoring:start'
        });
      } else {
        results.push({
          test: 'Health Checks',
          status: '✅',
          message: `Health check récent (${minutesAgo}min) - ${data.overall_status}`
        });
      }
    }
  } catch (e) {
    results.push({
      test: 'Health Checks',
      status: '❌',
      message: `Exception: ${e}`
    });
  }
}

/**
 * Test 5: Vérifier fonction RPC get_system_health_api
 */
async function testHealthAPIFunction() {
  try {
    const { data, error } = await supabase.rpc('get_system_health_api');
    
    if (error) {
      results.push({
        test: 'Health API RPC',
        status: '⚠️',
        message: 'Fonction RPC manquante',
        fix: 'Créer fonction: see migration 20250101120000_security_monitoring_system_complete.sql'
      });
    } else {
      results.push({
        test: 'Health API RPC',
        status: '✅',
        message: `Fonction accessible - Status: ${data?.status || 'unknown'}`
      });
    }
  } catch (e) {
    results.push({
      test: 'Health API RPC',
      status: '❌',
      message: `Exception: ${e}`
    });
  }
}

/**
 * Test 6: Vérifier backend health endpoint
 */
async function testBackendHealth() {
  try {
    const backendUrl = process.env.VITE_BACKEND_URL || 'https://224solution.net';
    const response = await fetch(`${backendUrl}/health/detailed`);
    
    if (response.ok) {
      const data = await response.json();
      results.push({
        test: 'Backend Health',
        status: '✅',
        message: `Endpoint accessible - Status: ${data.status}`
      });
    } else {
      results.push({
        test: 'Backend Health',
        status: '⚠️',
        message: `HTTP ${response.status}`,
        fix: 'Vérifier backend est déployé et accessible'
      });
    }
  } catch (e) {
    results.push({
      test: 'Backend Health',
      status: '❌',
      message: `Impossible d'atteindre backend`,
      fix: 'Déployer backend ou vérifier VITE_BACKEND_URL'
    });
  }
}

/**
 * Afficher résultats
 */
function displayResults() {
  console.log('\n' + '='.repeat(70));
  console.log('🔧 DIAGNOSTIC MONITORING SYSTEM - 224Solutions');
  console.log('='.repeat(70) + '\n');
  
  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.status} ${result.test}`);
    console.log(`   ${result.message}`);
    if (result.fix) {
      console.log(`   💡 Fix: ${result.fix}`);
    }
    console.log('');
    
    if (result.status === '✅') successCount++;
    if (result.status === '⚠️') warningCount++;
    if (result.status === '❌') errorCount++;
  });
  
  console.log('='.repeat(70));
  console.log(`📊 RÉSUMÉ: ${successCount} OK | ${warningCount} Warnings | ${errorCount} Errors`);
  console.log('='.repeat(70) + '\n');
  
  // Status global
  if (errorCount > 0) {
    console.log('🔴 STATUS: CRITIQUE - Actions immédiates requises');
    process.exit(1);
  } else if (warningCount > 2) {
    console.log('🟠 STATUS: DÉGRADÉ - Corrections recommandées');
    process.exit(1);
  } else {
    console.log('✅ STATUS: OPÉRATIONNEL');
    process.exit(0);
  }
}

/**
 * Exécution principale
 */
async function main() {
  console.log('🚀 Démarrage diagnostic...\n');
  
  await testSupabaseConnection();
  await testMonitoringTables();
  await testCriticalErrors();
  await testHealthChecks();
  await testHealthAPIFunction();
  await testBackendHealth();
  
  displayResults();
}

main().catch(console.error);
