/**
 * 🚀 SERVEUR BACKEND 224SOLUTIONS
 * Backend Express/Node.js avec intégration OpenAI et sécurité avancée
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import des services et middlewares
const logger = require('./src/utils/logger');
const { authMiddleware } = require('./src/middleware/auth');
const permissionMiddleware = require('./src/middleware/permissions');
const { errorHandler } = require('./src/middleware/errorHandler');

// Import des routes
const openaiRoutes = require('./src/routes/openai');
const authRoutes = require('./src/routes/auth');
const emailRoutes = require('./src/routes/email');
const agoraRoutes = require('./routes/agora');
const walletRoutes = require('./src/routes/wallet'); // Nouveau
const notificationsRoutes = require('./src/routes/notifications'); // Nouveau
const healthRoutes = require('./src/routes/health');
const ordersRoutes = require('./src/routes/orders');
const taxiMotoDriverRoutes = require('./src/routes/taxiMotoDriver');
const authGoogleRoutes = require('./src/routes/authGoogle');

const app = express();
const PORT = process.env.PORT || 3001;

// =====================================================
// CONFIGURATION SÉCURITÉ ET MIDDLEWARES
// =====================================================

// Sécurité de base
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Compression des réponses
app.use(compression());

// CORS configuré pour 224Solutions
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'https://224solutions.com',
        'https://www.224solutions.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting global
const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        error: 'Trop de requêtes depuis cette IP',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Rate limit dépassé pour IP: ${req.ip}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.originalUrl
        });
        res.status(429).json({
            error: 'Trop de requêtes',
            message: 'Veuillez patienter avant de réessayer',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

app.use(globalLimiter);

// Parsing JSON avec limite de taille
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            res.status(400).json({ error: 'JSON invalide' });
            throw new Error('JSON invalide');
        }
    }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging des requêtes
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl}`, {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    });

    next();
});

// =====================================================
// ROUTES
// =====================================================

// Route de santé (sans authentification)
app.use('/api/health', healthRoutes);

// Routes d'authentification
app.use('/api/auth', authRoutes);
// OAuth Google
app.use('/auth', authGoogleRoutes);

// Routes OpenAI (avec authentification et permissions)
app.use('/api/openai', authMiddleware, openaiRoutes);

// Routes Email (avec authentification)
app.use('/api/email', emailRoutes);

// Routes Agora (avec authentification) - montage conditionnel
const hasAgoraEnv = !!process.env.AGORA_APP_ID && !!process.env.AGORA_APP_CERTIFICATE;
const hasSupabaseForAgora = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
if (hasAgoraEnv && hasSupabaseForAgora) {
    app.use('/api/agora', agoraRoutes);
} else {
    logger.warn('Routes Agora désactivées: variables manquantes', {
        AGORA_APP_ID: !!process.env.AGORA_APP_ID,
        AGORA_APP_CERTIFICATE: !!process.env.AGORA_APP_CERTIFICATE,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
}

// Routes Wallet (avec authentification)
app.use('/api/wallet', walletRoutes);

// Routes Notifications (avec authentification)
app.use('/api/notifications', notificationsRoutes);

// Routes Orders (POS)
app.use('/api/orders', ordersRoutes);

// Routes Taxi Moto Driver (auth requise)
app.use('/api/taxiMoto/driver', authMiddleware, taxiMotoDriverRoutes);

// Route racine
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Backend 224Solutions API',
        version: '1.0.0',
        status: 'Opérationnel',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            email: '/api/email (authentification requise)',
            agora: '/api/agora (authentification requise)',
            openai: '/api/openai (authentification requise)'
        }
    });
});

// Route 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint non trouvé',
        message: `La route ${req.originalUrl} n'existe pas`,
        availableEndpoints: [
            '/api/health',
            '/api/auth',
            '/api/email',
            '/api/agora',
            '/api/openai'
        ]
    });
});

// =====================================================
// GESTION DES ERREURS
// =====================================================

app.use(errorHandler);

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    logger.error('Erreur non capturée:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promesse rejetée non gérée:', { reason, promise });
    process.exit(1);
});

// =====================================================
// DÉMARRAGE DU SERVEUR
// =====================================================

const server = app.listen(PORT, () => {
    logger.info(`🚀 Serveur 224Solutions démarré`, {
        port: PORT,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });

    console.log(`
🎉 SERVEUR 224SOLUTIONS DÉMARRÉ AVEC SUCCÈS !
===========================================
🌐 URL: http://localhost:${PORT}
🔧 Environnement: ${process.env.NODE_ENV}
📊 Endpoints disponibles:
   • GET  /                     → Informations API
   • GET  /api/health           → Statut du serveur
   • POST /api/auth/login       → Authentification
   • POST /api/openai/analyse-projet → Analyse OpenAI (PDG/Admin)

🛡️ Sécurités activées:
   • Rate limiting global (${process.env.RATE_LIMIT_MAX_REQUESTS || 100} req/15min)
   • Rate limiting OpenAI (${process.env.RATE_LIMIT_OPENAI_MAX_REQUESTS || 50} req/h)
   • Authentification JWT
   • Permissions par rôle
   • Helmet security headers
   • CORS configuré

🚀 Prêt à recevoir les requêtes !
  `);
});

// Arrêt gracieux
process.on('SIGTERM', () => {
    logger.info('Signal SIGTERM reçu, arrêt du serveur...');
    server.close(() => {
        logger.info('Serveur arrêté proprement');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('Signal SIGINT reçu, arrêt du serveur...');
    server.close(() => {
        logger.info('Serveur arrêté proprement');
        process.exit(0);
    });
});

module.exports = app;
