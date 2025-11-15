import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceSelectionCard } from '@/components/professional-services/ServiceSelectionCard';
import { ServiceSetupDialog } from '@/components/professional-services/ServiceSetupDialog';
import { useProfessionalServices } from '@/hooks/useProfessionalServices';
import type { ServiceType } from '@/hooks/useProfessionalServices';

export default function ServiceSelection() {
  const navigate = useNavigate();
  const { serviceTypes, loading, createProfessionalService } = useProfessionalServices();
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Grouper les services par catégorie
  const categories = [
    { value: 'all', label: 'Tous les services', count: serviceTypes.length },
    { value: 'services', label: 'Services', count: serviceTypes.filter(s => s.category === 'services').length },
    { value: 'commerce', label: 'Commerce', count: serviceTypes.filter(s => s.category === 'commerce').length },
    { value: 'transport', label: 'Transport', count: serviceTypes.filter(s => s.category === 'transport').length },
    { value: 'food', label: 'Restauration', count: serviceTypes.filter(s => s.category === 'food').length },
    { value: 'health', label: 'Santé', count: serviceTypes.filter(s => s.category === 'health').length },
    { value: 'education', label: 'Éducation', count: serviceTypes.filter(s => s.category === 'education').length },
    { value: 'tech', label: 'Technologie', count: serviceTypes.filter(s => s.category === 'tech').length },
    { value: 'creative', label: 'Créatif', count: serviceTypes.filter(s => s.category === 'creative').length },
  ].filter(cat => cat.count > 0 || cat.value === 'all');

  // Filtrer les services
  const filteredServices = serviceTypes.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleServiceSelect = (service: ServiceType) => {
    setSelectedService(service);
    setShowSetupDialog(true);
  };

  const handleCreateService = async (formData: any) => {
    if (!selectedService) return;

    const service = await createProfessionalService({
      service_type_id: selectedService.id,
      ...formData,
    });

    if (service) {
      // Rediriger vers le dashboard du service créé
      navigate(`/dashboard/service/${service.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement des services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </div>

          <div className="mt-6 text-center space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Choisissez votre Service Professionnel
              </h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Sélectionnez le type de service que vous souhaitez créer. 
              Chaque service dispose d'outils professionnels complets inspirés des meilleurs standards internationaux.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Barre de recherche */}
        <div className="max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
          <Input
            type="search"
            placeholder="Rechercher un service... (ex: Restaurant, Livraison, Beauté)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 text-lg"
          />
        </div>

        {/* Filtres par catégorie */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="grid grid-cols-3 lg:grid-cols-9 gap-2 h-auto bg-card/50 p-2">
            {categories.map((category) => (
              <TabsTrigger
                key={category.value}
                value={category.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span className="hidden sm:inline">{category.label}</span>
                <span className="sm:hidden">{category.label.split(' ')[0]}</span>
                <span className="ml-1 text-xs opacity-75">({category.count})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Grille des services */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-16 animate-in fade-in">
            <p className="text-muted-foreground text-lg">
              Aucun service trouvé pour "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {filteredServices.map((service) => (
              <div key={service.id} className="animate-in fade-in slide-in-from-bottom-4">
                <ServiceSelectionCard
                  service={service}
                  onSelect={() => handleServiceSelect(service)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de configuration */}
      <ServiceSetupDialog
        open={showSetupDialog}
        onClose={() => setShowSetupDialog(false)}
        selectedService={selectedService}
        onSubmit={handleCreateService}
      />
    </div>
  );
}
