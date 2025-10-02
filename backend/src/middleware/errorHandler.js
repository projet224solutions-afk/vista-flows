/**
 * 🚨 GESTIONNAIRE D'ERREURS GLOBAL - 224SOLUTIONS
 * Middleware centralisé pour la gestion des erreurs avec logging sécurisé
 */

const logger = require('../utils/logger');

/**
 * 🎯 Types d'erreurs personnalisées
 */
class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentification requise') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Permissions insuffisantes') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Ressource non trouvée') {
        super(message, 404, 'NOT_FOUND_ERROR');
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Trop de requêtes') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}

class ExternalServiceError extends AppError {
    constructor(message = 'Erreur de service externe', service = 'unknown') {
        super(message, 503, 'EXTERNAL_SERVICE_ERROR');
        this.service = service;
    }
}

/**
 * 🛡️ Middleware principal de gestion des erreurs
 */
const errorHandler = (error, req, res, next) => {
    // Si la réponse a déjà été envoyée, déléguer à Express
    if (res.headersSent) {
        return next(error);
    }

    // Extraction des informations de base
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Erreur interne du serveur';
    let code = error.code || 'INTERNAL_ERROR';
    let details = error.details || null;

    // ID unique pour tracer l'erreur
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Informations de contexte pour le logging
    const context = {
        errorId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || null,
        userRole: req.user?.role || null,
        statusCode,
        code
    };

    // Gestion spécifique selon le type d'erreur
    if (error.name === 'ValidationError' || error instanceof ValidationError) {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Données de requête invalides';

        logger.warn('Erreur de validation', {
            ...context,
            validationErrors: error.details || error.errors
        });
    }

    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'INVALID_TOKEN';
        message = 'Token d\'authentification invalide';

        logger.security('Token JWT invalide', context);
    }

    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'TOKEN_EXPIRED';
        message = 'Token d\'authentification expiré';

        logger.security('Token JWT expiré', context);
    }

    else if (error.name === 'CastError') {
        statusCode = 400;
        code = 'INVALID_ID';
        message = 'ID de ressource invalide';

        logger.warn('Erreur de format d\'ID', context);
    }

    else if (error.code === 11000) { // Erreur de duplication MongoDB
        statusCode = 409;
        code = 'DUPLICATE_RESOURCE';
        message = 'Ressource déjà existante';

        logger.warn('Tentative de création de ressource dupliquée', context);
    }

    else if (error.name === 'MulterError') {
        statusCode = 400;
        code = 'FILE_UPLOAD_ERROR';

        if (error.code === 'LIMIT_FILE_SIZE') {
            message = 'Fichier trop volumineux';
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            message = 'Trop de fichiers';
        } else {
            message = 'Erreur lors du téléchargement du fichier';
        }

        logger.warn('Erreur de téléchargement de fichier', {
            ...context,
            multerCode: error.code
        });
    }

    else if (error instanceof AuthenticationError) {
        logger.security('Erreur d\'authentification', context);
    }

    else if (error instanceof AuthorizationError) {
        logger.security('Erreur d\'autorisation', context);
    }

    else if (error instanceof RateLimitError) {
        logger.security('Limite de taux dépassée', context);
    }

    else if (error instanceof ExternalServiceError) {
        logger.error('Erreur de service externe', {
            ...context,
            service: error.service
        });
    }

    else if (statusCode >= 500) {
        // Erreurs internes du serveur
        logger.error('Erreur interne du serveur', {
            ...context,
            stack: error.stack,
            originalError: error.message
        });

        // En production, masquer les détails techniques
        if (process.env.NODE_ENV === 'production') {
            message = 'Une erreur interne est survenue';
            code = 'INTERNAL_ERROR';
        }
    }

    else {
        // Autres erreurs (4xx)
        logger.warn('Erreur client', {
            ...context,
            originalMessage: error.message
        });
    }

    // Construction de la réponse d'erreur
    const errorResponse = {
        success: false,
        error: {
            message,
            code,
            errorId,
            timestamp: new Date().toISOString()
        }
    };

    // Ajout des détails en développement
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.details = details;
        errorResponse.error.stack = error.stack;
        errorResponse.error.originalMessage = error.message;
    }

    // Ajout des détails de validation si présents
    if (details && Array.isArray(details)) {
        errorResponse.error.validationErrors = details;
    }

    // Ajout d'informations de retry pour certaines erreurs
    if (statusCode === 429) {
        errorResponse.error.retryAfter = error.retryAfter || 3600; // 1 heure par défaut
    }

    if (statusCode >= 500 && statusCode < 600) {
        errorResponse.error.retryable = true;
    }

    // Envoi de la réponse
    res.status(statusCode).json(errorResponse);
};

/**
 * 🔍 Middleware pour capturer les erreurs 404
 */
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Endpoint non trouvé: ${req.method} ${req.originalUrl}`);

    logger.warn('Endpoint non trouvé', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || null
    });

    next(error);
};

/**
 * 🚀 Gestionnaire pour les erreurs asynchrones
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 📊 Middleware pour logger les erreurs de performance
 */
const performanceErrorHandler = (threshold = 5000) => {
    return (req, res, next) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;

            if (duration > threshold) {
                logger.performance('Requête lente détectée', {
                    method: req.method,
                    url: req.originalUrl,
                    duration: `${duration}ms`,
                    threshold: `${threshold}ms`,
                    statusCode: res.statusCode,
                    userId: req.user?.id || null
                });
            }
        });

        next();
    };
};

/**
 * 🔧 Utilitaires pour créer des erreurs personnalisées
 */
const createError = {
    validation: (message, details) => new ValidationError(message, details),
    authentication: (message) => new AuthenticationError(message),
    authorization: (message) => new AuthorizationError(message),
    notFound: (message) => new NotFoundError(message),
    rateLimit: (message) => new RateLimitError(message),
    externalService: (message, service) => new ExternalServiceError(message, service),
    internal: (message, code) => new AppError(message, 500, code)
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    performanceErrorHandler,
    createError,
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ExternalServiceError
};
