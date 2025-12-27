import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, RefreshCw, Search, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import QuickFooter from "@/components/QuickFooter";
import { cn } from "@/lib/utils";
import { useGeoDistance } from "@/hooks/useGeoDistance";
import { VendorCard } from "@/components/vendor/VendorCard";
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
  business_type?: "physical" | "digital" | "hybrid" | null;
  service_type?: "wholesale" | "retail" | "mixed" | null;
  is_verified?: boolean | null;
  distance?: number | null;
}

const RADIUS_KM = 20;

export default function NearbyBoutiques() {
  const navigate = useNavigate();
  const { userPosition, positionReady, usingRealLocation, refreshPosition, calculateDistance } = useGeoDistance();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");

  useEffect(() => {
    document.title = "Boutiques à proximité | 224SOLUTIONS";
  }, []);

  const loadVendors = async (overridePosition?: { latitude: number; longitude: number }) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("vendors")
        .select(
          "id, business_name, description, address, logo_url, rating, city, neighborhood, latitude, longitude, business_type, service_type, is_verified"
        )
        .eq("is_active", true)
        .limit(200);

      if (businessTypeFilter !== "all") query = query.eq("business_type", businessTypeFilter);
      if (serviceTypeFilter !== "all") query = query.eq("service_type", serviceTypeFilter);

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;

      const origin = overridePosition ?? userPosition;

      // IMPORTANT: sans GPS réel, les distances peuvent être fausses (position par défaut).
      // On force donc l'utilisateur à activer le GPS pour afficher les boutiques proches.
      if (!overridePosition && !usingRealLocation) {
        setVendors([]);
        setError(`Activez le GPS pour voir les boutiques à moins de ${RADIUS_KM} km.`);
        return;
      }

      let list: Vendor[] = (data || []).map((v: any) => ({
        ...v,
        business_type: v.business_type as Vendor["business_type"],
        service_type: v.service_type as Vendor["service_type"],
      }));

      // Distances + filtre rayon - EXCLURE les boutiques sans GPS
      list = list
        .map((v) => {
          // Si pas de coordonnées GPS, distance = null
          if (v.latitude === null || v.latitude === undefined || v.longitude === null || v.longitude === undefined) {
            return { ...v, distance: null };
          }
          const distance = calculateDistance(origin.latitude, origin.longitude, Number(v.latitude), Number(v.longitude));
          return { ...v, distance };
        })
        // IMPORTANT: Exclure les boutiques sans GPS (distance === null) ET celles hors rayon
        .filter((v) => v.distance !== null && v.distance <= RADIUS_KM);

      // Tri: plus proches d'abord, sinon par note
      list.sort((a, b) => {
        if (a.distance === null && b.distance === null) return (b.rating || 0) - (a.rating || 0);
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      setVendors(list);
    } catch (e) {
      console.error("Erreur chargement boutiques:", e);
      setError("Erreur lors du chargement des boutiques");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    const pos = await refreshPosition();
    await loadVendors(pos);
  };

  useEffect(() => {
    if (positionReady) {
      loadVendors();
    }
  }, [positionReady, businessTypeFilter, serviceTypeFilter, userPosition]);

  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => {
      return (
        v.business_name?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q) ||
        v.neighborhood?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q)
      );
    });
  }, [vendors, searchQuery]);

  // Handler de navigation optimisé avec useCallback pour éviter les re-créations
  const handleVendorNavigate = useCallback((vendorId: string) => {
    navigate(`/shop/${vendorId}`);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/proximite")}
                aria-label="Retour à proximité"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">Boutiques à proximité</h1>
                <p className="text-xs text-muted-foreground truncate">Découvrez les vendeurs dans un rayon de {RADIUS_KM} km</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleRefresh} disabled={loading} aria-label="Actualiser">
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={usingRealLocation ? "default" : "secondary"} className="gap-1">
              <MapPin className="w-3 h-3" />
              {usingRealLocation ? "Position GPS active" : "GPS désactivé"}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              Rayon: {RADIUS_KM} km
            </Badge>
            <Badge variant="outline" className="text-xs">
              {filteredVendors.length} boutique{filteredVendors.length > 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une boutique (nom, ville, quartier...)"
              className="pl-10 h-11 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">Type</span>
              <select
                value={businessTypeFilter}
                onChange={(e) => setBusinessTypeFilter(e.target.value)}
                className="bg-transparent text-sm text-foreground border-0 focus:outline-none"
              >
                <option value="all">Tous</option>
                <option value="physical">Physique</option>
                <option value="digital">En ligne</option>
                <option value="hybrid">Hybride</option>
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">Service</span>
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="bg-transparent text-sm text-foreground border-0 focus:outline-none"
              >
                <option value="all">Tous</option>
                <option value="retail">Détaillant</option>
                <option value="wholesale">Grossiste</option>
                <option value="mixed">Mixte</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error ? (
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
            <p className="text-sm font-medium text-foreground mb-1">Erreur</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-border/50 bg-card p-10 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Chargement des boutiques…</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-10 text-center">
            <Store className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Aucune boutique trouvée</p>
            <p className="text-sm text-muted-foreground">Essayez de modifier les filtres ou la recherche.</p>
          </div>
        ) : (
          <section aria-label="Liste des boutiques" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVendors.map((vendor, index) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                index={index}
                onNavigate={handleVendorNavigate}
              />
            ))}
          </section>
        )}
      </main>

      <QuickFooter />
    </div>
  );
}
