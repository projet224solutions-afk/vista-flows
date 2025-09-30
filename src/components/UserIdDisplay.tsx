import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

interface UserIdDisplayProps {
    className?: string;
    showBadge?: boolean;
}

export const UserIdDisplay = ({ className = '', showBadge = true }: UserIdDisplayProps) => {
    const { user, profile } = useAuth();
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserId = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('user_ids')
                    .select('custom_id')
                    .eq('user_id', user.id)
                    .single();

                if (error) {
                    console.log('ID utilisateur non trouvé, création en cours...');
                    // Si l'ID n'existe pas, le créer automatiquement
                    await createUserId();
                } else {
                    setUserId(data.custom_id);
                }
            } catch (error) {
                console.error('Erreur lors de la récupération de l\'ID utilisateur:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserId();
    }, [user]);

    const createUserId = async () => {
        if (!user) return;

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

            const { error } = await supabase
                .from('user_ids')
                .upsert({
                    user_id: user.id,
                    custom_id: newId
                });

            if (error) {
                console.error('Erreur création ID:', error);
            } else {
                setUserId(newId);
                console.log('✅ ID utilisateur créé:', newId);
            }
        } catch (error) {
            console.error('Erreur lors de la création de l\'ID utilisateur:', error);
        }
    };

    if (loading) {
        return <span className={`text-gray-400 ${className}`}>...</span>;
    }

    if (!userId) {
        return null;
    }

    const displayName = profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.email?.split('@')[0] || 'Utilisateur';

    if (showBadge) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {userId}
                </Badge>
                <span>{displayName}</span>
            </div>
        );
    }

    return (
        <span className={className}>
            {userId} - {displayName}
        </span>
    );
};

export default UserIdDisplay;
