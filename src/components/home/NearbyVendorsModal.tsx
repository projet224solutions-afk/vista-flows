/**
 * NEARBY VENDORS MODAL - Ultra Professional E-Commerce Design
 * Premium wide layout with enhanced vendor cards
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Store, MapPin, RefreshCw, Star, Search, ArrowRight, Verified, TrendingUp } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredVendors = vendors.filter(vendor =>
    vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-vendeur-primary to-vendeur-primary/80 p-6 text-white">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>Boutiques populaires</span>
            </div>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              Découvrez nos boutiques
            </DialogTitle>
          </DialogHeader>
          
          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher une boutique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-white border-0 text-foreground placeholder:text-muted-foreground shadow-lg"
            />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-muted/30 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredVendors.length}</span> boutiques disponibles
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Verified className="w-4 h-4 text-vendeur-primary" />
              Vendeurs vérifiés
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={loadVendors} className="gap-2">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        {/* Vendors Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-vendeur-primary/10 flex items-center justify-center mb-4">
                <RefreshCw className="w-8 h-8 animate-spin text-vendeur-primary" />
              </div>
              <p className="text-sm font-medium">Chargement des boutiques...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground mb-2">Erreur de chargement</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={loadVendors} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </Button>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Store className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-2">Aucune boutique trouvée</p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? 'Essayez un autre terme de recherche' : 'Aucune boutique disponible pour le moment'}
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')} className="gap-2">
                Effacer la recherche
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredVendors.map((vendor, index) => (
                <button
                  key={vendor.id}
                  onClick={() => handleVendorClick(vendor.id)}
                  className={cn(
                    'group relative flex flex-col p-4 rounded-2xl text-left',
                    'bg-card border border-border/50',
                    'hover:border-vendeur-primary/40 hover:shadow-lg hover:shadow-vendeur-primary/10',
                    'hover:-translate-y-1 transition-all duration-300',
                    'animate-fade-in'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Badge Popular */}
                  {index < 3 && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold text-white shadow-sm">
                      TOP
                    </div>
                  )}

                  {/* Logo */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vendeur-primary/10 to-vendeur-primary/5 flex items-center justify-center overflow-hidden mb-3 group-hover:scale-105 transition-transform">
                    {vendor.logo_url ? (
                      <img src={vendor.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-8 h-8 text-vendeur-primary" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-1.5">
                    <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-vendeur-primary transition-colors">
                      {vendor.business_name}
                    </h4>
                    
                    {vendor.address && (
                      <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {vendor.address}
                      </p>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-semibold text-foreground">
                          {vendor.rating?.toFixed(1) || '4.5'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">• Vérifié</span>
                    </div>
                  </div>

                  {/* Hover Arrow */}
                  <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-vendeur-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 text-vendeur-primary" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-border/40 bg-muted/20">
          <Button
            className="w-full h-12 rounded-xl gap-2 bg-vendeur-primary hover:bg-vendeur-primary/90 text-white font-semibold shadow-lg shadow-vendeur-primary/25"
            onClick={() => {
              onOpenChange(false);
              navigate('/marketplace');
            }}
          >
            <Store className="w-5 h-5" />
            Explorer toutes les boutiques
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NearbyVendorsModal;
