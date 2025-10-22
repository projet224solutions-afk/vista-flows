import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePublicId } from '@/hooks/usePublicId';
import { PublicIdBadge } from '@/components/PublicIdBadge';
import { Badge } from '@/components/ui/badge';

interface UserIdDisplayProps {
  className?: string;
  showBadge?: boolean;
  layout?: 'horizontal' | 'vertical';
  showPublicId?: boolean; // Afficher le nouveau public_id
}

export const UserIdDisplay = ({ 
  className = '', 
  showBadge = true, 
  layout = 'horizontal',
  showPublicId = true 
}: UserIdDisplayProps) => {
  const { user, profile } = useAuth();
  const { generatePublicId } = usePublicId();
  const [userId, setUserId] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserId = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Récupérer le custom_id (ancien système)
        const { data, error } = await supabase
          .from('user_ids')
          .select('custom_id')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.log('ID utilisateur non trouvé, création en cours...');
          await createUserId();
        } else {
          setUserId(data.custom_id);
        }

        // Récupérer le public_id (nouveau système)
        const userPublicId = (profile as any)?.public_id || null;
        
        if (!userPublicId) {
          console.log('🔄 Génération public_id utilisateur...');
          const newPublicId = await generatePublicId('users', false);
          
          if (newPublicId) {
            // Mettre à jour le profil
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ public_id: newPublicId })
              .eq('id', user.id);

            if (!updateError) {
              setPublicId(newPublicId);
              console.log('✅ Public_id créé:', newPublicId);
            }
          }
        } else {
          setPublicId(userPublicId);
        }

      } catch (error) {
        console.error('Erreur lors de la récupération de l\'ID utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
  }, [user, profile]);

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

  const displayName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.email?.split('@')[0] || 'Utilisateur';

  // Afficher le public_id en priorité, sinon le custom_id
  const displayId = publicId || userId;

  if (!displayId && !showPublicId) {
    return null;
  }

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <span className="font-semibold text-gray-800">{displayName}</span>
        <div className="flex gap-2">
          {publicId && showPublicId && (
            <PublicIdBadge 
              publicId={publicId}
              variant="secondary"
              size="sm"
              copyable={true}
            />
          )}
          {userId && (
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs w-fit">
              {userId}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (showBadge) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {publicId && showPublicId && (
          <PublicIdBadge 
            publicId={publicId}
            variant="secondary"
            size="sm"
            copyable={true}
          />
        )}
        {userId && !publicId && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {userId}
          </Badge>
        )}
        <span>{displayName}</span>
      </div>
    );
  }

  return (
    <span className={className}>
      {displayId} - {displayName}
    </span>
  );
};

export default UserIdDisplay;
