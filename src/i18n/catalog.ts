import { translations as legacyTranslations, defaultLanguage } from '@/i18n/translations';
import { frCore } from '@/i18n/locales/fr/core';
import { enCore } from '@/i18n/locales/en/core';
import { arCore } from '@/i18n/locales/ar/core';
import type { TranslationDict } from '@/i18n/types';

const modularCatalog: Record<string, TranslationDict> = {
  fr: frCore,
  en: enCore,
  ar: arCore,
};

export const translationsCatalog: Record<string, TranslationDict> = Object.keys(legacyTranslations).reduce(
  (acc, lang) => {
    acc[lang] = {
      ...legacyTranslations[lang],
      ...(modularCatalog[lang] || {}),
    };
    return acc;
  },
  {} as Record<string, TranslationDict>,
);

for (const [lang, dict] of Object.entries(modularCatalog)) {
  if (!translationsCatalog[lang]) {
    translationsCatalog[lang] = { ...dict };
  }
}

export function hasTranslation(language: string, key: string): boolean {
  return Boolean(translationsCatalog[language]?.[key] || translationsCatalog[defaultLanguage]?.[key]);
}

export function resolveTranslation(language: string, key: string): string | null {
  return (
    translationsCatalog[language]?.[key] ||
    translationsCatalog[defaultLanguage]?.[key] ||
    null
  );
}
