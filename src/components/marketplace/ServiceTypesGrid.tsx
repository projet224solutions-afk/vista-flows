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

// Couleurs par catégorie
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Commerce': { bg: 'from-blue-500 to-blue-600', text: 'text-blue-600', border: 'border-blue-200 hover:border-blue-400' },
  'Alimentation': { bg: 'from-orange-500 to-red-500', text: 'text-orange-600', border: 'border-orange-200 hover:border-orange-400' },
  'Transport': { bg: 'from-green-500 to-emerald-600', text: 'text-green-600', border: 'border-green-200 hover:border-green-400' },
  'Beauté': { bg: 'from-pink-500 to-rose-500', text: 'text-pink-600', border: 'border-pink-200 hover:border-pink-400' },
  'Réparation': { bg: 'from-slate-500 to-gray-600', text: 'text-slate-600', border: 'border-slate-200 hover:border-slate-400' },
  'Éducation': { bg: 'from-purple-500 to-violet-600', text: 'text-purple-600', border: 'border-purple-200 hover:border-purple-400' },
  'Technologie': { bg: 'from-cyan-500 to-blue-500', text: 'text-cyan-600', border: 'border-cyan-200 hover:border-cyan-400' },
  'Immobilier': { bg: 'from-amber-500 to-yellow-600', text: 'text-amber-600', border: 'border-amber-200 hover:border-amber-400' },
  'Média': { bg: 'from-indigo-500 to-purple-600', text: 'text-indigo-600', border: 'border-indigo-200 hover:border-indigo-400' },
  'Tourisme': { bg: 'from-sky-500 to-blue-500', text: 'text-sky-600', border: 'border-sky-200 hover:border-sky-400' },
  'Sport': { bg: 'from-red-500 to-orange-500', text: 'text-red-600', border: 'border-red-200 hover:border-red-400' },
  'Professionnel': { bg: 'from-gray-600 to-slate-700', text: 'text-gray-600', border: 'border-gray-200 hover:border-gray-400' },
  'Services': { bg: 'from-teal-500 to-cyan-600', text: 'text-teal-600', border: 'border-teal-200 hover:border-teal-400' },
  'Numérique': { bg: 'from-violet-500 to-purple-600', text: 'text-violet-600', border: 'border-violet-200 hover:border-violet-400' },
  'Maison': { bg: 'from-amber-400 to-orange-500', text: 'text-amber-600', border: 'border-amber-200 hover:border-amber-400' },
  'Construction': { bg: 'from-yellow-500 to-amber-600', text: 'text-yellow-600', border: 'border-yellow-200 hover:border-yellow-400' },
  'Agriculture': { bg: 'from-lime-500 to-green-600', text: 'text-lime-600', border: 'border-lime-200 hover:border-lime-400' },
  'Santé': { bg: 'from-emerald-500 to-teal-600', text: 'text-emerald-600', border: 'border-emerald-200 hover:border-emerald-400' },
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
      // Charger les types de services
      const { data: types, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('is_active', true)
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
          const colors = categoryColors[serviceType.category] || categoryColors['Professionnel'];
          const count = serviceCounts[serviceType.id] || 0;

          return (
            <Card
              key={serviceType.id}
              className={cn(
                "group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                "border-2",
                colors.border
              )}
              onClick={() => handleServiceClick(serviceType)}
            >
              <CardContent className="p-4 sm:p-6">
                {/* Icône avec gradient */}
                <div className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-4",
                  "bg-gradient-to-br shadow-lg",
                  colors.bg
                )}>
                  <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>

                {/* Nom du service */}
                <h3 className="font-semibold text-sm sm:text-base line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                  {serviceType.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {serviceType.description}
                </p>

                {/* Footer avec nombre et flèche */}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {count} {count > 1 ? 'prestataires' : 'prestataire'}
                  </Badge>
                  <ArrowRight className={cn(
                    "w-4 h-4 transition-transform group-hover:translate-x-1",
                    colors.text
                  )} />
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