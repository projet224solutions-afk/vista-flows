/**
 * 🏥 ROUTES SANTÉ - 224SOLUTIONS
 * Routes pour vérifier l'état du serveur et des services
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const openaiService = require('../services/openaiService');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Configuration Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

/**
 * 🎯 GET /
 * Vérification de santé basique du serveur
 */
router.get('/', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
        success: true,
        message: '🚀 Serveur 224Solutions opérationnel',
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: {
                seconds: Math.floor(uptime),
                human: formatUptime(uptime)
            },
            memory: {
                used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
            },
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0'
        }
    });
});

/**
 * 🔍 GET /detailed
 * Vérification de santé détaillée avec tous les services
 */
router.get('/detailed', asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const checks = {};

    // Test de la base de données Supabase
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('count(*)')
            .limit(1);

        checks.database = {
            status: error ? 'unhealthy' : 'healthy',
            responseTime: `${Date.now() - startTime}ms`,
            error: error?.message || null
        };
    } catch (dbError) {
        checks.database = {
            status: 'unhealthy',
            responseTime: `${Date.now() - startTime}ms`,
            error: dbError.message
        };
    }

    // Test du service OpenAI
    try {
        const openaiTest = await openaiService.testConnection();
        checks.openai = {
            status: openaiTest.success ? 'healthy' : 'unhealthy',
            responseTime: `${Date.now() - startTime}ms`,
            model: openaiTest.model || null,
            error: openaiTest.error || null
        };
    } catch (openaiError) {
        checks.openai = {
            status: 'unhealthy',
            responseTime: `${Date.now() - startTime}ms`,
            error: openaiError.message
        };
    }

    // Vérification des variables d'environnement critiques
    const envVars = {
        NODE_ENV: !!process.env.NODE_ENV,
        JWT_SECRET: !!process.env.JWT_SECRET,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
    };

    const missingEnvVars = Object.entries(envVars)
        .filter(([key, exists]) => !exists)
        .map(([key]) => key);

    checks.environment = {
        status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
        configured: envVars,
        missing: missingEnvVars
    };

    // Statut global
    const allHealthy = Object.values(checks).every(check =>
        check.status === 'healthy'
    );

    const totalResponseTime = Date.now() - startTime;

    // Logging du check de santé
    logger.info('Vérification de santé détaillée', {
        status: allHealthy ? 'healthy' : 'unhealthy',
        responseTime: `${totalResponseTime}ms`,
        checks: Object.keys(checks).reduce((acc, key) => {
            acc[key] = checks[key].status;
            return acc;
        }, {}),
        ip: req.ip
    });

    res.status(allHealthy ? 200 : 503).json({
        success: allHealthy,
        message: allHealthy ? 'Tous les services sont opérationnels' : 'Certains services rencontrent des problèmes',
        data: {
            status: allHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            responseTime: `${totalResponseTime}ms`,
            checks,
            summary: {
                total: Object.keys(checks).length,
                healthy: Object.values(checks).filter(c => c.status === 'healthy').length,
                unhealthy: Object.values(checks).filter(c => c.status === 'unhealthy').length
            }
        }
    });
}));

/**
 * 📊 GET /metrics
 * Métriques système pour monitoring
 */
router.get('/metrics', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    res.status(200).json({
        success: true,
        message: 'Métriques système',
        data: {
            timestamp: new Date().toISOString(),
            uptime: {
                seconds: Math.floor(uptime),
                human: formatUptime(uptime)
            },
            memory: {
                rss: memoryUsage.rss,
                heapTotal: memoryUsage.heapTotal,
                heapUsed: memoryUsage.heapUsed,
                external: memoryUsage.external,
                arrayBuffers: memoryUsage.arrayBuffers
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            process: {
                pid: process.pid,
                version: process.version,
                platform: process.platform,
                arch: process.arch
            }
        }
    });
});

/**
 * 🔄 GET /readiness
 * Vérification de disponibilité pour les load balancers
 */
router.get('/readiness', asyncHandler(async (req, res) => {
    // Vérifications critiques pour la disponibilité
    const checks = [];

    // Test rapide de la base de données
    try {
        await supabase.from('profiles').select('count(*)').limit(1);
        checks.push({ service: 'database', ready: true });
    } catch (error) {
        checks.push({ service: 'database', ready: false, error: error.message });
    }

    // Vérification des variables d'environnement critiques
    const criticalEnvVars = ['JWT_SECRET', 'SUPABASE_URL', 'OPENAI_API_KEY'];
    const envReady = criticalEnvVars.every(varName => !!process.env[varName]);

    checks.push({
        service: 'environment',
        ready: envReady,
        error: envReady ? null : 'Variables d\'environnement manquantes'
    });

    const allReady = checks.every(check => check.ready);

    res.status(allReady ? 200 : 503).json({
        success: allReady,
        message: allReady ? 'Service prêt' : 'Service non prêt',
        data: {
            ready: allReady,
            timestamp: new Date().toISOString(),
            checks
        }
    });
}));

/**
 * 💓 GET /liveness
 * Vérification de vie pour les orchestrateurs
 */
router.get('/liveness', (req, res) => {
    // Simple vérification que le processus répond
    res.status(200).json({
        success: true,
        message: 'Service vivant',
        data: {
            alive: true,
            timestamp: new Date().toISOString(),
            pid: process.pid,
            uptime: process.uptime()
        }
    });
});

/**
 * 🔧 Utilitaire pour formater l'uptime
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}j`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ') || '0s';
}

module.exports = router;
