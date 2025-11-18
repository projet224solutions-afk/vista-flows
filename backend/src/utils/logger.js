/**
 * 📊 SYSTÈME DE LOGGING - 224SOLUTIONS
 * Configuration Winston pour logging structuré et sécurisé
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Création du dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Configuration des niveaux de log personnalisés
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'blue'
    }
};

// Ajout des couleurs
winston.addColors(customLevels.colors);

/**
 * 🎨 Format personnalisé pour les logs
 */
const customFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;

        // Construction du log structuré
        const logObject = {
            timestamp,
            level: level.toUpperCase(),
            message,
            service: '224solutions-backend',
            environment: process.env.NODE_ENV || 'development'
        };

        // Ajout des métadonnées si présentes
        if (Object.keys(meta).length > 0) {
            logObject.meta = meta;
        }

        return JSON.stringify(logObject);
    })
);

/**
 * 🖥️ Format pour la console (développement)
 */
const consoleFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;

        let logMessage = `${timestamp} [${level}] ${message}`;

        // Ajout des métadonnées formatées pour la console
        if (Object.keys(meta).length > 0) {
            const metaString = JSON.stringify(meta, null, 2);
            logMessage += `\n${metaString}`;
        }

        return logMessage;
    })
);

/**
 * 🗂️ Configuration des transports
 */
const transports = [];

// Transport console (toujours actif en développement)
if (process.env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.Console({
            level: 'debug',
            format: consoleFormat
        })
    );
}

// Transport fichier pour tous les logs
transports.push(
    new winston.transports.File({
        filename: path.join(logsDir, 'app.log'),
        level: process.env.LOG_LEVEL || 'info',
        format: customFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
    })
);

// Transport fichier pour les erreurs uniquement
transports.push(
    new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: customFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
    })
);

// Transport fichier pour les requêtes HTTP
transports.push(
    new winston.transports.File({
        filename: path.join(logsDir, 'http.log'),
        level: 'http',
        format: customFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 3,
        tailable: true
    })
);

/**
 * 🏗️ Création du logger principal
 */
const logger = winston.createLogger({
    levels: customLevels.levels,
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    defaultMeta: {
        service: '224solutions-backend',
        version: '1.0.0'
    },
    transports,
    exitOnError: false
});

/**
 * 🔒 Fonction pour nettoyer les données sensibles des logs
 * @param {Object} data - Données à nettoyer
 * @returns {Object} Données nettoyées
 */
const sanitizeLogData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const sensitiveFields = [
        'password',
        'token',
        'apiKey',
        'secret',
        'authorization',
        'cookie',
        'session'
    ];

    const sanitized = { ...data };

    const sanitizeRecursive = (obj) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const lowerKey = key.toLowerCase();

                // Masquer les champs sensibles
                if (sensitiveFields.some(field => lowerKey.includes(field))) {
                    obj[key] = '[REDACTED]';
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeRecursive(obj[key]);
                }
            }
        }
    };

    sanitizeRecursive(sanitized);
    return sanitized;
};

/**
 * 🎯 Méthodes de logging sécurisées
 */
const secureLogger = {
    error: (message, meta = {}) => {
        logger.error(message, sanitizeLogData(meta));
    },

    warn: (message, meta = {}) => {
        logger.warn(message, sanitizeLogData(meta));
    },

    info: (message, meta = {}) => {
        logger.info(message, sanitizeLogData(meta));
    },

    http: (message, meta = {}) => {
        logger.http(message, sanitizeLogData(meta));
    },

    debug: (message, meta = {}) => {
        logger.debug(message, sanitizeLogData(meta));
    },

    /**
     * 🔐 Log spécifique pour les événements de sécurité
     */
    security: (message, meta = {}) => {
        logger.warn(`[SECURITY] ${message}`, {
            ...sanitizeLogData(meta),
            category: 'security',
            timestamp: new Date().toISOString()
        });
    },

    /**
     * 🤖 Log spécifique pour les interactions OpenAI
     */
    openai: (message, meta = {}) => {
        logger.info(`[OPENAI] ${message}`, {
            ...sanitizeLogData(meta),
            category: 'openai',
            timestamp: new Date().toISOString()
        });
    },

    /**
     * 📊 Log spécifique pour les métriques de performance
     */
    performance: (message, meta = {}) => {
        logger.info(`[PERFORMANCE] ${message}`, {
            ...sanitizeLogData(meta),
            category: 'performance',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * 📈 Middleware pour logger les requêtes HTTP
 */
const httpLoggerMiddleware = (req, res, next) => {
    const start = Date.now();

    // Log de la requête entrante
    secureLogger.http('Requête reçue', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: req.get('Content-Length') || 0
    });

    // Override de res.end pour logger la réponse
    const originalEnd = res.end;
    res.end = function (...args) {
        const duration = Date.now() - start;

        secureLogger.http('Réponse envoyée', {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length') || 0
        });

        originalEnd.apply(this, args);
    };

    next();
};

/**
 * 🧹 Fonction de nettoyage des anciens logs
 */
const cleanupOldLogs = () => {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
    const now = Date.now();

    fs.readdir(logsDir, (err, files) => {
        if (err) {
            secureLogger.error('Erreur lors du nettoyage des logs', { error: err.message });
            return;
        }

        files.forEach(file => {
            const filePath = path.join(logsDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;

                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlink(filePath, (err) => {
                        if (!err) {
                            secureLogger.info('Ancien fichier de log supprimé', { file });
                        }
                    });
                }
            });
        });
    });
};

// Nettoyage automatique des logs tous les jours
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

// Message de démarrage du système de logging
secureLogger.info('Système de logging 224Solutions initialisé', {
    logLevel: process.env.LOG_LEVEL || 'info',
    environment: process.env.NODE_ENV || 'development',
    logsDirectory: logsDir
});

module.exports = secureLogger;
