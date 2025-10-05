/**
 * 🔄 UTILITAIRE DE MISE À JOUR DES TAUX DE CHANGE
 * Service automatique pour maintenir les taux de change à jour
 */

import { CurrencyExchangeService } from '@/services/CurrencyExchangeService';

class CurrencyUpdater {
    private static instance: CurrencyUpdater;
    private updateInterval: NodeJS.Timeout | null = null;
    private isRunning = false;

    private constructor() { }

    static getInstance(): CurrencyUpdater {
        if (!CurrencyUpdater.instance) {
            CurrencyUpdater.instance = new CurrencyUpdater();
        }
        return CurrencyUpdater.instance;
    }

    /**
     * Démarrer la mise à jour automatique
     */
    start(): void {
        if (this.isRunning) {
            console.log('🔄 Currency updater already running');
            return;
        }

        console.log('🚀 Starting currency exchange rate updater...');
        this.isRunning = true;

        // Mise à jour immédiate
        this.updateRates();

        // Programmer les mises à jour suivantes (toutes les 6 heures)
        this.updateInterval = setInterval(() => {
            this.updateRates();
        }, 6 * 60 * 60 * 1000); // 6 heures

        console.log('✅ Currency updater started (updates every 6 hours)');
    }

    /**
     * Arrêter la mise à jour automatique
     */
    stop(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isRunning = false;
        console.log('⏹️ Currency updater stopped');
    }

    /**
     * Effectuer une mise à jour manuelle
     */
    async updateRates(): Promise<void> {
        try {
            console.log('🔄 Updating exchange rates...');
            const result = await CurrencyExchangeService.updateExchangeRatesFromAPI();

            if (result.success) {
                console.log(`✅ Exchange rates updated successfully: ${result.message}`);
            } else {
                console.warn(`⚠️ Exchange rates update failed: ${result.message}`);
            }
        } catch (error) {
            console.error('❌ Error updating exchange rates:', error);
        }
    }

    /**
     * Vérifier le statut
     */
    getStatus(): { isRunning: boolean; hasInterval: boolean } {
        return {
            isRunning: this.isRunning,
            hasInterval: this.updateInterval !== null
        };
    }
}

// Instance singleton
export const currencyUpdater = CurrencyUpdater.getInstance();

// Démarrer automatiquement en production
if (process.env.NODE_ENV === 'production') {
    currencyUpdater.start();
}

export default currencyUpdater;
