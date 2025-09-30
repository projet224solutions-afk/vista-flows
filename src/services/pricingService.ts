/**
 * SERVICE DE TARIFICATION DYNAMIQUE TAXI-MOTO
 * Calcul ultra professionnel des prix avec majorations intelligentes
 * 224Solutions - Taxi-Moto System
 */

import { supabase } from '@/integrations/supabase/client';

export interface PricingConfig {
    vehicleType: 'moto_economique' | 'moto_rapide' | 'moto_premium';
    basePrice: number;
    pricePerKm: number;
    pricePerMinute: number;
    peakHourMultiplier: number;
    nightMultiplier: number;
    weekendMultiplier: number;
    rainMultiplier: number;
    peakHours: Array<{ start: string; end: string }>;
}

export interface PriceCalculationInput {
    distance: number; // en km
    duration: number; // en minutes
    vehicleType: 'moto_economique' | 'moto_rapide' | 'moto_premium';
    pickupTime?: Date;
    weatherConditions?: 'clear' | 'rain' | 'storm';
    isScheduled?: boolean;
}

export interface PriceBreakdown {
    basePrice: number;
    distancePrice: number;
    timePrice: number;
    surgeMultiplier: number;
    surgeAmount: number;
    subtotal: number;
    taxes: number;
    totalPrice: number;
    currency: string;
    appliedMultipliers: Array<{
        type: 'peak_hour' | 'night' | 'weekend' | 'rain' | 'demand';
        multiplier: number;
        reason: string;
    }>;
}

export interface DemandData {
    currentDemand: 'low' | 'medium' | 'high' | 'very_high';
    availableDrivers: number;
    activeRides: number;
    demandMultiplier: number;
}

class PricingService {
    private pricingConfigs: Map<string, PricingConfig> = new Map();
    private lastConfigUpdate: Date | null = null;
    private readonly CONFIG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.loadPricingConfigs();
    }

    /**
     * Charge les configurations de tarification depuis la base de données
     */
    private async loadPricingConfigs(): Promise<void> {
        try {
            const { data, error } = await supabase
                .from('taxi_pricing')
                .select('*')
                .eq('is_active', true);

            if (error) {
                console.error('Erreur chargement tarifs:', error);
                this.setDefaultConfigs();
                return;
            }

            this.pricingConfigs.clear();

            data.forEach(config => {
                this.pricingConfigs.set(config.vehicle_type, {
                    vehicleType: config.vehicle_type,
                    basePrice: config.base_price,
                    pricePerKm: config.price_per_km,
                    pricePerMinute: config.price_per_minute,
                    peakHourMultiplier: config.peak_hour_multiplier,
                    nightMultiplier: config.night_multiplier,
                    weekendMultiplier: config.weekend_multiplier,
                    rainMultiplier: config.rain_multiplier,
                    peakHours: config.peak_hours || [
                        { start: '07:00', end: '09:00' },
                        { start: '17:00', end: '19:00' }
                    ]
                });
            });

            this.lastConfigUpdate = new Date();
            console.log('✅ Configurations de tarification chargées');

        } catch (error) {
            console.error('Erreur lors du chargement des tarifs:', error);
            this.setDefaultConfigs();
        }
    }

    /**
     * Définit les configurations par défaut
     */
    private setDefaultConfigs(): void {
        const defaultConfigs: PricingConfig[] = [
            {
                vehicleType: 'moto_economique',
                basePrice: 500,
                pricePerKm: 150,
                pricePerMinute: 30,
                peakHourMultiplier: 1.3,
                nightMultiplier: 1.2,
                weekendMultiplier: 1.1,
                rainMultiplier: 1.4,
                peakHours: [
                    { start: '07:00', end: '09:00' },
                    { start: '17:00', end: '19:00' }
                ]
            },
            {
                vehicleType: 'moto_rapide',
                basePrice: 750,
                pricePerKm: 200,
                pricePerMinute: 40,
                peakHourMultiplier: 1.4,
                nightMultiplier: 1.3,
                weekendMultiplier: 1.2,
                rainMultiplier: 1.5,
                peakHours: [
                    { start: '07:00', end: '09:00' },
                    { start: '17:00', end: '19:00' }
                ]
            },
            {
                vehicleType: 'moto_premium',
                basePrice: 1000,
                pricePerKm: 250,
                pricePerMinute: 50,
                peakHourMultiplier: 1.5,
                nightMultiplier: 1.4,
                weekendMultiplier: 1.3,
                rainMultiplier: 1.6,
                peakHours: [
                    { start: '07:00', end: '09:00' },
                    { start: '17:00', end: '19:00' }
                ]
            }
        ];

        defaultConfigs.forEach(config => {
            this.pricingConfigs.set(config.vehicleType, config);
        });
    }

    /**
     * Vérifie si les configurations doivent être rechargées
     */
    private shouldReloadConfigs(): boolean {
        if (!this.lastConfigUpdate) return true;
        const now = new Date();
        return (now.getTime() - this.lastConfigUpdate.getTime()) > this.CONFIG_CACHE_DURATION;
    }

    /**
     * Calcule le prix d'une course
     */
    async calculatePrice(input: PriceCalculationInput): Promise<PriceBreakdown> {
        // Recharger les configs si nécessaire
        if (this.shouldReloadConfigs()) {
            await this.loadPricingConfigs();
        }

        const config = this.pricingConfigs.get(input.vehicleType);
        if (!config) {
            throw new Error(`Configuration de tarification non trouvée pour ${input.vehicleType}`);
        }

        const pickupTime = input.pickupTime || new Date();
        const appliedMultipliers: PriceBreakdown['appliedMultipliers'] = [];

        // Calculs de base
        const basePrice = config.basePrice;
        const distancePrice = Math.round(input.distance * config.pricePerKm);
        const timePrice = Math.round(input.duration * config.pricePerMinute);
        const subtotal = basePrice + distancePrice + timePrice;

        // Calcul des majorations
        let totalMultiplier = 1.0;

        // Majoration heures de pointe
        if (this.isPeakHour(pickupTime, config.peakHours)) {
            totalMultiplier *= config.peakHourMultiplier;
            appliedMultipliers.push({
                type: 'peak_hour',
                multiplier: config.peakHourMultiplier,
                reason: 'Heure de pointe'
            });
        }

        // Majoration nocturne (22h-6h)
        if (this.isNightTime(pickupTime)) {
            totalMultiplier *= config.nightMultiplier;
            appliedMultipliers.push({
                type: 'night',
                multiplier: config.nightMultiplier,
                reason: 'Tarif nocturne'
            });
        }

        // Majoration weekend
        if (this.isWeekend(pickupTime)) {
            totalMultiplier *= config.weekendMultiplier;
            appliedMultipliers.push({
                type: 'weekend',
                multiplier: config.weekendMultiplier,
                reason: 'Tarif weekend'
            });
        }

        // Majoration météo
        if (input.weatherConditions === 'rain' || input.weatherConditions === 'storm') {
            totalMultiplier *= config.rainMultiplier;
            appliedMultipliers.push({
                type: 'rain',
                multiplier: config.rainMultiplier,
                reason: 'Conditions météorologiques'
            });
        }

        // Majoration demande (surge pricing)
        const demandData = await this.getCurrentDemand(input);
        if (demandData.demandMultiplier > 1.0) {
            totalMultiplier *= demandData.demandMultiplier;
            appliedMultipliers.push({
                type: 'demand',
                multiplier: demandData.demandMultiplier,
                reason: `Forte demande (${demandData.currentDemand})`
            });
        }

        // Calculs finaux
        const surgeAmount = Math.round(subtotal * (totalMultiplier - 1));
        const priceWithSurge = subtotal + surgeAmount;
        const taxes = Math.round(priceWithSurge * 0.18); // TVA 18%
        const totalPrice = priceWithSurge + taxes;

        return {
            basePrice,
            distancePrice,
            timePrice,
            surgeMultiplier: Math.round(totalMultiplier * 100) / 100,
            surgeAmount,
            subtotal,
            taxes,
            totalPrice,
            currency: 'FCFA',
            appliedMultipliers
        };
    }

    /**
     * Vérifie si c'est une heure de pointe
     */
    private isPeakHour(date: Date, peakHours: Array<{ start: string; end: string }>): boolean {
        const currentTime = date.getHours() * 60 + date.getMinutes();

        return peakHours.some(period => {
            const [startHour, startMin] = period.start.split(':').map(Number);
            const [endHour, endMin] = period.end.split(':').map(Number);

            const startTime = startHour * 60 + startMin;
            const endTime = endHour * 60 + endMin;

            return currentTime >= startTime && currentTime <= endTime;
        });
    }

    /**
     * Vérifie si c'est la nuit (22h-6h)
     */
    private isNightTime(date: Date): boolean {
        const hour = date.getHours();
        return hour >= 22 || hour < 6;
    }

    /**
     * Vérifie si c'est le weekend
     */
    private isWeekend(date: Date): boolean {
        const day = date.getDay();
        return day === 0 || day === 6; // Dimanche = 0, Samedi = 6
    }

    /**
     * Obtient les données de demande actuelle
     */
    private async getCurrentDemand(input: PriceCalculationInput): Promise<DemandData> {
        try {
            // Compter les courses actives dans la zone
            const { data: activeRides, error: ridesError } = await supabase
                .from('taxi_rides')
                .select('id')
                .in('status', ['pending', 'accepted', 'driver_arriving', 'in_progress'])
                .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // 30 dernières minutes

            // Compter les conducteurs disponibles
            const { data: availableDrivers, error: driversError } = await supabase
                .from('taxi_drivers')
                .select('id')
                .eq('is_online', true)
                .eq('is_active', true)
                .eq('kyc_status', 'approved')
                .eq('vehicle_type', input.vehicleType);

            if (ridesError || driversError) {
                console.error('Erreur calcul demande:', ridesError || driversError);
                return {
                    currentDemand: 'medium',
                    availableDrivers: 10,
                    activeRides: 5,
                    demandMultiplier: 1.0
                };
            }

            const activeRidesCount = activeRides?.length || 0;
            const availableDriversCount = availableDrivers?.length || 0;

            // Calcul du ratio demande/offre
            const demandRatio = availableDriversCount > 0 ? activeRidesCount / availableDriversCount : 2;

            let currentDemand: DemandData['currentDemand'] = 'low';
            let demandMultiplier = 1.0;

            if (demandRatio >= 2) {
                currentDemand = 'very_high';
                demandMultiplier = 2.0;
            } else if (demandRatio >= 1.5) {
                currentDemand = 'high';
                demandMultiplier = 1.5;
            } else if (demandRatio >= 1) {
                currentDemand = 'medium';
                demandMultiplier = 1.2;
            }

            return {
                currentDemand,
                availableDrivers: availableDriversCount,
                activeRides: activeRidesCount,
                demandMultiplier
            };

        } catch (error) {
            console.error('Erreur lors du calcul de la demande:', error);
            return {
                currentDemand: 'medium',
                availableDrivers: 10,
                activeRides: 5,
                demandMultiplier: 1.0
            };
        }
    }

    /**
     * Obtient une estimation rapide de prix
     */
    async getQuickEstimate(
        distance: number,
        vehicleType: 'moto_economique' | 'moto_rapide' | 'moto_premium'
    ): Promise<{ min: number; max: number; currency: string }> {
        const config = this.pricingConfigs.get(vehicleType);
        if (!config) {
            return { min: 500, max: 1500, currency: 'FCFA' };
        }

        // Estimation basique sans majorations
        const baseEstimate = config.basePrice + (distance * config.pricePerKm);

        // Fourchette avec majorations possibles
        const minPrice = Math.round(baseEstimate * 1.0); // Prix de base
        const maxPrice = Math.round(baseEstimate * 2.2); // Avec toutes les majorations possibles

        return {
            min: minPrice,
            max: maxPrice,
            currency: 'FCFA'
        };
    }

    /**
     * Compare les prix entre différents types de véhicules
     */
    async comparePrices(input: Omit<PriceCalculationInput, 'vehicleType'>): Promise<Array<{
        vehicleType: string;
        vehicleName: string;
        price: PriceBreakdown;
        estimatedArrival: string;
    }>> {
        const vehicleTypes: Array<{
            type: 'moto_economique' | 'moto_rapide' | 'moto_premium';
            name: string;
            estimatedArrival: string;
        }> = [
                { type: 'moto_economique', name: 'Moto Économique', estimatedArrival: '8-12 min' },
                { type: 'moto_rapide', name: 'Moto Rapide', estimatedArrival: '5-8 min' },
                { type: 'moto_premium', name: 'Moto Premium', estimatedArrival: '3-5 min' }
            ];

        const comparisons = await Promise.all(
            vehicleTypes.map(async (vehicle) => {
                const price = await this.calculatePrice({
                    ...input,
                    vehicleType: vehicle.type
                });

                return {
                    vehicleType: vehicle.type,
                    vehicleName: vehicle.name,
                    price,
                    estimatedArrival: vehicle.estimatedArrival
                };
            })
        );

        return comparisons.sort((a, b) => a.price.totalPrice - b.price.totalPrice);
    }

    /**
     * Formate un prix pour l'affichage
     */
    formatPrice(amount: number, currency: string = 'FCFA'): string {
        return `${amount.toLocaleString()} ${currency}`;
    }

    /**
     * Obtient les configurations actuelles
     */
    getPricingConfigs(): Map<string, PricingConfig> {
        return new Map(this.pricingConfigs);
    }

    /**
     * Force le rechargement des configurations
     */
    async reloadConfigs(): Promise<void> {
        await this.loadPricingConfigs();
    }
}

// Instance singleton
export const pricingService = new PricingService();

// Utilitaires exportés
export const formatCurrency = (amount: number, currency: string = 'FCFA'): string => {
    return `${amount.toLocaleString()} ${currency}`;
};

export const calculateCommission = (totalPrice: number, commissionRate: number = 0.15): {
    platformCommission: number;
    driverAmount: number;
} => {
    const platformCommission = Math.round(totalPrice * commissionRate);
    const driverAmount = totalPrice - platformCommission;

    return {
        platformCommission,
        driverAmount
    };
};

export const getVehicleTypeInfo = (vehicleType: string) => {
    const vehicleInfo = {
        moto_economique: {
            name: 'Moto Économique',
            description: 'Solution économique pour vos déplacements',
            icon: '🏍️',
            features: ['Prix abordable', 'Conducteur expérimenté', 'Casque fourni']
        },
        moto_rapide: {
            name: 'Moto Rapide',
            description: 'Déplacement rapide et efficace',
            icon: '🏍️',
            features: ['Trajet optimisé', 'Conducteur expert', 'Équipement de sécurité']
        },
        moto_premium: {
            name: 'Moto Premium',
            description: 'Service haut de gamme avec confort maximal',
            icon: '🏍️',
            features: ['Moto récente', 'Conducteur VIP', 'Équipement premium', 'Service prioritaire']
        }
    };

    return vehicleInfo[vehicleType as keyof typeof vehicleInfo] || vehicleInfo.moto_economique;
};
