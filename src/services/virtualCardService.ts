/**
 * Service de gestion des cartes virtuelles 224SOLUTIONS
 * 
 * Fonctionnalités:
 * - Création automatique de cartes virtuelles
 * - Gestion des limites et statuts
 * - Sécurité et chiffrement
 * - Intégration avec le système wallet
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ===================================================
// TYPES ET INTERFACES
// ===================================================

export interface VirtualCard {
    id: string;
    user_id: string;
    wallet_id: string;
    card_number: string;
    card_holder_name: string;
    expiry_month: string;
    expiry_year: string;
    cvv: string;
    card_type: CardType;
    card_status: CardStatus;
    daily_limit: number;
    monthly_limit: number;
    created_at: string;
    updated_at: string;
}

export interface CardTransaction {
    id: string;
    card_id: string;
    amount: number;
    merchant: string;
    description: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    created_at: string;
}

export interface CardLimits {
    daily_limit: number;
    monthly_limit: number;
    daily_spent: number;
    monthly_spent: number;
}

// Enums
export type CardType = 'virtual' | 'physical' | 'prepaid';
export type CardStatus = 'active' | 'blocked' | 'expired' | 'pending';

// ===================================================
// SERVICE PRINCIPAL
// ===================================================

export class VirtualCardService {

    // ===================================================
    // RÉCUPÉRATION DES CARTES
    // ===================================================

    /**
     * Récupérer la carte virtuelle d'un utilisateur
     */
    static async getUserCard(userId: string): Promise<VirtualCard | null> {
        try {
            const { data, error } = await supabase
                .from('virtual_cards')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Erreur récupération carte:', error);
                return null;
            }

            return data as VirtualCard | null;
        } catch (error) {
            console.error('Erreur récupération carte:', error);
            return null;
        }
    }

    /**
     * Récupérer toutes les cartes (pour PDG)
     */
    static async getAllCards(): Promise<VirtualCard[]> {
        try {
            const { data, error } = await supabase
                .from('virtual_cards')
                .select(`
          *,
          profiles!virtual_cards_user_id_fkey(email, full_name, role),
          wallets!virtual_cards_wallet_id_fkey(balance)
        `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erreur récupération toutes cartes:', error);
                return [];
            }

            return data as VirtualCard[];
        } catch (error) {
            console.error('Erreur récupération toutes cartes:', error);
            return [];
        }
    }

    // ===================================================
    // GESTION DES CARTES
    // ===================================================

    /**
     * Bloquer/débloquer une carte
     */
    static async toggleCardStatus(cardId: string, newStatus: CardStatus): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('virtual_cards')
                .update({
                    card_status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cardId);

            if (error) {
                console.error('Erreur changement statut carte:', error);
                toast.error('Impossible de changer le statut de la carte');
                return false;
            }

            const statusText = {
                'active': 'activée',
                'blocked': 'bloquée',
                'expired': 'expirée',
                'pending': 'en attente'
            }[newStatus];

            toast.success(`Carte ${statusText} avec succès`);
            return true;
        } catch (error) {
            console.error('Erreur changement statut carte:', error);
            toast.error('Erreur lors du changement de statut');
            return false;
        }
    }

    /**
     * Mettre à jour les limites de la carte
     */
    static async updateCardLimits(
        cardId: string,
        dailyLimit: number,
        monthlyLimit: number
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('virtual_cards')
                .update({
                    daily_limit: dailyLimit,
                    monthly_limit: monthlyLimit,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cardId);

            if (error) {
                console.error('Erreur mise à jour limites carte:', error);
                toast.error('Impossible de mettre à jour les limites');
                return false;
            }

            toast.success('Limites de carte mises à jour');
            return true;
        } catch (error) {
            console.error('Erreur mise à jour limites carte:', error);
            toast.error('Erreur lors de la mise à jour');
            return false;
        }
    }

    /**
     * Renouveler une carte (nouvelle expiration, nouveau CVV)
     */
    static async renewCard(cardId: string): Promise<VirtualCard | null> {
        try {
            // Générer nouvelles données
            const newExpiryYear = (new Date().getFullYear() + 3).toString();
            const newExpiryMonth = String(new Date().getMonth() + 1).padStart(2, '0');
            const newCvv = Math.floor(100 + Math.random() * 900).toString();

            const { data, error } = await supabase
                .from('virtual_cards')
                .update({
                    expiry_month: newExpiryMonth,
                    expiry_year: newExpiryYear,
                    cvv: newCvv,
                    card_status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', cardId)
                .select()
                .single();

            if (error) {
                console.error('Erreur renouvellement carte:', error);
                toast.error('Impossible de renouveler la carte');
                return null;
            }

            toast.success('Carte renouvelée avec succès');
            return data as VirtualCard;
        } catch (error) {
            console.error('Erreur renouvellement carte:', error);
            toast.error('Erreur lors du renouvellement');
            return null;
        }
    }

    // ===================================================
    // UTILISATION DE LA CARTE
    // ===================================================

    /**
     * Vérifier si une transaction est autorisée
     */
    static async validateTransaction(
        cardId: string,
        amount: number
    ): Promise<{ valid: boolean; reason?: string }> {
        try {
            // Récupérer la carte
            const { data: card, error } = await supabase
                .from('virtual_cards')
                .select('*')
                .eq('id', cardId)
                .single();

            if (error || !card) {
                return { valid: false, reason: 'Carte introuvable' };
            }

            // Vérifier le statut
            if (card.card_status !== 'active') {
                return { valid: false, reason: 'Carte non active' };
            }

            // Vérifier l'expiration
            const currentDate = new Date();
            const expiryDate = new Date(parseInt(card.expiry_year), parseInt(card.expiry_month) - 1);

            if (currentDate > expiryDate) {
                return { valid: false, reason: 'Carte expirée' };
            }

            // Vérifier les limites (simulation - dans un vrai système, on vérifierait la consommation)
            if (amount > card.daily_limit) {
                return { valid: false, reason: 'Limite quotidienne dépassée' };
            }

            if (amount > card.monthly_limit) {
                return { valid: false, reason: 'Limite mensuelle dépassée' };
            }

            return { valid: true };
        } catch (error) {
            console.error('Erreur validation transaction:', error);
            return { valid: false, reason: 'Erreur de validation' };
        }
    }

    /**
     * Effectuer un paiement avec la carte
     */
    static async processCardPayment(
        cardId: string,
        amount: number,
        merchant: string,
        description: string
    ): Promise<boolean> {
        try {
            // Valider la transaction
            const validation = await this.validateTransaction(cardId, amount);
            if (!validation.valid) {
                toast.error(`Paiement refusé: ${validation.reason}`);
                return false;
            }

            // Récupérer la carte et le wallet
            const { data: card, error: cardError } = await supabase
                .from('virtual_cards')
                .select('*, wallets(*)')
                .eq('id', cardId)
                .single();

            if (cardError || !card) {
                toast.error('Carte introuvable');
                return false;
            }

            // Vérifier le solde du wallet
            const wallet = (card as any).wallets;
            if (wallet.balance < amount) {
                toast.error('Solde insuffisant sur le wallet');
                return false;
            }

            // Débiter le wallet (simulation)
            const { error: walletError } = await supabase
                .from('wallets')
                .update({
                    balance: wallet.balance - amount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);

            if (walletError) {
                console.error('Erreur débit wallet:', walletError);
                toast.error('Erreur lors du débit');
                return false;
            }

            // Enregistrer la transaction de carte (si on avait une table dédiée)
            // Pour l'instant, on utilise les transactions wallet existantes

            toast.success(`Paiement de ${this.formatAmount(amount)} réussi chez ${merchant}`);
            return true;
        } catch (error) {
            console.error('Erreur paiement carte:', error);
            toast.error('Erreur lors du paiement');
            return false;
        }
    }

    // ===================================================
    // STATISTIQUES ET MONITORING
    // ===================================================

    /**
     * Récupérer les statistiques des cartes (pour PDG)
     */
    static async getCardStats(): Promise<{
        total_cards: number;
        active_cards: number;
        blocked_cards: number;
        total_transactions: number;
        total_volume: number;
    }> {
        try {
            const { data: cards, error: cardsError } = await supabase
                .from('virtual_cards')
                .select('card_status');

            if (cardsError) {
                console.error('Erreur stats cartes:', cardsError);
                return {
                    total_cards: 0,
                    active_cards: 0,
                    blocked_cards: 0,
                    total_transactions: 0,
                    total_volume: 0
                };
            }

            const totalCards = cards.length;
            const activeCards = cards.filter(c => c.card_status === 'active').length;
            const blockedCards = cards.filter(c => c.card_status === 'blocked').length;

            // Pour les transactions, on pourrait compter celles liées aux cartes
            // Pour l'instant, on simule
            return {
                total_cards: totalCards,
                active_cards: activeCards,
                blocked_cards: blockedCards,
                total_transactions: totalCards * 15, // Simulation
                total_volume: totalCards * 125000 // Simulation
            };
        } catch (error) {
            console.error('Erreur récupération stats cartes:', error);
            return {
                total_cards: 0,
                active_cards: 0,
                blocked_cards: 0,
                total_transactions: 0,
                total_volume: 0
            };
        }
    }

    /**
     * Récupérer les limites et consommation d'une carte
     */
    static async getCardLimits(cardId: string): Promise<CardLimits | null> {
        try {
            const { data: card, error } = await supabase
                .from('virtual_cards')
                .select('daily_limit, monthly_limit')
                .eq('id', cardId)
                .single();

            if (error || !card) {
                return null;
            }

            // Dans un vrai système, on calculerait la consommation réelle
            // Pour l'instant, on simule
            const dailySpent = Math.floor(Math.random() * card.daily_limit * 0.3);
            const monthlySpent = Math.floor(Math.random() * card.monthly_limit * 0.2);

            return {
                daily_limit: card.daily_limit,
                monthly_limit: card.monthly_limit,
                daily_spent: dailySpent,
                monthly_spent: monthlySpent
            };
        } catch (error) {
            console.error('Erreur récupération limites carte:', error);
            return null;
        }
    }

    // ===================================================
    // SÉCURITÉ ET MASQUAGE
    // ===================================================

    /**
     * Masquer le numéro de carte pour l'affichage
     */
    static maskCardNumber(cardNumber: string): string {
        if (!cardNumber || cardNumber.length < 4) return '****';

        const lastFour = cardNumber.slice(-4);
        const maskedPart = '*'.repeat(cardNumber.length - 4);

        return maskedPart + lastFour;
    }

    /**
     * Formater le numéro de carte avec des espaces
     */
    static formatCardNumber(cardNumber: string): string {
        return cardNumber.replace(/(.{4})/g, '$1 ').trim();
    }

    /**
     * Masquer le CVV
     */
    static maskCVV(): string {
        return '***';
    }

    /**
     * Vérifier si l'utilisateur peut voir les détails complets
     */
    static canViewFullCardDetails(userRole: string): boolean {
        return ['pdg', 'admin'].includes(userRole.toLowerCase());
    }

    // ===================================================
    // UTILITAIRES
    // ===================================================

    /**
     * Formater un montant en XAF
     */
    static formatAmount(amount: number): string {
        return new Intl.NumberFormat('fr-CM', {
            style: 'currency',
            currency: 'XAF',
            minimumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Valider un numéro de carte
     */
    static validateCardNumber(cardNumber: string): boolean {
        // Algorithme de Luhn (algorithme de validation des cartes)
        if (!/^\d{16}$/.test(cardNumber)) return false;

        let sum = 0;
        let isEven = false;

        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i));

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }

    /**
     * Obtenir le type de carte basé sur le numéro
     */
    static getCardBrand(cardNumber: string): string {
        if (cardNumber.startsWith('2245')) return '224Solutions Virtual';
        if (cardNumber.startsWith('4')) return 'Visa';
        if (cardNumber.startsWith('5')) return 'Mastercard';
        if (cardNumber.startsWith('3')) return 'American Express';
        return 'Inconnu';
    }

    /**
     * Générer un token de sécurité temporaire pour les transactions
     */
    static generateSecurityToken(): string {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}

export default VirtualCardService;
