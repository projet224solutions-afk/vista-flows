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
import { useGeoDistance, formatDistance } from "@/hooks/useGeoDistance";

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
  vendor_user_id?: string;
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
  const { getDistanceTo, usingRealLocation, positionReady } = useGeoDistance();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (id && positionReady) {
      loadServiceDetails();
      loadReviews();
    }
  }, [id, positionReady]);

  const loadServiceDetails = async () => {
    try {
      setLoading(true);
      
      // D'abord essayer de charger depuis professional_services (pour les services du marketplace)
      const { data: proService, error: proError } = await supabase
        .from('professional_services')
        .select(`
          id,
          user_id,
          business_name,
          description,
          logo_url,
          cover_image_url,
          address,
          phone,
          opening_hours,
          rating,
          total_reviews,
          service_types (
            name,
            category,
            code
          )
        `)
        .eq('id', id)
        .single();

      if (!proError && proService) {
        // C'est un service professionnel du marketplace
        const openingHours = proService.opening_hours as OpeningHours || {
          monday: "08:00 - 18:00",
          tuesday: "08:00 - 18:00",
          wednesday: "08:00 - 18:00",
          thursday: "08:00 - 18:00",
          friday: "08:00 - 18:00",
          saturday: "09:00 - 14:00",
          sunday: "Fermé"
        };

        const serviceData: ServiceDetail = {
          id: proService.id,
          name: proService.business_name,
          description: proService.description || 'Aucune description disponible',
          category: proService.service_types?.category || 'service',
          address: proService.address,
          phone: proService.phone,
          rating: Number(proService.rating) || 0,
          reviews_count: proService.total_reviews || 0,
          is_open: true,
          image_url: proService.cover_image_url || proService.logo_url,
          features: [],
          latitude: 9.6412,
          longitude: -13.5784,
          opening_hours: openingHours,
          vendor_user_id: proService.user_id
        };

        setService(serviceData);
        const dist = getDistanceTo(serviceData.latitude!, serviceData.longitude!);
        setDistance(dist);
        return;
      }

      // Sinon, essayer depuis service_types (pour les types de services génériques)
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
        features: (Array.isArray(data.features) ? data.features : []) as string[],
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
      const dist = getDistanceTo(serviceData.latitude!, serviceData.longitude!);
      setDistance(dist);

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
      // Charger les avis réels depuis service_reviews
      const { data, error } = await supabase
        .from('service_reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          client_id,
          is_verified
        `)
        .eq('professional_service_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erreur chargement avis:', error);
        setReviews([]);
        return;
      }

      if (!data || data.length === 0) {
        setReviews([]);
        return;
      }

      // Récupérer les infos des clients pour chaque avis
      const clientIds = data.map(r => r.client_id).filter(Boolean);
      let clientsMap: Record<string, any> = {};
      
      if (clientIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', clientIds);
        
        if (profiles) {
          clientsMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        }
      }

      const formattedReviews = data.map((review: any) => {
        const client = clientsMap[review.client_id];
        return {
          id: review.id,
          user_name: client?.full_name || 'Client vérifié',
          user_avatar: client?.avatar_url,
          rating: review.rating,
          comment: review.comment,
          created_at: review.created_at,
          is_verified: review.is_verified
        };
      });

      setReviews(formattedReviews);
    } catch (error) {
      console.error('Erreur chargement avis:', error);
    }
  };

  const handleContact = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour contacter ce service');
      navigate('/auth');
      return;
    }
    
    if (!service?.vendor_user_id) {
      toast.error('Informations du prestataire non disponibles');
      return;
    }

    try {
      // Créer un message initial
      const initialMessage = `Bonjour, je suis intéressé par vos services "${service.name}". Pouvez-vous me donner plus d'informations ?`;
      
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: service.vendor_user_id,
          content: initialMessage,
          type: 'text'
        });

      if (error) throw error;

      toast.success('Message envoyé au prestataire!');
      navigate(`/messages?recipientId=${service.vendor_user_id}`);
    } catch (error) {
      console.error('Erreur lors du contact:', error);
      toast.error('Impossible de contacter le prestataire');
    }
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
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {formatDistance(distance)}
                    {usingRealLocation && <span className="ml-1 text-green-500">●</span>}
                  </Badge>
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
