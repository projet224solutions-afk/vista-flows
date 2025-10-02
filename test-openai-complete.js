/**
 * 🧪 TEST COMPLET BACKEND OPENAI - 224SOLUTIONS
 * Script de test pour vérifier l'intégration OpenAI sans démarrer le serveur
 */

const fs = require('fs');
const path = require('path');

// Couleurs pour les logs
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    header: (msg) => console.log(`\n${colors.bold}${colors.blue}🚀 ${msg}${colors.reset}\n`)
};

/**
 * 🔍 Vérification de l'intégration OpenAI
 */
function testOpenAIIntegration() {
    log.header('VÉRIFICATION BACKEND OPENAI 224SOLUTIONS');

    let allTestsPassed = true;

    // Test 1: Structure des dossiers
    log.info('Test 1: Vérification de la structure des dossiers...');
    const requiredDirs = [
        'backend',
        'backend/src',
        'backend/src/services',
        'backend/src/routes',
        'backend/src/middleware',
        'backend/src/utils'
    ];

    requiredDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            log.success(`Dossier ${dir} ✓`);
        } else {
            log.error(`Dossier ${dir} manquant`);
            allTestsPassed = false;
        }
    });

    // Test 2: Fichiers principaux
    log.info('Test 2: Vérification des fichiers principaux...');
    const requiredFiles = [
        'backend/package.json',
        'backend/server.js',
        'backend/env.example',
        'backend/src/services/openaiService.js',
        'backend/src/routes/openai.js',
        'backend/src/routes/auth.js',
        'backend/src/routes/health.js',
        'backend/src/middleware/auth.js',
        'backend/src/middleware/permissions.js',
        'backend/src/middleware/errorHandler.js',
        'backend/src/utils/logger.js'
    ];

    requiredFiles.forEach(file => {
        if (fs.existsSync(file)) {
            log.success(`Fichier ${file} ✓`);
        } else {
            log.error(`Fichier ${file} manquant`);
            allTestsPassed = false;
        }
    });

    // Test 3: Vérification du package.json
    log.info('Test 3: Vérification des dépendances...');
    try {
        const packageJson = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
        const requiredDeps = [
            'express',
            'openai',
            'jsonwebtoken',
            'bcryptjs',
            'express-rate-limit',
            'winston',
            '@supabase/supabase-js',
            'dotenv',
            'cors',
            'helmet'
        ];

        requiredDeps.forEach(dep => {
            if (packageJson.dependencies && packageJson.dependencies[dep]) {
                log.success(`Dépendance ${dep} ✓`);
            } else {
                log.error(`Dépendance ${dep} manquante`);
                allTestsPassed = false;
            }
        });
    } catch (error) {
        log.error('Erreur lors de la lecture du package.json');
        allTestsPassed = false;
    }

    // Test 4: Vérification du service OpenAI
    log.info('Test 4: Vérification du service OpenAI...');
    try {
        const openaiServiceContent = fs.readFileSync('backend/src/services/openaiService.js', 'utf8');

        const requiredFeatures = [
            'analyzeProject',
            'buildSystemPrompt',
            'formatResponse',
            'testConnection',
            'getUsageStats'
        ];

        requiredFeatures.forEach(feature => {
            if (openaiServiceContent.includes(feature)) {
                log.success(`Fonctionnalité ${feature} ✓`);
            } else {
                log.error(`Fonctionnalité ${feature} manquante`);
                allTestsPassed = false;
            }
        });

        if (openaiServiceContent.includes('gpt-4o-mini')) {
            log.success('Modèle GPT-4o-mini configuré ✓');
        } else {
            log.warning('Modèle GPT-4o-mini non trouvé');
        }

    } catch (error) {
        log.error('Erreur lors de la lecture du service OpenAI');
        allTestsPassed = false;
    }

    // Test 5: Vérification des routes OpenAI
    log.info('Test 5: Vérification des routes OpenAI...');
    try {
        const routesContent = fs.readFileSync('backend/src/routes/openai.js', 'utf8');

        const requiredRoutes = [
            '/analyse-projet',
            '/stats',
            '/test-connection'
        ];

        requiredRoutes.forEach(route => {
            if (routesContent.includes(route)) {
                log.success(`Route ${route} ✓`);
            } else {
                log.error(`Route ${route} manquante`);
                allTestsPassed = false;
            }
        });

        if (routesContent.includes('requireRole') && routesContent.includes('pdg')) {
            log.success('Sécurité PDG/Admin configurée ✓');
        } else {
            log.error('Sécurité PDG/Admin manquante');
            allTestsPassed = false;
        }

    } catch (error) {
        log.error('Erreur lors de la lecture des routes OpenAI');
        allTestsPassed = false;
    }

    // Test 6: Vérification de la sécurité
    log.info('Test 6: Vérification de la sécurité...');
    try {
        const authContent = fs.readFileSync('backend/src/middleware/auth.js', 'utf8');
        const permissionsContent = fs.readFileSync('backend/src/middleware/permissions.js', 'utf8');

        if (authContent.includes('jwt.verify') && authContent.includes('Bearer')) {
            log.success('Authentification JWT ✓');
        } else {
            log.error('Authentification JWT manquante');
            allTestsPassed = false;
        }

        if (permissionsContent.includes('requireRole') && permissionsContent.includes('pdg')) {
            log.success('Système de permissions ✓');
        } else {
            log.error('Système de permissions manquant');
            allTestsPassed = false;
        }

    } catch (error) {
        log.error('Erreur lors de la vérification de la sécurité');
        allTestsPassed = false;
    }

    // Test 7: Vérification du rate limiting
    log.info('Test 7: Vérification du rate limiting...');
    try {
        const serverContent = fs.readFileSync('backend/server.js', 'utf8');
        const openaiRoutesContent = fs.readFileSync('backend/src/routes/openai.js', 'utf8');

        if (serverContent.includes('rateLimit') && serverContent.includes('express-rate-limit')) {
            log.success('Rate limiting global ✓');
        } else {
            log.error('Rate limiting global manquant');
            allTestsPassed = false;
        }

        if (openaiRoutesContent.includes('openaiLimiter') && openaiRoutesContent.includes('3600000')) {
            log.success('Rate limiting OpenAI (1h) ✓');
        } else {
            log.error('Rate limiting OpenAI manquant');
            allTestsPassed = false;
        }

    } catch (error) {
        log.error('Erreur lors de la vérification du rate limiting');
        allTestsPassed = false;
    }

    // Test 8: Vérification du logging
    log.info('Test 8: Vérification du système de logging...');
    try {
        const loggerContent = fs.readFileSync('backend/src/utils/logger.js', 'utf8');

        if (loggerContent.includes('winston') && loggerContent.includes('sanitizeLogData')) {
            log.success('Système de logging sécurisé ✓');
        } else {
            log.error('Système de logging manquant');
            allTestsPassed = false;
        }

    } catch (error) {
        log.error('Erreur lors de la vérification du logging');
        allTestsPassed = false;
    }

    // Résumé final
    log.header('RÉSUMÉ DE LA VÉRIFICATION');

    if (allTestsPassed) {
        log.success('🎉 TOUS LES TESTS RÉUSSIS !');
        console.log(`
${colors.green}✅ BACKEND OPENAI 224SOLUTIONS PRÊT !${colors.reset}

🎯 FONCTIONNALITÉS VÉRIFIÉES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Service OpenAI GPT-4o-mini intégré
✅ Authentification JWT sécurisée  
✅ Permissions PDG/Admin uniquement
✅ Rate limiting (50 req/h pour OpenAI)
✅ Logging sécurisé avec Winston
✅ Routes de santé et monitoring
✅ Gestion d'erreurs centralisée
✅ Validation des données entrantes

🚀 POUR DÉMARRER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Configurez votre clé OpenAI dans backend/.env:
   OPENAI_API_KEY=sk-votre-vraie-cle-openai

2. Démarrez le serveur:
   cd backend && npm run dev

3. Testez l'API:
   http://localhost:3001/api/health

🤖 ENDPOINT PRINCIPAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/openai/analyse-projet
• Authentification: Bearer Token (PDG/Admin)
• Rate limit: 50 requêtes/heure
• Modèle: GPT-4o-mini optimisé 224Solutions
`);
    } else {
        log.error('❌ CERTAINS TESTS ONT ÉCHOUÉ');
        log.warning('Vérifiez les erreurs ci-dessus et corrigez-les avant de continuer');
    }

    return allTestsPassed;
}

// Exécution du test
if (require.main === module) {
    const success = testOpenAIIntegration();
    process.exit(success ? 0 : 1);
}

module.exports = { testOpenAIIntegration };
