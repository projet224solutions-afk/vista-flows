/**
 * BASE DE DONNÉES MONDIALE DES PAYS
 * Contient tous les pays avec leurs informations complètes
 */

export interface Country {
  code: string;          // Code ISO 3166-1 alpha-2
  name: string;          // Nom en anglais
  nameFr: string;        // Nom en français
  dialCode: string;      // Indicatif téléphonique
  flag: string;          // Emoji drapeau
  languages: string[];   // Langues officielles (codes ISO 639-1)
  region: string;        // Région géographique
  currency: string;      // Code devise ISO 4217
}

// Mapping des langues par défaut selon le pays
export const countryToLanguage: Record<string, string> = {
  // Afrique francophone
  'GN': 'fr', // Guinée
  'SN': 'fr', // Sénégal
  'CI': 'fr', // Côte d'Ivoire
  'ML': 'fr', // Mali
  'BF': 'fr', // Burkina Faso
  'NE': 'fr', // Niger
  'TG': 'fr', // Togo
  'BJ': 'fr', // Bénin
  'CM': 'fr', // Cameroun
  'GA': 'fr', // Gabon
  'CG': 'fr', // Congo
  'CD': 'fr', // RD Congo
  'MG': 'fr', // Madagascar
  'TD': 'fr', // Tchad
  'CF': 'fr', // République Centrafricaine
  'DJ': 'fr', // Djibouti
  'KM': 'fr', // Comores
  'MU': 'fr', // Maurice
  'SC': 'fr', // Seychelles
  'RW': 'fr', // Rwanda
  'BI': 'fr', // Burundi
  
  // Afrique anglophone
  'SL': 'en', // Sierra Leone
  'LR': 'en', // Liberia
  'GH': 'en', // Ghana
  'NG': 'en', // Nigeria
  'GM': 'en', // Gambie
  'KE': 'en', // Kenya
  'UG': 'en', // Ouganda
  'TZ': 'en', // Tanzanie
  'ZA': 'en', // Afrique du Sud
  'ZW': 'en', // Zimbabwe
  'ZM': 'en', // Zambie
  'MW': 'en', // Malawi
  'BW': 'en', // Botswana
  'NA': 'en', // Namibie
  'LS': 'en', // Lesotho
  'SZ': 'en', // Eswatini
  
  // Afrique lusophone
  'GW': 'pt', // Guinée-Bissau
  'CV': 'pt', // Cap-Vert
  'AO': 'pt', // Angola
  'MZ': 'pt', // Mozambique
  'ST': 'pt', // Sao Tomé
  
  // Afrique arabophone
  'MA': 'ar', // Maroc
  'DZ': 'ar', // Algérie
  'TN': 'ar', // Tunisie
  'LY': 'ar', // Libye
  'EG': 'ar', // Égypte
  'SD': 'ar', // Soudan
  'MR': 'ar', // Mauritanie
  'SO': 'ar', // Somalie
  
  // Europe
  'FR': 'fr', // France
  'BE': 'fr', // Belgique (multilingue, français par défaut)
  'CH': 'fr', // Suisse (multilingue)
  'LU': 'fr', // Luxembourg
  'MC': 'fr', // Monaco
  'GB': 'en', // Royaume-Uni
  'US': 'en', // États-Unis
  'CA': 'en', // Canada (bilingue)
  'IE': 'en', // Irlande
  'AU': 'en', // Australie
  'NZ': 'en', // Nouvelle-Zélande
  'DE': 'de', // Allemagne
  'AT': 'de', // Autriche
  'ES': 'es', // Espagne
  'MX': 'es', // Mexique
  'AR': 'es', // Argentine
  'CO': 'es', // Colombie
  'PE': 'es', // Pérou
  'CL': 'es', // Chili
  'IT': 'it', // Italie
  'PT': 'pt', // Portugal
  'BR': 'pt', // Brésil
  'NL': 'nl', // Pays-Bas
  'PL': 'pl', // Pologne
  'RU': 'ru', // Russie
  'UA': 'uk', // Ukraine
  'TR': 'tr', // Turquie
  'GR': 'el', // Grèce
  'SE': 'sv', // Suède
  'NO': 'no', // Norvège
  'DK': 'da', // Danemark
  'FI': 'fi', // Finlande
  'CZ': 'cs', // République Tchèque
  'HU': 'hu', // Hongrie
  'RO': 'ro', // Roumanie
  
  // Asie
  'CN': 'zh', // Chine
  'JP': 'ja', // Japon
  'KR': 'ko', // Corée du Sud
  'IN': 'hi', // Inde
  'PK': 'ur', // Pakistan
  'BD': 'bn', // Bangladesh
  'ID': 'id', // Indonésie
  'MY': 'ms', // Malaisie
  'SG': 'en', // Singapour
  'PH': 'tl', // Philippines
  'TH': 'th', // Thaïlande
  'VN': 'vi', // Vietnam
  'SA': 'ar', // Arabie Saoudite
  'AE': 'ar', // Émirats Arabes Unis
  'IL': 'he', // Israël
  'IR': 'fa', // Iran
  'IQ': 'ar', // Irak
  
  // Amériques
  'HT': 'fr', // Haïti
  'JM': 'en', // Jamaïque
  'TT': 'en', // Trinité-et-Tobago
  'CU': 'es', // Cuba
  'DO': 'es', // République Dominicaine
  'VE': 'es', // Venezuela
  'EC': 'es', // Équateur
  'BO': 'es', // Bolivie
  'PY': 'es', // Paraguay
  'UY': 'es', // Uruguay
  'GT': 'es', // Guatemala
  'HN': 'es', // Honduras
  'SV': 'es', // El Salvador
  'NI': 'es', // Nicaragua
  'CR': 'es', // Costa Rica
  'PA': 'es', // Panama
};

// Liste complète de tous les pays du monde
export const countries: Country[] = [
  // Afrique
  { code: 'GN', name: 'Guinea', nameFr: 'Guinée', dialCode: '+224', flag: '🇬🇳', languages: ['fr'], region: 'Africa', currency: 'GNF' },
  { code: 'SL', name: 'Sierra Leone', nameFr: 'Sierra Leone', dialCode: '+232', flag: '🇸🇱', languages: ['en'], region: 'Africa', currency: 'SLL' },
  { code: 'LR', name: 'Liberia', nameFr: 'Libéria', dialCode: '+231', flag: '🇱🇷', languages: ['en'], region: 'Africa', currency: 'LRD' },
  { code: 'SN', name: 'Senegal', nameFr: 'Sénégal', dialCode: '+221', flag: '🇸🇳', languages: ['fr'], region: 'Africa', currency: 'XOF' },
  { code: 'GM', name: 'Gambia', nameFr: 'Gambie', dialCode: '+220', flag: '🇬🇲', languages: ['en'], region: 'Africa', currency: 'GMD' },
  { code: 'GW', name: 'Guinea-Bissau', nameFr: 'Guinée-Bissau', dialCode: '+245', flag: '🇬🇼', languages: ['pt'], region: 'Africa', currency: 'XOF' },
  { code: 'ML', name: 'Mali', nameFr: 'Mali', dialCode: '+223', flag: '🇲🇱', languages: ['fr'], region: 'Africa', currency: 'XOF' },
  { code: 'CI', name: 'Ivory Coast', nameFr: 'Côte d\'Ivoire', dialCode: '+225', flag: '🇨🇮', languages: ['fr'], region: 'Africa', currency: 'XOF' },
  { code: 'BF', name: 'Burkina Faso', nameFr: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫', languages: ['fr'], region: 'Africa', currency: 'XOF' },
  { code: 'GH', name: 'Ghana', nameFr: 'Ghana', dialCode: '+233', flag: '🇬🇭', languages: ['en'], region: 'Africa', currency: 'GHS' },
  { code: 'TG', name: 'Togo', nameFr: 'Togo', dialCode: '+228', flag: '🇹🇬', languages: ['fr'], region: 'Africa', currency: 'XOF' },
  { code: 'BJ', name: 'Benin', nameFr: 'Bénin', dialCode: '+229', flag: '🇧🇯', languages: ['fr'], region: 'Africa', currency: 'XOF' },
  { code: 'NE', name: 'Niger', nameFr: 'Niger', dialCode: '+227', flag: '🇳🇪', languages: ['fr'], region: 'Africa', currency: 'XOF' },
  { code: 'NG', name: 'Nigeria', nameFr: 'Nigéria', dialCode: '+234', flag: '🇳🇬', languages: ['en'], region: 'Africa', currency: 'NGN' },
  { code: 'CM', name: 'Cameroon', nameFr: 'Cameroun', dialCode: '+237', flag: '🇨🇲', languages: ['fr', 'en'], region: 'Africa', currency: 'XAF' },
  { code: 'GA', name: 'Gabon', nameFr: 'Gabon', dialCode: '+241', flag: '🇬🇦', languages: ['fr'], region: 'Africa', currency: 'XAF' },
  { code: 'GQ', name: 'Equatorial Guinea', nameFr: 'Guinée Équatoriale', dialCode: '+240', flag: '🇬🇶', languages: ['es', 'fr'], region: 'Africa', currency: 'XAF' },
  { code: 'CG', name: 'Republic of the Congo', nameFr: 'République du Congo', dialCode: '+242', flag: '🇨🇬', languages: ['fr'], region: 'Africa', currency: 'XAF' },
  { code: 'CD', name: 'DR Congo', nameFr: 'République Démocratique du Congo', dialCode: '+243', flag: '🇨🇩', languages: ['fr'], region: 'Africa', currency: 'CDF' },
  { code: 'AO', name: 'Angola', nameFr: 'Angola', dialCode: '+244', flag: '🇦🇴', languages: ['pt'], region: 'Africa', currency: 'AOA' },
  { code: 'CF', name: 'Central African Republic', nameFr: 'République Centrafricaine', dialCode: '+236', flag: '🇨🇫', languages: ['fr'], region: 'Africa', currency: 'XAF' },
  { code: 'TD', name: 'Chad', nameFr: 'Tchad', dialCode: '+235', flag: '🇹🇩', languages: ['fr', 'ar'], region: 'Africa', currency: 'XAF' },
  { code: 'SD', name: 'Sudan', nameFr: 'Soudan', dialCode: '+249', flag: '🇸🇩', languages: ['ar', 'en'], region: 'Africa', currency: 'SDG' },
  { code: 'SS', name: 'South Sudan', nameFr: 'Soudan du Sud', dialCode: '+211', flag: '🇸🇸', languages: ['en'], region: 'Africa', currency: 'SSP' },
  { code: 'ET', name: 'Ethiopia', nameFr: 'Éthiopie', dialCode: '+251', flag: '🇪🇹', languages: ['am'], region: 'Africa', currency: 'ETB' },
  { code: 'ER', name: 'Eritrea', nameFr: 'Érythrée', dialCode: '+291', flag: '🇪🇷', languages: ['ti', 'ar', 'en'], region: 'Africa', currency: 'ERN' },
  { code: 'DJ', name: 'Djibouti', nameFr: 'Djibouti', dialCode: '+253', flag: '🇩🇯', languages: ['fr', 'ar'], region: 'Africa', currency: 'DJF' },
  { code: 'SO', name: 'Somalia', nameFr: 'Somalie', dialCode: '+252', flag: '🇸🇴', languages: ['so', 'ar'], region: 'Africa', currency: 'SOS' },
  { code: 'KE', name: 'Kenya', nameFr: 'Kenya', dialCode: '+254', flag: '🇰🇪', languages: ['en', 'sw'], region: 'Africa', currency: 'KES' },
  { code: 'UG', name: 'Uganda', nameFr: 'Ouganda', dialCode: '+256', flag: '🇺🇬', languages: ['en', 'sw'], region: 'Africa', currency: 'UGX' },
  { code: 'TZ', name: 'Tanzania', nameFr: 'Tanzanie', dialCode: '+255', flag: '🇹🇿', languages: ['sw', 'en'], region: 'Africa', currency: 'TZS' },
  { code: 'RW', name: 'Rwanda', nameFr: 'Rwanda', dialCode: '+250', flag: '🇷🇼', languages: ['rw', 'fr', 'en'], region: 'Africa', currency: 'RWF' },
  { code: 'BI', name: 'Burundi', nameFr: 'Burundi', dialCode: '+257', flag: '🇧🇮', languages: ['rn', 'fr'], region: 'Africa', currency: 'BIF' },
  { code: 'MZ', name: 'Mozambique', nameFr: 'Mozambique', dialCode: '+258', flag: '🇲🇿', languages: ['pt'], region: 'Africa', currency: 'MZN' },
  { code: 'MW', name: 'Malawi', nameFr: 'Malawi', dialCode: '+265', flag: '🇲🇼', languages: ['en'], region: 'Africa', currency: 'MWK' },
  { code: 'ZM', name: 'Zambia', nameFr: 'Zambie', dialCode: '+260', flag: '🇿🇲', languages: ['en'], region: 'Africa', currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', nameFr: 'Zimbabwe', dialCode: '+263', flag: '🇿🇼', languages: ['en'], region: 'Africa', currency: 'ZWL' },
  { code: 'BW', name: 'Botswana', nameFr: 'Botswana', dialCode: '+267', flag: '🇧🇼', languages: ['en', 'tn'], region: 'Africa', currency: 'BWP' },
  { code: 'NA', name: 'Namibia', nameFr: 'Namibie', dialCode: '+264', flag: '🇳🇦', languages: ['en'], region: 'Africa', currency: 'NAD' },
  { code: 'ZA', name: 'South Africa', nameFr: 'Afrique du Sud', dialCode: '+27', flag: '🇿🇦', languages: ['en', 'af', 'zu'], region: 'Africa', currency: 'ZAR' },
  { code: 'LS', name: 'Lesotho', nameFr: 'Lesotho', dialCode: '+266', flag: '🇱🇸', languages: ['en', 'st'], region: 'Africa', currency: 'LSL' },
  { code: 'SZ', name: 'Eswatini', nameFr: 'Eswatini', dialCode: '+268', flag: '🇸🇿', languages: ['en', 'ss'], region: 'Africa', currency: 'SZL' },
  { code: 'MG', name: 'Madagascar', nameFr: 'Madagascar', dialCode: '+261', flag: '🇲🇬', languages: ['mg', 'fr'], region: 'Africa', currency: 'MGA' },
  { code: 'MU', name: 'Mauritius', nameFr: 'Maurice', dialCode: '+230', flag: '🇲🇺', languages: ['en', 'fr'], region: 'Africa', currency: 'MUR' },
  { code: 'KM', name: 'Comoros', nameFr: 'Comores', dialCode: '+269', flag: '🇰🇲', languages: ['ar', 'fr'], region: 'Africa', currency: 'KMF' },
  { code: 'SC', name: 'Seychelles', nameFr: 'Seychelles', dialCode: '+248', flag: '🇸🇨', languages: ['en', 'fr'], region: 'Africa', currency: 'SCR' },
  { code: 'RE', name: 'Réunion', nameFr: 'La Réunion', dialCode: '+262', flag: '🇷🇪', languages: ['fr'], region: 'Africa', currency: 'EUR' },
  { code: 'YT', name: 'Mayotte', nameFr: 'Mayotte', dialCode: '+262', flag: '🇾🇹', languages: ['fr'], region: 'Africa', currency: 'EUR' },
  { code: 'CV', name: 'Cape Verde', nameFr: 'Cap-Vert', dialCode: '+238', flag: '🇨🇻', languages: ['pt'], region: 'Africa', currency: 'CVE' },
  { code: 'ST', name: 'São Tomé and Príncipe', nameFr: 'Sao Tomé-et-Príncipe', dialCode: '+239', flag: '🇸🇹', languages: ['pt'], region: 'Africa', currency: 'STN' },
  { code: 'MR', name: 'Mauritania', nameFr: 'Mauritanie', dialCode: '+222', flag: '🇲🇷', languages: ['ar', 'fr'], region: 'Africa', currency: 'MRU' },
  { code: 'EH', name: 'Western Sahara', nameFr: 'Sahara Occidental', dialCode: '+212', flag: '🇪🇭', languages: ['ar'], region: 'Africa', currency: 'MAD' },
  { code: 'MA', name: 'Morocco', nameFr: 'Maroc', dialCode: '+212', flag: '🇲🇦', languages: ['ar', 'fr'], region: 'Africa', currency: 'MAD' },
  { code: 'DZ', name: 'Algeria', nameFr: 'Algérie', dialCode: '+213', flag: '🇩🇿', languages: ['ar', 'fr'], region: 'Africa', currency: 'DZD' },
  { code: 'TN', name: 'Tunisia', nameFr: 'Tunisie', dialCode: '+216', flag: '🇹🇳', languages: ['ar', 'fr'], region: 'Africa', currency: 'TND' },
  { code: 'LY', name: 'Libya', nameFr: 'Libye', dialCode: '+218', flag: '🇱🇾', languages: ['ar'], region: 'Africa', currency: 'LYD' },
  { code: 'EG', name: 'Egypt', nameFr: 'Égypte', dialCode: '+20', flag: '🇪🇬', languages: ['ar'], region: 'Africa', currency: 'EGP' },
  
  // Europe
  { code: 'FR', name: 'France', nameFr: 'France', dialCode: '+33', flag: '🇫🇷', languages: ['fr'], region: 'Europe', currency: 'EUR' },
  { code: 'GB', name: 'United Kingdom', nameFr: 'Royaume-Uni', dialCode: '+44', flag: '🇬🇧', languages: ['en'], region: 'Europe', currency: 'GBP' },
  { code: 'DE', name: 'Germany', nameFr: 'Allemagne', dialCode: '+49', flag: '🇩🇪', languages: ['de'], region: 'Europe', currency: 'EUR' },
  { code: 'ES', name: 'Spain', nameFr: 'Espagne', dialCode: '+34', flag: '🇪🇸', languages: ['es'], region: 'Europe', currency: 'EUR' },
  { code: 'IT', name: 'Italy', nameFr: 'Italie', dialCode: '+39', flag: '🇮🇹', languages: ['it'], region: 'Europe', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', nameFr: 'Portugal', dialCode: '+351', flag: '🇵🇹', languages: ['pt'], region: 'Europe', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', nameFr: 'Pays-Bas', dialCode: '+31', flag: '🇳🇱', languages: ['nl'], region: 'Europe', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', nameFr: 'Belgique', dialCode: '+32', flag: '🇧🇪', languages: ['nl', 'fr', 'de'], region: 'Europe', currency: 'EUR' },
  { code: 'CH', name: 'Switzerland', nameFr: 'Suisse', dialCode: '+41', flag: '🇨🇭', languages: ['de', 'fr', 'it'], region: 'Europe', currency: 'CHF' },
  { code: 'AT', name: 'Austria', nameFr: 'Autriche', dialCode: '+43', flag: '🇦🇹', languages: ['de'], region: 'Europe', currency: 'EUR' },
  { code: 'LU', name: 'Luxembourg', nameFr: 'Luxembourg', dialCode: '+352', flag: '🇱🇺', languages: ['lb', 'fr', 'de'], region: 'Europe', currency: 'EUR' },
  { code: 'MC', name: 'Monaco', nameFr: 'Monaco', dialCode: '+377', flag: '🇲🇨', languages: ['fr'], region: 'Europe', currency: 'EUR' },
  { code: 'IE', name: 'Ireland', nameFr: 'Irlande', dialCode: '+353', flag: '🇮🇪', languages: ['en', 'ga'], region: 'Europe', currency: 'EUR' },
  { code: 'SE', name: 'Sweden', nameFr: 'Suède', dialCode: '+46', flag: '🇸🇪', languages: ['sv'], region: 'Europe', currency: 'SEK' },
  { code: 'NO', name: 'Norway', nameFr: 'Norvège', dialCode: '+47', flag: '🇳🇴', languages: ['no'], region: 'Europe', currency: 'NOK' },
  { code: 'DK', name: 'Denmark', nameFr: 'Danemark', dialCode: '+45', flag: '🇩🇰', languages: ['da'], region: 'Europe', currency: 'DKK' },
  { code: 'FI', name: 'Finland', nameFr: 'Finlande', dialCode: '+358', flag: '🇫🇮', languages: ['fi', 'sv'], region: 'Europe', currency: 'EUR' },
  { code: 'IS', name: 'Iceland', nameFr: 'Islande', dialCode: '+354', flag: '🇮🇸', languages: ['is'], region: 'Europe', currency: 'ISK' },
  { code: 'PL', name: 'Poland', nameFr: 'Pologne', dialCode: '+48', flag: '🇵🇱', languages: ['pl'], region: 'Europe', currency: 'PLN' },
  { code: 'CZ', name: 'Czech Republic', nameFr: 'République Tchèque', dialCode: '+420', flag: '🇨🇿', languages: ['cs'], region: 'Europe', currency: 'CZK' },
  { code: 'SK', name: 'Slovakia', nameFr: 'Slovaquie', dialCode: '+421', flag: '🇸🇰', languages: ['sk'], region: 'Europe', currency: 'EUR' },
  { code: 'HU', name: 'Hungary', nameFr: 'Hongrie', dialCode: '+36', flag: '🇭🇺', languages: ['hu'], region: 'Europe', currency: 'HUF' },
  { code: 'RO', name: 'Romania', nameFr: 'Roumanie', dialCode: '+40', flag: '🇷🇴', languages: ['ro'], region: 'Europe', currency: 'RON' },
  { code: 'BG', name: 'Bulgaria', nameFr: 'Bulgarie', dialCode: '+359', flag: '🇧🇬', languages: ['bg'], region: 'Europe', currency: 'BGN' },
  { code: 'GR', name: 'Greece', nameFr: 'Grèce', dialCode: '+30', flag: '🇬🇷', languages: ['el'], region: 'Europe', currency: 'EUR' },
  { code: 'CY', name: 'Cyprus', nameFr: 'Chypre', dialCode: '+357', flag: '🇨🇾', languages: ['el', 'tr'], region: 'Europe', currency: 'EUR' },
  { code: 'MT', name: 'Malta', nameFr: 'Malte', dialCode: '+356', flag: '🇲🇹', languages: ['mt', 'en'], region: 'Europe', currency: 'EUR' },
  { code: 'HR', name: 'Croatia', nameFr: 'Croatie', dialCode: '+385', flag: '🇭🇷', languages: ['hr'], region: 'Europe', currency: 'EUR' },
  { code: 'SI', name: 'Slovenia', nameFr: 'Slovénie', dialCode: '+386', flag: '🇸🇮', languages: ['sl'], region: 'Europe', currency: 'EUR' },
  { code: 'RS', name: 'Serbia', nameFr: 'Serbie', dialCode: '+381', flag: '🇷🇸', languages: ['sr'], region: 'Europe', currency: 'RSD' },
  { code: 'BA', name: 'Bosnia and Herzegovina', nameFr: 'Bosnie-Herzégovine', dialCode: '+387', flag: '🇧🇦', languages: ['bs', 'hr', 'sr'], region: 'Europe', currency: 'BAM' },
  { code: 'ME', name: 'Montenegro', nameFr: 'Monténégro', dialCode: '+382', flag: '🇲🇪', languages: ['sr'], region: 'Europe', currency: 'EUR' },
  { code: 'MK', name: 'North Macedonia', nameFr: 'Macédoine du Nord', dialCode: '+389', flag: '🇲🇰', languages: ['mk'], region: 'Europe', currency: 'MKD' },
  { code: 'AL', name: 'Albania', nameFr: 'Albanie', dialCode: '+355', flag: '🇦🇱', languages: ['sq'], region: 'Europe', currency: 'ALL' },
  { code: 'XK', name: 'Kosovo', nameFr: 'Kosovo', dialCode: '+383', flag: '🇽🇰', languages: ['sq', 'sr'], region: 'Europe', currency: 'EUR' },
  { code: 'UA', name: 'Ukraine', nameFr: 'Ukraine', dialCode: '+380', flag: '🇺🇦', languages: ['uk'], region: 'Europe', currency: 'UAH' },
  { code: 'BY', name: 'Belarus', nameFr: 'Biélorussie', dialCode: '+375', flag: '🇧🇾', languages: ['be', 'ru'], region: 'Europe', currency: 'BYN' },
  { code: 'MD', name: 'Moldova', nameFr: 'Moldavie', dialCode: '+373', flag: '🇲🇩', languages: ['ro'], region: 'Europe', currency: 'MDL' },
  { code: 'RU', name: 'Russia', nameFr: 'Russie', dialCode: '+7', flag: '🇷🇺', languages: ['ru'], region: 'Europe', currency: 'RUB' },
  { code: 'EE', name: 'Estonia', nameFr: 'Estonie', dialCode: '+372', flag: '🇪🇪', languages: ['et'], region: 'Europe', currency: 'EUR' },
  { code: 'LV', name: 'Latvia', nameFr: 'Lettonie', dialCode: '+371', flag: '🇱🇻', languages: ['lv'], region: 'Europe', currency: 'EUR' },
  { code: 'LT', name: 'Lithuania', nameFr: 'Lituanie', dialCode: '+370', flag: '🇱🇹', languages: ['lt'], region: 'Europe', currency: 'EUR' },
  { code: 'TR', name: 'Turkey', nameFr: 'Turquie', dialCode: '+90', flag: '🇹🇷', languages: ['tr'], region: 'Europe', currency: 'TRY' },
  { code: 'AD', name: 'Andorra', nameFr: 'Andorre', dialCode: '+376', flag: '🇦🇩', languages: ['ca'], region: 'Europe', currency: 'EUR' },
  { code: 'LI', name: 'Liechtenstein', nameFr: 'Liechtenstein', dialCode: '+423', flag: '🇱🇮', languages: ['de'], region: 'Europe', currency: 'CHF' },
  { code: 'SM', name: 'San Marino', nameFr: 'Saint-Marin', dialCode: '+378', flag: '🇸🇲', languages: ['it'], region: 'Europe', currency: 'EUR' },
  { code: 'VA', name: 'Vatican City', nameFr: 'Vatican', dialCode: '+39', flag: '🇻🇦', languages: ['it', 'la'], region: 'Europe', currency: 'EUR' },
  { code: 'GI', name: 'Gibraltar', nameFr: 'Gibraltar', dialCode: '+350', flag: '🇬🇮', languages: ['en'], region: 'Europe', currency: 'GIP' },
  
  // Asie
  { code: 'CN', name: 'China', nameFr: 'Chine', dialCode: '+86', flag: '🇨🇳', languages: ['zh'], region: 'Asia', currency: 'CNY' },
  { code: 'JP', name: 'Japan', nameFr: 'Japon', dialCode: '+81', flag: '🇯🇵', languages: ['ja'], region: 'Asia', currency: 'JPY' },
  { code: 'KR', name: 'South Korea', nameFr: 'Corée du Sud', dialCode: '+82', flag: '🇰🇷', languages: ['ko'], region: 'Asia', currency: 'KRW' },
  { code: 'KP', name: 'North Korea', nameFr: 'Corée du Nord', dialCode: '+850', flag: '🇰🇵', languages: ['ko'], region: 'Asia', currency: 'KPW' },
  { code: 'MN', name: 'Mongolia', nameFr: 'Mongolie', dialCode: '+976', flag: '🇲🇳', languages: ['mn'], region: 'Asia', currency: 'MNT' },
  { code: 'TW', name: 'Taiwan', nameFr: 'Taïwan', dialCode: '+886', flag: '🇹🇼', languages: ['zh'], region: 'Asia', currency: 'TWD' },
  { code: 'HK', name: 'Hong Kong', nameFr: 'Hong Kong', dialCode: '+852', flag: '🇭🇰', languages: ['zh', 'en'], region: 'Asia', currency: 'HKD' },
  { code: 'MO', name: 'Macau', nameFr: 'Macao', dialCode: '+853', flag: '🇲🇴', languages: ['zh', 'pt'], region: 'Asia', currency: 'MOP' },
  { code: 'IN', name: 'India', nameFr: 'Inde', dialCode: '+91', flag: '🇮🇳', languages: ['hi', 'en'], region: 'Asia', currency: 'INR' },
  { code: 'PK', name: 'Pakistan', nameFr: 'Pakistan', dialCode: '+92', flag: '🇵🇰', languages: ['ur', 'en'], region: 'Asia', currency: 'PKR' },
  { code: 'BD', name: 'Bangladesh', nameFr: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', languages: ['bn'], region: 'Asia', currency: 'BDT' },
  { code: 'LK', name: 'Sri Lanka', nameFr: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', languages: ['si', 'ta'], region: 'Asia', currency: 'LKR' },
  { code: 'NP', name: 'Nepal', nameFr: 'Népal', dialCode: '+977', flag: '🇳🇵', languages: ['ne'], region: 'Asia', currency: 'NPR' },
  { code: 'BT', name: 'Bhutan', nameFr: 'Bhoutan', dialCode: '+975', flag: '🇧🇹', languages: ['dz'], region: 'Asia', currency: 'BTN' },
  { code: 'MV', name: 'Maldives', nameFr: 'Maldives', dialCode: '+960', flag: '🇲🇻', languages: ['dv'], region: 'Asia', currency: 'MVR' },
  { code: 'AF', name: 'Afghanistan', nameFr: 'Afghanistan', dialCode: '+93', flag: '🇦🇫', languages: ['ps', 'fa'], region: 'Asia', currency: 'AFN' },
  { code: 'TH', name: 'Thailand', nameFr: 'Thaïlande', dialCode: '+66', flag: '🇹🇭', languages: ['th'], region: 'Asia', currency: 'THB' },
  { code: 'VN', name: 'Vietnam', nameFr: 'Vietnam', dialCode: '+84', flag: '🇻🇳', languages: ['vi'], region: 'Asia', currency: 'VND' },
  { code: 'LA', name: 'Laos', nameFr: 'Laos', dialCode: '+856', flag: '🇱🇦', languages: ['lo'], region: 'Asia', currency: 'LAK' },
  { code: 'KH', name: 'Cambodia', nameFr: 'Cambodge', dialCode: '+855', flag: '🇰🇭', languages: ['km'], region: 'Asia', currency: 'KHR' },
  { code: 'MM', name: 'Myanmar', nameFr: 'Birmanie', dialCode: '+95', flag: '🇲🇲', languages: ['my'], region: 'Asia', currency: 'MMK' },
  { code: 'MY', name: 'Malaysia', nameFr: 'Malaisie', dialCode: '+60', flag: '🇲🇾', languages: ['ms'], region: 'Asia', currency: 'MYR' },
  { code: 'SG', name: 'Singapore', nameFr: 'Singapour', dialCode: '+65', flag: '🇸🇬', languages: ['en', 'zh', 'ms', 'ta'], region: 'Asia', currency: 'SGD' },
  { code: 'ID', name: 'Indonesia', nameFr: 'Indonésie', dialCode: '+62', flag: '🇮🇩', languages: ['id'], region: 'Asia', currency: 'IDR' },
  { code: 'BN', name: 'Brunei', nameFr: 'Brunei', dialCode: '+673', flag: '🇧🇳', languages: ['ms'], region: 'Asia', currency: 'BND' },
  { code: 'PH', name: 'Philippines', nameFr: 'Philippines', dialCode: '+63', flag: '🇵🇭', languages: ['tl', 'en'], region: 'Asia', currency: 'PHP' },
  { code: 'TL', name: 'Timor-Leste', nameFr: 'Timor Oriental', dialCode: '+670', flag: '🇹🇱', languages: ['pt', 'tet'], region: 'Asia', currency: 'USD' },
  { code: 'SA', name: 'Saudi Arabia', nameFr: 'Arabie Saoudite', dialCode: '+966', flag: '🇸🇦', languages: ['ar'], region: 'Asia', currency: 'SAR' },
  { code: 'AE', name: 'United Arab Emirates', nameFr: 'Émirats Arabes Unis', dialCode: '+971', flag: '🇦🇪', languages: ['ar'], region: 'Asia', currency: 'AED' },
  { code: 'QA', name: 'Qatar', nameFr: 'Qatar', dialCode: '+974', flag: '🇶🇦', languages: ['ar'], region: 'Asia', currency: 'QAR' },
  { code: 'KW', name: 'Kuwait', nameFr: 'Koweït', dialCode: '+965', flag: '🇰🇼', languages: ['ar'], region: 'Asia', currency: 'KWD' },
  { code: 'BH', name: 'Bahrain', nameFr: 'Bahreïn', dialCode: '+973', flag: '🇧🇭', languages: ['ar'], region: 'Asia', currency: 'BHD' },
  { code: 'OM', name: 'Oman', nameFr: 'Oman', dialCode: '+968', flag: '🇴🇲', languages: ['ar'], region: 'Asia', currency: 'OMR' },
  { code: 'YE', name: 'Yemen', nameFr: 'Yémen', dialCode: '+967', flag: '🇾🇪', languages: ['ar'], region: 'Asia', currency: 'YER' },
  { code: 'JO', name: 'Jordan', nameFr: 'Jordanie', dialCode: '+962', flag: '🇯🇴', languages: ['ar'], region: 'Asia', currency: 'JOD' },
  { code: 'LB', name: 'Lebanon', nameFr: 'Liban', dialCode: '+961', flag: '🇱🇧', languages: ['ar', 'fr'], region: 'Asia', currency: 'LBP' },
  { code: 'SY', name: 'Syria', nameFr: 'Syrie', dialCode: '+963', flag: '🇸🇾', languages: ['ar'], region: 'Asia', currency: 'SYP' },
  { code: 'IQ', name: 'Iraq', nameFr: 'Irak', dialCode: '+964', flag: '🇮🇶', languages: ['ar', 'ku'], region: 'Asia', currency: 'IQD' },
  { code: 'IR', name: 'Iran', nameFr: 'Iran', dialCode: '+98', flag: '🇮🇷', languages: ['fa'], region: 'Asia', currency: 'IRR' },
  { code: 'IL', name: 'Israel', nameFr: 'Israël', dialCode: '+972', flag: '🇮🇱', languages: ['he', 'ar'], region: 'Asia', currency: 'ILS' },
  { code: 'PS', name: 'Palestine', nameFr: 'Palestine', dialCode: '+970', flag: '🇵🇸', languages: ['ar'], region: 'Asia', currency: 'ILS' },
  { code: 'GE', name: 'Georgia', nameFr: 'Géorgie', dialCode: '+995', flag: '🇬🇪', languages: ['ka'], region: 'Asia', currency: 'GEL' },
  { code: 'AM', name: 'Armenia', nameFr: 'Arménie', dialCode: '+374', flag: '🇦🇲', languages: ['hy'], region: 'Asia', currency: 'AMD' },
  { code: 'AZ', name: 'Azerbaijan', nameFr: 'Azerbaïdjan', dialCode: '+994', flag: '🇦🇿', languages: ['az'], region: 'Asia', currency: 'AZN' },
  { code: 'KZ', name: 'Kazakhstan', nameFr: 'Kazakhstan', dialCode: '+7', flag: '🇰🇿', languages: ['kk', 'ru'], region: 'Asia', currency: 'KZT' },
  { code: 'UZ', name: 'Uzbekistan', nameFr: 'Ouzbékistan', dialCode: '+998', flag: '🇺🇿', languages: ['uz'], region: 'Asia', currency: 'UZS' },
  { code: 'TM', name: 'Turkmenistan', nameFr: 'Turkménistan', dialCode: '+993', flag: '🇹🇲', languages: ['tk'], region: 'Asia', currency: 'TMT' },
  { code: 'TJ', name: 'Tajikistan', nameFr: 'Tadjikistan', dialCode: '+992', flag: '🇹🇯', languages: ['tg'], region: 'Asia', currency: 'TJS' },
  { code: 'KG', name: 'Kyrgyzstan', nameFr: 'Kirghizistan', dialCode: '+996', flag: '🇰🇬', languages: ['ky', 'ru'], region: 'Asia', currency: 'KGS' },
  
  // Amériques
  { code: 'US', name: 'United States', nameFr: 'États-Unis', dialCode: '+1', flag: '🇺🇸', languages: ['en'], region: 'Americas', currency: 'USD' },
  { code: 'CA', name: 'Canada', nameFr: 'Canada', dialCode: '+1', flag: '🇨🇦', languages: ['en', 'fr'], region: 'Americas', currency: 'CAD' },
  { code: 'MX', name: 'Mexico', nameFr: 'Mexique', dialCode: '+52', flag: '🇲🇽', languages: ['es'], region: 'Americas', currency: 'MXN' },
  { code: 'GT', name: 'Guatemala', nameFr: 'Guatemala', dialCode: '+502', flag: '🇬🇹', languages: ['es'], region: 'Americas', currency: 'GTQ' },
  { code: 'BZ', name: 'Belize', nameFr: 'Belize', dialCode: '+501', flag: '🇧🇿', languages: ['en'], region: 'Americas', currency: 'BZD' },
  { code: 'HN', name: 'Honduras', nameFr: 'Honduras', dialCode: '+504', flag: '🇭🇳', languages: ['es'], region: 'Americas', currency: 'HNL' },
  { code: 'SV', name: 'El Salvador', nameFr: 'Salvador', dialCode: '+503', flag: '🇸🇻', languages: ['es'], region: 'Americas', currency: 'USD' },
  { code: 'NI', name: 'Nicaragua', nameFr: 'Nicaragua', dialCode: '+505', flag: '🇳🇮', languages: ['es'], region: 'Americas', currency: 'NIO' },
  { code: 'CR', name: 'Costa Rica', nameFr: 'Costa Rica', dialCode: '+506', flag: '🇨🇷', languages: ['es'], region: 'Americas', currency: 'CRC' },
  { code: 'PA', name: 'Panama', nameFr: 'Panama', dialCode: '+507', flag: '🇵🇦', languages: ['es'], region: 'Americas', currency: 'PAB' },
  { code: 'CU', name: 'Cuba', nameFr: 'Cuba', dialCode: '+53', flag: '🇨🇺', languages: ['es'], region: 'Americas', currency: 'CUP' },
  { code: 'HT', name: 'Haiti', nameFr: 'Haïti', dialCode: '+509', flag: '🇭🇹', languages: ['fr', 'ht'], region: 'Americas', currency: 'HTG' },
  { code: 'DO', name: 'Dominican Republic', nameFr: 'République Dominicaine', dialCode: '+1809', flag: '🇩🇴', languages: ['es'], region: 'Americas', currency: 'DOP' },
  { code: 'JM', name: 'Jamaica', nameFr: 'Jamaïque', dialCode: '+1876', flag: '🇯🇲', languages: ['en'], region: 'Americas', currency: 'JMD' },
  { code: 'TT', name: 'Trinidad and Tobago', nameFr: 'Trinité-et-Tobago', dialCode: '+1868', flag: '🇹🇹', languages: ['en'], region: 'Americas', currency: 'TTD' },
  { code: 'BB', name: 'Barbados', nameFr: 'Barbade', dialCode: '+1246', flag: '🇧🇧', languages: ['en'], region: 'Americas', currency: 'BBD' },
  { code: 'BS', name: 'Bahamas', nameFr: 'Bahamas', dialCode: '+1242', flag: '🇧🇸', languages: ['en'], region: 'Americas', currency: 'BSD' },
  { code: 'PR', name: 'Puerto Rico', nameFr: 'Porto Rico', dialCode: '+1787', flag: '🇵🇷', languages: ['es', 'en'], region: 'Americas', currency: 'USD' },
  { code: 'GP', name: 'Guadeloupe', nameFr: 'Guadeloupe', dialCode: '+590', flag: '🇬🇵', languages: ['fr'], region: 'Americas', currency: 'EUR' },
  { code: 'MQ', name: 'Martinique', nameFr: 'Martinique', dialCode: '+596', flag: '🇲🇶', languages: ['fr'], region: 'Americas', currency: 'EUR' },
  { code: 'GF', name: 'French Guiana', nameFr: 'Guyane Française', dialCode: '+594', flag: '🇬🇫', languages: ['fr'], region: 'Americas', currency: 'EUR' },
  { code: 'CO', name: 'Colombia', nameFr: 'Colombie', dialCode: '+57', flag: '🇨🇴', languages: ['es'], region: 'Americas', currency: 'COP' },
  { code: 'VE', name: 'Venezuela', nameFr: 'Venezuela', dialCode: '+58', flag: '🇻🇪', languages: ['es'], region: 'Americas', currency: 'VES' },
  { code: 'GY', name: 'Guyana', nameFr: 'Guyana', dialCode: '+592', flag: '🇬🇾', languages: ['en'], region: 'Americas', currency: 'GYD' },
  { code: 'SR', name: 'Suriname', nameFr: 'Suriname', dialCode: '+597', flag: '🇸🇷', languages: ['nl'], region: 'Americas', currency: 'SRD' },
  { code: 'EC', name: 'Ecuador', nameFr: 'Équateur', dialCode: '+593', flag: '🇪🇨', languages: ['es'], region: 'Americas', currency: 'USD' },
  { code: 'PE', name: 'Peru', nameFr: 'Pérou', dialCode: '+51', flag: '🇵🇪', languages: ['es'], region: 'Americas', currency: 'PEN' },
  { code: 'BR', name: 'Brazil', nameFr: 'Brésil', dialCode: '+55', flag: '🇧🇷', languages: ['pt'], region: 'Americas', currency: 'BRL' },
  { code: 'BO', name: 'Bolivia', nameFr: 'Bolivie', dialCode: '+591', flag: '🇧🇴', languages: ['es'], region: 'Americas', currency: 'BOB' },
  { code: 'PY', name: 'Paraguay', nameFr: 'Paraguay', dialCode: '+595', flag: '🇵🇾', languages: ['es', 'gn'], region: 'Americas', currency: 'PYG' },
  { code: 'CL', name: 'Chile', nameFr: 'Chili', dialCode: '+56', flag: '🇨🇱', languages: ['es'], region: 'Americas', currency: 'CLP' },
  { code: 'AR', name: 'Argentina', nameFr: 'Argentine', dialCode: '+54', flag: '🇦🇷', languages: ['es'], region: 'Americas', currency: 'ARS' },
  { code: 'UY', name: 'Uruguay', nameFr: 'Uruguay', dialCode: '+598', flag: '🇺🇾', languages: ['es'], region: 'Americas', currency: 'UYU' },
  
  // Océanie
  { code: 'AU', name: 'Australia', nameFr: 'Australie', dialCode: '+61', flag: '🇦🇺', languages: ['en'], region: 'Oceania', currency: 'AUD' },
  { code: 'NZ', name: 'New Zealand', nameFr: 'Nouvelle-Zélande', dialCode: '+64', flag: '🇳🇿', languages: ['en', 'mi'], region: 'Oceania', currency: 'NZD' },
  { code: 'PG', name: 'Papua New Guinea', nameFr: 'Papouasie-Nouvelle-Guinée', dialCode: '+675', flag: '🇵🇬', languages: ['en'], region: 'Oceania', currency: 'PGK' },
  { code: 'FJ', name: 'Fiji', nameFr: 'Fidji', dialCode: '+679', flag: '🇫🇯', languages: ['en', 'fj'], region: 'Oceania', currency: 'FJD' },
  { code: 'SB', name: 'Solomon Islands', nameFr: 'Îles Salomon', dialCode: '+677', flag: '🇸🇧', languages: ['en'], region: 'Oceania', currency: 'SBD' },
  { code: 'VU', name: 'Vanuatu', nameFr: 'Vanuatu', dialCode: '+678', flag: '🇻🇺', languages: ['bi', 'en', 'fr'], region: 'Oceania', currency: 'VUV' },
  { code: 'NC', name: 'New Caledonia', nameFr: 'Nouvelle-Calédonie', dialCode: '+687', flag: '🇳🇨', languages: ['fr'], region: 'Oceania', currency: 'XPF' },
  { code: 'PF', name: 'French Polynesia', nameFr: 'Polynésie Française', dialCode: '+689', flag: '🇵🇫', languages: ['fr'], region: 'Oceania', currency: 'XPF' },
  { code: 'WS', name: 'Samoa', nameFr: 'Samoa', dialCode: '+685', flag: '🇼🇸', languages: ['sm', 'en'], region: 'Oceania', currency: 'WST' },
  { code: 'TO', name: 'Tonga', nameFr: 'Tonga', dialCode: '+676', flag: '🇹🇴', languages: ['to', 'en'], region: 'Oceania', currency: 'TOP' },
  { code: 'KI', name: 'Kiribati', nameFr: 'Kiribati', dialCode: '+686', flag: '🇰🇮', languages: ['en'], region: 'Oceania', currency: 'AUD' },
  { code: 'FM', name: 'Micronesia', nameFr: 'Micronésie', dialCode: '+691', flag: '🇫🇲', languages: ['en'], region: 'Oceania', currency: 'USD' },
  { code: 'MH', name: 'Marshall Islands', nameFr: 'Îles Marshall', dialCode: '+692', flag: '🇲🇭', languages: ['en', 'mh'], region: 'Oceania', currency: 'USD' },
  { code: 'PW', name: 'Palau', nameFr: 'Palaos', dialCode: '+680', flag: '🇵🇼', languages: ['en', 'pau'], region: 'Oceania', currency: 'USD' },
  { code: 'NR', name: 'Nauru', nameFr: 'Nauru', dialCode: '+674', flag: '🇳🇷', languages: ['en', 'na'], region: 'Oceania', currency: 'AUD' },
  { code: 'TV', name: 'Tuvalu', nameFr: 'Tuvalu', dialCode: '+688', flag: '🇹🇻', languages: ['en', 'tvl'], region: 'Oceania', currency: 'AUD' },
];

// Fonctions utilitaires
export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(c => c.code.toUpperCase() === code.toUpperCase());
};

export const getCountryByDialCode = (dialCode: string): Country | undefined => {
  return countries.find(c => c.dialCode === dialCode);
};

export const searchCountries = (query: string, lang: 'en' | 'fr' = 'en'): Country[] => {
  const q = query.toLowerCase().trim();
  if (!q) return countries;
  
  return countries.filter(c => {
    const name = lang === 'fr' ? c.nameFr.toLowerCase() : c.name.toLowerCase();
    return (
      name.includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dialCode.includes(q)
    );
  });
};

export const getCountriesByRegion = (region: string): Country[] => {
  return countries.filter(c => c.region === region);
};

export const getDefaultLanguageForCountry = (countryCode: string): string => {
  return countryToLanguage[countryCode.toUpperCase()] || 'en';
};

export const getAllRegions = (): string[] => {
  return [...new Set(countries.map(c => c.region))];
};
