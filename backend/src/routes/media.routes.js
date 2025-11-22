/**
 * 📸 MEDIA PROCESSING ROUTES
 * Upload et traitement de médias
 */

import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middlewares/auth.js';
import { uploadRateLimiter } from '../middlewares/rateLimiter.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// Configuration Multer
const upload = multer({
  dest: process.env.UPLOAD_PATH || './uploads/',
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// Protection: Authentification + Rate limiting
router.use(authenticateToken);
router.use(uploadRateLimiter);

/**
 * POST /media/upload
 * Upload d'un fichier média
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    logger.info(`File uploaded by ${req.user.id}: ${req.file.originalname}`);

    // TODO: Traiter et uploader vers Supabase Storage

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    logger.error(`Upload error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /media/optimize
 * Optimisation d'images (compression, resize)
 */
router.post('/optimize', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image provided'
      });
    }

    const { width, height, quality } = req.body;

    logger.info(`Image optimization requested by ${req.user.id}`);

    // TODO: Implémenter avec Sharp

    res.json({
      success: true,
      message: 'Image optimized',
      original: req.file.size,
      optimized: req.file.size * 0.7 // Mock
    });
  } catch (error) {
    logger.error(`Optimization error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
