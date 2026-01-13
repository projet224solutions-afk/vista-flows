/**
 * ADD SERVICE MODAL
 * Permet au vendeur de créer un nouveau service professionnel
 * ✅ SYNCHRONISÉ avec Auth.tsx (formulaire d'inscription)
 * Ex: Restaurant, Boutique en ligne, Salon de beauté, etc.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Store, Utensils, Scissors, Car, Heart, 
  BookOpen, Camera, Truck, Building2, Dumbbell,
  Laptop, Leaf, Hammer, Sparkles, ArrowRight,
  Loader2, CheckCircle, AlertCircle, MapPin, Navigation,
  Wrench, Plane, Briefcase, Home, Package, GraduationCap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { z } from 'zod';

interface ServiceType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  is_active: boolean;
}

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ✅ MAPPING SYNCHRONISÉ avec Auth.tsx (formulaire d'inscription)
// Ces icônes correspondent exactement aux services affichés à l'inscription
const SERVICE_ICONS: Record<string, React.ElementType> = {
  // Services de Proximité Populaires (Auth.tsx)
  restaurant: Utensils,
  beaute: Scissors,
  vtc: Car,
  reparation: Wrench,
  menage: Sparkles,
  informatique: Laptop,
  
  // Services Professionnels (Auth.tsx)
  sport: Dumbbell,
  location: Building2,
  media: Camera,
  construction: Hammer,
  agriculture: Leaf,
  freelance: Briefcase,
  sante: Heart,
  maison: Home,
  
  // Produits Numériques (Auth.tsx)
  digital_logiciel: Laptop,
  dropshipping: Package,
  education: GraduationCap,
  digital_livre: BookOpen,
  
  // E-commerce classique
  ecommerce: Store,
  
  // Services legacy (compatibilité)
  livraison: Truck,
  voyage: Plane,
  
  default: Store
};

// ✅ CATÉGORIES synchronisées avec Auth.tsx
const SERVICE_CATEGORIES = {
  'proximite': {
    label: 'Services de Proximité Populaires',
    color: 'primary',
    codes: ['restaurant', 'beaute', 'vtc', 'reparation', 'menage', 'informatique']
  },
  'professionnel': {
    label: 'Services Professionnels',
    color: 'violet',
    codes: ['sport', 'location', 'media', 'construction', 'agriculture', 'freelance', 'sante', 'maison']
  },
  'numerique': {
    label: 'Produits Numériques',
    color: 'cyan',
    codes: ['digital_logiciel', 'dropshipping', 'education', 'digital_livre']
  },
  'commerce': {
    label: 'Commerce',
    color: 'green',
    codes: ['ecommerce', 'livraison']
  }
};

// Schéma de validation Zod
const serviceFormSchema = z.object({
  businessName: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(
      /^[a-zA-Z0-9\sÀ-ÿ\-'&.]+$/,
      'Le nom contient des caractères non autorisés'
    )
    .transform(val => val.trim()),
  description: z
    .string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(200, 'L\'adresse ne peut pas dépasser 200 caractères')
    .optional()
    .or(z.literal(''))
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

export function AddServiceModal({ open, onOpenChange }: AddServiceModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchServiceTypes();
      setStep('select');
      setSelectedType(null);
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setBusinessName('');
    setDescription('');
    setAddress('');
    setLatitude(null);
    setLongitude(null);
    setGpsError(null);
  };

  // Fonction pour obtenir la position GPS
  const getGpsLocation = async () => {
    if (!navigator.geolocation) {
      setGpsError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGpsLoading(false);
        toast.success('Position GPS capturée avec succès');
      },
      (error) => {
        setGpsLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Vous avez refusé l\'accès à votre position');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('Position non disponible');
            break;
          case error.TIMEOUT:
            setGpsError('Délai d\'attente dépassé');
            break;
          default:
            setGpsError('Erreur lors de la récupération de la position');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const fetchServiceTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServiceTypes(data || []);
    } catch (error) {
      console.error('Error fetching service types:', error);
      toast.error('Erreur lors du chargement des types de services');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectType = (type: ServiceType) => {
    setSelectedType(type);
    setStep('configure');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedType(null);
    resetForm();
  };

  const handleCreate = async () => {
    if (!user?.id || !selectedType) {
      toast.error('Session expirée, veuillez vous reconnecter');
      return;
    }

    // Validation avec Zod
    try {
      const formData: ServiceFormData = {
        businessName,
        description,
        address
      };
      
      const validatedData = serviceFormSchema.parse(formData);
      
      setCreating(true);

      // Créer le nouveau service professionnel avec données validées
      const { data, error } = await supabase
        .from('professional_services')
        .insert({
          user_id: user.id,
          service_type_id: selectedType.id,
          business_name: validatedData.businessName,
          description: validatedData.description || null,
          address: validatedData.address || null,
          latitude: latitude,
          longitude: longitude,
          status: 'active',
          verification_status: 'unverified',
          rating: 0,
          total_reviews: 0
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Service créé avec succès !');
      onOpenChange(false);
      
      // Rediriger vers la page vendeur pour voir le nouveau service
      navigate('/vendeur', { 
        state: { 
          newServiceId: data.id,
          showServiceModule: true 
        } 
      });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // Erreur de validation Zod - utiliser .issues pour Zod v4+
        const firstError = error.issues[0];
        toast.error(firstError.message);
      } else if (error.code === '23505') {
        toast.error('Vous avez déjà un service de ce type actif');
      } else {
        console.error('Error creating service:', error);
        toast.error('Erreur lors de la création du service');
      }
    } finally {
      setCreating(false);
    }
  };

  const getServiceIcon = (code: string) => {
    return SERVICE_ICONS[code] || SERVICE_ICONS.default;
  };

  // Fonction pour obtenir la catégorie d'un service
  const getServiceCategory = (code: string): string => {
    for (const [key, category] of Object.entries(SERVICE_CATEGORIES)) {
      if (category.codes.includes(code)) {
        return key;
      }
    }
    return 'commerce';
  };

  // Grouper les services par catégorie (comme dans Auth.tsx)
  const groupedServices = serviceTypes.reduce((acc, type) => {
    const category = getServiceCategory(type.code);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(type);
    return acc;
  }, {} as Record<string, ServiceType[]>);

  const getCategoryColor = (categoryKey: string) => {
    switch (categoryKey) {
      case 'proximite': return 'primary';
      case 'professionnel': return 'violet-500';
      case 'numerique': return 'cyan-500';
      default: return 'green-500';
    }
  };

  const renderServiceTypeGrid = () => (
    <ScrollArea className="h-[450px] pr-2">
      <div className="space-y-6">
        {/* Services de Proximité Populaires */}
        {groupedServices['proximite']?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-primary rounded"></span>
              Services de Proximité
              <span className="w-6 h-0.5 bg-primary rounded"></span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {groupedServices['proximite'].map((type) => {
                const Icon = getServiceIcon(type.code);
                return (
                  <Card
                    key={type.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary group"
                    onClick={() => handleSelectType(type)}
                  >
                    <CardContent className="p-3">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <h4 className="font-semibold text-xs text-foreground truncate w-full">{type.name}</h4>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Services Professionnels */}
        {groupedServices['professionnel']?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-violet-600 mb-3 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-violet-500 rounded"></span>
              Services Professionnels
              <span className="w-6 h-0.5 bg-violet-500 rounded"></span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {groupedServices['professionnel'].map((type) => {
                const Icon = getServiceIcon(type.code);
                return (
                  <Card
                    key={type.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-violet-500 group"
                    onClick={() => handleSelectType(type)}
                  >
                    <CardContent className="p-3 bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-900/10 dark:to-background">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-2 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition-colors">
                          <Icon className="w-5 h-5 text-violet-600" />
                        </div>
                        <h4 className="font-semibold text-xs text-foreground truncate w-full">{type.name}</h4>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Produits Numériques */}
        {groupedServices['numerique']?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-cyan-600 mb-3 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-cyan-500 rounded"></span>
              Produits Numériques
              <span className="w-6 h-0.5 bg-cyan-500 rounded"></span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {groupedServices['numerique'].map((type) => {
                const Icon = getServiceIcon(type.code);
                return (
                  <Card
                    key={type.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-cyan-500 group"
                    onClick={() => handleSelectType(type)}
                  >
                    <CardContent className="p-3 bg-gradient-to-br from-cyan-50/50 to-white dark:from-cyan-900/10 dark:to-background">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-2 group-hover:bg-cyan-200 dark:group-hover:bg-cyan-900/50 transition-colors">
                          <Icon className="w-5 h-5 text-cyan-600" />
                        </div>
                        <h4 className="font-semibold text-xs text-foreground truncate w-full">{type.name}</h4>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Commerce / Autres */}
        {groupedServices['commerce']?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-600 mb-3 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-green-500 rounded"></span>
              Commerce & Livraison
              <span className="w-6 h-0.5 bg-green-500 rounded"></span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {groupedServices['commerce'].map((type) => {
                const Icon = getServiceIcon(type.code);
                return (
                  <Card
                    key={type.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-green-500 group"
                    onClick={() => handleSelectType(type)}
                  >
                    <CardContent className="p-3 bg-gradient-to-br from-green-50/50 to-white dark:from-green-900/10 dark:to-background">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                          <Icon className="w-5 h-5 text-green-600" />
                        </div>
                        <h4 className="font-semibold text-xs text-foreground truncate w-full">{type.name}</h4>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Services non catégorisés (fallback) */}
        {Object.keys(groupedServices).filter(k => !['proximite', 'professionnel', 'numerique', 'commerce'].includes(k)).map(categoryKey => {
          const services = groupedServices[categoryKey];
          if (!services?.length) return null;
          return (
            <div key={categoryKey}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <span className="w-6 h-0.5 bg-muted-foreground rounded"></span>
                Autres Services
                <span className="w-6 h-0.5 bg-muted-foreground rounded"></span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {services.map((type) => {
                  const Icon = getServiceIcon(type.code);
                  return (
                    <Card
                      key={type.id}
                      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 group"
                      onClick={() => handleSelectType(type)}
                    >
                      <CardContent className="p-3">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2 group-hover:bg-muted/80 transition-colors">
                            <Icon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <h4 className="font-semibold text-xs text-foreground truncate w-full">{type.name}</h4>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );

  const renderConfigureForm = () => {
    const Icon = selectedType ? getServiceIcon(selectedType.code) : Store;
    
    return (
      <div className="space-y-6">
        {/* Selected type indicator */}
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{selectedType?.name}</h4>
            <p className="text-xs text-muted-foreground">{selectedType?.category}</p>
          </div>
          <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Nom de l'entreprise *</Label>
            <Input
              id="business-name"
              placeholder="Ex: Mon Restaurant Gourmand"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              placeholder="Décrivez votre activité..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse (optionnel)</Label>
            <Input
              id="address"
              placeholder="Ex: Kaloum, Conakry, Guinée"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* GPS Location */}
          <div className="space-y-2">
            <Label>Position GPS (recommandé)</Label>
            <div className="flex items-center gap-3">
              <Button 
                type="button"
                variant="outline" 
                onClick={getGpsLocation}
                disabled={gpsLoading}
                className="gap-2"
              >
                {gpsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                {gpsLoading ? 'Localisation...' : 'Localiser mon service'}
              </Button>
              {latitude && longitude && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <MapPin className="w-4 h-4" />
                  <span>Position enregistrée</span>
                </div>
              )}
            </div>
            {gpsError && (
              <p className="text-xs text-destructive">{gpsError}</p>
            )}
            {latitude && longitude && (
              <p className="text-xs text-muted-foreground">
                Coordonnées: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            )}
          </div>
        </div>

        {/* Info box */}
        <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Bon à savoir
            </p>
            <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
              Vous pourrez personnaliser votre service avec des produits, menus, et horaires après la création.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            type="button"
            variant="outline" 
            onClick={handleBack}
            className="flex-1"
            disabled={creating}
          >
            Retour
          </Button>
          <Button 
            type="button"
            onClick={handleCreate}
            className="flex-1 gap-2"
            disabled={creating || !businessName.trim()}
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Créer le service
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            {step === 'select' ? 'Nouveau service professionnel' : 'Configurer votre service'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' 
              ? 'Choisissez le type de service que vous souhaitez créer'
              : `Configurez votre ${selectedType?.name || 'service'}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : step === 'select' ? (
            renderServiceTypeGrid()
          ) : (
            renderConfigureForm()
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddServiceModal;
