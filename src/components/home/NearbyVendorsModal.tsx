/**
 * NEARBY VENDORS MODAL - Ultra Professional E-Commerce Design
 * Premium wide layout with enhanced vendor cards + Proximity sorting
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Store, MapPin, RefreshCw, Star, Search, ArrowRight, Verified, TrendingUp,
  Building2, Globe, Package, ShoppingBag, Navigation, Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Vendor {
  id: string;
  business_name: string;
  description?: string | null;
  address?: string | null;
  logo_url?: string | null;
  rating?: number | null;
  city?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  business_type?: 'physical' | 'digital' | 'hybrid' | null;
  service_type?: 'wholesale' | 'retail' | 'mixed' | null;
  is_verified?: boolean | null;
  distance?: number;
}

interface NearbyVendorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Haversine formula for distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Business type labels
const businessTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  physical: { label: 'Physique', icon: <Building2 className="w-3 h-3" />, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  digital: { label: 'En ligne', icon: <Globe className="w-3 h-3" />, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  hybrid: { label: 'Hybride', icon: <Store className="w-3 h-3" />, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
};

// Service type labels
const serviceTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  wholesale: { label: 'Grossiste', icon: <Package className="w-3 h-3" />, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  retail: { label: 'Détaillant', icon: <ShoppingBag className="w-3 h-3" />, color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  mixed: { label: 'Mixte', icon: <Store className="w-3 h-3" />, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
};

export function NearbyVendorsModal({ open, onOpenChange }: NearbyVendorsModalProps) {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');

  // Get user position
  const getUserPosition = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => setUserPosition({ latitude: 9.6412, longitude: -13.5784 }), // Default: Conakry
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      setUserPosition({ latitude: 9.6412, longitude: -13.5784 });
    }
  };

  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('vendors')
        .select('id, business_name, description, address, logo_url, rating, city, neighborhood, latitude, longitude, business_type, service_type, is_verified')
        .eq('is_active', true)
        .limit(50);

      if (businessTypeFilter !== 'all') {
        query = query.eq('business_type', businessTypeFilter);
      }
      if (serviceTypeFilter !== 'all') {
        query = query.eq('service_type', serviceTypeFilter);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;

      let vendorList: Vendor[] = (data || []).map((v) => ({
        ...v,
        business_type: v.business_type as Vendor['business_type'],
        service_type: v.service_type as Vendor['service_type'],
      }));

      // Calculate distance and sort by proximity
      if (userPosition) {
        vendorList = vendorList.map((vendor) => {
          if (vendor.latitude && vendor.longitude) {
            const distance = calculateDistance(
              userPosition.latitude, userPosition.longitude,
              vendor.latitude, vendor.longitude
            );
            return { ...vendor, distance };
          }
          return vendor;
        });

        // Sort: closest first, then by rating for those without location
        vendorList.sort((a, b) => {
          if (a.distance === undefined && b.distance === undefined) {
            return (b.rating || 0) - (a.rating || 0);
          }
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
      } else {
        vendorList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      setVendors(vendorList);
    } catch (err) {
      console.error('Error loading vendors:', err);
      setError('Erreur lors du chargement des boutiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      getUserPosition();
    }
  }, [open]);

  useEffect(() => {
    if (open && userPosition) {
      loadVendors();
    }
  }, [open, userPosition, businessTypeFilter, serviceTypeFilter]);

  const handleVendorClick = (vendorId: string) => {
    onOpenChange(false);
    navigate(`/marketplace?vendor=${vendorId}`);
  };

  const filteredVendors = vendors.filter(vendor => {
    const query = searchQuery.toLowerCase();
    return (
      vendor.business_name.toLowerCase().includes(query) ||
      vendor.city?.toLowerCase().includes(query) ||
      vendor.neighborhood?.toLowerCase().includes(query) ||
      vendor.description?.toLowerCase().includes(query)
    );
  });

  const formatDistance = (distance?: number) => {
    if (!distance) return null;
    if (distance < 1) return `${Math.round(distance * 1000)} m`;
    return `${distance.toFixed(1)} km`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-vendeur-primary to-vendeur-primary/80 p-6 text-white">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
              <Navigation className="w-4 h-4" />
              <span>Boutiques à proximité</span>
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
              placeholder="Rechercher par nom, ville, quartier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-white border-0 text-foreground placeholder:text-muted-foreground shadow-lg"
            />
          </div>

          {/* Filters */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
              <Filter className="w-3.5 h-3.5 text-white/70" />
              <select
                value={businessTypeFilter}
                onChange={(e) => setBusinessTypeFilter(e.target.value)}
                className="bg-transparent text-white text-xs border-0 focus:ring-0 cursor-pointer"
              >
                <option value="all" className="text-foreground">Tous les types</option>
                <option value="physical" className="text-foreground">Boutique physique</option>
                <option value="digital" className="text-foreground">Boutique en ligne</option>
                <option value="hybrid" className="text-foreground">Hybride</option>
              </select>
            </div>
            <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
              <Package className="w-3.5 h-3.5 text-white/70" />
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="bg-transparent text-white text-xs border-0 focus:ring-0 cursor-pointer"
              >
                <option value="all" className="text-foreground">Tous les services</option>
                <option value="wholesale" className="text-foreground">Grossiste</option>
                <option value="retail" className="text-foreground">Détaillant</option>
                <option value="mixed" className="text-foreground">Mixte</option>
              </select>
            </div>
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
              <Navigation className="w-4 h-4 text-vendeur-primary" />
              Triées par proximité
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  {/* Badge Position / Distance */}
                  {vendor.distance !== undefined && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-vendeur-primary to-vendeur-primary/80 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                      <Navigation className="w-2.5 h-2.5" />
                      {formatDistance(vendor.distance)}
                    </div>
                  )}
                  {vendor.distance === undefined && index < 3 && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold text-white shadow-sm">
                      TOP
                    </div>
                  )}

                  {/* Logo */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-vendeur-primary/10 to-vendeur-primary/5 flex items-center justify-center overflow-hidden mb-3 group-hover:scale-105 transition-transform">
                    {vendor.logo_url ? (
                      <img src={vendor.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-7 h-7 text-vendeur-primary" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-vendeur-primary transition-colors">
                        {vendor.business_name}
                      </h4>
                      {vendor.is_verified && (
                        <Verified className="w-4 h-4 text-vendeur-primary flex-shrink-0" />
                      )}
                    </div>

                    {/* Description */}
                    {vendor.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {vendor.description}
                      </p>
                    )}
                    
                    {/* Location */}
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {(vendor.city || vendor.neighborhood) && (
                        <p className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="line-clamp-1">
                            {[vendor.neighborhood, vendor.city].filter(Boolean).join(', ')}
                          </span>
                        </p>
                      )}
                      {vendor.address && !vendor.city && !vendor.neighborhood && (
                        <p className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="line-clamp-1">{vendor.address}</span>
                        </p>
                      )}
                    </div>

                    {/* Type Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {vendor.business_type && businessTypeLabels[vendor.business_type] && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 gap-1", businessTypeLabels[vendor.business_type].color)}>
                          {businessTypeLabels[vendor.business_type].icon}
                          {businessTypeLabels[vendor.business_type].label}
                        </Badge>
                      )}
                      {vendor.service_type && serviceTypeLabels[vendor.service_type] && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 gap-1", serviceTypeLabels[vendor.service_type].color)}>
                          {serviceTypeLabels[vendor.service_type].icon}
                          {serviceTypeLabels[vendor.service_type].label}
                        </Badge>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-semibold text-foreground">
                          {vendor.rating?.toFixed(1) || '4.5'}
                        </span>
                      </div>
                      {vendor.is_verified && (
                        <span className="text-xs text-muted-foreground">• Vérifié</span>
                      )}
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
