/**
 * NEARBY VENDORS MODAL - Premium Design
 * Displays all active boutiques/shops
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Store, MapPin, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Vendor {
  id: string;
  business_name: string;
  address?: string;
  logo_url?: string;
  rating?: number;
}

interface NearbyVendorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NearbyVendorsModal({ open, onOpenChange }: NearbyVendorsModalProps) {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('vendors')
        .select('id, business_name, address, logo_url, rating')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(20);

      if (dbError) throw dbError;
      setVendors(data || []);
    } catch (err) {
      console.error('Error loading vendors:', err);
      setError('Erreur lors du chargement des boutiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadVendors();
    }
  }, [open]);

  const handleVendorClick = (vendorId: string) => {
    onOpenChange(false);
    navigate(`/marketplace?vendor=${vendorId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-vendeur-primary" />
            Boutiques disponibles
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-vendeur-primary" />
              <p className="text-sm">Chargement des boutiques...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={loadVendors}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          ) : vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Aucune boutique disponible</p>
              <Button variant="outline" size="sm" onClick={loadVendors}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {vendors.map((vendor) => (
                <button
                  key={vendor.id}
                  onClick={() => handleVendorClick(vendor.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-2xl',
                    'bg-card border border-border/40',
                    'hover:border-vendeur-primary/30 hover:bg-vendeur-primary/5',
                    'transition-all duration-200'
                  )}
                >
                  <div className="w-14 h-14 rounded-2xl bg-vendeur-primary/10 flex items-center justify-center overflow-hidden">
                    {vendor.logo_url ? (
                      <img src={vendor.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-7 h-7 text-vendeur-primary" />
                    )}
                  </div>
                  <h4 className="font-medium text-sm text-foreground text-center line-clamp-2">
                    {vendor.business_name}
                  </h4>
                  {vendor.address && (
                    <p className="text-xs text-muted-foreground text-center line-clamp-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {vendor.address}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border/40">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              navigate('/marketplace');
            }}
          >
            Voir toutes les boutiques
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NearbyVendorsModal;
