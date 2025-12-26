/**
 * Hook pour gérer les uploads vers Google Cloud Storage
 * via les Edge Functions Supabase
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadOptions {
  folder?: string;
  fileType?: 'product' | 'profile' | 'document' | 'other';
  entityId?: string;
  entityType?: string;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  success: boolean;
  publicUrl?: string;
  objectPath?: string;
  error?: string;
}

export function useGCSUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Upload un fichier vers Google Cloud Storage
   */
  const uploadFile = useCallback(async (
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResult> => {
    const { folder = 'uploads', fileType = 'other', entityId, entityType, onProgress } = options;

    setIsUploading(true);
    setProgress(0);

    try {
      // Étape 1: Obtenir une URL signée pour l'upload
      const { data: signedUrlData, error: signedUrlError } = await supabase.functions.invoke(
        'gcs-signed-url',
        {
          body: {
            action: 'upload',
            fileName: file.name,
            contentType: file.type,
            folder,
            expiresInMinutes: 15,
          },
        }
      );

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error(signedUrlError?.message || 'Failed to get upload URL');
      }

      setProgress(10);
      onProgress?.(10);

      // Étape 2: Upload direct vers GCS via l'URL signée
      const uploadResponse = await fetch(signedUrlData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      setProgress(80);
      onProgress?.(80);

      // Étape 3: Notifier le backend que l'upload est terminé
      const { data: completeData, error: completeError } = await supabase.functions.invoke(
        'gcs-upload-complete',
        {
          body: {
            objectPath: signedUrlData.objectPath,
            fileType,
            metadata: {
              originalName: file.name,
              size: file.size,
              mimeType: file.type,
              entityId,
              entityType,
            },
          },
        }
      );

      if (completeError) {
        console.warn('Upload complete notification failed:', completeError);
        // L'upload a quand même réussi, on continue
      }

      setProgress(100);
      onProgress?.(100);

      return {
        success: true,
        publicUrl: signedUrlData.publicUrl,
        objectPath: signedUrlData.objectPath,
      };

    } catch (error: any) {
      console.error('GCS upload error:', error);
      toast.error(`Erreur d'upload: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setIsUploading(false);
    }
  }, []);

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
        throw new Error(error?.message || 'Failed to get download URL');
      }

      return data.signedUrl;
    } catch (error: any) {
      console.error('Get download URL error:', error);
      toast.error(`Erreur: ${error.message}`);
      return null;
    }
  }, []);

  /**
   * Upload multiple fichiers
   */
  const uploadMultipleFiles = useCallback(async (
    files: File[],
    options: UploadOptions = {}
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

  return {
    uploadFile,
    uploadMultipleFiles,
    getDownloadUrl,
    isUploading,
    progress,
  };
}
