/**
 * Grille des Types de Services Professionnels
 * Affiche tous les types de services disponibles (Restaurant, Boutique, VTC, etc.)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingBag, 
  Utensils, 
  Car, 
  Truck, 
  Scissors, 
  Wrench,
  GraduationCap,
  Laptop,
  Home,
  Camera,
  Plane,
  Dumbbell,
  Briefcase,
  Sparkles,
  BookOpen,
  HardHat,
  Tractor,
  Stethoscope,
  Package,
  ArrowRight,
  Users,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceType {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  commission_rate: number;
  is_active: boolean;
}

// Map des icônes Lucide
const iconMap: Record<string, LucideIcon> = {
  ShoppingBag,
  Utensils,
  Car,
  Truck,
  Scissors,
  Wrench,
  GraduationCap,
  Laptop,
  Home,
  Camera,
  Plane,
  Dumbbell,
  Briefcase,
  Sparkles,
  BookOpen,
  HardHat,
  Tractor,
  Stethoscope,
  Package
};

// Couleurs de marque unies (pas de dégradés)
const BRAND_BLUE = '#04439e';
const BRAND_ORANGE = '#ff4000';

const serviceTypeVisualMap: Record<string, { image: string; accent?: string }> = {
  agriculture: {
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
    accent: '#15803d'
  },
  beaute: {
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    accent: '#d63384'
  },
  construction: {
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    accent: '#b45309'
  },
  education: {
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    accent: '#1d4ed8'
  },
  ecommerce: {
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
    accent: BRAND_BLUE
  },
  freelance: {
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    accent: '#1d4ed8'
  },
  informatique: {
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    accent: '#7c3aed'
  },
  livraison: {
    image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=80',
    accent: BRAND_ORANGE
  },
  location: {
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
    accent: '#0369a1'
  },
  maison: {
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    accent: '#c2410c'
  },
  media: {
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80',
    accent: '#9333ea'
  },
  menage: {
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    accent: '#0891b2'
  },
  reparation: {
    image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80',
    accent: '#b45309'
  },
  restaurant: {
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    accent: '#e85d04'
  },
  sante: {
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
    accent: '#dc2626'
  },
  sport: {
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    accent: '#16a34a'
  },
  vtc: {
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
    accent: '#1d4ed8'
  }
};

const getServiceVisual = (serviceType: ServiceType) => {
  const code = serviceType.code?.toLowerCase() || '';
  const normalized = `${serviceType.name} ${serviceType.category}`.toLowerCase();

  if (serviceTypeVisualMap[code]) return serviceTypeVisualMap[code];
  if (normalized.includes('boutique') || normalized.includes('e-commerce') || normalized.includes('commerce')) return serviceTypeVisualMap.ecommerce;
  if (normalized.includes('éducation') || normalized.includes('education') || normalized.includes('formation')) return serviceTypeVisualMap.education;
  if (normalized.includes('immobilier') || normalized.includes('location')) return serviceTypeVisualMap.location;
  if (normalized.includes('photo') || normalized.includes('vidéo') || normalized.includes('video')) return serviceTypeVisualMap.media;
  if (normalized.includes('santé') || normalized.includes('sante')) return serviceTypeVisualMap.sante;
  if (normalized.includes('maison') || normalized.includes('déco') || normalized.includes('deco')) return serviceTypeVisualMap.maison;
  if (normalized.includes('livraison')) return serviceTypeVisualMap.livraison;

  return { image: '', accent: BRAND_BLUE };
};

interface ServiceTypesGridProps {
  onBack?: () => void;
  searchQuery?: string;
}

export function ServiceTypesGrid({ onBack, searchQuery }: ServiceTypesGridProps) {
  const navigate = useNavigate();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadServiceTypes();
  }, []);

  const loadServiceTypes = async () => {
    try {
      // Charger les types de services SAUF les numériques (qui vont dans le bouton "Numériques")
      // Les services numériques (dropshipping, logiciel, ebooks) n'ont pas de GPS
      const { data: types, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('is_active', true)
        .neq('category', 'Numérique') // Exclure les services numériques
        .not('code', 'in', '(dropshipping,digital_logiciel,digital_livre)') // Double sécurité
        .order('name');

      if (error) throw error;

      setServiceTypes(types || []);

      // Charger le nombre de services par type
      const { data: counts, error: countError } = await supabase
        .from('professional_services')
        .select('service_type_id')
        .eq('status', 'active');

      if (!countError && counts) {
        const countMap: Record<string, number> = {};
        counts.forEach((item) => {
          countMap[item.service_type_id] = (countMap[item.service_type_id] || 0) + 1;
        });
        setServiceCounts(countMap);
      }
    } catch (error) {
      console.error('Erreur chargement types de services:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer par recherche
  const filteredTypes = searchQuery 
    ? serviceTypes.filter(type => 
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : serviceTypes;

  const handleServiceClick = (serviceType: ServiceType) => {
    // Naviguer vers la page des services de proximité avec le filtre du type
    navigate(`/services-proximite?type=${serviceType.code}`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-muted rounded-xl mb-4" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec bouton retour */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Services Professionnels</h2>
          <p className="text-sm text-muted-foreground">
            {filteredTypes.length} types de services disponibles
          </p>
        </div>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            Retour aux produits
          </Button>
        )}
      </div>

      {/* Grille des types de services */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTypes.map((serviceType) => {
          const IconComponent = iconMap[serviceType.icon] || Briefcase;
          const count = serviceCounts[serviceType.id] || 0;
          const visual = getServiceVisual(serviceType);

          return (
            <Card
              key={serviceType.id}
              className={cn(
                "group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                "border-2 border-border hover:border-[#04439e]"
              )}
              onClick={() => handleServiceClick(serviceType)}
            >
              <CardContent className="p-0">
                <div className="relative h-24 overflow-hidden sm:h-28">
                  {visual.image ? (
                    <>
                      <img
                        src={visual.image}
                        alt={serviceType.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1b33]/70 via-[#04439e]/20 to-transparent" />
                    </>
                  ) : (
                    <div className="h-full w-full bg-[linear-gradient(135deg,#04439e_0%,#0536a8_100%)]" />
                  )}

                  <div
                    className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-xl shadow-lg sm:h-14 sm:w-14"
                    style={{ backgroundColor: visual.accent || BRAND_BLUE }}
                  >
                    <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <h3 className="mb-1 line-clamp-1 text-sm font-semibold transition-colors group-hover:text-white sm:text-base">
                    {serviceType.name}
                  </h3>

                  <p className="mb-3 line-clamp-2 text-xs text-muted-foreground transition-colors group-hover:text-white">
                    {serviceType.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs transition-colors group-hover:bg-transparent group-hover:text-white">
                      <Users className="mr-1 h-3 w-3" />
                      {count} {count > 1 ? 'prestataires' : 'prestataire'}
                    </Badge>
                    <ArrowRight
                      className="h-4 w-4 transition-all group-hover:translate-x-1 group-hover:text-white"
                      style={{ color: BRAND_ORANGE }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTypes.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun service trouvé</p>
        </div>
      )}
    </div>
  );
}