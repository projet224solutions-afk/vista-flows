/**
 * 🔧 COMPOSANT: AFFICHAGE ID VENDEUR
 * Affiche l'ID public du vendeur avec son nom
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStandardId } from '@/hooks/useStandardId';
import { StandardIdBadge } from '@/components/StandardIdBadge';
import { Loader2 } from 'lucide-react';

interface VendorIdDisplayProps {
  className?: string;
  showName?: boolean;
}

export function VendorIdDisplay({ 
  className = '',
  showName = true 
}: VendorIdDisplayProps) {
  const { user } = useAuth();
  const { generateStandardId } = useStandardId();
  const [vendorData, setVendorData] = useState<{
    public_id: string | null;
    business_name: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendorData();
  }, [user]);

  const fetchVendorData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Récupérer les données du vendeur
      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('id, public_id, business_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!vendor) {
        setLoading(false);
        return;
      }

      // Si pas de public_id, en générer un
      if (!vendor.public_id) {
        console.log('🔄 Génération standard_id vendeur...');
        const newPublicId = await generateStandardId('vendors', false);
        
        if (newPublicId) {
          // Mettre à jour le vendeur
          const { error: updateError } = await supabase
            .from('vendors')
            .update({ public_id: newPublicId })
            .eq('id', vendor.id);

          if (!updateError) {
            setVendorData({
              public_id: newPublicId,
              business_name: vendor.business_name
            });
            console.log('✅ Public_id vendeur créé:', newPublicId);
          }
        }
      } else {
        setVendorData({
          public_id: vendor.public_id,
          business_name: vendor.business_name
        });
      }

    } catch (error) {
      console.error('Erreur récupération données vendeur:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (!vendorData?.public_id) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <StandardIdBadge 
        standardId={vendorData.public_id}
        variant="secondary"
        size="md"
        copyable={true}
      />
      {showName && vendorData.business_name && (
        <span className="text-sm font-medium">
          {vendorData.business_name}
        </span>
      )}
    </div>
  );
}

export default VendorIdDisplay;
