/**
 * 🚀 SCRIPT DE DÉPLOIEMENT DU SYSTÈME MONDIAL DE GESTION DES DEVISES
 * Exécute automatiquement tous les scripts SQL nécessaires
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

// Fonction pour exécuter un script SQL
async function executeSQLScript(scriptPath, description) {
  logInfo(`Exécution de ${description}...`);
  
  try {
    const sqlContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Diviser le script en instructions individuelles
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            // Ignorer certaines erreurs non critiques
            if (!error.message.includes('already exists') && 
                !error.message.includes('relation') && 
                !error.message.includes('duplicate key')) {
              logWarning(`Avertissement SQL: ${error.message}`);
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            successCount++;
          }
        } catch (err) {
          logWarning(`Avertissement: ${err.message}`);
          errorCount++;
        }
      }
    }
    
    logSuccess(`${description} terminé: ${successCount} instructions exécutées, ${errorCount} avertissements`);
    return true;
  } catch (err) {
    logError(`Erreur lors de l'exécution de ${description}: ${err.message}`);
    return false;
  }
}

// Fonction pour créer la fonction exec_sql si elle n'existe pas
async function createExecSQLFunction() {
  logInfo('Création de la fonction exec_sql...');
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
      RETURN 'OK';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
    END;
    $$;
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
    if (error) {
      logWarning(`Fonction exec_sql déjà existante ou erreur: ${error.message}`);
    } else {
      logSuccess('Fonction exec_sql créée avec succès');
    }
    return true;
  } catch (err) {
    logWarning(`Avertissement fonction exec_sql: ${err.message}`);
    return true; // Continue même si la fonction existe déjà
  }
}

// Fonction pour vérifier la connectivité
async function checkConnection() {
  logInfo('Vérification de la connectivité Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('global_currencies')
      .select('count')
      .limit(1);
    
    if (error && error.message.includes('relation "global_currencies" does not exist')) {
      logInfo('Tables pas encore créées, c\'est normal pour un nouveau déploiement');
      return true;
    } else if (error) {
      logError(`Erreur de connectivité: ${error.message}`);
      return false;
    } else {
      logSuccess('Connexion Supabase établie');
      return true;
    }
  } catch (err) {
    logError(`Erreur de connectivité: ${err.message}`);
    return false;
  }
}

// Fonction pour vérifier les permissions
async function checkPermissions() {
  logInfo('Vérification des permissions...');
  
  try {
    // Test de création d'une table temporaire
    const { error } = await supabase.rpc('exec_sql', { 
      sql: 'CREATE TEMP TABLE test_permissions (id int);' 
    });
    
    if (error) {
      logError(`Permissions insuffisantes: ${error.message}`);
      return false;
    } else {
      logSuccess('Permissions suffisantes');
      return true;
    }
  } catch (err) {
    logError(`Erreur de permissions: ${err.message}`);
    return false;
  }
}

// Fonction principale de déploiement
async function deployGlobalCurrencySystem() {
  log('🚀 DÉPLOIEMENT DU SYSTÈME MONDIAL DE GESTION DES DEVISES', 'cyan');
  log('=' .repeat(80), 'cyan');
  
  // Vérifications préliminaires
  logInfo('Vérifications préliminaires...');
  
  const connectionOK = await checkConnection();
  if (!connectionOK) {
    logError('Impossible de se connecter à Supabase');
    return false;
  }
  
  // Créer la fonction exec_sql
  await createExecSQLFunction();
  
  // Vérifier les permissions
  const permissionsOK = await checkPermissions();
  if (!permissionsOK) {
    logError('Permissions insuffisantes pour le déploiement');
    return false;
  }
  
  // Scripts à exécuter dans l'ordre
  const scripts = [
    {
      path: path.join(__dirname, 'sql', 'global_currency_system.sql'),
      description: 'Système mondial de devises (tables, données, fonctions)'
    },
    {
      path: path.join(__dirname, 'sql', 'advanced_multi_currency_transfer_functions.sql'),
      description: 'Fonctions de transfert multi-devises avancées'
    }
  ];
  
  let allSuccess = true;
  
  for (const script of scripts) {
    if (fs.existsSync(script.path)) {
      const success = await executeSQLScript(script.path, script.description);
      if (!success) {
        logError(`Échec du déploiement de ${script.description}`);
        allSuccess = false;
      }
    } else {
      logError(`Script non trouvé: ${script.path}`);
      allSuccess = false;
    }
  }
  
  // Vérification post-déploiement
  if (allSuccess) {
    logInfo('Vérification post-déploiement...');
    
    try {
      // Vérifier que les tables principales existent
      const { data: currencies, error: currenciesError } = await supabase
        .from('global_currencies')
        .select('count')
        .limit(1);
      
      if (currenciesError) {
        logError(`Erreur lors de la vérification des devises: ${currenciesError.message}`);
        allSuccess = false;
      } else {
        logSuccess('Table global_currencies accessible');
      }
      
      // Vérifier les fonctions
      const { data: rateData, error: rateError } = await supabase
        .rpc('get_current_exchange_rate', {
          p_from_currency: 'GNF',
          p_to_currency: 'USD'
        });
      
      if (rateError) {
        logError(`Erreur lors de la vérification des fonctions: ${rateError.message}`);
        allSuccess = false;
      } else {
        logSuccess('Fonctions SQL opérationnelles');
      }
      
    } catch (err) {
      logError(`Erreur lors de la vérification post-déploiement: ${err.message}`);
      allSuccess = false;
    }
  }
  
  // Résumé du déploiement
  log('\n📊 RÉSUMÉ DU DÉPLOIEMENT', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  if (allSuccess) {
    logSuccess('Déploiement terminé avec succès !');
    logInfo('Le système mondial de gestion des devises est opérationnel.');
    logInfo('Vous pouvez maintenant :');
    log('- Utiliser l\'interface PDG pour gérer les taux de change', 'blue');
    log('- Effectuer des transferts multi-devises', 'blue');
    log('- Simuler des conversions en temps réel', 'blue');
    log('- Contrôler les frais et commissions', 'blue');
  } else {
    logError('Déploiement échoué');
    logWarning('Vérifiez les erreurs ci-dessus et réessayez');
    logInfo('Vous pouvez exécuter manuellement les scripts SQL dans Supabase :');
    log('1. sql/global_currency_system.sql', 'blue');
    log('2. sql/advanced_multi_currency_transfer_functions.sql', 'blue');
  }
  
  log('\n🎯 DÉPLOIEMENT TERMINÉ', 'cyan');
  log('=' .repeat(80), 'cyan');
  
  return allSuccess;
}

// Exécution du déploiement
if (require.main === module) {
  deployGlobalCurrencySystem()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      logError(`Erreur fatale: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  deployGlobalCurrencySystem,
  executeSQLScript,
  checkConnection,
  checkPermissions
};
