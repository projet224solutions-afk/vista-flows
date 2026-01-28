/**
 * Hook unifié pour gérer tous les uploads vers Google Cloud Storage
 * Remplace les uploads vers Supabase Storage
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StorageFolder = 
  | 'avatars' 
  | 'products' 
  | 'videos' 
  | 'audio' 
  | 'documents' 
  | 'stamps' 
  | 'restaurant' 
  | 'digital-products'
  | 'travel'
  | 'misc';

interface UploadOptions {
  folder: StorageFolder;
  subfolder?: string; // Ex: userId, productId, etc.
  onProgress?: (progress: number) => void;
  metadata?: Record<string, string>;
}

interface UploadResult {
  success: boolean;
  publicUrl?: string;
  objectPath?: string;
  error?: string;
}

interface UseStorageUploadReturn {
  uploadFile: (file: File, options: UploadOptions) => Promise<UploadResult>;
  uploadMultipleFiles: (files: File[], options: UploadOptions) => Promise<UploadResult[]>;
  getDownloadUrl: (objectPath: string, expiresInMinutes?: number) => Promise<string | null>;
  isUploading: boolean;
  progress: number;
}

// Types MIME autorisés par catégorie
const ALLOWED_TYPES: Record<StorageFolder, string[]> = {
  avatars: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  products: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  videos: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
  documents: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  stamps: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  restaurant: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  'digital-products': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/zip'],
  travel: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  misc: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
};

// Taille max par catégorie (en bytes)
const MAX_SIZES: Record<StorageFolder, number> = {
  avatars: 10 * 1024 * 1024, // 10 MB
  products: 10 * 1024 * 1024, // 10 MB
  videos: 100 * 1024 * 1024, // 100 MB
  audio: 50 * 1024 * 1024, // 50 MB
  documents: 20 * 1024 * 1024, // 20 MB
  stamps: 2 * 1024 * 1024, // 2 MB
  restaurant: 5 * 1024 * 1024, // 5 MB
  'digital-products': 50 * 1024 * 1024, // 50 MB
  travel: 10 * 1024 * 1024, // 10 MB
  misc: 10 * 1024 * 1024, // 10 MB
};

export function useStorageUpload(): UseStorageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Valide le fichier avant upload
   */
  const validateFile = useCallback((file: File, folder: StorageFolder): { valid: boolean; error?: string } => {
    const allowedTypes = ALLOWED_TYPES[folder];
    const maxSize = MAX_SIZES[folder];

    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}` 
      };
    }

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return { 
        valid: false, 
        error: `Le fichier dépasse la taille maximale de ${maxSizeMB} Mo` 
      };
    }

    return { valid: true };
  }, []);

  /**
   * Upload un fichier vers Google Cloud Storage
   */
  const uploadFile = useCallback(async (
    file: File,
    options: UploadOptions
  ): Promise<UploadResult> => {
    const { folder, subfolder, onProgress } = options;

    // Validation
    const validation = validateFile(file, folder);
    if (!validation.valid) {
      toast.error(validation.error);
      return { success: false, error: validation.error };
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Construire le chemin du dossier
      const folderPath = subfolder ? `${folder}/${subfolder}` : folder;

      // Vérifier si l'utilisateur est authentifié
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[useStorageUpload] Erreur session:', sessionError);
        throw new Error('Erreur de session. Veuillez vous reconnecter.');
      }

      if (!session) {
        console.error('[useStorageUpload] Pas de session active');
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      console.log(`[useStorageUpload] Session valide, user: ${session.user.id}`);

      // Étape 1: Obtenir une URL signée pour l'upload
      console.log(`[useStorageUpload] Requesting signed URL for ${folderPath}/${file.name}`);
      
      const { data: signedUrlData, error: signedUrlError } = await supabase.functions.invoke(
        'gcs-signed-url',
        {
          body: {
            action: 'upload',
            fileName: file.name,
            contentType: file.type,
            folder: folderPath,
            expiresInMinutes: 15,
          },
        }
      );

      if (signedUrlError) {
        console.error('[useStorageUpload] Erreur Edge Function:', signedUrlError);
        throw new Error(signedUrlError?.message || 'Erreur du service d\'upload');
      }

      if (!signedUrlData?.signedUrl) {
        console.error('[useStorageUpload] Pas d\'URL signée retournée:', signedUrlData);
        throw new Error(signedUrlData?.error || 'Échec de l\'obtention de l\'URL d\'upload');
      }

      setProgress(10);
      onProgress?.(10);

      console.log(`[useStorageUpload] Got signed URL, uploading to GCS...`);

      // Étape 2: Upload direct vers GCS via l'URL signée
      const uploadResponse = await fetch(signedUrlData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Échec de l'upload: ${uploadResponse.statusText}`);
      }

      setProgress(80);
      onProgress?.(80);

      console.log(`[useStorageUpload] Upload successful: ${signedUrlData.publicUrl}`);

      // Étape 3: Notifier le backend (optionnel, pour tracking)
      try {
        await supabase.functions.invoke('gcs-upload-complete', {
          body: {
            objectPath: signedUrlData.objectPath,
            fileType: folder,
            metadata: {
              originalName: file.name,
              size: file.size,
              mimeType: file.type,
              ...options.metadata,
            },
          },
        });
      } catch (notifyError) {
        console.warn('[useStorageUpload] Upload notification failed (non-critical):', notifyError);
      }

      setProgress(100);
      onProgress?.(100);

      return {
        success: true,
        publicUrl: signedUrlData.publicUrl,
        objectPath: signedUrlData.objectPath,
      };

    } catch (error: any) {
      console.error('[useStorageUpload] Error:', error);
      toast.error(`Erreur d'upload: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setIsUploading(false);
    }
  }, [validateFile]);

  /**
   * Upload multiple fichiers
   */
  const uploadMultipleFiles = useCallback(async (
    files: File[],
    options: UploadOptions
  ): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadFile(file, {
        ...options,
        onProgress: (fileProgress) => {
          const overallProgress = ((i + fileProgress / 100) / files.length) * 100;
          setProgress(overallProgress);
          options.onProgress?.(overallProgress);
        },
      });
      results.push(result);
    }

    return results;
  }, [uploadFile]);

  /**
   * Obtenir une URL signée pour télécharger un fichier
   */
  const getDownloadUrl = useCallback(async (
    objectPath: string,
    expiresInMinutes: number = 60
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('gcs-signed-url', {
        body: {
          action: 'download',
          fileName: objectPath,
          expiresInMinutes,
        },
      });

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Échec de l\'obtention de l\'URL de téléchargement');
      }

      return data.signedUrl;
    } catch (error: any) {
      console.error('[useStorageUpload] Get download URL error:', error);
      toast.error(`Erreur: ${error.message}`);
      return null;
    }
  }, []);

  return {
    uploadFile,
    uploadMultipleFiles,
    getDownloadUrl,
    isUploading,
    progress,
  };
}

/**
 * Fonction utilitaire pour migrer une URL Supabase vers GCS
 * (utile pour la migration des données existantes)
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes('supabase.co/storage') || url.includes('.supabase.co/storage');
}

/**
 * Fonction pour obtenir l'URL publique GCS
 */
export function getGCSPublicUrl(objectPath: string, bucketName: string = '224solutions'): string {
  return `https://storage.googleapis.com/${bucketName}/${objectPath}`;
}
