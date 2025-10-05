/**
 * 🌍 SERVICE DE GESTION DES DEVISES MONDIALES
 * Gestion complète des devises ISO 4217 avec détection automatique du pays
 */

import { supabase } from '@/integrations/supabase/client';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  country: string;
  flag: string;
  isActive: boolean;
  decimalPlaces: number;
}

export interface CountryCurrency {
  country: string;
  countryCode: string;
  currency: string;
  flag: string;
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: 'manual' | 'api' | 'fallback';
  lastUpdated: string;
  updatedBy?: string;
}

export class GlobalCurrencyService {
  // Liste complète des devises mondiales ISO 4217
  private static readonly WORLD_CURRENCIES: Currency[] = [
    // Afrique
    { code: 'GNF', name: 'Guinean Franc', symbol: 'FG', country: 'Guinea', flag: '🇬🇳', isActive: true, decimalPlaces: 0 },
    { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', country: 'West Africa', flag: '🌍', isActive: true, decimalPlaces: 0 },
    { code: 'XAF', name: 'Central African CFA Franc', symbol: 'CFA', country: 'Central Africa', flag: '🌍', isActive: true, decimalPlaces: 0 },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', country: 'Nigeria', flag: '🇳🇬', isActive: true, decimalPlaces: 2 },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', country: 'South Africa', flag: '🇿🇦', isActive: true, decimalPlaces: 2 },
    { code: 'EGP', name: 'Egyptian Pound', symbol: '£', country: 'Egypt', flag: '🇪🇬', isActive: true, decimalPlaces: 2 },
    { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', country: 'Morocco', flag: '🇲🇦', isActive: true, decimalPlaces: 2 },
    { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', country: 'Tunisia', flag: '🇹🇳', isActive: true, decimalPlaces: 3 },
    { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', country: 'Algeria', flag: '🇩🇿', isActive: true, decimalPlaces: 2 },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', country: 'Kenya', flag: '🇰🇪', isActive: true, decimalPlaces: 2 },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', country: 'Ghana', flag: '🇬🇭', isActive: true, decimalPlaces: 2 },
    { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', country: 'Ethiopia', flag: '🇪🇹', isActive: true, decimalPlaces: 2 },
    
    // Amérique
    { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States', flag: '🇺🇸', isActive: true, decimalPlaces: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', country: 'Canada', flag: '🇨🇦', isActive: true, decimalPlaces: 2 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', country: 'Brazil', flag: '🇧🇷', isActive: true, decimalPlaces: 2 },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', country: 'Mexico', flag: '🇲🇽', isActive: true, decimalPlaces: 2 },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$', country: 'Argentina', flag: '🇦🇷', isActive: true, decimalPlaces: 2 },
    { code: 'CLP', name: 'Chilean Peso', symbol: '$', country: 'Chile', flag: '🇨🇱', isActive: true, decimalPlaces: 0 },
    { code: 'COP', name: 'Colombian Peso', symbol: '$', country: 'Colombia', flag: '🇨🇴', isActive: true, decimalPlaces: 2 },
    { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', country: 'Peru', flag: '🇵🇪', isActive: true, decimalPlaces: 2 },
    
    // Europe
    { code: 'EUR', name: 'Euro', symbol: '€', country: 'European Union', flag: '🇪🇺', isActive: true, decimalPlaces: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', country: 'United Kingdom', flag: '🇬🇧', isActive: true, decimalPlaces: 2 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', country: 'Switzerland', flag: '🇨🇭', isActive: true, decimalPlaces: 2 },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', country: 'Sweden', flag: '🇸🇪', isActive: true, decimalPlaces: 2 },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', country: 'Norway', flag: '🇳🇴', isActive: true, decimalPlaces: 2 },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr', country: 'Denmark', flag: '🇩🇰', isActive: true, decimalPlaces: 2 },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', country: 'Poland', flag: '🇵🇱', isActive: true, decimalPlaces: 2 },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', country: 'Czech Republic', flag: '🇨🇿', isActive: true, decimalPlaces: 2 },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', country: 'Hungary', flag: '🇭🇺', isActive: true, decimalPlaces: 2 },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', country: 'Russia', flag: '🇷🇺', isActive: true, decimalPlaces: 2 },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', country: 'Turkey', flag: '🇹🇷', isActive: true, decimalPlaces: 2 },
    
    // Asie
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', country: 'China', flag: '🇨🇳', isActive: true, decimalPlaces: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan', flag: '🇯🇵', isActive: true, decimalPlaces: 0 },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', country: 'South Korea', flag: '🇰🇷', isActive: true, decimalPlaces: 0 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', country: 'India', flag: '🇮🇳', isActive: true, decimalPlaces: 2 },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', country: 'Singapore', flag: '🇸🇬', isActive: true, decimalPlaces: 2 },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', country: 'Hong Kong', flag: '🇭🇰', isActive: true, decimalPlaces: 2 },
    { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', country: 'Taiwan', flag: '🇹🇼', isActive: true, decimalPlaces: 2 },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', country: 'Thailand', flag: '🇹🇭', isActive: true, decimalPlaces: 2 },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', country: 'Vietnam', flag: '🇻🇳', isActive: true, decimalPlaces: 0 },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', country: 'Indonesia', flag: '🇮🇩', isActive: true, decimalPlaces: 2 },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', country: 'Malaysia', flag: '🇲🇾', isActive: true, decimalPlaces: 2 },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱', country: 'Philippines', flag: '🇵🇭', isActive: true, decimalPlaces: 2 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: 'Australia', flag: '🇦🇺', isActive: true, decimalPlaces: 2 },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', country: 'New Zealand', flag: '🇳🇿', isActive: true, decimalPlaces: 2 },
    
    // Moyen-Orient
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', country: 'United Arab Emirates', flag: '🇦🇪', isActive: true, decimalPlaces: 2 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', country: 'Saudi Arabia', flag: '🇸🇦', isActive: true, decimalPlaces: 2 },
    { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', country: 'Qatar', flag: '🇶🇦', isActive: true, decimalPlaces: 2 },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', country: 'Kuwait', flag: '🇰🇼', isActive: true, decimalPlaces: 3 },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', country: 'Bahrain', flag: '🇧🇭', isActive: true, decimalPlaces: 3 },
    { code: 'OMR', name: 'Omani Rial', symbol: '﷼', country: 'Oman', flag: '🇴🇲', isActive: true, decimalPlaces: 3 },
    { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا', country: 'Jordan', flag: '🇯🇴', isActive: true, decimalPlaces: 3 },
    { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', country: 'Lebanon', flag: '🇱🇧', isActive: true, decimalPlaces: 2 },
    { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', country: 'Israel', flag: '🇮🇱', isActive: true, decimalPlaces: 2 },
    { code: 'EGP', name: 'Egyptian Pound', symbol: '£', country: 'Egypt', flag: '🇪🇬', isActive: true, decimalPlaces: 2 }
  ];

  // Mapping pays → devise par défaut
  private static readonly COUNTRY_CURRENCY_MAP: Record<string, string> = {
    // Afrique
    'GN': 'GNF', 'Guinea': 'GNF',
    'CI': 'XOF', 'Côte d\'Ivoire': 'XOF', 'Ivory Coast': 'XOF',
    'SN': 'XOF', 'Senegal': 'XOF',
    'ML': 'XOF', 'Mali': 'XOF',
    'BF': 'XOF', 'Burkina Faso': 'XOF',
    'NE': 'XOF', 'Niger': 'XOF',
    'CM': 'XAF', 'Cameroon': 'XAF',
    'TD': 'XAF', 'Chad': 'XAF',
    'CF': 'XAF', 'Central African Republic': 'XAF',
    'GQ': 'XAF', 'Equatorial Guinea': 'XAF',
    'GA': 'XAF', 'Gabon': 'XAF',
    'CG': 'XAF', 'Republic of the Congo': 'XAF',
    'NG': 'NGN', 'Nigeria': 'NGN',
    'ZA': 'ZAR', 'South Africa': 'ZAR',
    'EG': 'EGP', 'Egypt': 'EGP',
    'MA': 'MAD', 'Morocco': 'MAD',
    'TN': 'TND', 'Tunisia': 'TND',
    'DZ': 'DZD', 'Algeria': 'DZD',
    'KE': 'KES', 'Kenya': 'KES',
    'GH': 'GHS', 'Ghana': 'GHS',
    'ET': 'ETB', 'Ethiopia': 'ETB',
    
    // Amérique
    'US': 'USD', 'United States': 'USD', 'USA': 'USD',
    'CA': 'CAD', 'Canada': 'CAD',
    'BR': 'BRL', 'Brazil': 'BRL',
    'MX': 'MXN', 'Mexico': 'MXN',
    'AR': 'ARS', 'Argentina': 'ARS',
    'CL': 'CLP', 'Chile': 'CLP',
    'CO': 'COP', 'Colombia': 'COP',
    'PE': 'PEN', 'Peru': 'PEN',
    
    // Europe
    'FR': 'EUR', 'France': 'EUR',
    'DE': 'EUR', 'Germany': 'EUR',
    'IT': 'EUR', 'Italy': 'EUR',
    'ES': 'EUR', 'Spain': 'EUR',
    'NL': 'EUR', 'Netherlands': 'EUR',
    'BE': 'EUR', 'Belgium': 'EUR',
    'AT': 'EUR', 'Austria': 'EUR',
    'PT': 'EUR', 'Portugal': 'EUR',
    'IE': 'EUR', 'Ireland': 'EUR',
    'FI': 'EUR', 'Finland': 'EUR',
    'LU': 'EUR', 'Luxembourg': 'EUR',
    'MT': 'EUR', 'Malta': 'EUR',
    'CY': 'EUR', 'Cyprus': 'EUR',
    'SK': 'EUR', 'Slovakia': 'EUR',
    'SI': 'EUR', 'Slovenia': 'EUR',
    'EE': 'EUR', 'Estonia': 'EUR',
    'LV': 'EUR', 'Latvia': 'EUR',
    'LT': 'EUR', 'Lithuania': 'EUR',
    'GB': 'GBP', 'United Kingdom': 'GBP', 'UK': 'GBP',
    'CH': 'CHF', 'Switzerland': 'CHF',
    'SE': 'SEK', 'Sweden': 'SEK',
    'NO': 'NOK', 'Norway': 'NOK',
    'DK': 'DKK', 'Denmark': 'DKK',
    'PL': 'PLN', 'Poland': 'PLN',
    'CZ': 'CZK', 'Czech Republic': 'CZK',
    'HU': 'HUF', 'Hungary': 'HUF',
    'RU': 'RUB', 'Russia': 'RUB',
    'TR': 'TRY', 'Turkey': 'TRY',
    
    // Asie
    'CN': 'CNY', 'China': 'CNY',
    'JP': 'JPY', 'Japan': 'JPY',
    'KR': 'KRW', 'South Korea': 'KRW',
    'IN': 'INR', 'India': 'INR',
    'SG': 'SGD', 'Singapore': 'SGD',
    'HK': 'HKD', 'Hong Kong': 'HKD',
    'TW': 'TWD', 'Taiwan': 'TWD',
    'TH': 'THB', 'Thailand': 'THB',
    'VN': 'VND', 'Vietnam': 'VND',
    'ID': 'IDR', 'Indonesia': 'IDR',
    'MY': 'MYR', 'Malaysia': 'MYR',
    'PH': 'PHP', 'Philippines': 'PHP',
    'AU': 'AUD', 'Australia': 'AUD',
    'NZ': 'NZD', 'New Zealand': 'NZD',
    
    // Moyen-Orient
    'AE': 'AED', 'United Arab Emirates': 'AED',
    'SA': 'SAR', 'Saudi Arabia': 'SAR',
    'QA': 'QAR', 'Qatar': 'QAR',
    'KW': 'KWD', 'Kuwait': 'KWD',
    'BH': 'BHD', 'Bahrain': 'BHD',
    'OM': 'OMR', 'Oman': 'OMR',
    'JO': 'JOD', 'Jordan': 'JOD',
    'LB': 'LBP', 'Lebanon': 'LBP',
    'IL': 'ILS', 'Israel': 'ILS'
  };

  /**
   * Obtenir toutes les devises mondiales
   */
  static getAllCurrencies(): Currency[] {
    return this.WORLD_CURRENCIES;
  }

  /**
   * Obtenir les devises actives
   */
  static getActiveCurrencies(): Currency[] {
    return this.WORLD_CURRENCIES.filter(currency => currency.isActive);
  }

  /**
   * Rechercher des devises par nom ou code
   */
  static searchCurrencies(query: string): Currency[] {
    const lowercaseQuery = query.toLowerCase();
    return this.WORLD_CURRENCIES.filter(currency => 
      currency.name.toLowerCase().includes(lowercaseQuery) ||
      currency.code.toLowerCase().includes(lowercaseQuery) ||
      currency.country.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Détecter le pays de l'utilisateur et retourner sa devise par défaut
   */
  static async detectUserCountry(): Promise<CountryCurrency | null> {
    try {
      // Essayer d'abord via l'API de géolocalisation
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.country_code) {
        const currency = this.COUNTRY_CURRENCY_MAP[data.country_code];
        if (currency) {
          const currencyInfo = this.WORLD_CURRENCIES.find(c => c.code === currency);
          if (currencyInfo) {
            return {
              country: data.country_name || data.country,
              countryCode: data.country_code,
              currency: currency,
              flag: currencyInfo.flag
            };
          }
        }
      }
      
      // Fallback sur la détection par timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const countryFromTimezone = this.getCountryFromTimezone(timezone);
      
      if (countryFromTimezone) {
        const currency = this.COUNTRY_CURRENCY_MAP[countryFromTimezone];
        if (currency) {
          const currencyInfo = this.WORLD_CURRENCIES.find(c => c.code === currency);
          if (currencyInfo) {
            return {
              country: countryFromTimezone,
              countryCode: countryFromTimezone,
              currency: currency,
              flag: currencyInfo.flag
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting user country:', error);
      return null;
    }
  }

  /**
   * Obtenir la devise par défaut pour un pays
   */
  static getDefaultCurrencyForCountry(countryCode: string): string | null {
    return this.COUNTRY_CURRENCY_MAP[countryCode] || null;
  }

  /**
   * Obtenir les informations d'une devise
   */
  static getCurrencyInfo(currencyCode: string): Currency | null {
    return this.WORLD_CURRENCIES.find(c => c.code === currencyCode) || null;
  }

  /**
   * Formater un montant avec la devise
   */
  static formatAmount(amount: number, currencyCode: string): string {
    const currency = this.getCurrencyInfo(currencyCode);
    if (!currency) return `${amount} ${currencyCode}`;
    
    return `${currency.symbol} ${amount.toLocaleString('fr-FR', { 
      minimumFractionDigits: currency.decimalPlaces, 
      maximumFractionDigits: currency.decimalPlaces 
    })}`;
  }

  /**
   * Obtenir le pays depuis la timezone
   */
  private static getCountryFromTimezone(timezone: string): string | null {
    const timezoneMap: Record<string, string> = {
      'Africa/Conakry': 'GN',
      'Africa/Abidjan': 'CI',
      'Africa/Dakar': 'SN',
      'Africa/Bamako': 'ML',
      'Africa/Ouagadougou': 'BF',
      'Africa/Niamey': 'NE',
      'Africa/Douala': 'CM',
      'Africa/Ndjamena': 'TD',
      'Africa/Bangui': 'CF',
      'Africa/Malabo': 'GQ',
      'Africa/Libreville': 'GA',
      'Africa/Brazzaville': 'CG',
      'Africa/Lagos': 'NG',
      'Africa/Johannesburg': 'ZA',
      'Africa/Cairo': 'EG',
      'Africa/Casablanca': 'MA',
      'Africa/Tunis': 'TN',
      'Africa/Algiers': 'DZ',
      'Africa/Nairobi': 'KE',
      'Africa/Accra': 'GH',
      'Africa/Addis_Ababa': 'ET',
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Toronto': 'CA',
      'America/Vancouver': 'CA',
      'America/Sao_Paulo': 'BR',
      'America/Mexico_City': 'MX',
      'America/Argentina/Buenos_Aires': 'AR',
      'America/Santiago': 'CL',
      'America/Bogota': 'CO',
      'America/Lima': 'PE',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Europe/Rome': 'IT',
      'Europe/Madrid': 'ES',
      'Europe/Amsterdam': 'NL',
      'Europe/Brussels': 'BE',
      'Europe/Vienna': 'AT',
      'Europe/Lisbon': 'PT',
      'Europe/Dublin': 'IE',
      'Europe/Helsinki': 'FI',
      'Europe/Luxembourg': 'LU',
      'Europe/Malta': 'MT',
      'Europe/Nicosia': 'CY',
      'Europe/Bratislava': 'SK',
      'Europe/Ljubljana': 'SI',
      'Europe/Tallinn': 'EE',
      'Europe/Riga': 'LV',
      'Europe/Vilnius': 'LT',
      'Europe/London': 'GB',
      'Europe/Zurich': 'CH',
      'Europe/Stockholm': 'SE',
      'Europe/Oslo': 'NO',
      'Europe/Copenhagen': 'DK',
      'Europe/Warsaw': 'PL',
      'Europe/Prague': 'CZ',
      'Europe/Budapest': 'HU',
      'Europe/Moscow': 'RU',
      'Europe/Istanbul': 'TR',
      'Asia/Shanghai': 'CN',
      'Asia/Tokyo': 'JP',
      'Asia/Seoul': 'KR',
      'Asia/Kolkata': 'IN',
      'Asia/Singapore': 'SG',
      'Asia/Hong_Kong': 'HK',
      'Asia/Taipei': 'TW',
      'Asia/Bangkok': 'TH',
      'Asia/Ho_Chi_Minh': 'VN',
      'Asia/Jakarta': 'ID',
      'Asia/Kuala_Lumpur': 'MY',
      'Asia/Manila': 'PH',
      'Asia/Sydney': 'AU',
      'Asia/Auckland': 'NZ',
      'Asia/Dubai': 'AE',
      'Asia/Riyadh': 'SA',
      'Asia/Qatar': 'QA',
      'Asia/Kuwait': 'KW',
      'Asia/Bahrain': 'BH',
      'Asia/Muscat': 'OM',
      'Asia/Amman': 'JO',
      'Asia/Beirut': 'LB',
      'Asia/Jerusalem': 'IL'
    };
    
    return timezoneMap[timezone] || null;
  }

  /**
   * Synchroniser les devises avec la base de données
   */
  static async syncCurrenciesToDatabase(): Promise<{ success: boolean; message: string }> {
    try {
      for (const currency of this.WORLD_CURRENCIES) {
        const { error } = await supabase
          .from('currencies')
          .upsert({
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            country: currency.country,
            is_active: currency.isActive,
            decimal_places: currency.decimalPlaces
          }, {
            onConflict: 'code'
          });

        if (error) {
          console.error(`Error syncing currency ${currency.code}:`, error);
        }
      }

      return {
        success: true,
        message: `${this.WORLD_CURRENCIES.length} devises synchronisées avec succès`
      };
    } catch (error) {
      console.error('Error syncing currencies:', error);
      return {
        success: false,
        message: `Erreur lors de la synchronisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }
}
