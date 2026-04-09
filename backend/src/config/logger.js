/**
 * 📝 LOGGER CONFIGURATION
 * Winston logger pour logs structurés
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logLevel = process.env.LOG_LEVEL || 'info';

// Format personnalisé
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    
    return msg;
  })
);

// Configuration du logger
export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Fichier pour toutes les logs
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/backend.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Fichier pour les erreurs uniquement
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ],
  exitOnError: false
});

// Stream pour Morgan (HTTP request logging)
logger.stream = {
  write: (message) => logger.info(message.trim())
};

export default logger;
