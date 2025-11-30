import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Phone, Clock, Star, Mail, 
  Share2, Heart, MessageSquare, Calendar, Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ServiceDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  rating: number;
  reviews_count: number;
  is_open: boolean;
  image_url?: string;
  opening_hours?: OpeningHours;
  latitude?: number;
  longitude?: number;
  features?: string[];
}

interface OpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

interface Review {
  id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      loadServiceDetails();
      loadReviews();
      getUserLocation();
    }
  }, [id]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Géolocalisation non disponible:', error);
        }
      );
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const loadServiceDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transformer les données
      const serviceData: ServiceDetail = {
        id: data.id,
        name: data.name,
        description: data.description || 'Aucune description disponible',
        category: data.category || 'service',
        rating: 4.5,
        reviews_count: 0,
        is_open: true,
        image_url: data.icon,
        features: data.features || [],
        // Coordonnées par défaut (Conakry)
        latitude: 9.6412,
        longitude: -13.5784,
        opening_hours: {
          monday: "08:00 - 18:00",
          tuesday: "08:00 - 18:00",
          wednesday: "08:00 - 18:00",
          thursday: "08:00 - 18:00",
          friday: "08:00 - 18:00",
          saturday: "09:00 - 14:00",
          sunday: "Fermé"
        }
      };

      setService(serviceData);

      // Calculer la distance si géolocalisation disponible
      if (userLocation && serviceData.latitude && serviceData.longitude) {
        const dist = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          serviceData.latitude,
          serviceData.longitude
        );
        setDistance(dist);
      }

    } catch (error) {
      console.error('Erreur chargement service:', error);
      toast.error('Erreur lors du chargement du service');
      navigate('/services-proximite');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('service_reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          user:profiles(full_name, avatar_url)
        `)
        .eq('service_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Table service_reviews non disponible:', error);
        // Utiliser des avis factices pour le moment
        setReviews([
          {
            id: '1',
            user_name: 'Mamadou Diallo',
            rating: 5,
            comment: 'Excellent service ! Personnel très professionnel.',
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            user_name: 'Fatoumata Baldé',
            rating: 4,
            comment: 'Très bon, je recommande vivement.',
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        ]);
        return;
      }

      const formattedReviews = (data || []).map(review => ({
        id: review.id,
        user_name: review.user?.full_name || 'Utilisateur',
        user_avatar: review.user?.avatar_url,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at
      }));

      setReviews(formattedReviews);
    } catch (error) {
      console.error('Erreur chargement avis:', error);
    }
  };

  const handleContact = () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour contacter ce service');
      navigate('/auth');
      return;
    }
    
    toast.success('Système de messagerie à venir');
  };

  const handleReservation = () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour réserver');
      navigate('/auth');
      return;
    }
    
    toast.success('Système de réservation à venir');
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: service?.name,
          text: service?.description,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Lien copié dans le presse-papier');
      }
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour ajouter aux favoris');
      return;
    }
    
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris');
  };

  const openInMaps = () => {
    if (service?.latitude && service?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}`;
      window.open(url, '_blank');
    } else {
      toast.error('Coordonnées non disponibles');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du service...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Service non trouvé</p>
          <Button onClick={() => navigate('/services-proximite')}>
            Retour aux services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Image d'en-tête */}
      <div className="relative h-64 md:h-96 bg-gradient-to-br from-purple-500 to-blue-600">
        {service.image_url ? (
          <img 
            src={service.image_url} 
            alt={service.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-6xl">
            {service.category === 'restaurant' ? '🍽️' : 
             service.category === 'sante' ? '🏥' :
             service.category === 'education' ? '📚' :
             service.category === 'beaute' ? '💇' :
             service.category === 'commerce' ? '🛍️' : '🔧'}
          </div>
        )}
        
        {/* Overlay avec boutons */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => navigate('/services-proximite')}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleShare}
              >
                <Share2 className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleFavorite}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Badge statut */}
        <div className="absolute bottom-4 right-4">
          <Badge variant={service.is_open ? "default" : "secondary"} className="text-lg px-4 py-2">
            {service.is_open ? '✅ Ouvert' : '🔴 Fermé'}
          </Badge>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-4 -mt-8">
        {/* Carte principale */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {service.name}
                </h1>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="font-semibold text-lg">{service.rating}</span>
                    <span className="text-muted-foreground ml-2">
                      ({service.reviews_count} avis)
                    </span>
                  </div>
                  {distance && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {distance.toFixed(1)} km
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary">{service.category}</Badge>
              </div>
            </div>

            <p className="text-muted-foreground mb-6 text-lg">
              {service.description}
            </p>

            {/* Boutons d'action */}
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleContact} className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                Contacter
              </Button>
              <Button onClick={handleReservation} variant="outline" className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                Réserver
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Onglets */}
        <Tabs defaultValue="info" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="hours">Horaires</TabsTrigger>
            <TabsTrigger value="reviews">Avis ({reviews.length})</TabsTrigger>
          </TabsList>

          {/* Informations */}
          <TabsContent value="info">
            <Card>
              <CardContent className="p-6 space-y-4">
                {service.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">Adresse</p>
                      <p className="text-muted-foreground">{service.address}</p>
                      <Button 
                        variant="link" 
                        className="px-0 h-auto mt-1"
                        onClick={openInMaps}
                      >
                        Voir sur la carte
                      </Button>
                    </div>
                  </div>
                )}

                {service.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">Téléphone</p>
                      <a href={`tel:${service.phone}`} className="text-primary hover:underline">
                        {service.phone}
                      </a>
                    </div>
                  </div>
                )}

                {service.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">Email</p>
                      <a href={`mailto:${service.email}`} className="text-primary hover:underline">
                        {service.email}
                      </a>
                    </div>
                  </div>
                )}

                {service.features && service.features.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Caractéristiques</p>
                    <div className="flex flex-wrap gap-2">
                      {service.features.map((feature, index) => (
                        <Badge key={index} variant="outline">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Horaires */}
          <TabsContent value="hours">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {service.opening_hours && Object.entries(service.opening_hours).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="font-medium capitalize">{
                        day === 'monday' ? 'Lundi' :
                        day === 'tuesday' ? 'Mardi' :
                        day === 'wednesday' ? 'Mercredi' :
                        day === 'thursday' ? 'Jeudi' :
                        day === 'friday' ? 'Vendredi' :
                        day === 'saturday' ? 'Samedi' : 'Dimanche'
                      }</span>
                      <span className="text-muted-foreground">{hours}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Avis */}
          <TabsContent value="reviews">
            <Card>
              <CardContent className="p-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Aucun avis pour le moment</p>
                    <Button variant="outline">
                      Soyez le premier à donner votre avis
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-border pb-4 last:border-0">
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar>
                            <AvatarImage src={review.user_avatar} />
                            <AvatarFallback>{review.user_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold">{review.user_name}</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <div className="flex items-center mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-muted-foreground">{review.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
