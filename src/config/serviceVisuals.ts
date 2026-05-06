import {
  BookOpen,
  Briefcase,
  Building2,
  Camera,
  Car,
  Dumbbell,
  GraduationCap,
  HardHat,
  _Heart,
  Home,
  Laptop,
  LucideIcon,
  Package,
  Plane,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Store,
  Tractor,
  Truck,
  Utensils,
  Wrench,
} from 'lucide-react';

export interface ServiceVisual {
  image: string;
  accent: string;
  icon: LucideIcon;
  logoImage?: string;
}

const BRAND_BLUE = '#04439e';
const BRAND_ORANGE = '#ff4000';

export const SERVICE_VISUALS: Record<string, ServiceVisual> = {
  agriculture: {
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
    accent: '#15803d',
    icon: Tractor,
    logoImage: '/service-icons/icon-agriculture.png',
  },
  beaute: {
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    accent: '#d63384',
    icon: Scissors,
    logoImage: '/service-icons/icon-beaute.png',
  },
  construction: {
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    accent: '#b45309',
    icon: HardHat,
    logoImage: '/service-icons/logo-construction-btp.jpeg',
  },
  education: {
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    accent: '#1d4ed8',
    icon: GraduationCap,
  },
  ecommerce: {
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
    accent: BRAND_BLUE,
    icon: ShoppingBag,
    logoImage: '/service-icons/logo-boutique.jpeg',
  },
  freelance: {
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    accent: '#1d4ed8',
    icon: Briefcase,
    logoImage: '/service-icons/icon-administratif.png',
  },
  informatique: {
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    accent: '#7c3aed',
    icon: Laptop,
    logoImage: '/service-icons/icon-informatique.png',
  },
  livraison: {
    image: 'https://images.unsplash.com/photo-1648394794449-5dbe63f6a8b5?auto=format&fit=crop&w=800&q=80',
    accent: BRAND_ORANGE,
    icon: Truck,
    logoImage: '/service-icons/icon-livreur.png',
  },
  location: {
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
    accent: '#0369a1',
    icon: Building2,
    logoImage: '/service-icons/logo-immobilier.jpeg',
  },
  maison: {
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    accent: '#c2410c',
    icon: Home,
    logoImage: '/service-icons/icon-maison.png',
  },
  media: {
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80',
    accent: '#9333ea',
    icon: Camera,
    logoImage: '/service-icons/icon-photo-video.png',
  },
  menage: {
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    accent: '#0891b2',
    icon: Sparkles,
    logoImage: '/service-icons/icon-nettoyage.png',
  },
  reparation: {
    image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80',
    accent: '#b45309',
    icon: Wrench,
    logoImage: '/service-icons/icon-reparation.png',
  },
  restaurant: {
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    accent: '#e85d04',
    icon: Utensils,
    logoImage: '/service-icons/logo-resto.jpeg',
  },
  sante: {
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
    accent: '#dc2626',
    icon: Stethoscope,
    logoImage: '/service-icons/icon-sante.png',
  },
  sport: {
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    accent: '#16a34a',
    icon: Dumbbell,
    logoImage: '/service-icons/icon-sport-fitness.png',
  },
  vtc: {
    image: 'https://images.unsplash.com/photo-1601979107535-46367552bc25?auto=format&fit=crop&w=800&q=80',
    accent: '#1d4ed8',
    icon: Car,
    logoImage: '/service-icons/icon-taxi-moto.png',
  },
  voyage: {
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80',
    accent: '#0284c7',
    icon: Plane,
  },
  digital_livre: {
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    accent: '#7c3aed',
    icon: BookOpen,
  },
  digital_logiciel: {
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    accent: '#2563eb',
    icon: Laptop,
  },
  dropshipping: {
    image: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=800&q=80',
    accent: '#ea580c',
    icon: Package,
  },
};

const FALLBACK_VISUAL: ServiceVisual = {
  image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=800&q=80',
  accent: BRAND_BLUE,
  icon: Store,
};

export function getServiceVisual(input: {
  code?: string | null;
  name?: string | null;
  category?: string | null;
}): ServiceVisual {
  const code = input.code?.toLowerCase().trim() || '';
  const haystack = `${input.name || ''} ${input.category || ''}`.toLowerCase();

  if (code && SERVICE_VISUALS[code]) return SERVICE_VISUALS[code];
  if (haystack.includes('boutique') || haystack.includes('e-commerce') || haystack.includes('commerce')) return SERVICE_VISUALS.ecommerce;
  if (haystack.includes('éducation') || haystack.includes('education') || haystack.includes('formation')) return SERVICE_VISUALS.education;
  if (haystack.includes('immobilier') || haystack.includes('location')) return SERVICE_VISUALS.location;
  if (haystack.includes('photo') || haystack.includes('vidéo') || haystack.includes('video')) return SERVICE_VISUALS.media;
  if (haystack.includes('santé') || haystack.includes('sante') || haystack.includes('pharmacie')) return SERVICE_VISUALS.sante;
  if (haystack.includes('maison') || haystack.includes('déco') || haystack.includes('deco')) return SERVICE_VISUALS.maison;
  if (haystack.includes('livraison') || haystack.includes('coursier')) return SERVICE_VISUALS.livraison;
  if (haystack.includes('transport') || haystack.includes('vtc') || haystack.includes('taxi')) return SERVICE_VISUALS.vtc;
  if (haystack.includes('restaurant') || haystack.includes('alimentation')) return SERVICE_VISUALS.restaurant;
  if (haystack.includes('beauté') || haystack.includes('beaute') || haystack.includes('coiffure')) return SERVICE_VISUALS.beaute;
  if (haystack.includes('réparation') || haystack.includes('reparation') || haystack.includes('mécanique') || haystack.includes('mecanique')) return SERVICE_VISUALS.reparation;
  if (haystack.includes('nettoyage') || haystack.includes('ménage') || haystack.includes('menage')) return SERVICE_VISUALS.menage;
  if (haystack.includes('informatique') || haystack.includes('tech')) return SERVICE_VISUALS.informatique;
  if (haystack.includes('construction') || haystack.includes('btp')) return SERVICE_VISUALS.construction;
  if (haystack.includes('agriculture') || haystack.includes('agricole')) return SERVICE_VISUALS.agriculture;
  if (haystack.includes('sport') || haystack.includes('fitness')) return SERVICE_VISUALS.sport;
  if (haystack.includes('voyage') || haystack.includes('tourisme')) return SERVICE_VISUALS.voyage;

  return FALLBACK_VISUAL;
}