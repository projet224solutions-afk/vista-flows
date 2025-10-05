/**
 * 🔍 MODULE AUDIT IA - SCAN SYSTÈME COMPLET
 * Analyse complète du code, sécurité et dépendances
 * Mode additif uniquement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://uakkxaibujzxdiqzpnpr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * Scanner l'arborescence du projet
 */
async function scanProjectStructure() {
  const issues = [];
  const projectRoot = process.cwd();
  
  console.log('🔍 Scan de l\'arborescence du projet...');
  
  try {
    // Vérifier les fichiers sensibles
    const sensitiveFiles = [
      '.env',
      '.env.local',
      'config/database.js',
      'secrets.json'
    ];
    
    for (const file of sensitiveFiles) {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Vérifier les tokens hardcodés
        if (content.includes('sk-') || content.includes('pk_') || content.includes('secret')) {
          issues.push({
            file: file,
            line: 0,
            severity: 'high',
            type: 'hardcoded_secrets',
            suggestion: 'Utiliser des variables d\'environnement au lieu de secrets hardcodés',
            code: content.substring(0, 100) + '...'
          });
        }
      }
    }
    
    // Vérifier les fichiers de configuration
    const configFiles = [
      'package.json',
      'vite.config.js',
      'tailwind.config.js'
    ];
    
    for (const file of configFiles) {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Vérifier les configurations dangereuses
        if (content.includes('cors: true') || content.includes('cors: "*"')) {
          issues.push({
            file: file,
            line: 0,
            severity: 'medium',
            type: 'cors_permissive',
            suggestion: 'Configurer CORS de manière restrictive',
            code: 'cors: true'
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du scan de l\'arborescence:', error);
    issues.push({
      file: 'system',
      line: 0,
      severity: 'low',
      type: 'scan_error',
      suggestion: 'Vérifier les permissions de lecture des fichiers',
      code: error.message
    });
  }
  
  return issues;
}

/**
 * Exécuter ESLint sur le projet
 */
async function runESLint() {
  const issues = [];
  
  console.log('🔍 Exécution d\'ESLint...');
  
  try {
    const result = execSync('npx eslint . --format json', { 
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    const lintResults = JSON.parse(result);
    
    for (const file of lintResults) {
      for (const message of file.messages) {
        issues.push({
          file: file.filePath,
          line: message.line,
          severity: message.severity === 2 ? 'high' : 'medium',
          type: 'eslint_error',
          suggestion: message.message,
          code: message.ruleId || 'unknown'
        });
      }
    }
    
  } catch (error) {
    console.log('⚠️ ESLint non configuré ou erreur:', error.message);
    issues.push({
      file: 'eslint',
      line: 0,
      severity: 'low',
      type: 'eslint_not_configured',
      suggestion: 'Configurer ESLint pour améliorer la qualité du code',
      code: 'ESLint not configured'
    });
  }
  
  return issues;
}

/**
 * Vérifier les dépendances obsolètes
 */
async function checkDependencies() {
  const issues = [];
  
  console.log('🔍 Vérification des dépendances...');
  
  try {
    const result = execSync('npm audit --json', { 
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    const auditResults = JSON.parse(result);
    
    for (const vulnerability of auditResults.vulnerabilities || []) {
      issues.push({
        file: 'package.json',
        line: 0,
        severity: vulnerability.severity === 'high' ? 'high' : 'medium',
        type: 'vulnerability',
        suggestion: `Mettre à jour ${vulnerability.name} vers une version sécurisée`,
        code: vulnerability.name
      });
    }
    
  } catch (error) {
    console.log('⚠️ Audit npm non disponible:', error.message);
  }
  
  return issues;
}

/**
 * Vérifier les schémas Supabase
 */
async function checkSupabaseSchema() {
  const issues = [];
  
  console.log('🔍 Vérification des schémas Supabase...');
  
  try {
    // Vérifier les tables critiques
    const criticalTables = [
      'profiles',
      'wallets',
      'transactions',
      'ai_chats',
      'ai_logs',
      'audit_reports'
    ];
    
    for (const table of criticalTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        issues.push({
          file: `supabase/${table}`,
          line: 0,
          severity: 'high',
          type: 'missing_table',
          suggestion: `Table ${table} manquante ou inaccessible`,
          code: error.message
        });
      }
    }
    
    // Vérifier les colonnes sensibles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, role, kyc_verified')
      .limit(1);
    
    if (profiles && profiles.length > 0) {
      const profile = profiles[0];
      if (!profile.kyc_verified) {
        issues.push({
          file: 'supabase/profiles',
          line: 0,
          severity: 'medium',
          type: 'missing_kyc_verification',
          suggestion: 'Implémenter la vérification KYC pour tous les utilisateurs',
          code: 'kyc_verified column'
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification Supabase:', error);
    issues.push({
      file: 'supabase',
      line: 0,
      severity: 'high',
      type: 'supabase_connection_error',
      suggestion: 'Vérifier la connexion à Supabase',
      code: error.message
    });
  }
  
  return issues;
}

/**
 * Vérifications personnalisées
 */
async function runCustomChecks() {
  const issues = [];
  
  console.log('🔍 Exécution des vérifications personnalisées...');
  
  try {
    // Vérifier les imports non utilisés
    const srcDir = path.join(process.cwd(), 'src');
    if (fs.existsSync(srcDir)) {
      const files = fs.readdirSync(srcDir, { recursive: true });
      
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
          const filePath = path.join(srcDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Vérifier les console.log en production
          if (content.includes('console.log') && !content.includes('// TODO: Remove in production')) {
            issues.push({
              file: filePath,
              line: 0,
              severity: 'low',
              type: 'console_log_in_production',
              suggestion: 'Supprimer les console.log en production',
              code: 'console.log'
            });
          }
          
          // Vérifier les TODO non résolus
          const todoMatches = content.match(/TODO:.*/g);
          if (todoMatches) {
            for (const todo of todoMatches) {
              issues.push({
                file: filePath,
                line: 0,
                severity: 'low',
                type: 'unresolved_todo',
                suggestion: 'Résoudre les TODO restants',
                code: todo
              });
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors des vérifications personnalisées:', error);
  }
  
  return issues;
}

/**
 * Fonction principale d'audit
 */
async function runAudit() {
  console.log('🚀 Démarrage de l\'audit système complet...');
  
  const startTime = Date.now();
  const issues = [];
  
  try {
    // Exécuter tous les scans en parallèle
    const [
      structureIssues,
      eslintIssues,
      dependencyIssues,
      supabaseIssues,
      customIssues
    ] = await Promise.all([
      scanProjectStructure(),
      runESLint(),
      checkDependencies(),
      checkSupabaseSchema(),
      runCustomChecks()
    ]);
    
    // Combiner tous les résultats
    issues.push(...structureIssues);
    issues.push(...eslintIssues);
    issues.push(...dependencyIssues);
    issues.push(...supabaseIssues);
    issues.push(...customIssues);
    
    // Calculer les statistiques
    const summary = {
      total_issues: issues.length,
      high_severity: issues.filter(i => i.severity === 'high').length,
      medium_severity: issues.filter(i => i.severity === 'medium').length,
      low_severity: issues.filter(i => i.severity === 'low').length,
      scan_duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
    
    // Créer le rapport
    const report = {
      summary,
      issues,
      recommendations: generateRecommendations(issues)
    };
    
    // Sauvegarder le rapport dans Supabase
    const { data: savedReport, error: saveError } = await supabase
      .from('audit_reports')
      .insert({
        summary: `Audit complet: ${summary.total_issues} anomalies détectées`,
        issues_json: issues,
        status: 'completed',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('❌ Erreur lors de la sauvegarde du rapport:', saveError);
    } else {
      console.log('✅ Rapport d\'audit sauvegardé:', savedReport.id);
    }
    
    console.log(`✅ Audit terminé: ${summary.total_issues} anomalies détectées en ${summary.scan_duration}ms`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'audit:', error);
    
    const errorReport = {
      summary: {
        total_issues: 1,
        high_severity: 1,
        medium_severity: 0,
        low_severity: 0,
        scan_duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      },
      issues: [{
        file: 'audit_system',
        line: 0,
        severity: 'high',
        type: 'audit_failure',
        suggestion: 'Vérifier la configuration du système d\'audit',
        code: error.message
      }],
      recommendations: ['Vérifier les permissions et la configuration du système']
    };
    
    return errorReport;
  }
}

/**
 * Générer des recommandations basées sur les issues
 */
function generateRecommendations(issues) {
  const recommendations = [];
  
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  
  if (highIssues.length > 0) {
    recommendations.push('🚨 Priorité haute: Corriger les ' + highIssues.length + ' anomalies critiques');
  }
  
  if (mediumIssues.length > 0) {
    recommendations.push('⚠️ Priorité moyenne: Traiter les ' + mediumIssues.length + ' anomalies moyennes');
  }
  
  const securityIssues = issues.filter(i => i.type.includes('security') || i.type.includes('vulnerability'));
  if (securityIssues.length > 0) {
    recommendations.push('🔒 Sécurité: ' + securityIssues.length + ' problèmes de sécurité détectés');
  }
  
  const codeQualityIssues = issues.filter(i => i.type.includes('eslint') || i.type.includes('console_log'));
  if (codeQualityIssues.length > 0) {
    recommendations.push('📝 Qualité du code: ' + codeQualityIssues.length + ' améliorations suggérées');
  }
  
  return recommendations;
}

module.exports = { runAudit };
