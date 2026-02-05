/**
 * 🌍 SERVICE DE TRADUCTION - 224SOLUTIONS
 * Traduction automatique des messages entre utilisateurs de langues différentes
 */

import { supabase } from '@/integrations/supabase/client';

// Langues supportées - Liste complète pour tous les pays
export const SUPPORTED_LANGUAGES = {
  // Langues européennes
  fr: 'Français',
  en: 'English',
  es: 'Español',
  pt: 'Português',
  de: 'Deutsch',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  ru: 'Русский',
  uk: 'Українська',
  ro: 'Română',
  el: 'Ελληνικά',
  tr: 'Türkçe',
  cs: 'Čeština',
  sv: 'Svenska',
  da: 'Dansk',
  fi: 'Suomi',
  no: 'Norsk',
  hu: 'Magyar',
  
  // Langues africaines
  ar: 'العربية',
  sw: 'Kiswahili',
  wo: 'Wolof',
  ha: 'Hausa',
  bm: 'Bambara',
  ff: 'Fulfulde',
  yo: 'Yorùbá',
  ig: 'Igbo',
  am: 'አማርኛ',
  zu: 'isiZulu',
  xh: 'isiXhosa',
  af: 'Afrikaans',
  rw: 'Kinyarwanda',
  sn: 'Shona',
  
  // Langues asiatiques
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  tl: 'Tagalog',
  
  // Autres
  he: 'עברית'
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
   * Détecter la langue d'un texte (heuristique améliorée)
   */
  detectLanguage(text: string): SupportedLanguage {
    // Scripts non-latins
    if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return 'ar'; // Arabe
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'; // Chinois
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja'; // Japonais (Hiragana/Katakana)
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'; // Coréen
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi (Devanagari)
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th'; // Thaï
    if (/[\u0590-\u05FF]/.test(text)) return 'he'; // Hébreu
    if (/[\u0400-\u04FF]/.test(text)) return 'ru'; // Cyrillique (russe par défaut)
    if (/[\u1200-\u137F]/.test(text)) return 'am'; // Amharique (Éthiopien)
    if (/[\u1E00-\u1EFF]/.test(text) && /\b(và|của|là|một)\b/i.test(text)) return 'vi'; // Vietnamien
    
    // Langues latines - basées sur des caractères/mots spécifiques
    const lowerText = text.toLowerCase();
    
    // Français - caractères accentués et mots communs
    if (/[àâäéèêëïîôùûüç]/i.test(text) && !/[ãõ]/i.test(text)) {
      if (/\b(le|la|les|un|une|de|du|des|et|est|je|tu|il|elle|nous|vous|ils|elles|que|qui|dans|pour|avec|sur|pas|plus|bien|très|tout|cette|son|sa|ses|mais|ou|où|comme|aussi|encore|même)\b/i.test(lowerText)) {
        return 'fr';
      }
    }
    
    // Espagnol
    if (/[áéíóúñ¿¡]/i.test(text)) {
      if (/\b(el|la|los|las|un|una|de|del|en|que|es|no|se|con|por|para|su|sus|como|pero|más|este|esta|muy)\b/i.test(lowerText)) {
        return 'es';
      }
    }
    
    // Portugais
    if (/[ãõç]/i.test(text) && /\b(o|a|os|as|um|uma|de|do|da|em|que|é|não|se|com|para|seu|sua|como|mas|mais|este|esta|muito)\b/i.test(lowerText)) {
      return 'pt';
    }
    
    // Allemand
    if (/[äöüß]/i.test(text) && /\b(der|die|das|und|ist|von|für|mit|auf|nicht|ein|eine|sich|auch|es|ich|du|wir|sie)\b/i.test(lowerText)) {
      return 'de';
    }
    
    // Italien
    if (/[àèéìòù]/i.test(text) && /\b(il|la|lo|le|gli|un|una|di|del|che|è|non|per|con|su|sono|essere|questo|questa|molto)\b/i.test(lowerText)) {
      return 'it';
    }
    
    // Néerlandais
    if (/\b(de|het|een|van|en|in|is|dat|op|te|zijn|voor|met|niet|ook|aan|naar|maar|dan|als|er|wel)\b/i.test(lowerText) && /ij|oe|ui|eu/i.test(text)) {
      return 'nl';
    }
    
    // Polonais
    if (/[ąćęłńóśźż]/i.test(text)) {
      return 'pl';
    }
    
    // Turc
    if (/[ğışöüç]/i.test(text) && /\b(ve|bir|bu|için|ile|da|de|mi|ne|var|yok|ben|sen|o|biz|siz|onlar)\b/i.test(lowerText)) {
      return 'tr';
    }
    
    // Swahili
    if (/\b(na|ya|wa|ni|kwa|hakuna|sana|mimi|wewe|yeye|sisi|nyinyi|wao|ndiyo|hapana|asante|karibu)\b/i.test(lowerText)) {
      return 'sw';
    }
    
    // Langues africaines ouest-africaines (détection basique)
    if (/\b(dafa|ndax|nit|benn|am|nii|wax)\b/i.test(lowerText)) return 'wo'; // Wolof
    if (/\b(shi|ya|da|ba|na|mai|yana|suna|gida|ruwa)\b/i.test(lowerText)) return 'ha'; // Hausa
    if (/\b(ewo|ihe|onye|ndi|gi|ya|ka|na|si|di|bu)\b/i.test(lowerText)) return 'ig'; // Igbo
    if (/\b(emi|iwo|oun|wa|ti|si|ni|ko|mo|se)\b/i.test(lowerText)) return 'yo'; // Yoruba
    
    // Bahasa Indonesia/Malay
    if (/\b(dan|yang|di|ini|itu|dengan|untuk|pada|tidak|dari|akan|saya|anda|mereka|bisa|ada|sudah|juga|atau|tetapi)\b/i.test(lowerText)) {
      return 'id';
    }
    
    // Défaut: anglais pour les textes non identifiés
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
