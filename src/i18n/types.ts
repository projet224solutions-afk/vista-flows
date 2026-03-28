export type TranslationDict = Record<string, string>;

export type TranslationParams = Record<string, string | number | boolean | null | undefined>;

export interface LanguageMeta {
  code: string;
  name: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}
