import { supabase } from '@/integrations/supabase/client';

export interface ExchangeRateData {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
}

export interface CurrencyApiResponse {
    success: boolean;
    rates: Record<string, number>;
    base: string;
    timestamp: number;
}

export class CurrencyExchangeService {
    private static readonly FALLBACK_RATES: Record<string, number> = {
        'GNF': 1.0,
        'USD': 0.00012,
        'EUR': 0.00011,
        'XOF': 0.18,
        'XAF': 0.18,
        'GBP': 0.00009,
        'JPY': 0.018,
        'CNY': 0.00085,
        'CAD': 0.00016,
        'AUD': 0.00018
    };

    /**
     * Mettre à jour les taux de change depuis une API externe
     */
    static async updateExchangeRatesFromAPI(): Promise<{ success: boolean; updatedCount: number; message: string }> {
        try {
            // Essayer d'abord l'API gratuite ExchangeRate-API
            const rates = await this.fetchFromExchangeRateAPI();

            if (rates && Object.keys(rates).length > 0) {
                return await this.saveRatesToDatabase(rates);
            }

            // Fallback vers l'API OpenExchangeRates (si clé API disponible)
            const openExchangeRates = await this.fetchFromOpenExchangeRates();
            if (openExchangeRates && Object.keys(openExchangeRates).length > 0) {
                return await this.saveRatesToDatabase(openExchangeRates);
            }

            // Utiliser les taux de fallback
            console.warn('API de taux de change non disponible, utilisation des taux de fallback');
            return await this.saveRatesToDatabase(this.FALLBACK_RATES);

        } catch (error) {
            console.error('Error updating exchange rates:', error);

            // En cas d'erreur, utiliser les taux de fallback
            return await this.saveRatesToDatabase(this.FALLBACK_RATES);
        }
    }

    /**
     * Récupérer les taux depuis ExchangeRate-API (gratuit, 1000 requêtes/mois)
     */
    private static async fetchFromExchangeRateAPI(): Promise<Record<string, number> | null> {
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/GNF', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                // Timeout de 10 secondes
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.rates && typeof data.rates === 'object') {
                // Convertir les taux pour avoir GNF comme base (1 GNF = X autres devises)
                const convertedRates: Record<string, number> = {};

                // Taux directs depuis GNF
                Object.entries(data.rates).forEach(([currency, rate]) => {
                    if (currency !== 'GNF' && typeof rate === 'number' && rate > 0) {
                        convertedRates[currency] = rate;
                    }
                });

                return convertedRates;
            }

            return null;
        } catch (error) {
            console.error('Error fetching from ExchangeRate-API:', error);
            return null;
        }
    }

    /**
     * Récupérer les taux depuis OpenExchangeRates (nécessite une clé API)
     */
    private static async fetchFromOpenExchangeRates(): Promise<Record<string, number> | null> {
        const apiKey = process.env.REACT_APP_OPENEXCHANGE_API_KEY;

        if (!apiKey) {
            console.log('OpenExchangeRates API key not configured');
            return null;
        }

        try {
            const response = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=GNF`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data: CurrencyApiResponse = await response.json();

            if (data.success && data.rates) {
                return data.rates;
            }

            return null;
        } catch (error) {
            console.error('Error fetching from OpenExchangeRates:', error);
            return null;
        }
    }

    /**
     * Sauvegarder les taux dans la base de données
     */
    private static async saveRatesToDatabase(rates: Record<string, number>): Promise<{ success: boolean; updatedCount: number; message: string }> {
        try {
            // Convertir les taux en format pour la base de données
            const rateEntries: Array<{
                fromCurrency: string;
                toCurrency: string;
                rate: number;
            }> = [];

            // Créer des paires de taux bidirectionnelles
            Object.entries(rates).forEach(([currency, rate]) => {
                if (currency !== 'GNF' && rate > 0) {
                    // GNF vers autre devise
                    rateEntries.push({
                        fromCurrency: 'GNF',
                        toCurrency: currency,
                        rate: rate
                    });

                    // Autre devise vers GNF (inverse)
                    rateEntries.push({
                        fromCurrency: currency,
                        toCurrency: 'GNF',
                        rate: 1 / rate
                    });
                }
            });

            // Ajouter les taux entre devises non-GNF
            const currencies = Object.keys(rates).filter(c => c !== 'GNF');
            for (let i = 0; i < currencies.length; i++) {
                for (let j = i + 1; j < currencies.length; j++) {
                    const fromCurrency = currencies[i];
                    const toCurrency = currencies[j];
                    const fromRate = rates[fromCurrency];
                    const toRate = rates[toCurrency];

                    if (fromRate > 0 && toRate > 0) {
                        const crossRate = toRate / fromRate;

                        rateEntries.push({
                            fromCurrency,
                            toCurrency,
                            rate: crossRate
                        });

                        rateEntries.push({
                            fromCurrency: toCurrency,
                            toCurrency: fromCurrency,
                            rate: 1 / crossRate
                        });
                    }
                }
            }

            // Appeler la fonction SQL pour mettre à jour les taux
            const { data, error } = await supabase.rpc('update_exchange_rates', {
                p_rates: rateEntries
            });

            if (error) {
                throw new Error(error.message);
            }

            return {
                success: true,
                updatedCount: rateEntries.length,
                message: `Taux de change mis à jour avec succès (${rateEntries.length} taux)`
            };

        } catch (error) {
            console.error('Error saving rates to database:', error);
            return {
                success: false,
                updatedCount: 0,
                message: `Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
            };
        }
    }

    /**
     * Récupérer les taux actuels depuis la base de données
     */
    static async getCurrentRates(): Promise<Array<{
        fromCurrency: string;
        toCurrency: string;
        rate: number;
        lastUpdated: string;
    }>> {
        try {
            const { data, error } = await supabase
                .from('exchange_rates')
                .select('from_currency, to_currency, rate, updated_at')
                .eq('is_active', true)
                .order('updated_at', { ascending: false });

            if (error) {
                throw new Error(error.message);
            }

            return data.map(rate => ({
                fromCurrency: rate.from_currency,
                toCurrency: rate.to_currency,
                rate: rate.rate,
                lastUpdated: rate.updated_at
            }));

        } catch (error) {
            console.error('Error getting current rates:', error);
            return [];
        }
    }

    /**
     * Programmer la mise à jour automatique des taux
     */
    static scheduleAutoUpdate(): void {
        // Mise à jour toutes les 24 heures
        const updateInterval = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

        const updateRates = async () => {
            console.log('🔄 Mise à jour automatique des taux de change...');
            const result = await this.updateExchangeRatesFromAPI();
            console.log(`✅ ${result.message}`);
        };

        // Mise à jour immédiate
        updateRates();

        // Programmer les mises à jour suivantes
        setInterval(updateRates, updateInterval);
    }

    /**
     * Convertir un montant entre devises
     */
    static async convertAmount(
        amount: number,
        fromCurrency: string,
        toCurrency: string
    ): Promise<{ convertedAmount: number; rate: number; success: boolean; error?: string }> {
        try {
            if (fromCurrency === toCurrency) {
                return {
                    convertedAmount: amount,
                    rate: 1,
                    success: true
                };
            }

            // Récupérer le taux depuis la base de données
            const { data, error } = await supabase
                .from('exchange_rates')
                .select('rate')
                .eq('from_currency', fromCurrency)
                .eq('to_currency', toCurrency)
                .eq('is_active', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                // Essayer le taux inverse
                const { data: inverseData, error: inverseError } = await supabase
                    .from('exchange_rates')
                    .select('rate')
                    .eq('from_currency', toCurrency)
                    .eq('to_currency', fromCurrency)
                    .eq('is_active', true)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .single();

                if (inverseError || !inverseData) {
                    return {
                        convertedAmount: 0,
                        rate: 0,
                        success: false,
                        error: 'Taux de change non trouvé'
                    };
                }

                const rate = 1 / inverseData.rate;
                return {
                    convertedAmount: amount * rate,
                    rate: rate,
                    success: true
                };
            }

            const rate = data.rate;
            return {
                convertedAmount: amount * rate,
                rate: rate,
                success: true
            };

        } catch (error) {
            console.error('Error converting amount:', error);
            return {
                convertedAmount: 0,
                rate: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Erreur de conversion'
            };
        }
    }

    /**
     * Obtenir les devises supportées
     */
    static getSupportedCurrencies(): Array<{ code: string; name: string; symbol: string; country: string }> {
        return [
            { code: 'GNF', name: 'Guinean Franc', symbol: 'FG', country: 'Guinea' },
            { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States' },
            { code: 'EUR', name: 'Euro', symbol: '€', country: 'European Union' },
            { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', country: 'West Africa' },
            { code: 'XAF', name: 'Central African CFA Franc', symbol: 'CFA', country: 'Central Africa' },
            { code: 'GBP', name: 'British Pound', symbol: '£', country: 'United Kingdom' },
            { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan' },
            { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', country: 'China' },
            { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', country: 'Canada' },
            { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: 'Australia' }
        ];
    }
}
