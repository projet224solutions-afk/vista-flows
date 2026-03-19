import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  Star,
  Mail,
  Share2,
  Heart,
  MessageSquare,
  Calendar,
  Navigation,
  UtensilsCrossed,
  Flame,
  Settings,
  Camera,
  ImagePlus,
  X,
  Trash2,
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
import { ReservationModal } from "@/components/restaurant/ReservationModal";

interface ServiceDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  service_type_code?: string; // Code du type de service (restaurant, salon, etc.)
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

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  image_url?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category_id?: string;
  is_available: boolean;
  is_featured: boolean;
  spicy_level?: number;
  dietary_tags?: string[];
  preparation_time?: number;
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getDistanceTo, usingRealLocation, positionReady } = useGeoDistance();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [galleryImages, setGalleryImages] = useState<{ id: string; image_url: string; caption?: string }[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isOwner, setIsOwner] = useState(false);


  useEffect(() => {
    if (id && positionReady) {
      loadServiceDetails();
      loadReviews();
      loadRestaurantMenu();
      loadGalleryImages();
    }
  }, [id, positionReady]);

  // Check ownership
  useEffect(() => {
    if (service?.vendor_user_id && user?.id) {
      setIsOwner(service.vendor_user_id === user.id);
    } else {
      setIsOwner(false);
    }
  }, [service?.vendor_user_id, user?.id]);

  // Géocoder une adresse pour obtenir les coordonnées
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      console.log('[ServiceDetail] Géocodage de l\'adresse:', address);
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address, type: 'geocode' }
      });

      if (error) {
        console.warn('[ServiceDetail] Erreur géocodage:', error);
        return null;
      }

      if (data?.lat && data?.lng) {
        console.log('[ServiceDetail] Coordonnées trouvées:', data.lat, data.lng);
        return { lat: data.lat, lng: data.lng };
      }

      return null;
    } catch (err) {
      console.warn('[ServiceDetail] Géocodage échoué:', err);
      return null;
    }
  };

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

        // Coordonnées par défaut (Conakry)
        let lat = 9.6412;
        let lng = -13.5784;

        // Si une adresse existe, tenter de la géocoder
        if (proService.address) {
          const coords = await geocodeAddress(proService.address);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
          }
        }

        const serviceData: ServiceDetail = {
          id: proService.id,
          name: proService.business_name,
          description: proService.description || 'Aucune description disponible',
          category: proService.service_types?.category || 'service',
          service_type_code: proService.service_types?.code, // Ajouter le code du type
          address: proService.address,
          phone: proService.phone,
          rating: Number(proService.rating) || 0,
          reviews_count: proService.total_reviews || 0,
          is_open: true,
          image_url: proService.cover_image_url || proService.logo_url,
          features: [],
          latitude: lat,
          longitude: lng,
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

  const loadRestaurantMenu = async () => {
    try {
      // Charger les catégories du menu
      const { data: categories } = await supabase
        .from('restaurant_menu_categories')
        .select('*')
        .eq('professional_service_id', id)
        .eq('is_active', true)
        .order('display_order');

      if (categories) {
        setMenuCategories(categories);
      }

      // Charger les plats du menu
      const { data: items } = await supabase
        .from('restaurant_menu_items')
        .select('*')
        .eq('professional_service_id', id)
        .eq('is_available', true)
        .order('display_order');

      if (items) {
        setMenuItems(items);
      }
    } catch (error) {
      console.error('Erreur chargement menu:', error);
    }
  };

  const loadGalleryImages = async () => {
    try {
      const { data, error } = await supabase
        .from('service_gallery_images')
        .select('id, image_url, caption')
        .eq('professional_service_id', id)
        .order('display_order');
      if (!error && data) setGalleryImages(data);
    } catch (e) {
      console.warn('Erreur chargement galerie:', e);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Seules les images sont autorisées');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 5 MB)');
      return;
    }

    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${id}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('service-gallery')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('service-gallery')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('service_gallery_images')
        .insert({
          professional_service_id: id,
          image_url: publicUrl,
          display_order: galleryImages.length,
        });

      if (dbError) throw dbError;

      toast.success('Image ajoutée à la galerie !');
      loadGalleryImages();
    } catch (err: any) {
      console.error('Erreur upload galerie:', err);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('service_gallery_images')
        .delete()
        .eq('id', imageId);
      if (error) throw error;
      toast.success('Image supprimée');
      setGalleryImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleContact = () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour contacter ce service');
      navigate('/auth');
      return;
    }

    console.log('🔍 handleContact - service:', service);
    console.log('🔍 handleContact - vendor_user_id:', service?.vendor_user_id);

    if (!service?.vendor_user_id) {
      toast.error('Informations du prestataire non disponibles. Veuillez réessayer.');
      return;
    }

    if (service.vendor_user_id === user.id) {
      toast.error("Vous ne pouvez pas vous contacter vous-même");
      return;
    }

    // Ouvrir la messagerie directe (réelle) avec le prestataire
    navigate(`/communication/direct/${service.vendor_user_id}`);
  };

  const handleReservation = () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour réserver');
      navigate('/auth');
      return;
    }
    
    // Ouvrir le modal de réservation professionnel pour les restaurants
    if (isRestaurant) {
      setIsReservationModalOpen(true);
    } else {
      // Pour les autres types de services, rediriger vers la réservation générique
      toast.info('Contactez le prestataire pour réserver');
    }
  };

  // Naviguer vers le menu restaurant pour passer commande
  const handleOrderFromRestaurant = () => {
    navigate(`/restaurant/${id}/menu`);
  };

  // Vérifier si c'est un restaurant (via le code du type de service)
  const isRestaurant = service?.service_type_code === 'restaurant';

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
    <div className="min-h-screen bg-background pb-24">
      {/* ═══ Hero Image ═══ */}
      <div className="relative h-72 md:h-[420px] bg-muted overflow-hidden">
        {service.image_url ? (
          <img
            src={service.image_url}
            alt={service.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <span className="text-7xl opacity-60">
              {service.category === 'restaurant' ? '🍽️' :
               service.category === 'sante' ? '🏥' :
               service.category === 'education' ? '📚' :
               service.category === 'beaute' ? '💇' :
               service.category === 'commerce' ? '🛍️' : '🔧'}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />

        {/* Top navigation */}
        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between z-10">
          <Button
            variant="ghost"
            size="icon"
            className="text-white bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full w-10 h-10"
            onClick={() => navigate('/services-proximite')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex gap-2">
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full w-10 h-10"
                onClick={() => navigate(`/dashboard/service/${id}`)}
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full w-10 h-10"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full w-10 h-10"
              onClick={toggleFavorite}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Status badge on image */}
        <div className="absolute bottom-4 right-4 z-10">
          <Badge
            className={`text-sm px-4 py-2 font-semibold shadow-lg backdrop-blur-sm border-0 ${
              service.is_open
                ? 'bg-primary text-primary-foreground'
                : 'bg-destructive text-destructive-foreground'
            }`}
          >
            {service.is_open ? '✅ Ouvert' : '🔴 Fermé'}
          </Badge>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <div className="max-w-3xl mx-auto px-4 relative">
        {/* Profile card overlapping hero */}
        <Card className="relative -mt-16 z-20 border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-5 md:p-8">
            {/* Name & rating */}
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight mb-3">
              {service.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* Rating */}
              <div className="flex items-center gap-1.5">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-lg">{service.rating}</span>
                <span className="text-muted-foreground text-sm">
                  ({service.reviews_count} avis)
                </span>
              </div>

              {/* Distance */}
              <Badge variant="outline" className="flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border-primary/30">
                <Navigation className="w-3.5 h-3.5 text-primary" />
                {formatDistance(distance)}
                {usingRealLocation && <span className="text-green-500 text-xs">●</span>}
              </Badge>
            </div>

            {/* Category badge */}
            <Badge className="bg-primary/10 text-primary border-0 font-semibold mb-4">
              {service.category}
            </Badge>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed mb-6">
              {service.description}
            </p>

            {/* ═══ Action Buttons ═══ */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleContact}
                className="flex-1 min-w-[120px] h-12 rounded-xl font-semibold text-sm bg-primary hover:bg-primary/90"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Contacter
              </Button>
              <Button
                onClick={handleReservation}
                variant="outline"
                className="flex-1 min-w-[120px] h-12 rounded-xl font-semibold text-sm border-primary/30 text-primary hover:bg-primary/5"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Réserver
              </Button>
              {isRestaurant && (
                <Button
                  onClick={handleOrderFromRestaurant}
                  className="flex-1 min-w-[120px] h-12 rounded-xl font-semibold text-sm bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <UtensilsCrossed className="w-4 h-4 mr-2" />
                  Commander
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ═══ Tabs Section ═══ */}
        <Tabs defaultValue="info" className="mt-6 mb-6">
          <TabsList className="w-full rounded-xl h-12 bg-muted/60 p-1">
            <TabsTrigger value="info" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold">
              Informations
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold">
              Horaires
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-semibold">
              Avis ({reviews.length})
            </TabsTrigger>
          </TabsList>

          {/* ─── Informations ─── */}
          <TabsContent value="info">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-5 md:p-6 space-y-5">
                {service.address && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">Adresse</p>
                      <p className="text-muted-foreground text-sm mt-0.5">{service.address}</p>
                      <Button
                        variant="link"
                        className="px-0 h-auto mt-1 text-primary font-medium text-sm"
                        onClick={openInMaps}
                      >
                        Voir sur la carte
                      </Button>
                    </div>
                  </div>
                )}

                {service.phone && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">Téléphone</p>
                      <a href={`tel:${service.phone}`} className="text-primary hover:underline text-sm mt-0.5 inline-block">
                        {service.phone}
                      </a>
                    </div>
                  </div>
                )}

                {service.email && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">Email</p>
                      <a href={`mailto:${service.email}`} className="text-primary hover:underline text-sm mt-0.5 inline-block">
                        {service.email}
                      </a>
                    </div>
                  </div>
                )}

                {service.features && service.features.length > 0 && (
                  <div>
                    <p className="font-semibold text-foreground mb-2">Caractéristiques</p>
                    <div className="flex flex-wrap gap-2">
                      {service.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="rounded-full">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Horaires ─── */}
          <TabsContent value="hours">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-5 md:p-6">
                <div className="space-y-1">
                  {service.opening_hours && Object.entries(service.opening_hours).map(([day, hours]) => {
                    const dayName = day === 'monday' ? 'Lundi' :
                      day === 'tuesday' ? 'Mardi' :
                      day === 'wednesday' ? 'Mercredi' :
                      day === 'thursday' ? 'Jeudi' :
                      day === 'friday' ? 'Vendredi' :
                      day === 'saturday' ? 'Samedi' : 'Dimanche';

                    let hoursDisplay: string;
                    if (typeof hours === 'string') {
                      hoursDisplay = hours;
                    } else if (typeof hours === 'object' && hours !== null) {
                      const hoursObj = hours as { open?: string; close?: string; closed?: boolean };
                      if (hoursObj.closed) {
                        hoursDisplay = 'Fermé';
                      } else {
                        hoursDisplay = `${hoursObj.open || '08:00'} - ${hoursObj.close || '18:00'}`;
                      }
                    } else {
                      hoursDisplay = 'Non défini';
                    }

                    const isClosed = hoursDisplay.toLowerCase() === 'fermé';

                    return (
                      <div key={day} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                        <span className="font-medium text-foreground">{dayName}</span>
                        <span className={`text-sm font-medium ${isClosed ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {hoursDisplay}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Avis ─── */}
          <TabsContent value="reviews">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-5 md:p-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-10">
                    <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">Aucun avis pour le moment</p>
                    <Button variant="outline" className="rounded-xl">
                      Soyez le premier à donner votre avis
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-border/50 pb-5 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={review.user_avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {review.user_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-foreground text-sm">{review.user_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted-foreground/30'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>
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

        {/* ═══ Gallery ═══ */}
        {(galleryImages.length > 0 || isOwner) && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Photos</h2>
                <Badge variant="secondary" className="rounded-full">{galleryImages.length}</Badge>
              </div>
              {isOwner && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  <Button asChild variant="outline" size="sm" disabled={uploadingImage} className="rounded-xl">
                    <span>
                      {uploadingImage ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                      ) : (
                        <ImagePlus className="w-4 h-4 mr-2" />
                      )}
                      Ajouter
                    </span>
                  </Button>
                </label>
              )}
            </div>

            {galleryImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {galleryImages.map((img) => (
                  <div key={img.id} className="relative group rounded-2xl overflow-hidden aspect-square bg-muted shadow-sm">
                    <img
                      src={img.image_url}
                      alt={img.caption || 'Photo du service'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteGalleryImage(img.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : isOwner ? (
              <Card className="rounded-2xl border-0 shadow-md">
                <CardContent className="p-8 text-center">
                  <Camera className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground mb-1">Aucune photo pour le moment</p>
                  <p className="text-sm text-muted-foreground/70">
                    Ajoutez des photos pour attirer plus de clients
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        {/* ═══ Restaurant Menu Section ═══ */}
        {isRestaurant && menuItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <UtensilsCrossed className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Notre Menu</h2>
            </div>

            {menuCategories.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                {menuCategories.map((category) => (
                  <Badge
                    key={category.id}
                    variant="secondary"
                    className="whitespace-nowrap px-4 py-1.5 rounded-full font-medium"
                  >
                    {category.icon && <span className="mr-1">{category.icon}</span>}
                    {category.name}
                  </Badge>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuItems.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow rounded-2xl border-0 shadow-sm">
                  <div className="flex">
                    <div className="w-28 h-28 flex-shrink-0 bg-muted">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl bg-primary/5">
                          🍽️
                        </div>
                      )}
                    </div>

                    <CardContent className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-foreground line-clamp-1 text-sm">
                            {item.name}
                          </h3>
                          {item.is_featured && (
                            <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5">
                              ⭐
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.spicy_level && item.spicy_level > 0 && (
                            <div className="flex items-center text-accent">
                              {[...Array(item.spicy_level)].map((_, i) => (
                                <Flame key={i} className="w-3 h-3" />
                              ))}
                            </div>
                          )}
                          {item.dietary_tags?.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] rounded-full px-1.5">
                              {tag}
                            </Badge>
                          ))}
                          {item.preparation_time && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {item.preparation_time}min
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-base font-bold text-primary">
                          {item.price.toLocaleString()} FG
                        </span>
                        <Button
                          size="sm"
                          onClick={handleOrderFromRestaurant}
                          className="h-8 rounded-lg text-xs bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          Commander
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center mt-5">
              <Button
                variant="outline"
                onClick={handleOrderFromRestaurant}
                className="w-full md:w-auto rounded-xl h-12 font-semibold"
              >
                <UtensilsCrossed className="w-4 h-4 mr-2" />
                Voir le menu complet et commander
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de réservation restaurant */}
      {isRestaurant && service && (
        <ReservationModal
          isOpen={isReservationModalOpen}
          onClose={() => setIsReservationModalOpen(false)}
          serviceId={service.id}
          restaurantName={service.name}
          restaurantPhone={service.phone}
        />
      )}
    </div>
  );
}
