import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Clock, Star, Search, RefreshCw, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QuickFooter from "@/components/QuickFooter";
import { cn } from "@/lib/utils";
import { useGeoDistance, formatDistance } from "@/hooks/useGeoDistance";

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

const RADIUS_KM = 50;

export default function ServicesProximite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userPosition, positionReady, usingRealLocation, getDistanceTo } = useGeoDistance();
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("type") || "all");

  const categories = [
    { id: "all", name: "Tous", icon: "🏪" },
    { id: "restaurant", name: "Restaurants", icon: "🍽️" },
    { id: "beaute", name: "Beauté & Coiffure", icon: "💇" },
    { id: "reparation", name: "Réparation", icon: "🔧" },
    { id: "nettoyage", name: "Nettoyage", icon: "✨" },
    { id: "immobilier", name: "Immobilier", icon: "🏢" },
    { id: "formation", name: "Formation", icon: "🎓" },
    { id: "photo-video", name: "Photo & Vidéo", icon: "📸" },
    { id: "sport", name: "Sport & Fitness", icon: "🏋️" },
    { id: "sante", name: "Santé", icon: "🏥" },
    { id: "education", name: "Éducation", icon: "📚" },
    { id: "commerce", name: "Commerce", icon: "🛍️" },
    { id: "service", name: "Autres Services", icon: "⚙️" },
  ];

  useEffect(() => {
    document.title = "Services de Proximité | 224SOLUTIONS";
  }, []);

  const loadServices = async () => {
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
          service_types (id, name, code, category)
        `)
        .eq('status', 'active')
        .order('rating', { ascending: false, nullsFirst: false });

      if (error) throw error;

      let list: ProfessionalService[] = (data || []).map((item: any) => ({
        ...item,
        service_type: item.service_types,
      }));

      // Calculer les distances
      list = list
        .map((s) => {
          const distance = getDistanceTo(s.latitude, s.longitude);
          return { ...s, distance };
        })
        .filter((s) => (s.distance === null ? true : s.distance <= RADIUS_KM));

      // Tri: plus proches d'abord, sinon par note
      list.sort((a, b) => {
        if (a.distance === null && b.distance === null) return (b.rating || 0) - (a.rating || 0);
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      setServices(list);
    } catch (error) {
      console.error('Erreur chargement services:', error);
      toast.error('Erreur lors du chargement des services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (positionReady) {
      loadServices();
    }
  }, [positionReady, userPosition]);

  const filteredServices = useMemo(() => {
    let result = services;

    // Filtrer par catégorie
    if (selectedCategory !== 'all') {
      result = result.filter((s) => {
        const category = s.service_type?.category?.toLowerCase() || '';
        const code = s.service_type?.code?.toLowerCase() || '';
        return category.includes(selectedCategory) || code.includes(selectedCategory);
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
            <Button variant="ghost" size="icon" className="rounded-full" onClick={loadServices} disabled={loading}>
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
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="whitespace-nowrap flex-shrink-0 min-w-fit px-3"
            >
              <span className="mr-1.5">{category.icon}</span>
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
                {service.distance !== null ? (
                  <div className="absolute -top-2 -right-2 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-md flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(service.distance)}
                  </div>
                ) : (
                  <div className="absolute -top-2 -right-2 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium shadow-sm">
                    Pas de GPS
                  </div>
                )}

                <div className="w-14 h-14 rounded-xl bg-muted/40 flex items-center justify-center overflow-hidden mb-3 group-hover:scale-105 transition-transform">
                  {service.logo_url ? (
                    <img
                      src={service.logo_url}
                      alt={`Logo ${service.business_name}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Store className="w-7 h-7 text-primary" />
                  )}
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

                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-semibold text-foreground">{service.rating?.toFixed(1) || "4.5"}</span>
                    </div>
                    {service.total_reviews && service.total_reviews > 0 && (
                      <span className="text-[10px] text-muted-foreground">({service.total_reviews} avis)</span>
                    )}
                  </div>

                  {service.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{service.phone}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <QuickFooter />
    </div>
  );
}
