/**
 * SCRIPT DE DIAGNOSTIC DES PERFORMANCES
 * Analyse complète des problèmes de performance
 * 224Solutions - Performance Diagnostic Tool
 */

import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceDiagnostic {
  constructor() {
    this.startTime = performance.now();
    this.issues = [];
    this.recommendations = [];
    this.metrics = {
      bundleSize: 0,
      componentCount: 0,
      hookCount: 0,
      useEffectCount: 0,
      apiCallCount: 0,
      cacheHitRate: 0,
      renderTime: 0
    };
  }

  /**
   * Analyse du bundle
   */
  analyzeBundle() {
    console.log('📦 Analyse du bundle...');
    
    try {
      const distPath = path.join(__dirname, 'dist');
      if (fs.existsSync(distPath)) {
        const files = this.getFilesRecursively(distPath);
        let totalSize = 0;
        
        files.forEach(file => {
          const stats = fs.statSync(file);
          totalSize += stats.size;
        });
        
        this.metrics.bundleSize = totalSize;
        
        if (totalSize > 2 * 1024 * 1024) { // > 2MB
          this.issues.push({
            type: 'bundle_size',
            severity: 'high',
            message: `Bundle trop volumineux: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
            recommendation: 'Implémenter le code splitting et le lazy loading'
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur analyse bundle:', error);
    }
  }

  /**
   * Analyse des composants React
   */
  analyzeComponents() {
    console.log('⚛️ Analyse des composants...');
    
    const srcPath = path.join(__dirname, 'src');
    const components = this.findReactComponents(srcPath);
    
    this.metrics.componentCount = components.length;
    
    // Analyser les composants lourds
    components.forEach(component => {
      const content = fs.readFileSync(component, 'utf8');
      const lines = content.split('\n').length;
      
      if (lines > 500) {
        this.issues.push({
          type: 'heavy_component',
          severity: 'medium',
          message: `Composant lourd: ${path.basename(component)} (${lines} lignes)`,
          recommendation: 'Diviser le composant en sous-composants plus petits'
        });
      }
    });
  }

  /**
   * Analyse des hooks
   */
  analyzeHooks() {
    console.log('🪝 Analyse des hooks...');
    
    const srcPath = path.join(__dirname, 'src');
    const hookFiles = this.findHookFiles(srcPath);
    
    hookFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Compter les useEffect
      const useEffectMatches = content.match(/useEffect/g);
      if (useEffectMatches) {
        this.metrics.useEffectCount += useEffectMatches.length;
        
        if (useEffectMatches.length > 10) {
          this.issues.push({
            type: 'too_many_useEffect',
            severity: 'medium',
            message: `Trop de useEffect dans ${path.basename(file)}: ${useEffectMatches.length}`,
            recommendation: 'Consolider les useEffect ou utiliser useMemo/useCallback'
          });
        }
      }
    });
  }

  /**
   * Analyse des appels API
   */
  analyzeApiCalls() {
    console.log('🌐 Analyse des appels API...');
    
    const srcPath = path.join(__dirname, 'src');
    const apiFiles = this.findApiFiles(srcPath);
    
    apiFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Compter les fetch/axios
      const fetchMatches = content.match(/fetch\(|axios\./g);
      if (fetchMatches) {
        this.metrics.apiCallCount += fetchMatches.length;
        
        if (fetchMatches.length > 20) {
          this.issues.push({
            type: 'too_many_api_calls',
            severity: 'high',
            message: `Trop d'appels API dans ${path.basename(file)}: ${fetchMatches.length}`,
            recommendation: 'Implémenter un système de cache et de requêtes optimisées'
          });
        }
      }
    });
  }

  /**
   * Analyse des dépendances
   */
  analyzeDependencies() {
    console.log('📚 Analyse des dépendances...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      const devDependencies = Object.keys(packageJson.devDependencies || {});
      
      const totalDeps = dependencies.length + devDependencies.length;
      
      if (totalDeps > 100) {
        this.issues.push({
          type: 'too_many_dependencies',
          severity: 'medium',
          message: `Trop de dépendances: ${totalDeps}`,
          recommendation: 'Auditer et supprimer les dépendances inutiles'
        });
      }
      
      // Vérifier les dépendances lourdes
      const heavyDeps = ['lodash', 'moment', 'jquery', 'bootstrap'];
      heavyDeps.forEach(dep => {
        if (dependencies.includes(dep)) {
          this.issues.push({
            type: 'heavy_dependency',
            severity: 'low',
            message: `Dépendance lourde détectée: ${dep}`,
            recommendation: `Remplacer ${dep} par une alternative plus légère`
          });
        }
      });
    } catch (error) {
      console.error('❌ Erreur analyse dépendances:', error);
    }
  }

  /**
   * Génère les recommandations
   */
  generateRecommendations() {
    console.log('💡 Génération des recommandations...');
    
    // Recommandations basées sur les métriques
    if (this.metrics.bundleSize > 1024 * 1024) {
      this.recommendations.push({
        priority: 'high',
        category: 'bundle',
        title: 'Optimiser la taille du bundle',
        actions: [
          'Implémenter le code splitting avec React.lazy()',
          'Utiliser le lazy loading pour les composants lourds',
          'Optimiser les images avec WebP',
          'Supprimer le code mort avec tree shaking'
        ]
      });
    }
    
    if (this.metrics.componentCount > 50) {
      this.recommendations.push({
        priority: 'medium',
        category: 'components',
        title: 'Optimiser les composants',
        actions: [
          'Diviser les composants lourds',
          'Utiliser React.memo() pour éviter les re-renders',
          'Implémenter la virtualisation pour les listes',
          'Optimiser les props drilling'
        ]
      });
    }
    
    if (this.metrics.useEffectCount > 20) {
      this.recommendations.push({
        priority: 'medium',
        category: 'hooks',
        title: 'Optimiser les hooks',
        actions: [
          'Consolider les useEffect similaires',
          'Utiliser useMemo() et useCallback()',
          'Éviter les dépendances inutiles',
          'Implémenter des hooks personnalisés'
        ]
      });
    }
    
    if (this.metrics.apiCallCount > 30) {
      this.recommendations.push({
        priority: 'high',
        category: 'api',
        title: 'Optimiser les appels API',
        actions: [
          'Implémenter un système de cache intelligent',
          'Utiliser React Query ou SWR',
          'Débouncer les requêtes de recherche',
          'Implémenter la pagination'
        ]
      });
    }
  }

  /**
   * Génère le rapport
   */
  generateReport() {
    const endTime = performance.now();
    const totalTime = endTime - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT DE DIAGNOSTIC DES PERFORMANCES');
    console.log('='.repeat(60));
    
    console.log('\n📈 MÉTRIQUES:');
    console.log(`• Taille du bundle: ${(this.metrics.bundleSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`• Nombre de composants: ${this.metrics.componentCount}`);
    console.log(`• Nombre de useEffect: ${this.metrics.useEffectCount}`);
    console.log(`• Nombre d'appels API: ${this.metrics.apiCallCount}`);
    console.log(`• Temps d'analyse: ${totalTime.toFixed(2)}ms`);
    
    if (this.issues.length > 0) {
      console.log('\n⚠️ PROBLÈMES DÉTECTÉS:');
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
        console.log(`   💡 ${issue.recommendation}`);
      });
    }
    
    if (this.recommendations.length > 0) {
      console.log('\n💡 RECOMMANDATIONS:');
      this.recommendations.forEach((rec, index) => {
        console.log(`\n${index + 1}. ${rec.title} [${rec.priority.toUpperCase()}]`);
        rec.actions.forEach(action => {
          console.log(`   • ${action}`);
        });
      });
    }
    
    // Score de performance
    const score = this.calculatePerformanceScore();
    console.log(`\n🎯 SCORE DE PERFORMANCE: ${score}/100`);
    
    if (score < 50) {
      console.log('🔴 Performance critique - Optimisation urgente nécessaire');
    } else if (score < 75) {
      console.log('🟡 Performance acceptable - Améliorations recommandées');
    } else {
      console.log('🟢 Performance excellente - Maintenir les bonnes pratiques');
    }
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Calcule le score de performance
   */
  calculatePerformanceScore() {
    let score = 100;
    
    // Pénalités basées sur les problèmes
    this.issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });
    
    // Pénalités basées sur les métriques
    if (this.metrics.bundleSize > 2 * 1024 * 1024) score -= 15;
    if (this.metrics.useEffectCount > 20) score -= 10;
    if (this.metrics.apiCallCount > 30) score -= 15;
    
    return Math.max(0, score);
  }

  /**
   * Utilitaires
   */
  getFilesRecursively(dir) {
    let files = [];
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files = files.concat(this.getFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  findReactComponents(srcPath) {
    const components = [];
    
    const findComponents = (dir) => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          findComponents(fullPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.jsx')) {
          components.push(fullPath);
        }
      });
    };
    
    findComponents(srcPath);
    return components;
  }

  findHookFiles(srcPath) {
    const hookFiles = [];
    
    const findHooks = (dir) => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          findHooks(fullPath);
        } else if (item.includes('hook') || item.includes('use')) {
          hookFiles.push(fullPath);
        }
      });
    };
    
    findHooks(srcPath);
    return hookFiles;
  }

  findApiFiles(srcPath) {
    const apiFiles = [];
    
    const findApis = (dir) => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          findApis(fullPath);
        } else if (item.includes('api') || item.includes('service')) {
          apiFiles.push(fullPath);
        }
      });
    };
    
    findApis(srcPath);
    return apiFiles;
  }

  /**
   * Lance l'analyse complète
   */
  async run() {
    console.log('🚀 Démarrage du diagnostic des performances...\n');
    
    this.analyzeBundle();
    this.analyzeComponents();
    this.analyzeHooks();
    this.analyzeApiCalls();
    this.analyzeDependencies();
    this.generateRecommendations();
    this.generateReport();
  }
}

// Lancement du diagnostic
const diagnostic = new PerformanceDiagnostic();
diagnostic.run().catch(console.error);
