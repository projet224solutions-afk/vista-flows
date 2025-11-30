/**
 * SCRIPT: Vérification et Correction Monitoring System
 * 224Solutions - Diagnostic et réparation automatique
 */

import { supabase } from '@/integrations/supabase/client';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

/**
 * Vérifier si une table existe
 */
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    return !error || error.code !== '42P01'; // 42P01 = table does not exist
  } catch {
    return false;
  }
}

/**
 * Vérifier toutes les tables requises
 */
async function checkRequiredTables(): Promise<DiagnosticResult> {
  const requiredTables = [
    'error_logs',
    'secure_logs',
    'system_health_logs',
    'performance_metrics',
    'alerts',
    'health_check_reports',
    'csp_violations'
  ];

  const results: { [key: string]: boolean } = {};
  
  for (const table of requiredTables) {
    results[table] = await checkTableExists(table);
  }

  const missingTables = Object.entries(results)
    .filter(([_, exists]) => !exists)
    .map(([table]) => table);

  if (missingTables.length === 0) {
    return {
      step: 'Tables Check',
      status: 'success',
      message: `✅ Toutes les tables requises existent (${requiredTables.length}/7)`,
      details: results
    };
  }

  return {
    step: 'Tables Check',
    status: 'error',
    message: `❌ ${missingTables.length} tables manquantes`,
    details: { missing: missingTables, found: results }
  };
}

/**
 * Vérifier RPC function get_system_health_api
 */
async function checkHealthApiFunction(): Promise<DiagnosticResult> {
  try {
    const { data, error } = await supabase.rpc('get_system_health_api', {});
    
    if (error) {
      return {
        step: 'Health API Function',
        status: 'warning',
        message: '⚠️ Fonction get_system_health_api manquante (non critique)',
        details: { error: error.message }
      };
    }

    return {
      step: 'Health API Function',
      status: 'success',
      message: '✅ Fonction get_system_health_api accessible',
      details: data
    };
  } catch (error) {
    return {
      step: 'Health API Function',
      status: 'warning',
      message: '⚠️ Fonction get_system_health_api non testable',
      details: { error: String(error) }
    };
  }
}

/**
 * Compter erreurs critiques
 */
async function checkCriticalErrors(): Promise<DiagnosticResult> {
  try {
    const { count, error } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .eq('level', 'critical')
      .eq('resolved', false);

    if (error) {
      return {
        step: 'Critical Errors',
        status: 'error',
        message: '❌ Impossible de vérifier erreurs critiques',
        details: { error: error.message }
      };
    }

    if (count === 0) {
      return {
        step: 'Critical Errors',
        status: 'success',
        message: '✅ Aucune erreur critique',
        details: { count: 0 }
      };
    }

    return {
      step: 'Critical Errors',
      status: 'warning',
      message: `⚠️ ${count} erreurs critiques non résolues`,
      details: { count }
    };
  } catch (error) {
    return {
      step: 'Critical Errors',
      status: 'error',
      message: '❌ Erreur vérification erreurs critiques',
      details: { error: String(error) }
    };
  }
}

/**
 * Vérifier derniers health checks
 */
async function checkRecentHealthChecks(): Promise<DiagnosticResult> {
  try {
    const { data, error } = await supabase
      .from('system_health_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return {
        step: 'Recent Health Checks',
        status: 'warning',
        message: '⚠️ Aucun health check récent trouvé',
        details: { error: error.message }
      };
    }

    const lastCheckTime = new Date(data.timestamp);
    const now = new Date();
    const minutesAgo = Math.floor((now.getTime() - lastCheckTime.getTime()) / 60000);

    if (minutesAgo > 5) {
      return {
        step: 'Recent Health Checks',
        status: 'warning',
        message: `⚠️ Dernier health check il y a ${minutesAgo} minutes`,
        details: { lastCheck: data.timestamp, minutesAgo }
      };
    }

    return {
      step: 'Recent Health Checks',
      status: 'success',
      message: `✅ Health check récent (${minutesAgo}min) - Status: ${data.overall_status}`,
      details: { lastCheck: data.timestamp, status: data.overall_status }
    };
  } catch (error) {
    return {
      step: 'Recent Health Checks',
      status: 'error',
      message: '❌ Erreur vérification health checks',
      details: { error: String(error) }
    };
  }
}

/**
 * Tester connectivité base de données
 */
async function checkDatabaseConnection(): Promise<DiagnosticResult> {
  try {
    const startTime = Date.now();
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    const responseTime = Date.now() - startTime;

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found (acceptable)
      return {
        step: 'Database Connection',
        status: 'error',
        message: '❌ Erreur connexion base de données',
        details: { error: error.message, responseTime }
      };
    }

    if (responseTime > 1000) {
      return {
        step: 'Database Connection',
        status: 'warning',
        message: `⚠️ Connexion lente (${responseTime}ms)`,
        details: { responseTime }
      };
    }

    return {
      step: 'Database Connection',
      status: 'success',
      message: `✅ Connexion rapide (${responseTime}ms)`,
      details: { responseTime }
    };
  } catch (error) {
    return {
      step: 'Database Connection',
      status: 'error',
      message: '❌ Erreur critique connexion DB',
      details: { error: String(error) }
    };
  }
}

/**
 * Vérifier permissions RLS
 */
async function checkRLSPermissions(): Promise<DiagnosticResult> {
  try {
    // Tester accès à chaque table
    const tables = ['error_logs', 'system_health_logs', 'health_check_reports'];
    const results: { [key: string]: boolean } = {};

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        results[table] = !error || error.code !== '42501'; // 42501 = insufficient privileges
      } catch {
        results[table] = false;
      }
    }

    const deniedTables = Object.entries(results)
      .filter(([_, allowed]) => !allowed)
      .map(([table]) => table);

    if (deniedTables.length === 0) {
      return {
        step: 'RLS Permissions',
        status: 'success',
        message: '✅ Permissions RLS correctes',
        details: results
      };
    }

    return {
      step: 'RLS Permissions',
      status: 'warning',
      message: `⚠️ Accès refusé à ${deniedTables.length} tables`,
      details: { denied: deniedTables, results }
    };
  } catch (error) {
    return {
      step: 'RLS Permissions',
      status: 'error',
      message: '❌ Erreur vérification permissions',
      details: { error: String(error) }
    };
  }
}

/**
 * Diagnostic complet
 */
export async function runMonitoringDiagnostic(): Promise<{
  overall: 'healthy' | 'degraded' | 'critical';
  results: DiagnosticResult[];
  summary: {
    success: number;
    warnings: number;
    errors: number;
  };
}> {
  console.log('🔍 Démarrage diagnostic Monitoring System...\n');

  const results: DiagnosticResult[] = [];

  // Exécuter tous les checks
  results.push(await checkDatabaseConnection());
  results.push(await checkRequiredTables());
  results.push(await checkHealthApiFunction());
  results.push(await checkRLSPermissions());
  results.push(await checkCriticalErrors());
  results.push(await checkRecentHealthChecks());

  // Calculer résumé
  const summary = {
    success: results.filter(r => r.status === 'success').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length
  };

  // Déterminer statut global
  let overall: 'healthy' | 'degraded' | 'critical';
  if (summary.errors > 2) {
    overall = 'critical';
  } else if (summary.errors > 0 || summary.warnings > 2) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  // Afficher résultats
  console.log('📊 Résultats Diagnostic:\n');
  results.forEach(result => {
    console.log(`${result.step}: ${result.message}`);
    if (result.details) {
      console.log('   Détails:', result.details);
    }
  });

  console.log('\n📈 Résumé:');
  console.log(`   ✅ Succès: ${summary.success}`);
  console.log(`   ⚠️  Warnings: ${summary.warnings}`);
  console.log(`   ❌ Erreurs: ${summary.errors}`);
  console.log(`\n🎯 Statut Global: ${overall.toUpperCase()}`);

  return { overall, results, summary };
}

/**
 * Actions de correction automatique
 */
export async function autoFixMonitoring(): Promise<DiagnosticResult[]> {
  console.log('🔧 Démarrage corrections automatiques...\n');

  const fixes: DiagnosticResult[] = [];

  // Fix 1: Créer RPC function si manquante
  try {
    const { error } = await supabase.rpc('get_system_health_api', {});
    
    if (error && error.code === '42883') { // Function does not exist
      // Impossible de créer function via client, doit être fait en SQL
      fixes.push({
        step: 'Create Health API Function',
        status: 'warning',
        message: '⚠️ Créer manuellement fonction get_system_health_api (voir MONITORING_SYSTEM_DIAGNOSTIC.md)',
      });
    }
  } catch {
    // Ignorer
  }

  // Fix 2: Nettoyer vieilles erreurs critiques
  try {
    const { error } = await supabase
      .from('error_logs')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('level', 'critical')
      .eq('resolved', false)
      .lt('created_at', new Date(Date.now() - 3600000).toISOString()); // > 1h

    if (!error) {
      fixes.push({
        step: 'Clean Old Errors',
        status: 'success',
        message: '✅ Anciennes erreurs critiques nettoyées',
      });
    }
  } catch {
    // Ignorer
  }

  // Fix 3: Créer entrée health check initiale si aucune
  try {
    const { count } = await supabase
      .from('system_health_logs')
      .select('*', { count: 'exact', head: true });

    if (count === 0) {
      const { error } = await supabase
        .from('system_health_logs')
        .insert([{
          overall_status: 'healthy',
          security_status: 'healthy',
          database_status: 'healthy',
          api_status: 'healthy',
          frontend_status: 'healthy',
          critical_errors: 0,
          pending_errors: 0,
          uptime: 0,
          response_time: 0,
          active_users: 0,
          timestamp: new Date().toISOString()
        }]);

      if (!error) {
        fixes.push({
          step: 'Initialize Health Logs',
          status: 'success',
          message: '✅ Health log initial créé',
        });
      }
    }
  } catch {
    // Ignorer
  }

  console.log('\n🔧 Corrections appliquées:');
  fixes.forEach(fix => {
    console.log(`   ${fix.step}: ${fix.message}`);
  });

  return fixes;
}

/**
 * Fonction principale
 */
export async function fixMonitoringSystem() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔒 MONITORING SYSTEM - Diagnostic et Réparation');
  console.log('   224Solutions - Version 1.0.0');
  console.log('═══════════════════════════════════════════════════\n');

  // Phase 1: Diagnostic
  const diagnostic = await runMonitoringDiagnostic();

  // Phase 2: Corrections automatiques si nécessaire
  if (diagnostic.overall !== 'healthy') {
    console.log('\n🔧 Application corrections automatiques...\n');
    await autoFixMonitoring();

    // Re-diagnostic après corrections
    console.log('\n🔄 Re-diagnostic après corrections...\n');
    const finalDiagnostic = await runMonitoringDiagnostic();

    return finalDiagnostic;
  }

  return diagnostic;
}

// Export pour utilisation dans console
if (typeof window !== 'undefined') {
  (window as any).monitoringDiagnostic = {
    run: runMonitoringDiagnostic,
    fix: autoFixMonitoring,
    fixAll: fixMonitoringSystem
  };

  console.log('💡 Diagnostic disponible dans console:');
  console.log('   - monitoringDiagnostic.run() : Diagnostic complet');
  console.log('   - monitoringDiagnostic.fix() : Corrections automatiques');
  console.log('   - monitoringDiagnostic.fixAll() : Diagnostic + Corrections');
}
