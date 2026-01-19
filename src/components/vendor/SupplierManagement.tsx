/**
 * Module Gestion Fournisseurs & Achats
 * Point d'entrée principal intégrant le nouveau système d'achats POS/ERP
 */

import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SupplierPurchaseManagement } from './suppliers/SupplierPurchaseManagement';
import { Loader2 } from 'lucide-react';

export default function SupplierManagement() {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchVendor = async () => {
      try {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (vendor) {
          setVendorId(vendor.id);
        }
      } catch (error) {
        console.error('Erreur chargement vendeur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendorId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun compte vendeur trouvé
      </div>
    );
  }

  return <SupplierPurchaseManagement vendorId={vendorId} />;
}
