import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Clock, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  address?: string;
  phone?: string;
  rating?: number;
  reviews_count?: number;
  is_open?: boolean;
  image_url?: string;
}

export default function ServicesProximite() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", name: "Tous", icon: "🏪" },
    { id: "restaurant", name: "Restaurants", icon: "🍽️" },
    { id: "sante", name: "Santé", icon: "🏥" },
    { id: "education", name: "Éducation", icon: "📚" },
    { id: "beaute", name: "Beauté", icon: "💇" },
    { id: "commerce", name: "Commerce", icon: "🛍️" },
    { id: "service", name: "Services", icon: "🔧" },
  ];

  useEffect(() => {
    loadServices();
  }, [selectedCategory, searchQuery]);

  const loadServices = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('service_types')
        .select('*')
        .eq('is_active', true);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      // Transformer les données pour correspondre à l'interface Service
      const transformedData = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        category: item.category || 'service',
        rating: 4.5,
        reviews_count: Math.floor(Math.random() * 100),
        is_open: true,
        image_url: item.icon
      }));

      setServices(transformedData);
    } catch (error) {
      console.error('Erreur chargement services:', error);
      toast.error('Erreur lors du chargement des services');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceClick = (serviceId: string) => {
    // Rediriger vers la page de détails du service ou ouvrir un modal
    toast.info('Détails du service à venir');
  };

  const filteredServices = services;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Services de Proximité</h1>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      {/* Catégories */}
      <section className="px-4 py-4 border-b border-border bg-card">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="whitespace-nowrap"
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </Button>
          ))}
        </div>
      </section>

      {/* Liste des services */}
      <section className="px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Aucun service trouvé</p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Effacer la recherche
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <Card 
                key={service.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleServiceClick(service.id)}
              >
                {service.image_url && (
                  <div className="h-40 bg-accent overflow-hidden">
                    <img 
                      src={service.image_url} 
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground text-lg">
                      {service.name}
                    </h3>
                    {service.is_open && (
                      <Badge variant="default" className="text-xs">
                        Ouvert
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {service.description}
                  </p>

                  {service.rating && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium ml-1">{service.rating}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ({service.reviews_count} avis)
                      </span>
                    </div>
                  )}

                  {service.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{service.address}</span>
                    </div>
                  )}

                  {service.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{service.phone}</span>
                    </div>
                  )}

                  <Button className="w-full mt-4" size="sm">
                    Voir les détails
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
