/**
 * 🌍 HOOK DE TRADUCTION AUTOMATIQUE DES MESSAGES - 224SOLUTIONS
 * Traduit automatiquement les messages en fonction de la langue préférée de l'utilisateur
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { translationService, SupportedLanguage, SUPPORTED_LANGUAGES } from '@/services/translationService';
import { Message } from '@/types/communication.types';
import { getLanguageForCountry } from '@/data/countryMappings';

interface UseAutoTranslationOptions {
  autoTranslate?: boolean;
  context?: 'general' | 'commerce' | 'delivery' | 'payment' | 'support';
}

interface TranslatedMessage extends Message {
  displayContent: string;
  isTranslated: boolean;
}

export function useAutoTranslation(options: UseAutoTranslationOptions = {}) {
  const { autoTranslate = true, context = 'general' } = options;
  
  const [userLanguage, setUserLanguage] = useState<SupportedLanguage>('fr');
  const [isLoading, setIsLoading] = useState(false);
  const [showOriginalIds, setShowOriginalIds] = useState<Set<string>>(new Set());
  const translationCache = useRef<Map<string, string>>(new Map());
  const pendingTranslations = useRef<Set<string>>(new Set());

  // Charger la langue préférée de l'utilisateur au démarrage
  useEffect(() => {
    const loadUserLanguage = async () => {
      try {
        // D'abord essayer depuis le profil Supabase
        const lang = await translationService.getUserPreferredLanguage();
        setUserLanguage(lang);
        
        // Si pas définie, utiliser la langue détectée par géolocalisation
        if (lang === 'fr') {
          const storedLang = localStorage.getItem('user-language');
          if (storedLang && storedLang in SUPPORTED_LANGUAGES) {
            setUserLanguage(storedLang as SupportedLanguage);
          }
        }
      } catch (error) {
        console.error('[AutoTranslation] Erreur chargement langue:', error);
        // Fallback: utiliser localStorage
        const storedLang = localStorage.getItem('user-language');
        if (storedLang && storedLang in SUPPORTED_LANGUAGES) {
          setUserLanguage(storedLang as SupportedLanguage);
        }
      }
    };
    loadUserLanguage();
  }, []);

  /**
   * Générer une clé de cache unique
   */
  const getCacheKey = useCallback((content: string, targetLang: string): string => {
    return `${content.substring(0, 100)}_${targetLang}`;
  }, []);

  /**
   * Traduire un message unique
   */
  const translateSingleMessage = useCallback(async (
    message: Message,
    targetLanguage: SupportedLanguage
  ): Promise<TranslatedMessage> => {
    // Si le message est déjà traduit dans la bonne langue
    if (
      message.translation_status === 'completed' &&
      message.translated_content &&
      message.target_language === targetLanguage
    ) {
      return {
        ...message,
        displayContent: message.translated_content,
        isTranslated: true
      };
    }

    // Détecter si la langue source est la même que la cible
    const detectedLang = translationService.detectLanguage(message.content);
    if (detectedLang === targetLanguage) {
      return {
        ...message,
        displayContent: message.content,
        isTranslated: false
      };
    }

    // Vérifier le cache
    const cacheKey = getCacheKey(message.content, targetLanguage);
    if (translationCache.current.has(cacheKey)) {
      return {
        ...message,
        displayContent: translationCache.current.get(cacheKey)!,
        isTranslated: true
      };
    }

    // Éviter les traductions en double
    if (pendingTranslations.current.has(message.id)) {
      return {
        ...message,
        displayContent: message.content,
        isTranslated: false
      };
    }

    // Marquer comme en cours
    pendingTranslations.current.add(message.id);

    try {
      const result = await translationService.translateMessage({
        content: message.content,
        sourceLanguage: detectedLang,
        targetLanguage,
        messageId: message.id,
        context
      });

      // Mettre en cache
      if (result.wasTranslated) {
        translationCache.current.set(cacheKey, result.translatedContent);
      }

      return {
        ...message,
        displayContent: result.translatedContent,
        isTranslated: result.wasTranslated,
        translated_content: result.translatedContent,
        original_language: result.sourceLanguage,
        target_language: targetLanguage,
        translation_status: result.wasTranslated ? 'completed' : 'none'
      };
    } catch (error) {
      console.error('[AutoTranslation] Erreur traduction:', error);
      return {
        ...message,
        displayContent: message.content,
        isTranslated: false
      };
    } finally {
      pendingTranslations.current.delete(message.id);
    }
  }, [context, getCacheKey]);

  /**
   * Traduire un tableau de messages
   */
  const translateMessages = useCallback(async (
    messages: Message[]
  ): Promise<TranslatedMessage[]> => {
    if (!autoTranslate || messages.length === 0) {
      return messages.map(msg => ({
        ...msg,
        displayContent: msg.content,
        isTranslated: false
      }));
    }

    setIsLoading(true);
    
    try {
      // Filtrer les messages qui ont besoin de traduction
      const needsTranslation = messages.filter(msg => {
        const detectedLang = translationService.detectLanguage(msg.content);
        return detectedLang !== userLanguage && 
               msg.translation_status !== 'completed' ||
               msg.target_language !== userLanguage;
      });

      // Traduire en parallèle par batch
      const batchSize = 5;
      const results: TranslatedMessage[] = [];

      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const translatedBatch = await Promise.all(
          batch.map(msg => translateSingleMessage(msg, userLanguage))
        );
        results.push(...translatedBatch);
      }

      return results;
    } finally {
      setIsLoading(false);
    }
  }, [autoTranslate, userLanguage, translateSingleMessage]);

  /**
   * Obtenir le contenu à afficher pour un message
   */
  const getDisplayContent = useCallback((message: Message): string => {
    // Si l'utilisateur veut voir l'original
    if (showOriginalIds.has(message.id)) {
      return message.content;
    }

    // Si une traduction est disponible
    if (
      message.translation_status === 'completed' &&
      message.translated_content &&
      message.target_language === userLanguage
    ) {
      return message.translated_content;
    }

    // Vérifier le cache
    const cacheKey = getCacheKey(message.content, userLanguage);
    if (translationCache.current.has(cacheKey)) {
      return translationCache.current.get(cacheKey)!;
    }

    return message.display_content || message.content;
  }, [showOriginalIds, userLanguage, getCacheKey]);

  /**
   * Vérifier si un message est traduit
   */
  const isTranslated = useCallback((message: Message): boolean => {
    if (showOriginalIds.has(message.id)) {
      return false;
    }

    // Détecter la langue source
    const detectedLang = translationService.detectLanguage(message.content);
    if (detectedLang === userLanguage) {
      return false;
    }

    return (
      message.translation_status === 'completed' &&
      message.translated_content !== null &&
      message.target_language === userLanguage
    ) || translationCache.current.has(getCacheKey(message.content, userLanguage));
  }, [showOriginalIds, userLanguage, getCacheKey]);

  /**
   * Afficher l'original d'un message
   */
  const showOriginal = useCallback((messageId: string) => {
    setShowOriginalIds(prev => new Set(prev).add(messageId));
  }, []);

  /**
   * Cacher l'original (revenir à la traduction)
   */
  const hideOriginal = useCallback((messageId: string) => {
    setShowOriginalIds(prev => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  }, []);

  /**
   * Vérifier si on affiche l'original
   */
  const isShowingOriginal = useCallback((messageId: string): boolean => {
    return showOriginalIds.has(messageId);
  }, [showOriginalIds]);

  /**
   * Mettre à jour la langue préférée
   */
  const updateUserLanguage = useCallback(async (lang: SupportedLanguage): Promise<boolean> => {
    setIsLoading(true);
    try {
      const success = await translationService.setUserPreferredLanguage(lang);
      if (success) {
        setUserLanguage(lang);
        localStorage.setItem('user-language', lang);
        // Vider le cache car on change de langue
        translationCache.current.clear();
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Vider le cache de traduction
   */
  const clearCache = useCallback(() => {
    translationCache.current.clear();
  }, []);

  return {
    userLanguage,
    updateUserLanguage,
    translateMessages,
    translateSingleMessage,
    getDisplayContent,
    isTranslated,
    showOriginal,
    hideOriginal,
    isShowingOriginal,
    isLoading,
    clearCache,
    supportedLanguages: SUPPORTED_LANGUAGES
  };
}

export default useAutoTranslation;
