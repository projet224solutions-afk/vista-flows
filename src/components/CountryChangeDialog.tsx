/**
 * POPUP DE CHANGEMENT DE PAYS (VOYAGE)
 * Notification quand l'utilisateur est détecté dans un nouveau pays
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Globe, MapPin, Languages, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Country, getDefaultLanguageForCountry } from '@/data/countries';
import { useLanguage } from '@/i18n/LanguageContext';

interface CountryChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCountry: Country | null;
  newCountry: Country;
  onAccept: () => void;
  onDecline: () => void;
}

export const CountryChangeDialog: React.FC<CountryChangeDialogProps> = ({
  open,
  onOpenChange,
  currentCountry,
  newCountry,
  onAccept,
  onDecline
}) => {
  const { language, t } = useLanguage();
  
  const getCountryName = (country: Country) => {
    return language === 'fr' ? country.nameFr : country.name;
  };

  const newLanguage = getDefaultLanguageForCountry(newCountry.code);
  const languageNames: Record<string, string> = {
    fr: 'Français',
    en: 'English',
    ar: 'العربية',
    pt: 'Português',
    es: 'Español',
    de: 'Deutsch',
    it: 'Italiano',
    zh: '中文',
    ja: '日本語',
    ko: '한국어',
    hi: 'हिन्दी',
    sw: 'Kiswahili'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {language === 'fr' ? 'Nouveau pays détecté' : 'New country detected'}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {language === 'fr' 
              ? `Nous avons détecté que vous êtes maintenant en ${getCountryName(newCountry)}. Voulez-vous mettre à jour votre pays et votre langue ?`
              : `We detected that you are now in ${getCountryName(newCountry)}. Would you like to update your country and language?`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Changement de pays */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {language === 'fr' ? 'Pays' : 'Country'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentCountry && (
                <>
                  <span className="text-lg">{currentCountry.flag}</span>
                  <span className="text-sm text-muted-foreground">{getCountryName(currentCountry)}</span>
                  <span className="text-muted-foreground">→</span>
                </>
              )}
              <span className="text-lg">{newCountry.flag}</span>
              <span className="text-sm font-medium">{getCountryName(newCountry)}</span>
            </div>
          </div>

          {/* Changement de langue */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {language === 'fr' ? 'Langue' : 'Language'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{languageNames[language] || language}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-sm font-medium">{languageNames[newLanguage] || newLanguage}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDecline}>
            {language === 'fr' ? 'Non, garder mes paramètres' : 'No, keep my settings'}
          </Button>
          <Button onClick={onAccept}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Oui, mettre à jour' : 'Yes, update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CountryChangeDialog;
