/**
 * ☁️ SERVICE STOCKAGE - 224SOLUTIONS
 * Service hybride : Google Cloud Storage + Supabase Storage
 */

const { Storage } = require('@google-cloud/storage');
const { createClient } = require('@supabase/supabase-js');
const { gcsConfig } = require('../config/firebase.config');
const path = require('path');
const fs = require('fs');

class StorageService {
    constructor() {
        this.initializeServices();
    }

    /**
     * Initialise les services de stockage
     */
    initializeServices() {
        try {
            // Google Cloud Storage
            this.gcs = new Storage({
                projectId: gcsConfig.projectId,
                keyFilename: gcsConfig.keyFilename
            });
            this.bucket = this.gcs.bucket(gcsConfig.bucketName);

            // Supabase Storage
            this.supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            console.log('✅ Services de stockage initialisés');
        } catch (error) {
            console.error('❌ Erreur initialisation stockage:', error);
        }
    }

    /**
     * 🗂️ GOOGLE CLOUD STORAGE (Fichiers lourds)
     */

    /**
     * Upload un fichier vers Google Cloud Storage
     */
    async uploadToGCS(file, folder, userId, options = {}) {
        try {
            const fileName = this.generateFileName(file.originalname, userId);
            const filePath = `${gcsConfig.folders[folder] || folder}${fileName}`;
            
            const fileUpload = this.bucket.file(filePath);
            
            const stream = fileUpload.createWriteStream({
                metadata: {
                    contentType: file.mimetype,
                    metadata: {
                        userId: userId,
                        uploadedAt: new Date().toISOString(),
                        originalName: file.originalname,
                        ...options.metadata
                    }
                },
                public: options.public || false
            });

            return new Promise((resolve, reject) => {
                stream.on('error', (error) => {
                    console.error('❌ Erreur upload GCS:', error);
                    reject(error);
                });

                stream.on('finish', async () => {
                    try {
                        let publicUrl = null;
                        
                        if (options.public) {
                            await fileUpload.makePublic();
                            publicUrl = `https://storage.googleapis.com/${gcsConfig.bucketName}/${filePath}`;
                        } else {
                            // Générer une URL signée (valide 7 jours)
                            const [signedUrl] = await fileUpload.getSignedUrl({
                                action: 'read',
                                expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 jours
                            });
                            publicUrl = signedUrl;
                        }

                        console.log('✅ Fichier uploadé vers GCS:', filePath);
                        resolve({
                            success: true,
                            filePath,
                            publicUrl,
                            fileName,
                            size: file.size,
                            contentType: file.mimetype
                        });
                    } catch (error) {
                        reject(error);
                    }
                });

                stream.end(file.buffer);
            });
        } catch (error) {
            console.error('❌ Erreur upload GCS:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Supprime un fichier de Google Cloud Storage
     */
    async deleteFromGCS(filePath) {
        try {
            await this.bucket.file(filePath).delete();
            console.log('✅ Fichier supprimé de GCS:', filePath);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression GCS:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtient une URL signée pour un fichier GCS
     */
    async getGCSSignedUrl(filePath, expiresInDays = 7) {
        try {
            const [signedUrl] = await this.bucket.file(filePath).getSignedUrl({
                action: 'read',
                expires: Date.now() + expiresInDays * 24 * 60 * 60 * 1000
            });

            return { success: true, signedUrl };
        } catch (error) {
            console.error('❌ Erreur génération URL signée:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 📦 SUPABASE STORAGE (Fichiers légers)
     */

    /**
     * Upload un fichier vers Supabase Storage
     */
    async uploadToSupabase(file, bucket, folder, userId, options = {}) {
        try {
            const fileName = this.generateFileName(file.originalname, userId);
            const filePath = `${folder}/${fileName}`;

            const { data, error } = await this.supabase.storage
                .from(bucket)
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    metadata: {
                        userId: userId,
                        uploadedAt: new Date().toISOString(),
                        originalName: file.originalname,
                        ...options.metadata
                    }
                });

            if (error) {
                throw error;
            }

            // Obtenir l'URL publique
            const { data: publicUrlData } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            console.log('✅ Fichier uploadé vers Supabase:', filePath);
            return {
                success: true,
                filePath,
                publicUrl: publicUrlData.publicUrl,
                fileName,
                size: file.size,
                contentType: file.mimetype
            };
        } catch (error) {
            console.error('❌ Erreur upload Supabase:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Supprime un fichier de Supabase Storage
     */
    async deleteFromSupabase(bucket, filePath) {
        try {
            const { error } = await this.supabase.storage
                .from(bucket)
                .remove([filePath]);

            if (error) {
                throw error;
            }

            console.log('✅ Fichier supprimé de Supabase:', filePath);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression Supabase:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🤖 UPLOAD INTELLIGENT (Choix automatique du service)
     */

    /**
     * Upload intelligent selon le type et la taille du fichier
     */
    async smartUpload(file, fileType, userId, options = {}) {
        try {
            const fileSizeMB = file.size / (1024 * 1024);
            
            // Règles de routage
            const useGCS = this.shouldUseGCS(fileType, fileSizeMB);
            
            if (useGCS) {
                // Fichiers lourds → Google Cloud Storage
                return await this.uploadToGCS(file, fileType, userId, options);
            } else {
                // Fichiers légers → Supabase Storage
                const bucket = this.getSupabaseBucket(fileType);
                return await this.uploadToSupabase(file, bucket, fileType, userId, options);
            }
        } catch (error) {
            console.error('❌ Erreur smart upload:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Détermine si on doit utiliser GCS
     */
    shouldUseGCS(fileType, fileSizeMB) {
        // Règles de routage
        const gcsTypes = ['videos', 'documents', 'receipts', 'invoices'];
        const maxSupabaseSize = 5; // 5MB max pour Supabase
        
        return gcsTypes.includes(fileType) || fileSizeMB > maxSupabaseSize;
    }

    /**
     * Obtient le bucket Supabase selon le type de fichier
     */
    getSupabaseBucket(fileType) {
        const bucketMap = {
            'avatars': 'avatars',
            'images': 'images',
            'documents': 'documents',
            'receipts': 'receipts'
        };
        
        return bucketMap[fileType] || 'general';
    }

    /**
     * 🛠️ UTILITAIRES
     */

    /**
     * Génère un nom de fichier unique
     */
    generateFileName(originalName, userId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(originalName);
        
        return `${userId}_${timestamp}_${random}${extension}`;
    }

    /**
     * Valide le type de fichier
     */
    validateFileType(file, allowedTypes) {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const mimeType = file.mimetype.toLowerCase();
        
        return allowedTypes.some(type => 
            fileExtension.includes(type) || mimeType.includes(type)
        );
    }

    /**
     * Redimensionne une image (pour les avatars)
     */
    async resizeImage(file, width = 200, height = 200) {
        try {
            const sharp = require('sharp');
            
            const resizedBuffer = await sharp(file.buffer)
                .resize(width, height, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 80 })
                .toBuffer();

            return {
                ...file,
                buffer: resizedBuffer,
                size: resizedBuffer.length
            };
        } catch (error) {
            console.error('❌ Erreur redimensionnement:', error);
            return file; // Retourner le fichier original en cas d'erreur
        }
    }

    /**
     * 📊 GESTION DES QUOTAS ET STATISTIQUES
     */

    /**
     * Obtient les statistiques d'utilisation d'un utilisateur
     */
    async getUserStorageStats(userId) {
        try {
            // Cette fonction devrait interroger la base de données
            // pour obtenir les statistiques d'utilisation
            return {
                totalFiles: 0,
                totalSize: 0,
                gcsFiles: 0,
                gcsSize: 0,
                supabaseFiles: 0,
                supabaseSize: 0,
                quota: 1024 * 1024 * 1024, // 1GB par défaut
                quotaUsed: 0
            };
        } catch (error) {
            console.error('❌ Erreur stats stockage:', error);
            return null;
        }
    }

    /**
     * Vérifie si l'utilisateur peut uploader un fichier
     */
    async canUserUpload(userId, fileSize) {
        try {
            const stats = await this.getUserStorageStats(userId);
            if (!stats) return false;
            
            return (stats.quotaUsed + fileSize) <= stats.quota;
        } catch (error) {
            console.error('❌ Erreur vérification quota:', error);
            return false;
        }
    }
}

// Export singleton
const storageService = new StorageService();
module.exports = storageService;
