/**
 * 🎙️ HOOK D'ENVOI DE MESSAGE VOCAL AVEC TRADUCTION AUTOMATIQUE
 * Envoie un message vocal et déclenche automatiquement la traduction
 * si l'expéditeur et le destinataire ont des langues différentes
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { autoConvertIfNeeded, needsConversionForIOS, isIOS } from '@/services/AudioConversionService';
import { audioTranslationService } from '@/services/audioTranslationService';
import { useToast } from '@/hooks/use-toast';

interface VoiceMessageOptions {
  conversationId?: string;
  recipientId?: string;
  senderId: string;
  additionalMetadata?: Record<string, any>;
}

interface SendVoiceMessageResult {
  success: boolean;
  messageId?: string;
  audioUrl?: string;
  needsTranslation?: boolean;
  error?: string;
}

export function useVoiceMessageWithTranslation() {
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');
  const { toast } = useToast();

  /**
   * Envoi d'un message vocal avec traduction automatique
   */
  const sendVoiceMessage = useCallback(async (
    audioBlob: Blob,
    options: VoiceMessageOptions
  ): Promise<SendVoiceMessageResult> => {
    setIsSending(true);
    setTranslationStatus('idle');

    try {
      const { senderId, recipientId, conversationId, additionalMetadata } = options;

      // 1. Détecter le format audio depuis le blob
      const blobMimeType = audioBlob.type || 'audio/webm';
      console.log('🎙️ Audio blob MIME type:', blobMimeType);
      
      // Déterminer le format et l'extension depuis le MIME type
      let audioFormat = 'webm';
      let mimeType = blobMimeType;
      
      if (blobMimeType.includes('mp4') || blobMimeType.includes('m4a')) {
        audioFormat = 'mp4';
        mimeType = 'audio/mp4';
      } else if (blobMimeType.includes('aac')) {
        audioFormat = 'aac';
        mimeType = 'audio/aac';
      } else if (blobMimeType.includes('wav')) {
        audioFormat = 'wav';
        mimeType = 'audio/wav';
      } else if (blobMimeType.includes('webm') || blobMimeType.includes('opus')) {
        audioFormat = 'webm';
        mimeType = 'audio/webm';
      }

      // 2. Upload vers Supabase Storage - utiliser le bucket communication-files
      const fileName = `voice-${senderId}-${Date.now()}.${audioFormat}`;
      const filePath = `audio/${fileName}`;

      console.log('🎙️ Uploading voice message to storage...', { filePath, mimeType, audioFormat });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('communication-files')
        .upload(filePath, audioBlob, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Storage upload failed:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ Upload successful:', uploadData);

      // 3. Obtenir l'URL publique
      const { data: publicUrlData } = supabase.storage
        .from('communication-files')
        .getPublicUrl(filePath);
      
      const audioUrl = publicUrlData.publicUrl;
      console.log('🔗 Audio URL:', audioUrl);

      // 4. Vérifier si la traduction est nécessaire
      let needsTranslation = false;
      if (recipientId && recipientId !== senderId) {
        needsTranslation = await audioTranslationService.needsAudioTranslation(senderId, recipientId);
        if (needsTranslation) {
          setTranslationStatus('pending');
        }
      }

      // 5. Insérer le message dans la base de données
      const messageData: any = {
        sender_id: senderId,
        recipient_id: recipientId || senderId, // recipient_id est requis
        type: 'audio',
        content: '🎙️ Message vocal', // Content requis pour les messages
        file_url: audioUrl,
        file_name: fileName,
        audio_format: audioFormat,
        audio_mime_type: mimeType,
        status: 'sent',
        ...(conversationId && { conversation_id: conversationId }),
        ...additionalMetadata
      };

      // Si c'est un format iOS, définir aussi file_url_ios
      if (audioFormat === 'm4a' || audioFormat === 'mp4') {
        messageData.file_url_ios = audioUrl;
        messageData.audio_format_ios = audioFormat;
      }

      console.log('📝 Inserting message:', messageData);

      const { data: insertedMessage, error: insertError } = await supabase
        .from('messages')
        .insert(messageData)
        .select('id, audio_translation_status')
        .single();

      if (insertError) {
        console.error('❌ Message insert failed:', insertError);
        throw new Error(`Message insert failed: ${insertError.message}`);
      }

      console.log('✅ Message inserted:', insertedMessage);

      // 6. Le webhook va être déclenché automatiquement par le trigger SQL
      // si audio_translation_status = 'pending'

      console.log('✅ Voice message sent:', {
        messageId: insertedMessage.id,
        needsTranslation,
        translationStatus: insertedMessage.audio_translation_status
      });

      // 7. Si la traduction est nécessaire et le webhook n'est pas configuré,
      // déclencher manuellement la traduction en arrière-plan
      if (insertedMessage.audio_translation_status === 'pending') {
        triggerManualTranslation(insertedMessage.id, audioUrl, senderId, recipientId);
      }

      return {
        success: true,
        messageId: insertedMessage.id,
        audioUrl,
        needsTranslation
      };

    } catch (error: any) {
      console.error('❌ Voice message send error:', error);
      setTranslationStatus('failed');
      
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message vocal",
        variant: "destructive"
      });

      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsSending(false);
    }
  }, [toast]);

  /**
   * Déclencher manuellement la traduction si le webhook n'est pas configuré
   */
  const triggerManualTranslation = async (
    messageId: string,
    audioUrl: string,
    senderId: string,
    recipientId?: string
  ) => {
    try {
      // Obtenir les langues des utilisateurs
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, preferred_language')
        .in('id', [senderId, recipientId].filter(Boolean) as string[]);

      if (!profiles || profiles.length < 2) return;

      const senderLang = profiles.find(p => p.id === senderId)?.preferred_language || 'fr';
      const recipientLang = profiles.find(p => p.id === recipientId)?.preferred_language || 'fr';

      if (senderLang === recipientLang) return;

      console.log('🎙️ Triggering manual translation...');

      // Appeler l'Edge Function de traduction
      const { data, error } = await supabase.functions.invoke('translate-audio', {
        body: {
          audioUrl,
          messageId,
          sourceLanguage: senderLang,
          targetLanguage: recipientLang
        }
      });

      if (error) {
        console.error('Manual translation error:', error);
        setTranslationStatus('failed');
      } else {
        setTranslationStatus('completed');
        console.log('✅ Manual translation completed:', data);
      }

    } catch (error) {
      console.error('Manual translation error:', error);
      setTranslationStatus('failed');
    }
  };

  /**
   * Écouter les mises à jour de traduction en temps réel
   */
  const subscribeToTranslationStatus = useCallback((
    messageId: string,
    onStatusChange: (status: string, data?: any) => void
  ) => {
    const channel = supabase
      .channel(`translation-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `id=eq.${messageId}`
        },
        (payload) => {
          const newStatus = payload.new.audio_translation_status;
          onStatusChange(newStatus, {
            transcribedText: payload.new.transcribed_text,
            translatedText: payload.new.translated_text,
            translatedAudioUrl: payload.new.translated_audio_url
          });

          if (newStatus === 'completed' || newStatus === 'text_only') {
            setTranslationStatus('completed');
          } else if (newStatus === 'failed') {
            setTranslationStatus('failed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    sendVoiceMessage,
    subscribeToTranslationStatus,
    isSending,
    isRecording,
    setIsRecording,
    translationStatus
  };
}

export default useVoiceMessageWithTranslation;
