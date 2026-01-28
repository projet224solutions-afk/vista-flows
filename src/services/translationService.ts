/**
 * 🌍 SERVICE DE TRADUCTION - 224SOLUTIONS
 * Traduction automatique des messages entre utilisateurs de langues différentes
 */

import { supabase } from '@/integrations/supabase/client';

// Langues supportées
export const SUPPORTED_LANGUAGES = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
  es: 'Español',
  pt: 'Português',
  de: 'Deutsch',
  it: 'Italiano',
  sw: 'Kiswahili',
  wo: 'Wolof',
  ha: 'Hausa',
  bm: 'Bambara',
  ff: 'Fulfulde',
  yo: 'Yorùbá',
  ig: 'Igbo'
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

export interface TranslationResult {
  translatedContent: string;
  originalContent: string;
  sourceLanguage: string;
  targetLanguage: string;
  wasTranslated: boolean;
}

export interface TranslationRequest {
  content: string;
  sourceLanguage?: string;
  targetLanguage: string;
  messageId?: string;
  context?: 'general' | 'commerce' | 'delivery' | 'payment' | 'support';
}

class TranslationService {
  private static instance: TranslationService;
  private translationCache: Map<string, TranslationResult> = new Map();
  private pendingTranslations: Map<string, Promise<TranslationResult>> = new Map();

  private constructor() {}

  static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  /**
   * Obtenir la langue préférée de l'utilisateur actuel
   */
  async getUserPreferredLanguage(): Promise<SupportedLanguage> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'fr';

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .single();

      return (profile?.preferred_language as SupportedLanguage) || 'fr';
    } catch (error) {
      console.error('Erreur récupération langue préférée:', error);
      return 'fr';
    }
  }

  /**
   * Définir la langue préférée de l'utilisateur
   */
  async setUserPreferredLanguage(language: SupportedLanguage): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language })
        .eq('id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur mise à jour langue préférée:', error);
      return false;
    }
  }

  /**
   * Obtenir la langue préférée d'un utilisateur spécifique
   */
  async getRecipientLanguage(recipientId: string): Promise<SupportedLanguage> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', recipientId)
        .single();

      return (profile?.preferred_language as SupportedLanguage) || 'fr';
    } catch (error) {
      console.error('Erreur récupération langue destinataire:', error);
      return 'fr';
    }
  }

  /**
   * Générer une clé de cache unique
   */
  private getCacheKey(content: string, targetLanguage: string): string {
    return `${content.substring(0, 100)}_${targetLanguage}`;
  }

  /**
   * Traduire un message
   */
  async translateMessage(request: TranslationRequest): Promise<TranslationResult> {
    const { content, sourceLanguage, targetLanguage, messageId, context = 'general' } = request;

    // Vérifier le cache
    const cacheKey = this.getCacheKey(content, targetLanguage);
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey)!;
    }

    // Éviter les traductions en double
    if (this.pendingTranslations.has(cacheKey)) {
      return this.pendingTranslations.get(cacheKey)!;
    }

    // Si même langue, retourner sans traduire
    if (sourceLanguage === targetLanguage) {
      return {
        translatedContent: content,
        originalContent: content,
        sourceLanguage: sourceLanguage || 'auto',
        targetLanguage,
        wasTranslated: false
      };
    }

    // Lancer la traduction
    const translationPromise = this.performTranslation(content, sourceLanguage, targetLanguage, messageId, context);
    this.pendingTranslations.set(cacheKey, translationPromise);

    try {
      const result = await translationPromise;
      this.translationCache.set(cacheKey, result);
      
      // Limiter la taille du cache
      if (this.translationCache.size > 500) {
        const firstKey = this.translationCache.keys().next().value;
        if (firstKey) this.translationCache.delete(firstKey);
      }
      
      return result;
    } finally {
      this.pendingTranslations.delete(cacheKey);
    }
  }

  /**
   * Effectuer la traduction via l'Edge Function
   */
  private async performTranslation(
    content: string,
    sourceLanguage: string | undefined,
    targetLanguage: string,
    messageId?: string,
    context?: string
  ): Promise<TranslationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: {
          content,
          sourceLanguage,
          targetLanguage,
          messageId,
          context
        }
      });

      if (error) throw error;

      return {
        translatedContent: data.translatedContent || content,
        originalContent: content,
        sourceLanguage: data.sourceLanguage || sourceLanguage || 'auto',
        targetLanguage,
        wasTranslated: data.wasTranslated || false
      };
    } catch (error) {
      console.error('Erreur traduction:', error);
      // En cas d'erreur, retourner le contenu original
      return {
        translatedContent: content,
        originalContent: content,
        sourceLanguage: sourceLanguage || 'auto',
        targetLanguage,
        wasTranslated: false
      };
    }
  }

  /**
   * Traduire plusieurs messages en batch
   */
  async translateMessages(
    messages: Array<{ id: string; content: string; sourceLanguage?: string }>,
    targetLanguage: string,
    context?: 'general' | 'commerce' | 'delivery' | 'payment' | 'support'
  ): Promise<Map<string, TranslationResult>> {
    const results = new Map<string, TranslationResult>();
    
    // Traduire en parallèle avec limitation
    const batchSize = 5;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const translations = await Promise.all(
        batch.map(msg => this.translateMessage({
          content: msg.content,
          sourceLanguage: msg.sourceLanguage,
          targetLanguage,
          messageId: msg.id,
          context
        }))
      );
      
      batch.forEach((msg, idx) => {
        results.set(msg.id, translations[idx]);
      });
    }
    
    return results;
  }

  /**
   * Vérifier si une traduction est nécessaire
   */
  async needsTranslation(senderId: string, recipientId: string): Promise<boolean> {
    try {
      const [senderLang, recipientLang] = await Promise.all([
        this.getRecipientLanguage(senderId),
        this.getRecipientLanguage(recipientId)
      ]);
      
      return senderLang !== recipientLang;
    } catch (error) {
      return false;
    }
  }

  /**
   * Détecter la langue d'un texte (heuristique simple)
   */
  detectLanguage(text: string): SupportedLanguage {
    // Arabe
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    // Français (accents spécifiques)
    if (/[àâäéèêëïîôùûüç]/i.test(text) && !/[ãõ]/i.test(text)) return 'fr';
    // Espagnol
    if (/[áéíóúñ¿¡]/i.test(text)) return 'es';
    // Portugais
    if (/[ãõç]/i.test(text)) return 'pt';
    // Allemand
    if (/[äöüß]/i.test(text)) return 'de';
    // Italien
    if (/[àèéìòù]/i.test(text) && /\b(che|non|per|con)\b/i.test(text)) return 'it';
    // Défaut: anglais
    return 'en';
  }

  /**
   * Vider le cache de traduction
   */
  clearCache(): void {
    this.translationCache.clear();
  }
}

// Export singleton
export const translationService = TranslationService.getInstance();

// Export helper functions
export const translateMessage = (request: TranslationRequest) => 
  translationService.translateMessage(request);

export const getUserLanguage = () => 
  translationService.getUserPreferredLanguage();

export const setUserLanguage = (language: SupportedLanguage) => 
  translationService.setUserPreferredLanguage(language);

export const needsTranslation = (senderId: string, recipientId: string) =>
  translationService.needsTranslation(senderId, recipientId);
