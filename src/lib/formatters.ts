import { getCurrencyByCode } from '@/data/currencies';

/**
 * Format a number as currency with the correct symbol and formatting
 */
export function formatCurrency(amount: number, currencyCode: string = 'GNF'): string {
  const currency = getCurrencyByCode(currencyCode);
  
  if (!currency) {
    return `${amount.toLocaleString()} ${currencyCode}`;
  }

  // Determine decimal places based on currency
  const noDecimalCurrencies = ['GNF', 'JPY', 'KRW', 'VND', 'XOF', 'XAF'];
  const decimals = noDecimalCurrencies.includes(currencyCode) ? 0 : 2;

  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // Position du symbole selon la devise
  const symbolBefore = ['USD', 'GBP', 'EUR', 'CAD', 'AUD'].includes(currencyCode);
  
  if (symbolBefore) {
    return `${currency.symbol}${formattedAmount}`;
  }
  
  return `${formattedAmount} ${currency.symbol}`;
}

/**
 * Format a number as a compact currency (e.g., 1.5M, 2.3K)
 */
export function formatCompactCurrency(amount: number, currencyCode: string = 'GNF'): string {
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currency?.symbol || currencyCode;

  if (amount >= 1_000_000_000) {
    return `${symbol}${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  }
  
  return formatCurrency(amount, currencyCode);
}

/**
 * Format a phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 9) {
    // Guinea format: XXX XX XX XX
    return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  }
  
  // Default: just add spaces every 3 digits
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

/**
 * Format a date and time for display
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "il y a 5 minutes")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHour < 24) return `Il y a ${diffHour}h`;
  if (diffDay < 7) return `Il y a ${diffDay}j`;
  
  return formatDate(d);
}
