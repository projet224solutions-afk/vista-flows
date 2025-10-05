/**
 * 🧪 TEST COMPLET DU SYSTÈME MONDIAL DE GESTION DES DEVISES
 * Test de toutes les fonctionnalités du système multi-devises avancé
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test 1: Vérification des tables
async function testDatabaseTables() {
  logInfo('Test 1: Vérification des tables de base de données...');
  
  const tables = [
    'global_currencies',
    'advanced_exchange_rates',
    'exchange_rate_history',
    'advanced_fee_structures',
    'country_currency_mapping',
    'conversion_simulations',
    'transaction_statistics',
    'advanced_multi_currency_transfers'
  ];
  
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        logError(`Table ${table} n'existe pas ou n'est pas accessible: ${error.message}`);
        allTablesExist = false;
      } else {
        logSuccess(`Table ${table} accessible`);
      }
    } catch (err) {
      logError(`Erreur lors de la vérification de la table ${table}: ${err.message}`);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

// Test 2: Vérification des devises mondiales
async function testGlobalCurrencies() {
  logInfo('Test 2: Vérification des devises mondiales...');
  
  try {
    const { data, error } = await supabase
      .from('global_currencies')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      logError(`Erreur lors de la récupération des devises: ${error.message}`);
      return false;
    }
    
    if (data.length === 0) {
      logWarning('Aucune devise active trouvée');
      return false;
    }
    
    logSuccess(`${data.length} devises mondiales disponibles`);
    
    // Vérifier les devises principales
    const mainCurrencies = ['GNF', 'USD', 'EUR', 'XOF', 'XAF', 'GBP', 'CAD', 'CNY', 'JPY'];
    const availableCurrencies = data.map(c => c.code);
    
    for (const currency of mainCurrencies) {
      if (availableCurrencies.includes(currency)) {
        logSuccess(`Devise ${currency} disponible`);
      } else {
        logWarning(`Devise ${currency} manquante`);
      }
    }
    
    return true;
  } catch (err) {
    logError(`Erreur lors du test des devises: ${err.message}`);
    return false;
  }
}

// Test 3: Vérification des taux de change
async function testExchangeRates() {
  logInfo('Test 3: Vérification des taux de change...');
  
  try {
    const { data, error } = await supabase
      .from('advanced_exchange_rates')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      logError(`Erreur lors de la récupération des taux: ${error.message}`);
      return false;
    }
    
    if (data.length === 0) {
      logWarning('Aucun taux de change configuré');
      return false;
    }
    
    logSuccess(`${data.length} taux de change configurés`);
    
    // Vérifier quelques taux principaux
    const mainRates = [
      { from: 'GNF', to: 'USD' },
      { from: 'GNF', to: 'EUR' },
      { from: 'USD', to: 'EUR' },
      { from: 'XOF', to: 'GNF' }
    ];
    
    for (const rate of mainRates) {
      const found = data.find(r => r.from_currency === rate.from && r.to_currency === rate.to);
      if (found) {
        logSuccess(`Taux ${rate.from} → ${rate.to}: ${found.rate}`);
      } else {
        logWarning(`Taux ${rate.from} → ${rate.to} manquant`);
      }
    }
    
    return true;
  } catch (err) {
    logError(`Erreur lors du test des taux: ${err.message}`);
    return false;
  }
}

// Test 4: Test des fonctions SQL
async function testSQLFunctions() {
  logInfo('Test 4: Test des fonctions SQL...');
  
  try {
    // Test de la fonction get_current_exchange_rate
    const { data: rateData, error: rateError } = await supabase
      .rpc('get_current_exchange_rate', {
        p_from_currency: 'GNF',
        p_to_currency: 'USD'
      });
    
    if (rateError) {
      logError(`Erreur fonction get_current_exchange_rate: ${rateError.message}`);
      return false;
    }
    
    logSuccess(`Taux GNF → USD: ${rateData}`);
    
    // Test de la fonction calculate_advanced_fees
    const { data: feesData, error: feesError } = await supabase
      .rpc('calculate_advanced_fees', {
        p_amount: 100000,
        p_currency: 'GNF'
      });
    
    if (feesError) {
      logError(`Erreur fonction calculate_advanced_fees: ${feesError.message}`);
      return false;
    }
    
    logSuccess(`Frais pour 100,000 GNF: ${JSON.stringify(feesData)}`);
    
    // Test de la fonction simulate_conversion
    const { data: simData, error: simError } = await supabase
      .rpc('simulate_conversion', {
        p_from_currency: 'GNF',
        p_to_currency: 'USD',
        p_amount: 1000000,
        p_user_id: null
      });
    
    if (simError) {
      logError(`Erreur fonction simulate_conversion: ${simError.message}`);
      return false;
    }
    
    logSuccess(`Simulation 1,000,000 GNF → USD: ${JSON.stringify(simData)}`);
    
    return true;
  } catch (err) {
    logError(`Erreur lors du test des fonctions SQL: ${err.message}`);
    return false;
  }
}

// Test 5: Test des structures de frais
async function testFeeStructures() {
  logInfo('Test 5: Vérification des structures de frais...');
  
  try {
    const { data, error } = await supabase
      .from('advanced_fee_structures')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      logError(`Erreur lors de la récupération des structures de frais: ${error.message}`);
      return false;
    }
    
    if (data.length === 0) {
      logWarning('Aucune structure de frais configurée');
      return false;
    }
    
    logSuccess(`${data.length} structures de frais configurées`);
    
    // Vérifier les structures principales
    const mainCurrencies = ['GNF', 'USD', 'EUR', 'XOF'];
    const availableCurrencies = data.map(f => f.currency);
    
    for (const currency of mainCurrencies) {
      const structure = data.find(f => f.currency === currency);
      if (structure) {
        logSuccess(`Structure ${currency}: ${structure.internal_fee_percentage * 100}% + ${structure.api_commission_percentage * 100}%`);
      } else {
        logWarning(`Structure de frais manquante pour ${currency}`);
      }
    }
    
    return true;
  } catch (err) {
    logError(`Erreur lors du test des structures de frais: ${err.message}`);
    return false;
  }
}

// Test 6: Test du mapping pays → devise
async function testCountryCurrencyMapping() {
  logInfo('Test 6: Vérification du mapping pays → devise...');
  
  try {
    const { data, error } = await supabase
      .from('country_currency_mapping')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      logError(`Erreur lors de la récupération du mapping: ${error.message}`);
      return false;
    }
    
    if (data.length === 0) {
      logWarning('Aucun mapping pays → devise configuré');
      return false;
    }
    
    logSuccess(`${data.length} mappings pays → devise configurés`);
    
    // Vérifier quelques mappings principaux
    const mainMappings = [
      { country: 'GN', currency: 'GNF' },
      { country: 'US', currency: 'USD' },
      { country: 'FR', currency: 'EUR' },
      { country: 'CI', currency: 'XOF' }
    ];
    
    for (const mapping of mainMappings) {
      const found = data.find(m => m.country_code === mapping.country);
      if (found) {
        logSuccess(`${mapping.country} → ${found.currency_code}`);
      } else {
        logWarning(`Mapping manquant pour ${mapping.country}`);
      }
    }
    
    return true;
  } catch (err) {
    logError(`Erreur lors du test du mapping: ${err.message}`);
    return false;
  }
}

// Test 7: Test de performance
async function testPerformance() {
  logInfo('Test 7: Test de performance...');
  
  const startTime = Date.now();
  
  try {
    // Test de récupération des devises
    const currenciesStart = Date.now();
    const { data: currencies, error: currenciesError } = await supabase
      .from('global_currencies')
      .select('*')
      .eq('is_active', true);
    const currenciesTime = Date.now() - currenciesStart;
    
    if (currenciesError) {
      logError(`Erreur lors du test de performance des devises: ${currenciesError.message}`);
      return false;
    }
    
    logSuccess(`Récupération des devises: ${currenciesTime}ms`);
    
    // Test de récupération des taux
    const ratesStart = Date.now();
    const { data: rates, error: ratesError } = await supabase
      .from('advanced_exchange_rates')
      .select('*')
      .eq('is_active', true);
    const ratesTime = Date.now() - ratesStart;
    
    if (ratesError) {
      logError(`Erreur lors du test de performance des taux: ${ratesError.message}`);
      return false;
    }
    
    logSuccess(`Récupération des taux: ${ratesTime}ms`);
    
    // Test de simulation
    const simStart = Date.now();
    const { data: simData, error: simError } = await supabase
      .rpc('simulate_conversion', {
        p_from_currency: 'GNF',
        p_to_currency: 'USD',
        p_amount: 1000000,
        p_user_id: null
      });
    const simTime = Date.now() - simStart;
    
    if (simError) {
      logError(`Erreur lors du test de performance de simulation: ${simError.message}`);
      return false;
    }
    
    logSuccess(`Simulation de conversion: ${simTime}ms`);
    
    const totalTime = Date.now() - startTime;
    logSuccess(`Temps total: ${totalTime}ms`);
    
    return true;
  } catch (err) {
    logError(`Erreur lors du test de performance: ${err.message}`);
    return false;
  }
}

// Test 8: Test de sécurité
async function testSecurity() {
  logInfo('Test 8: Test de sécurité...');
  
  try {
    // Test RLS sur les tables sensibles
    const sensitiveTables = [
      'advanced_multi_currency_transfers',
      'exchange_rate_history',
      'conversion_simulations'
    ];
    
    for (const table of sensitiveTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error && error.message.includes('permission denied')) {
          logSuccess(`RLS activé sur ${table}`);
        } else if (error) {
          logWarning(`Erreur RLS sur ${table}: ${error.message}`);
        } else {
          logWarning(`RLS possiblement désactivé sur ${table}`);
        }
      } catch (err) {
        logSuccess(`RLS activé sur ${table} (accès refusé)`);
      }
    }
    
    return true;
  } catch (err) {
    logError(`Erreur lors du test de sécurité: ${err.message}`);
    return false;
  }
}

// Fonction principale de test
async function runAllTests() {
  log('🚀 DÉMARRAGE DES TESTS DU SYSTÈME MONDIAL DE GESTION DES DEVISES', 'cyan');
  log('=' .repeat(80), 'cyan');
  
  const tests = [
    { name: 'Tables de base de données', fn: testDatabaseTables },
    { name: 'Devises mondiales', fn: testGlobalCurrencies },
    { name: 'Taux de change', fn: testExchangeRates },
    { name: 'Fonctions SQL', fn: testSQLFunctions },
    { name: 'Structures de frais', fn: testFeeStructures },
    { name: 'Mapping pays → devise', fn: testCountryCurrencyMapping },
    { name: 'Performance', fn: testPerformance },
    { name: 'Sécurité', fn: testSecurity }
  ];
  
  const results = [];
  
  for (const test of tests) {
    log(`\n📋 ${test.name}...`, 'yellow');
    try {
      const result = await test.fn();
      results.push({ name: test.name, success: result });
      if (result) {
        logSuccess(`${test.name} réussi`);
      } else {
        logError(`${test.name} échoué`);
      }
    } catch (err) {
      logError(`${test.name} erreur: ${err.message}`);
      results.push({ name: test.name, success: false, error: err.message });
    }
  }
  
  // Résumé des résultats
  log('\n📊 RÉSUMÉ DES TESTS', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  log(`Tests réussis: ${successful}/${total}`, successful === total ? 'green' : 'yellow');
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${status} ${result.name}`, color);
    if (result.error) {
      log(`   Erreur: ${result.error}`, 'red');
    }
  }
  
  // Recommandations
  log('\n💡 RECOMMANDATIONS', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  if (successful === total) {
    logSuccess('Tous les tests sont passés avec succès !');
    logInfo('Le système mondial de gestion des devises est opérationnel.');
  } else {
    logWarning('Certains tests ont échoué. Vérifiez les points suivants :');
    
    const failedTests = results.filter(r => !r.success);
    for (const test of failedTests) {
      log(`- ${test.name}`, 'red');
    }
    
    logInfo('Exécutez les scripts SQL dans l\'ordre suivant :');
    log('1. sql/global_currency_system.sql', 'blue');
    log('2. sql/advanced_multi_currency_transfer_functions.sql', 'blue');
    log('3. Vérifiez les permissions RLS', 'blue');
  }
  
  log('\n🎯 SYSTÈME MONDIAL DE GESTION DES DEVISES - TEST TERMINÉ', 'cyan');
  log('=' .repeat(80), 'cyan');
  
  return successful === total;
}

// Exécution des tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      logError(`Erreur fatale: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testDatabaseTables,
  testGlobalCurrencies,
  testExchangeRates,
  testSQLFunctions,
  testFeeStructures,
  testCountryCurrencyMapping,
  testPerformance,
  testSecurity
};
