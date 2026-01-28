/**
 * 🎙️ HOOK D'ENVOI DE MESSAGE VOCAL AVEC TRADUCTION AUTOMATIQUE
 * Envoie un message vocal et déclenche automatiquement la traduction
 * si l'expéditeur et le destinataire ont des langues différentes
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { audioConversionService } from '@/services/AudioConversionService';
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

      // 1. Convertir l'audio pour iOS si nécessaire
      console.log('🎙️ Converting audio for compatibility...');
      const conversionResult = await audioConversionService.convertAudioForIOS(audioBlob);
      
      const audioToUpload = conversionResult.convertedBlob || audioBlob;
      const audioFormat = conversionResult.format || 'webm';
      const mimeType = audioFormat === 'm4a' ? 'audio/mp4' : 'audio/webm';

      // 2. Upload vers Supabase Storage
      const fileName = `voice-${senderId}-${Date.now()}.${audioFormat}`;
      const filePath = `voice-messages/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, audioToUpload, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 3. Obtenir l'URL publique
      const { data: publicUrlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(filePath);
      
      const audioUrl = publicUrlData.publicUrl;

      // 4. Vérifier si la traduction est nécessaire
      let needsTranslation = false;
      if (recipientId && recipientId !== senderId) {
        needsTranslation = await audioTranslationService.needsAudioTranslation(senderId, recipientId);
        if (needsTranslation) {
          setTranslationStatus('pending');
        }
      }

      // 5. Insérer le message dans la base de données
      // Le trigger SQL va automatiquement définir les langues et le statut de traduction
      const messageData: any = {
        sender_id: senderId,
        type: 'audio',
        file_url: audioUrl,
        audio_format: audioFormat,
        // Les colonnes suivantes seront définies par le trigger:
        // - original_language (langue du sender)
        // - target_language (langue du recipient)
        // - audio_translation_status ('pending' si langues différentes)
        ...(conversationId && { conversation_id: conversationId }),
        ...(recipientId && { receiver_id: recipientId }),
        ...additionalMetadata
      };

      // Si c'est un format iOS, définir aussi file_url_ios
      if (audioFormat === 'm4a' || audioFormat === 'mp4') {
        messageData.file_url_ios = audioUrl;
      }

      const { data: insertedMessage, error: insertError } = await supabase
        .from('messages')
        .insert(messageData)
        .select('id, audio_translation_status')
        .single();

      if (insertError) {
        throw new Error(`Message insert failed: ${insertError.message}`);
      }

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
