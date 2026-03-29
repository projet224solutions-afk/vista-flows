/**
 * 🎥 SERVICE D'ENREGISTREMENT AUTOMATIQUE SOS
 * Démarre automatiquement enregistrement audio/vidéo lors déclenchement SOS
 * Upload automatique vers Supabase Storage
 */

import { supabase } from '@/integrations/supabase/client';

interface RecordingConfig {
  audio: boolean;
  video: boolean;
  videoBitrate?: number;
  audioBitrate?: number;
}

interface RecordingData {
  sosId: string;
  startTime: number;
  mediaStream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  recordedChunks: Blob[];
  duration: number;
}

export class SOSMediaRecorder {
  private static instance: SOSMediaRecorder;
  private activeRecordings: Map<string, RecordingData> = new Map();
  private readonly DEFAULT_CONFIG: RecordingConfig = {
    audio: true,
    video: true,
    videoBitrate: 2500000, // 2.5 Mbps
    audioBitrate: 128000   // 128 kbps
  };

  private constructor() {}

  public static getInstance(): SOSMediaRecorder {
    if (!SOSMediaRecorder.instance) {
      SOSMediaRecorder.instance = new SOSMediaRecorder();
    }
    return SOSMediaRecorder.instance;
  }

  /**
   * 🚨 Démarre enregistrement automatique lors SOS
   */
  public async startSOSRecording(
    sosId: string,
    config: Partial<RecordingConfig> = {}
  ): Promise<boolean> {
    try {
      console.log('🎬 Démarrage enregistrement SOS automatique...', sosId);

      // Vérifier si enregistrement déjà actif pour ce SOS
      if (this.activeRecordings.has(sosId)) {
        console.warn('⚠️ Enregistrement déjà actif pour ce SOS');
        return true;
      }

      const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

      // 1. Demander permissions média
      const constraints: MediaStreamConstraints = {
        audio: finalConfig.audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        } : false,
        video: finalConfig.video ? {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'environment' // Caméra arrière par défaut
        } : false
      };

      console.log('📹 Demande permissions:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Permissions accordées, stream obtenu');

      // 2. Créer MediaRecorder avec options optimales
      const options: MediaRecorderOptions = {
        mimeType: this.getSupportedMimeType(),
        videoBitsPerSecond: finalConfig.videoBitrate,
        audioBitsPerSecond: finalConfig.audioBitrate
      };

      const mediaRecorder = new MediaRecorder(mediaStream, options);
      const recordedChunks: Blob[] = [];

      // 3. Gérer événements enregistrement
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
          console.log(`📦 Chunk enregistré: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('⏹️ Enregistrement arrêté, upload en cours...');
        await this.uploadRecording(sosId, recordedChunks, finalConfig);
        
        // Nettoyer stream
        mediaStream.getTracks().forEach(track => track.stop());
        this.activeRecordings.delete(sosId);
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ Erreur MediaRecorder:', event);
        mediaStream.getTracks().forEach(track => track.stop());
        this.activeRecordings.delete(sosId);
      };

      // 4. Démarrer enregistrement
      mediaRecorder.start(1000); // Chunk toutes les 1 secondes
      console.log('🔴 Enregistrement démarré!');

      // 5. Stocker état enregistrement
      this.activeRecordings.set(sosId, {
        sosId,
        startTime: Date.now(),
        mediaStream,
        mediaRecorder,
        recordedChunks,
        duration: 0
      });

      // 6. Notification visuelle
      this.showRecordingIndicator(sosId);

      return true;

    } catch (error: any) {
      console.error('❌ Erreur démarrage enregistrement SOS:', error);
      
      // Gestion erreurs permissions
      if (error.name === 'NotAllowedError') {
        console.error('⛔ Permissions média refusées par utilisateur');
      } else if (error.name === 'NotFoundError') {
        console.error('📷 Aucun périphérique audio/vidéo trouvé');
      } else if (error.name === 'NotReadableError') {
        console.error('🔒 Périphérique déjà utilisé par autre application');
      }

      return false;
    }
  }

  /**
   * ⏹️ Arrête enregistrement SOS
   */
  public stopSOSRecording(sosId: string): void {
    const recording = this.activeRecordings.get(sosId);
    if (!recording) {
      console.warn('⚠️ Aucun enregistrement actif pour ce SOS');
      return;
    }

    console.log('⏹️ Arrêt enregistrement SOS:', sosId);
    recording.duration = Date.now() - recording.startTime;
    
    if (recording.mediaRecorder && recording.mediaRecorder.state !== 'inactive') {
      recording.mediaRecorder.stop();
    }

    this.hideRecordingIndicator(sosId);
  }

  /**
   * 📤 Upload enregistrement vers Supabase Storage
   */
  private async uploadRecording(
    sosId: string,
    chunks: Blob[],
    config: RecordingConfig
  ): Promise<void> {
    try {
      if (chunks.length === 0) {
        console.warn('⚠️ Aucune donnée à uploader');
        return;
      }

      console.log(`📤 Upload ${chunks.length} chunks...`);

      // 1. Créer blob final
      const mimeType = this.getSupportedMimeType();
      const blob = new Blob(chunks, { type: mimeType });
      const extension = this.getFileExtension(mimeType);
      const fileName = `sos-${sosId}-${Date.now()}.${extension}`;

      console.log(`📁 Fichier: ${fileName}, Taille: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

      // 2. Upload vers Supabase Storage - bucket sos-recordings
      const { data, error } = await supabase.storage
        .from('sos-recordings')
        .upload(`recordings/${fileName}`, blob, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Erreur upload storage:', error);
        // Fallback vers le bucket documents si sos-recordings échoue
        const fallbackResult = await supabase.storage
          .from('documents')
          .upload(`sos-media/${sosId}/${fileName}`, blob, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: true
          });
        
        if (fallbackResult.error) {
          throw fallbackResult.error;
        }
        console.log('✅ Upload réussi (fallback documents):', fallbackResult.data?.path);
        
        const { data: fallbackUrl } = supabase.storage
          .from('documents')
          .getPublicUrl(`sos-media/${sosId}/${fileName}`);
        
        // Mettre à jour sos_alerts avec l'URL
        await supabase
          .from('sos_alerts')
          .update({
            recording_url: fallbackUrl.publicUrl,
            recording_stopped_at: new Date().toISOString()
          })
          .eq('id', sosId);
        
        return;
      }

      console.log('✅ Upload réussi:', data.path);

      // 3. Obtenir URL publique
      const { data: urlData } = supabase.storage
        .from('sos-recordings')
        .getPublicUrl(data.path);

      // 4. Sauvegarder l'URL dans sos_alerts
      const { error: updateError } = await supabase
        .from('sos_alerts')
        .update({
          recording_url: urlData.publicUrl,
          recording_stopped_at: new Date().toISOString()
        })
        .eq('id', sosId);

      if (updateError) {
        console.error('❌ Erreur mise à jour SOS avec URL:', updateError);
      } else {
        console.log('✅ SOS mis à jour avec URL enregistrement:', urlData.publicUrl);
      }

      // 5. Enregistrer aussi dans sos_media pour l'historique
      try {
        await (supabase as any)
          .from('sos_media')
          .insert({
            sos_alert_id: sosId,
            media_type: config.video ? 'video' : 'audio',
            file_path: data.path,
            file_url: urlData.publicUrl,
            file_size_bytes: blob.size,
            duration_seconds: Math.round((Date.now() - (this.activeRecordings.get(sosId)?.startTime || Date.now())) / 1000),
            created_at: new Date().toISOString()
          });
        console.log('✅ Entrée sos_media créée');
      } catch (mediaError) {
        console.warn('⚠️ Erreur création sos_media:', mediaError);
      }

    } catch (error) {
      console.error('❌ Erreur upload enregistrement:', error);
    }
  }

  /**
   * 🎯 Détermine MIME type supporté
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('✅ MIME type supporté:', type);
        return type;
      }
    }

    return 'video/webm'; // Fallback
  }

  /**
   * 📄 Obtient extension fichier
   */
  private getFileExtension(mimeType: string): string {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'webm';
  }

  /**
   * 🔴 Affiche indicateur enregistrement
   */
  private showRecordingIndicator(sosId: string): void {
    // Créer indicateur visuel
    const indicator = document.createElement('div');
    indicator.id = `recording-indicator-${sosId}`;
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      font-weight: bold;
      font-size: 14px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      animation: pulse 2s infinite;
    `;
    indicator.innerHTML = `
      <span style="width: 12px; height: 12px; background: white; border-radius: 50%; animation: blink 1s infinite;"></span>
      ENREGISTREMENT EN COURS
    `;

    // Ajouter animations CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(indicator);
  }

  /**
   * ⚪ Cache indicateur enregistrement
   */
  private hideRecordingIndicator(sosId: string): void {
    const indicator = document.getElementById(`recording-indicator-${sosId}`);
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * 📊 Obtient état enregistrement
   */
  public getRecordingState(sosId: string): RecordingData | null {
    return this.activeRecordings.get(sosId) || null;
  }

  /**
   * 🔍 Vérifie si enregistrement actif
   */
  public isRecording(sosId: string): boolean {
    const recording = this.activeRecordings.get(sosId);
    return recording?.mediaRecorder?.state === 'recording';
  }

  /**
   * 🧹 Nettoie tous les enregistrements
   */
  public cleanup(): void {
    this.activeRecordings.forEach((recording, sosId) => {
      this.stopSOSRecording(sosId);
    });
    this.activeRecordings.clear();
  }
}

export const sosMediaRecorder = SOSMediaRecorder.getInstance();
