import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
/**
 * Formate un montant en devise
 */
export function formatCurrency(amount: number, currency: string = 'GNF'): string {
  const formatters: Record<string, Intl.NumberFormat> = {
    'GNF': new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    'USD': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    'EUR': new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }),
    'CNY': new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }),
  };
  
  const formatter = formatters[currency] || new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: currency 
  });
  
  return formatter.format(amount);
}

/**
 * Formate une date
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', options || { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Formate un temps relatif (ex: "il y a 2 heures")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'à l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
  if (diffHour < 24) return `il y a ${diffHour} heure${diffHour > 1 ? 's' : ''}`;
  if (diffDay < 7) return `il y a ${diffDay} jour${diffDay > 1 ? 's' : ''}`;
  
  return formatDate(d);
}