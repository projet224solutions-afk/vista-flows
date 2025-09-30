import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserCompleteInfo {
    user_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
    custom_id?: string;
    wallet?: {
        id: string;
        balance: number;
        currency: string;
        status: string;
    };
    virtual_card?: {
        id: string;
        card_number: string;
        card_holder_name: string;
        expiry_month: string;
        expiry_year: string;
        card_status: string;
        daily_limit: number;
        monthly_limit: number;
    };
}

export const useUserSetup = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<UserCompleteInfo | null>(null);

    // Fonction pour vérifier et créer le setup utilisateur complet
    const ensureUserSetup = async (userId: string) => {
        setIsLoading(true);
        try {
            console.log('🔍 Vérification du setup utilisateur pour:', userId);

            // 1. Vérifier d'abord si l'utilisateur a déjà tout son setup
            const { data: completeInfo, error: infoError } = await supabase
                .rpc('get_user_complete_info', { target_user_id: userId });

            if (infoError) {
                console.error('❌ Erreur lors de la récupération des infos:', infoError);
                throw infoError;
            }

            console.log('📋 Infos utilisateur récupérées:', completeInfo);

            // 2. Vérifier les éléments manquants
            const missingElements = [];

            if (!completeInfo?.custom_id) {
                missingElements.push('ID utilisateur');
            }

            if (!completeInfo?.wallet?.id) {
                missingElements.push('Wallet');
            }

            if (!completeInfo?.virtual_card?.id) {
                missingElements.push('Carte virtuelle');
            }

            // 3. Si des éléments manquent, les créer
            if (missingElements.length > 0) {
                console.log('⚠️ Éléments manquants détectés:', missingElements);
                toast.info(`Configuration en cours: ${missingElements.join(', ')}`);

                await createMissingElements(userId, completeInfo);

                // Récupérer les infos mises à jour
                const { data: updatedInfo, error: updateError } = await supabase
                    .rpc('get_user_complete_info', { target_user_id: userId });

                if (updateError) {
                    throw updateError;
                }

                setUserInfo(updatedInfo);
                toast.success('✅ Configuration utilisateur complétée !');
            } else {
                console.log('✅ Setup utilisateur complet déjà en place');
                setUserInfo(completeInfo);
            }

            return completeInfo;
        } catch (error) {
            console.error('❌ Erreur setup utilisateur:', error);
            toast.error('Erreur lors de la configuration utilisateur');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Fonction pour créer les éléments manquants
    const createMissingElements = async (userId: string, currentInfo: any) => {
        try {
            // Créer l'ID utilisateur s'il manque
            if (!currentInfo?.custom_id) {
                console.log('🔄 Création ID utilisateur...');
                const customId = await generateCustomId();

                const { error: idError } = await supabase
                    .from('user_ids')
                    .upsert({
                        user_id: userId,
                        custom_id: customId
                    });

                if (idError) {
                    console.error('❌ Erreur création ID:', idError);
                    throw idError;
                }

                console.log('✅ ID utilisateur créé:', customId);
            }

            // Créer le wallet s'il manque
            if (!currentInfo?.wallet?.id) {
                console.log('🔄 Création Wallet...');
                const { data: walletData, error: walletError } = await supabase
                    .from('wallets')
                    .upsert({
                        user_id: userId,
                        balance: 0,
                        currency: 'XAF',
                        status: 'active'
                    })
                    .select()
                    .single();

                if (walletError) {
                    console.error('❌ Erreur création wallet:', walletError);
                    throw walletError;
                }

                console.log('✅ Wallet créé:', walletData);

                // Créer la carte virtuelle si le wallet vient d'être créé
                if (!currentInfo?.virtual_card?.id) {
                    console.log('🔄 Création Carte virtuelle...');
                    await createVirtualCard(userId, walletData.id, currentInfo);
                }
            }

        } catch (error) {
            console.error('❌ Erreur création éléments manquants:', error);
            throw error;
        }
    };

    // Fonction pour créer une carte virtuelle
    const createVirtualCard = async (userId: string, walletId: string, userInfo: any) => {
        try {
            const cardNumber = generateVirtualCardNumber();
            const cvv = generateCVV();
            const currentDate = new Date();
            const expiryDate = new Date(currentDate.getFullYear() + 3, currentDate.getMonth());

            const cardHolderName = userInfo?.first_name && userInfo?.last_name
                ? `${userInfo.first_name} ${userInfo.last_name}`.trim()
                : userInfo?.email?.split('@')[0] || 'Utilisateur 224Solutions';

            const { data: cardData, error: cardError } = await supabase
                .from('virtual_cards')
                .upsert({
                    user_id: userId,
                    wallet_id: walletId,
                    card_number: cardNumber,
                    card_holder_name: cardHolderName,
                    expiry_month: String(expiryDate.getMonth() + 1).padStart(2, '0'),
                    expiry_year: String(expiryDate.getFullYear()),
                    cvv: cvv,
                    card_type: 'virtual',
                    card_status: 'active',
                    daily_limit: 500000,
                    monthly_limit: 10000000
                })
                .select()
                .single();

            if (cardError) {
                console.error('❌ Erreur création carte virtuelle:', cardError);
                throw cardError;
            }

            console.log('✅ Carte virtuelle créée:', cardData);
            return cardData;
        } catch (error) {
            console.error('❌ Erreur création carte virtuelle:', error);
            throw error;
        }
    };

    // Fonction pour générer un ID utilisateur unique (3 lettres + 4 chiffres)
    const generateCustomId = async (): Promise<string> => {
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            // Générer 3 lettres aléatoires (A-Z)
            let letters = '';
            for (let i = 0; i < 3; i++) {
                letters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
            }

            // Générer 4 chiffres aléatoires (0-9)
            let numbers = '';
            for (let i = 0; i < 4; i++) {
                numbers += Math.floor(Math.random() * 10).toString();
            }

            const id = letters + numbers;

            // Vérifier l'unicité
            const { data, error } = await supabase
                .from('user_ids')
                .select('custom_id')
                .eq('custom_id', id)
                .single();

            if (error && error.code === 'PGRST116') {
                // Aucun résultat trouvé, l'ID est unique
                return id;
            }

            attempts++;
        }

        // Si on arrive ici, générer un ID basé sur le timestamp avec le bon format
        const timestamp = Date.now().toString();
        const letters = 'USR';
        const numbers = timestamp.slice(-4);
        return letters + numbers;
    };

    // Fonction pour générer un numéro de carte virtuelle
    const generateVirtualCardNumber = (): string => {
        const part1 = '2245'; // Préfixe 224Solutions
        const part2 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const part3 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const part4 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

        return `${part1}${part2}${part3}${part4}`;
    };

    // Fonction pour générer un CVV
    const generateCVV = (): string => {
        return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    };

    // Hook pour vérifier automatiquement le setup au montage
    const checkUserSetup = async (userId: string) => {
        if (userId) {
            try {
                await ensureUserSetup(userId);
            } catch (error) {
                console.error('Erreur lors de la vérification du setup:', error);
            }
        }
    };

    return {
        isLoading,
        userInfo,
        ensureUserSetup,
        checkUserSetup,
        createMissingElements
    };
};
