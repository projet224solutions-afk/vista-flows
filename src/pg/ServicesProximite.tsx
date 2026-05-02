import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Camera,
  Dumbbell,
  GraduationCap,
  Heart,
  Home,
  Laptop,
  MapPin,
  Phone,
  RefreshCw,
  Scissors,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  Utensils,
  Wrench,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { _Card, _CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QuickFooter from "@/components/QuickFooter";
import { cn } from "@/lib/utils";
import { useGeoDistance, formatDistance, calculateDistance } from "@/hooks/useGeoDistance";
import { getServiceVisual } from "@/config/serviceVisuals";

interface ProfessionalService {
  id: string;
  business_name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  rating?: number | null;
  total_reviews?: number | null;
  city?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string | null;
  service_type_id?: string | null;
  service_type?: {
    id: string;
    name: string;
    code?: string;
    category?: string;
  } | null;
  distance?: number | null;
}

const RADIUS_KM = 20;

type ServiceCategory = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
};

/**
 * Single source of truth for category filters.
 * The `id` matches the `service_types.code` values stored in the database,
 * AND the `?type=` values sent from Proximite.tsx.
 */
const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: "all", name: "Tous", icon: Store },
  { id: "restaurant", name: "Restaurants", icon: Utensils },
  { id: "beaute", name: "Beauté & Coiffure", icon: Scissors },
  { id: "reparation", name: "Réparation", icon: Wrench },
  { id: "menage", name: "Nettoyage & Ménage", icon: Sparkles },
  { id: "location", name: "Immobilier", icon: Building2 },
  { id: "education", name: "Éducation & Formation", icon: GraduationCap },
  { id: "media", name: "Photo & Vidéo", icon: Camera },
  { id: "sport", name: "Sport & Fitness", icon: Dumbbell },
  { id: "sante", name: "Santé & Bien-être", icon: Heart },
  { id: "informatique", name: "Informatique & Tech", icon: Laptop },
  { id: "construction", name: "Construction & BTP", icon: Building2 },
  { id: "agriculture", name: "Agriculture", icon: ShoppingBag },
  { id: "freelance", name: "Services Pro", icon: Briefcase },
  { id: "maison", name: "Maison & Déco", icon: Home },
  { id: "ecommerce", name: "Boutique / E-commerce", icon: Store },
  { id: "vtc", name: "Transport VTC", icon: Car },
  { id: "livraison", name: "Livraison", icon: Truck },
];

export default function ServicesProximite() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userPosition, positionReady, usingRealLocation } = useGeoDistance();
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync selectedCategory with URL ?type= param
  const selectedCategory = searchParams.get("type") || "all";

  const setSelectedCategory = useCallback((cat: string) => {
    if (cat === "all") {
      searchParams.delete("type");
    } else {
      searchParams.set("type", cat);
    }
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Stabiliser la position pour éviter les re-renders infinis
  const positionRef = useRef({ lat: userPosition.latitude, lng: userPosition.longitude });
  const loadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    document.title = "Services de Proximité | 224SOLUTIONS";
  }, []);

  const loadServices = useCallback(async (lat: number, lng: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('professional_services')
        .select(`
          id,
          business_name,
          description,
          address,
          phone,
          email,
          logo_url,
          rating,
          total_reviews,
          city,
          neighborhood,
          latitude,
          longitude,
          status,
          service_type_id,
          user_id,
          service_types (id, name, code, category)
        `)
        .eq('status', 'active')
        .order('rating', { ascending: false, nullsFirst: false });

      if (error) throw error;

      let list: ProfessionalService[] = (data || []).map((item: any) => ({
        ...item,
        service_type: item.service_types,
      }));

      // Pour les services sans GPS, essayer de récupérer depuis la table vendors (même user_id)
      const servicesWithoutGps = list.filter(s => s.latitude == null || s.longitude == null);
      if (servicesWithoutGps.length > 0) {
        const userIds = [...new Set(servicesWithoutGps.map(s => (s as any).user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: vendorsData } = await supabase
            .from('vendors')
            .select('user_id, latitude, longitude')
            .in('user_id', userIds)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

          if (vendorsData && vendorsData.length > 0) {
            const vendorGpsMap = new Map(vendorsData.map(v => [v.user_id, { lat: v.latitude, lng: v.longitude }]));
            list = list.map(s => {
              if ((s.latitude == null || s.longitude == null) && (s as any).user_id) {
                const vendorGps = vendorGpsMap.get((s as any).user_id);
                if (vendorGps) {
                  return { ...s, latitude: vendorGps.lat, longitude: vendorGps.lng };
                }
              }
              return s;
            });

            // Mettre à jour en arrière-plan dans la DB
            for (const s of servicesWithoutGps) {
              const vendorGps = vendorGpsMap.get((s as any).user_id);
              if (vendorGps) {
                supabase
                  .from('professional_services')
                  .update({ latitude: vendorGps.lat, longitude: vendorGps.lng })
                  .eq('id', s.id)
                  .then(() => console.log('GPS synced for:', s.business_name));
              }
            }
          }
        }
      }

      // Calculer les distances - exclure les services sans GPS valide
      const beforeFilterCount = list.length;
      list = list
        .map((s) => {
          const lat_val = Number(s.latitude);
          const lng_val = Number(s.longitude);
          const hasValidCoords =
            s.latitude != null && s.longitude != null &&
            Number.isFinite(lat_val) && Number.isFinite(lng_val) &&
            !(lat_val === 0 && lng_val === 0);

          const distance = hasValidCoords
            ? calculateDistance(lat, lng, lat_val, lng_val)
            : null;
          return { ...s, distance };
        })
        .filter((s) => {
          if (s.distance === null) return false;
          return s.distance <= RADIUS_KM;
        });

      console.log(`Proximité: ${beforeFilterCount} services trouvés, ${list.length} dans le rayon de ${RADIUS_KM} km`);

      // Tri: plus proches en premier
      list.sort((a, b) => {
        if (a.distance !== null && b.distance !== null) {
          if (a.distance === b.distance) return (b.rating || 0) - (a.rating || 0);
          return a.distance - b.distance;
        }
        if (a.distance !== null && b.distance === null) return -1;
        if (a.distance === null && b.distance !== null) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });

      setServices(list);
    } catch (error) {
      console.error('Erreur chargement services:', error);
      toast.error('Erreur lors du chargement des services');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Charger une seule fois quand positionReady, puis re-charger si la position change de +100m
  useEffect(() => {
    if (!positionReady) return;

    const newLat = userPosition.latitude;
    const newLng = userPosition.longitude;
    const prevLat = positionRef.current.lat;
    const prevLng = positionRef.current.lng;

    const moved = hasLoadedRef.current
      ? calculateDistance(prevLat, prevLng, newLat, newLng) > 0.1
      : true;

    if (!moved) return;

    positionRef.current = { lat: newLat, lng: newLng };
    hasLoadedRef.current = true;
    loadServices(newLat, newLng);
  }, [positionReady, userPosition.latitude, userPosition.longitude, loadServices]);

  const filteredServices = useMemo(() => {
    let result = services;

    // Filtrer par catégorie - match exact sur service_types.code
    if (selectedCategory !== 'all') {
      result = result.filter((s) => {
        const code = s.service_type?.code?.toLowerCase() || '';
        return code === selectedCategory.toLowerCase();
      });
    }

    // Filtrer par recherche
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((s) => {
        return (
          s.business_name?.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q) ||
          s.neighborhood?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.service_type?.name?.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [services, selectedCategory, searchQuery]);

  const handleServiceClick = (serviceId: string) => {
    navigate(`/services-proximite/${serviceId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/proximite")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">Services de Proximité</h1>
                <p className="text-xs text-muted-foreground truncate">Dans un rayon de {RADIUS_KM} km</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => loadServices(positionRef.current.lat, positionRef.current.lng)} disabled={loading}>
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={usingRealLocation ? "default" : "secondary"} className="gap-1">
              <MapPin className="w-3 h-3" />
              {usingRealLocation ? "Position GPS active" : "GPS désactivé"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {filteredServices.length} service{filteredServices.length > 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
        </div>
      </header>

      {/* Catégories */}
      <section className="px-4 py-4 border-b border-border bg-card">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          {SERVICE_CATEGORIES.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="whitespace-nowrap flex-shrink-0 min-w-fit px-3"
            >
              <category.icon className="mr-1.5 h-4 w-4" />
              <span>{category.name}</span>
            </Button>
          ))}
        </div>
      </section>

      {/* Liste des services */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="rounded-2xl border border-border/50 bg-card p-10 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Chargement des services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-10 text-center">
            <Store className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Aucun service trouvé</p>
            <p className="text-sm text-muted-foreground mb-4">Essayez de modifier les filtres ou la recherche.</p>
            <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredServices.map((service, index) => (
              (() => {
                const visual = getServiceVisual({
                  code: service.service_type?.code,
                  name: service.service_type?.name,
                  category: service.service_type?.category,
                });
                const Icon = visual.icon;

                return (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service.id)}
                className={cn(
                  "group relative flex flex-col p-4 rounded-2xl text-left",
                  "bg-card border border-border/50",
                  "hover:border-primary/30 hover:shadow-lg transition-all duration-300",
                  "hover:-translate-y-1"
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Badge de distance */}
                <div className="absolute -top-2 -right-2 px-2.5 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1 bg-primary text-primary-foreground">
                  <MapPin className="w-3 h-3" />
                  {formatDistance(service.distance!)}
                </div>

                <div className="mb-3 overflow-hidden rounded-2xl border border-border/50 bg-muted/40">
                  <div className="relative h-36 w-full overflow-hidden">
                    <img
                      src={service.logo_url || visual.image}
                      alt={service.business_name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                    <div
                      className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg"
                      style={{ backgroundColor: visual.accent }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <h2 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {service.business_name}
                  </h2>

                  {service.service_type?.name && (
                    <Badge variant="secondary" className="text-[10px]">
                      {service.service_type.name}
                    </Badge>
                  )}

                  {(service.city || service.neighborhood || service.address) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {[service.neighborhood, service.city, !service.city && !service.neighborhood ? service.address : null]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </p>
                  )}

                  {service.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                  )}

                  {(service.rating !== null && service.rating !== undefined && service.rating > 0) && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-semibold text-foreground">{service.rating.toFixed(1)}</span>
                      </div>
                      {service.total_reviews && service.total_reviews > 0 && (
                        <span className="text-[10px] text-muted-foreground">({service.total_reviews} avis)</span>
                      )}
                    </div>
                  )}

                  {service.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{service.phone}</span>
                    </div>
                  )}
                </div>
              </button>
                );
              })()
            ))}
          </div>
        )}
      </section>

      <QuickFooter />
    </div>
  );
}
