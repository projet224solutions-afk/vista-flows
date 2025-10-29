import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStandardId } from '@/hooks/useStandardId';
import { StandardIdBadge } from '@/components/StandardIdBadge';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface UserIdDisplayProps {
  className?: string;
  showBadge?: boolean;
  layout?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
}

export const UserIdDisplay = ({ 
  className = '', 
  showBadge = true, 
  layout = 'horizontal',
  size = 'sm'
}: UserIdDisplayProps) => {
  const { user, profile } = useAuth();
  const { generateStandardId, validateStandardId } = useStandardId();
  const [standardId, setStandardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrCreateStandardId = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Déterminer le préfixe selon le rôle
        let scope = 'users';
        const userRole = profile?.role;
        
        if (userRole === 'vendeur') scope = 'vendors';
        else if (userRole === 'livreur') scope = 'drivers';
        else if (userRole === 'taxi') scope = 'drivers';
        else if (userRole === 'admin') scope = 'pdg';
        else if (userRole === 'syndicat') scope = 'syndicats';
        else if (userRole === 'transitaire') scope = 'agents';

        // Vérifier si l'utilisateur a déjà un ID standardisé
        const existingId = (profile as any)?.public_id;
        
        if (existingId && validateStandardId(existingId)) {
          setStandardId(existingId);
          console.log('✅ ID standardisé trouvé:', existingId);
        } else {
          // Générer un nouvel ID standardisé
          console.log('🔄 Génération ID standardisé...');
          const newId = await generateStandardId(scope, false);
          
          if (newId) {
            // Mettre à jour le profil avec le nouvel ID
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ public_id: newId })
              .eq('id', user.id);

            if (!updateError) {
              setStandardId(newId);
              console.log('✅ ID standardisé créé:', newId);
              toast.success('ID utilisateur généré', {
                description: `Votre identifiant: ${newId}`
              });
            } else {
              console.error('Erreur mise à jour ID:', updateError);
            }
          }
        }

      } catch (error) {
        console.error('Erreur ID standardisé:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateStandardId();
  }, [user, profile]);

  if (loading) {
    return <span className={`text-muted-foreground ${className}`}>Chargement...</span>;
  }

  const displayName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.email?.split('@')[0] || 'Utilisateur';

  if (!standardId) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="text-xs">
          ID en cours...
        </Badge>
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <span className="font-semibold text-foreground">{displayName}</span>
        <StandardIdBadge 
          standardId={standardId}
          variant="default"
          size={size}
          copyable={true}
          showIcon={true}
        />
      </div>
    );
  }

  if (showBadge) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <StandardIdBadge 
          standardId={standardId}
          variant="secondary"
          size={size}
          copyable={true}
          showIcon={true}
        />
        <span className="text-foreground font-medium">{displayName}</span>
      </div>
    );
  }

  return (
    <span className={className}>
      {standardId} - {displayName}
    </span>
  );
};

export default UserIdDisplay;
