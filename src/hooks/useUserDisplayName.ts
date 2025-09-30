import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserDisplayInfo {
    customId: string | null;
    displayName: string;
    fullDisplayName: string; // Format: "ABC1234 - Jean Dupont"
}

export const useUserDisplayName = () => {
    const { user, profile } = useAuth();
    const [userDisplay, setUserDisplay] = useState<UserDisplayInfo>({
        customId: null,
        displayName: 'Utilisateur',
        fullDisplayName: 'Utilisateur'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserDisplayInfo = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // Récupérer l'ID personnalisé
                const { data: userIdData, error: userIdError } = await supabase
                    .from('user_ids')
                    .select('custom_id')
                    .eq('user_id', user.id)
                    .single();

                let customId = null;
                if (!userIdError && userIdData) {
                    customId = userIdData.custom_id;
                }

                // Construire le nom d'affichage
                let displayName = 'Utilisateur';
                if (profile?.first_name && profile?.last_name) {
                    displayName = `${profile.first_name} ${profile.last_name}`;
                } else if (profile?.first_name) {
                    displayName = profile.first_name;
                } else if (profile?.email) {
                    displayName = profile.email.split('@')[0];
                } else if (user.email) {
                    displayName = user.email.split('@')[0];
                }

                // Format complet avec ID devant
                const fullDisplayName = customId
                    ? `${customId} - ${displayName}`
                    : displayName;

                setUserDisplay({
                    customId,
                    displayName,
                    fullDisplayName
                });

            } catch (error) {
                console.error('Erreur lors de la récupération des infos utilisateur:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserDisplayInfo();
    }, [user, profile]);

    // Fonction pour créer un ID si manquant
    const ensureUserId = async (): Promise<string | null> => {
        if (!user || userDisplay.customId) {
            return userDisplay.customId;
        }

        try {
            // Générer un ID au format 3 lettres + 4 chiffres
            let letters = '';
            for (let i = 0; i < 3; i++) {
                letters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
            }

            let numbers = '';
            for (let i = 0; i < 4; i++) {
                numbers += Math.floor(Math.random() * 10).toString();
            }

            const newId = letters + numbers;

            // Vérifier l'unicité et créer l'ID
            const { error } = await supabase
                .from('user_ids')
                .upsert({
                    user_id: user.id,
                    custom_id: newId
                });

            if (error) {
                console.error('Erreur création ID:', error);
                return null;
            }

            // Mettre à jour l'état local
            setUserDisplay(prev => ({
                ...prev,
                customId: newId,
                fullDisplayName: `${newId} - ${prev.displayName}`
            }));

            console.log('✅ ID utilisateur créé:', newId);
            return newId;

        } catch (error) {
            console.error('Erreur lors de la création de l\'ID utilisateur:', error);
            return null;
        }
    };

    return {
        userDisplay,
        loading,
        ensureUserId,
        // Helpers pour l'affichage
        customId: userDisplay.customId,
        displayName: userDisplay.displayName,
        fullDisplayName: userDisplay.fullDisplayName
    };
};

export default useUserDisplayName;
