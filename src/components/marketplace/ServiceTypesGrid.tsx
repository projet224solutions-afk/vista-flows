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

          return (
            <Card
              key={serviceType.id}
              className={cn(
                "group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                "border-2 border-border hover:border-[#04439e]"
              )}
              onClick={() => handleServiceClick(serviceType)}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.backgroundColor = BRAND_BLUE;
                el.querySelectorAll('h3, p, span').forEach((c: any) => { c.style.color = 'white'; });
                el.querySelectorAll('svg').forEach((c: any) => { c.style.color = 'white'; });
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.backgroundColor = '';
                el.querySelectorAll('h3').forEach((c: any) => { c.style.color = ''; });
                el.querySelectorAll('p').forEach((c: any) => { c.style.color = ''; });
                el.querySelectorAll('span').forEach((c: any) => { c.style.color = ''; });
                el.querySelectorAll('svg').forEach((c: any) => { c.style.color = ''; });
              }}
            >
              <CardContent className="p-4 sm:p-6">
                {/* Icône avec couleur de marque unie */}
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg"
                  style={{ backgroundColor: BRAND_BLUE }}
                >
                  <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>

                {/* Nom du service */}
                <h3 className="font-semibold text-sm sm:text-base line-clamp-1 mb-1 transition-colors">
                  {serviceType.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 transition-colors">
                  {serviceType.description}
                </p>

                {/* Footer avec nombre et flèche */}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs transition-colors">
                    <Users className="w-3 h-3 mr-1" />
                    {count} {count > 1 ? 'prestataires' : 'prestataire'}
                  </Badge>
                  <ArrowRight 
                    className="w-4 h-4 transition-transform group-hover:translate-x-1 transition-colors"
                    style={{ color: BRAND_ORANGE }}
                  />
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