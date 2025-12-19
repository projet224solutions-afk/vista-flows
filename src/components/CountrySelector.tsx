/**
 * SÉLECTEUR DE PAYS AVEC RECHERCHE
 * Dropdown complet avec tous les pays du monde
 */

import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, Search, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { countries, Country, searchCountries } from '@/data/countries';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface CountrySelectorProps {
  value?: string;
  onChange: (country: Country) => void;
  placeholder?: string;
  className?: string;
  showDialCode?: boolean;
  disabled?: boolean;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onChange,
  placeholder,
  className,
  showDialCode = false,
  disabled = false
}) => {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCountry = useMemo(() => {
    return countries.find(c => c.code === value);
  }, [value]);

  const filteredCountries = useMemo(() => {
    return searchCountries(search, language === 'fr' ? 'fr' : 'en');
  }, [search, language]);

  const handleSelect = (country: Country) => {
    onChange(country);
    setOpen(false);
    setSearch('');
  };

  const displayName = (country: Country) => {
    return language === 'fr' ? country.nameFr : country.name;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedCountry && "text-muted-foreground",
            className
          )}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span className="text-lg">{selectedCountry.flag}</span>
              <span>{displayName(selectedCountry)}</span>
              {showDialCode && (
                <span className="text-muted-foreground">({selectedCountry.dialCode})</span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {placeholder || (language === 'fr' ? 'Sélectionner un pays' : 'Select a country')}
            </span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-background border z-50" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'fr' ? 'Rechercher un pays...' : 'Search country...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-1">
            {filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {language === 'fr' ? 'Aucun pays trouvé' : 'No country found'}
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleSelect(country)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer",
                    value === country.code && "bg-accent"
                  )}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="flex-1 text-left">{displayName(country)}</span>
                  {showDialCode && (
                    <span className="text-muted-foreground text-xs">{country.dialCode}</span>
                  )}
                  {value === country.code && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default CountrySelector;
