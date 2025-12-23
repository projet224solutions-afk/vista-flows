import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ServiceType {
  id: string;
  name: string;
  code?: string;
  description: string;
  category: string;
  icon: string;
  commission_rate: number;
  features: string[];
  is_active: boolean;
}

export interface ProfessionalService {
  id: string;
  service_type_id: string;
  user_id: string;
  business_name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  cover_image_url?: string;
  opening_hours?: any;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  rating: number;
  total_reviews: number;
  total_orders: number;
  total_revenue: number;
  metadata?: any;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  service_type?: ServiceType;
}

export function useProfessionalServices() {
  const { user } = useAuth();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [userServices, setUserServices] = useState<ProfessionalService[]>([]);
  const [loading, setLoading] = useState(true);

  // Services par défaut avec codes (fallback si erreur DB)
  const defaultServiceTypes: ServiceType[] = [
    { id: '1', name: 'Restaurant', code: 'restaurant', description: 'Système complet de gestion de restaurant', category: 'food', icon: '🍽️', commission_rate: 15, features: ['Menu digital', 'Commandes', 'Réservations', 'Livraison'], is_active: true },
    { id: '2', name: 'E-commerce', code: 'ecommerce', description: 'Boutique en ligne complète', category: 'commerce', icon: '🛍️', commission_rate: 10, features: ['Catalogue produits', 'Panier', 'Paiement', 'Livraison'], is_active: true },
    { id: '3', name: 'Salon de Beauté', code: 'beaute', description: 'Gestion de rendez-vous et services de beauté', category: 'services', icon: '💅', commission_rate: 12, features: ['Réservations', 'Catalogue services', 'Gestion équipe'], is_active: true },
    { id: '4', name: 'Taxi/VTC', code: 'voyage', description: 'Service de transport avec réservation', category: 'transport', icon: '🚕', commission_rate: 20, features: ['Réservations', 'Suivi GPS', 'Paiement'], is_active: true },
    { id: '5', name: 'Cabinet Médical', code: 'sante', description: 'Gestion de cabinet médical', category: 'health', icon: '⚕️', commission_rate: 8, features: ['Rendez-vous', 'Dossiers patients', 'Prescriptions'], is_active: true },
    { id: '6', name: 'Centre de Formation', code: 'education', description: 'Plateforme de cours et formations', category: 'education', icon: '🎓', commission_rate: 15, features: ['Cours', 'Inscriptions', 'Certificats'], is_active: true },
    { id: '7', name: 'Studio Photo', code: 'media', description: 'Gestion de studio photo', category: 'creative', icon: '📸', commission_rate: 10, features: ['Portfolio', 'Réservations', 'Galerie'], is_active: true },
    { id: '8', name: 'Développeur Web', code: 'informatique', description: 'Services de développement web', category: 'tech', icon: '💻', commission_rate: 12, features: ['Portfolio', 'Devis', 'Projets'], is_active: true },
    { id: '9', name: 'Livraison Express', code: 'livraison', description: 'Service de livraison rapide', category: 'transport', icon: '📦', commission_rate: 18, features: ['Suivi', 'Paiement', 'Notifications'], is_active: true },
    { id: '10', name: 'Gym/Fitness', code: 'fitness', description: 'Centre de fitness avec abonnements', category: 'services', icon: '💪', commission_rate: 10, features: ['Abonnements', 'Planning cours', 'Suivi'], is_active: true },
    { id: '11', name: 'Coiffeur', code: 'coiffeur', description: 'Salon de coiffure', category: 'services', icon: '✂️', commission_rate: 12, features: ['Réservations', 'Services', 'Produits'], is_active: true },
    { id: '12', name: 'Traiteur', code: 'traiteur', description: 'Service de traiteur pour événements', category: 'food', icon: '🍱', commission_rate: 15, features: ['Menus', 'Devis', 'Événements'], is_active: true },
    { id: '13', name: 'Boutique Mode', code: 'mode', description: 'Boutique de vêtements et accessoires', category: 'commerce', icon: '👗', commission_rate: 10, features: ['Catalogue', 'Tailles', 'Livraison'], is_active: true },
    { id: '14', name: 'Agence Immobilière', code: 'location', description: 'Gestion de biens immobiliers', category: 'services', icon: '🏠', commission_rate: 8, features: ['Annonces', 'Visites', 'Contacts'], is_active: true },
    { id: '15', name: 'Coach Sportif', code: 'coach', description: 'Coaching sportif personnalisé', category: 'services', icon: '🏋️', commission_rate: 12, features: ['Programmes', 'Suivi', 'Rendez-vous'], is_active: true }
  ];

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserServices();
    } else {
      setUserServices([]);
    }
  }, [user]);

  const fetchServiceTypes = async () => {
    try {
      setLoading(true);
      
      // Requête réelle vers la base de données
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('Erreur DB service_types:', error);
        // Fallback vers les données par défaut
        setServiceTypes(defaultServiceTypes);
      } else if (data && data.length > 0) {
        // Mapper les données DB vers notre interface
        const mappedTypes: ServiceType[] = data.map(item => ({
          id: item.id,
          name: item.name,
          code: item.code,
          description: item.description || '',
          category: item.category || 'services',
          icon: item.icon || '📦',
          commission_rate: item.commission_rate || 10,
          features: Array.isArray(item.features) ? item.features : [],
          is_active: item.is_active
        }));
        setServiceTypes(mappedTypes);
      } else {
        // Pas de données, utiliser les défauts
        setServiceTypes(defaultServiceTypes);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des types de services:', error);
      setServiceTypes(defaultServiceTypes);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserServices = async () => {
    if (!user) return;
    
    try {
      // Requête réelle vers la base de données
      const { data, error } = await supabase
        .from('professional_services')
        .select(`
          *,
          service_type:service_types(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erreur DB professional_services:', error);
        setUserServices([]);
      } else if (data) {
        // Mapper les données DB vers notre interface
        const mappedServices: ProfessionalService[] = data.map(item => ({
          id: item.id,
          service_type_id: item.service_type_id,
          user_id: item.user_id,
          business_name: item.business_name,
          description: item.description,
          address: item.address,
          phone: item.phone,
          email: item.email,
          website: item.website,
          logo_url: item.logo_url,
          cover_image_url: item.cover_image_url,
          opening_hours: item.opening_hours,
          status: item.status || 'pending',
          verification_status: item.verification_status || 'unverified',
          rating: item.rating || 0,
          total_reviews: item.total_reviews || 0,
          total_orders: item.total_orders || 0,
          total_revenue: item.total_revenue || 0,
          metadata: item.metadata,
          is_active: item.status === 'active',
          created_at: item.created_at,
          updated_at: item.updated_at,
          service_type: item.service_type ? {
            id: item.service_type.id,
            name: item.service_type.name,
            code: item.service_type.code,
            description: item.service_type.description || '',
            category: item.service_type.category || 'services',
            icon: item.service_type.icon || '📦',
            commission_rate: item.service_type.commission_rate || 10,
            features: Array.isArray(item.service_type.features) ? item.service_type.features : [],
            is_active: item.service_type.is_active
          } : undefined
        }));
        setUserServices(mappedServices);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des services utilisateur:', error);
      setUserServices([]);
    }
  };

  const createProfessionalService = async (serviceData: {
    service_type_id: string;
    business_name: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  }) => {
    try {
      if (!user) {
        toast.error('Vous devez être connecté');
        return null;
      }

      // Créer le service dans la DB
      const { data, error } = await supabase
        .from('professional_services')
        .insert({
          service_type_id: serviceData.service_type_id,
          user_id: user.id,
          business_name: serviceData.business_name,
          description: serviceData.description || null,
          address: serviceData.address || null,
          phone: serviceData.phone || null,
          email: serviceData.email || null,
          website: serviceData.website || null,
          status: 'pending',
          verification_status: 'unverified',
          rating: 0,
          total_reviews: 0,
          total_orders: 0,
          total_revenue: 0
        })
        .select(`
          *,
          service_type:service_types(*)
        `)
        .single();

      if (error) {
        console.error('Erreur création service:', error);
        toast.error('Erreur lors de la création du service');
        return null;
      }

      toast.success('Service créé avec succès ! En attente de validation.');
      await fetchUserServices();
      
      return data as ProfessionalService;
    } catch (error) {
      console.error('Erreur lors de la création du service:', error);
      toast.error('Erreur lors de la création du service');
      return null;
    }
  };

  const updateProfessionalService = async (
    serviceId: string, 
    updates: Partial<ProfessionalService>
  ) => {
    try {
      if (!user) {
        toast.error('Vous devez être connecté');
        return false;
      }

      const { error } = await supabase
        .from('professional_services')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erreur mise à jour service:', error);
        toast.error('Erreur lors de la mise à jour');
        return false;
      }

      toast.success('Service mis à jour');
      await fetchUserServices();
      return true;
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      return false;
    }
  };

  return {
    serviceTypes,
    userServices,
    loading,
    createProfessionalService,
    updateProfessionalService,
    refresh: () => {
      fetchServiceTypes();
      if (user) fetchUserServices();
    }
  };
}
