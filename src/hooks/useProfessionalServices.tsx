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
  location?: any;
  phone?: string;
  email?: string;
  settings?: any;
  is_active: boolean;
  created_at: string;
  service_type?: ServiceType;
}

export function useProfessionalServices() {
  const { user } = useAuth();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [userServices, setUserServices] = useState<ProfessionalService[]>([]);
  const [loading, setLoading] = useState(true);

  // Services par défaut avec codes (fallback si la table n'existe pas)
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
    if (user) {
      fetchUserServices();
    }
  }, [user]);

  const fetchServiceTypes = async () => {
    try {
      setLoading(true);
      
      // TODO: Remplacer par vraie requête DB quand la table service_types sera créée
      // const { data, error } = await supabase
      //   .from('service_types')
      //   .select('*')
      //   .eq('is_active', true);
      
      // Pour l'instant, utiliser les données par défaut
      setServiceTypes(defaultServiceTypes);
    } catch (error) {
      console.error('Erreur lors du chargement des types de services:', error);
      toast.error('Erreur lors du chargement des services');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserServices = async () => {
    try {
      // TODO: Requête pour récupérer les services de l'utilisateur
      // const { data, error } = await supabase
      //   .from('professional_services')
      //   .select('*, service_type:service_types(*)')
      //   .eq('user_id', user?.id);
      
      setUserServices([]);
    } catch (error) {
      console.error('Erreur lors du chargement des services utilisateur:', error);
    }
  };

  const createProfessionalService = async (serviceData: Partial<ProfessionalService>) => {
    try {
      if (!user) {
        toast.error('Vous devez être connecté');
        return null;
      }

      // TODO: Créer le service dans la DB
      // const { data, error } = await supabase
      //   .from('professional_services')
      //   .insert({
      //     ...serviceData,
      //     user_id: user.id,
      //   })
      //   .select()
      //   .single();

      toast.success('Service créé avec succès');
      fetchUserServices();
      
      // Retourner un service mock pour l'instant
      return {
        id: crypto.randomUUID(),
        ...serviceData,
        user_id: user.id,
        is_active: true,
        created_at: new Date().toISOString(),
      } as ProfessionalService;
    } catch (error) {
      console.error('Erreur lors de la création du service:', error);
      toast.error('Erreur lors de la création du service');
      return null;
    }
  };

  return {
    serviceTypes,
    userServices,
    loading,
    createProfessionalService,
    refresh: () => {
      fetchServiceTypes();
      if (user) fetchUserServices();
    }
  };
}
