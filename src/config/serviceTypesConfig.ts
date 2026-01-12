/**
 * CONFIGURATION CENTRALISÉE DES TYPES DE SERVICES
 * Source unique de vérité pour tous les modules, formulaires et pages
 * Synchronisé avec la table service_types de la base de données
 */

export interface ServiceTypeConfig {
  // Code DB officiel (doit correspondre à service_types.code)
  code: string;
  // Nom d'affichage
  name: string;
  // Catégorie (correspond à service_types.category)
  category: string;
  // Icône emoji pour l'UI
  icon: string;
  // Description courte
  description: string;
  // Icône Lucide (correspond à service_types.icon)
  lucideIcon: string;
  // Section dans le formulaire d'inscription
  section: 'proximity' | 'professional' | 'digital';
  // Codes legacy qui doivent mapper vers ce service
  legacyCodes: string[];
  // Visible dans le formulaire d'inscription vendeur
  showInVendorSignup: boolean;
  // Visible dans la section "Services de proximité"
  showInProximity: boolean;
}

/**
 * Liste complète des types de services synchronisée avec la DB
 * IDs DB réels:
 * - restaurant: 4aa11ff0-946e-4bc6-9c6a-af73e388868d
 * - beaute: cdc71e4e-27ce-4faa-b770-bb8d8a7394d9
 * - ecommerce: 6ec517c9-fc1f-4e59-9048-023080c17667
 * - reparation: 281fe1c5-5fc4-48f9-b01d-608721cebee2
 * - location: d43a4bd5-b322-4e5a-a3f7-f53325247c18
 * - menage: 3e8ce989-0b76-4cd4-9f55-1f3b70efecec
 * - livraison: 76d5b1f9-39f4-4865-9770-3302f822438a
 * - media: f91f8aa4-0653-4707-8378-0d8ea4def99a
 * - education: ec96223d-a50b-4320-a870-d36747f252a6
 * - sante: 3ce16e66-fb56-47a5-831a-ca879e71cdda
 * - voyage: 66e39dea-84c6-4cab-b357-8adb898d0e52
 * - freelance: 6f22da0d-f671-4f3d-978c-c345cd8118d2
 * - construction: 71694b23-a121-4d57-9c21-36dde31fde3f
 * - agriculture: 22908237-3cc7-481f-933f-c88fd90d6a99
 * - informatique: e058e290-cfd5-45c2-819a-ea35eece604f
 * - vtc: 65bda8bc-83e1-48c7-8499-69e8ac68092f
 */
export const SERVICE_TYPES_CONFIG: ServiceTypeConfig[] = [
  // ===== SERVICES DE PROXIMITÉ POPULAIRES =====
  {
    code: 'restaurant',
    name: 'Restaurant / Alimentation',
    category: 'Alimentation',
    icon: '🍽️',
    description: 'Cuisine & plats',
    lucideIcon: 'Utensils',
    section: 'proximity',
    legacyCodes: ['food', 'restauration', 'alimentation'],
    showInVendorSignup: true,
    showInProximity: true,
  },
  {
    code: 'beaute',
    name: 'Beauté & Bien-être',
    category: 'Beauté',
    icon: '💇',
    description: 'Soins & styling',
    lucideIcon: 'Scissors',
    section: 'proximity',
    legacyCodes: ['salon_coiffure', 'beauty', 'coiffure', 'coiff', 'spa'],
    showInVendorSignup: true,
    showInProximity: true,
  },
  {
    code: 'vtc',
    name: 'VTC / Transport',
    category: 'Transport',
    icon: '🚗',
    description: 'Véhicules privés',
    lucideIcon: 'Car',
    section: 'proximity',
    legacyCodes: ['taxi', 'transport_prive', 'chauffeur'],
    showInVendorSignup: true,
    showInProximity: true,
  },
  {
    code: 'reparation',
    name: 'Réparation / Mécanique',
    category: 'Réparation',
    icon: '🔧',
    description: 'Électro & mécanique',
    lucideIcon: 'Car',
    section: 'proximity',
    legacyCodes: ['garage_auto', 'repair', 'mecanique', 'electronique'],
    showInVendorSignup: true,
    showInProximity: true,
  },
  {
    code: 'menage',
    name: 'Ménage & Entretien',
    category: 'Services',
    icon: '✨',
    description: 'Nettoyage & pressing',
    lucideIcon: 'Sparkles',
    section: 'proximity',
    legacyCodes: ['nettoyage', 'cleaning', 'pressing', 'entretien'],
    showInVendorSignup: true,
    showInProximity: true,
  },
  {
    code: 'informatique',
    name: 'Informatique / Tech',
    category: 'Technologie',
    icon: '💻',
    description: 'Tech & dépannage',
    lucideIcon: 'Laptop',
    section: 'proximity',
    legacyCodes: ['tech', 'computer', 'depannage_info'],
    showInVendorSignup: true,
    showInProximity: true,
  },
  {
    code: 'livraison',
    name: 'Livraison / Coursier',
    category: 'Transport',
    icon: '🚚',
    description: 'Courses & livraison',
    lucideIcon: 'Truck',
    section: 'proximity',
    legacyCodes: ['delivery', 'coursier', 'express'],
    showInVendorSignup: true,
    showInProximity: true,
  },
  {
    code: 'ecommerce',
    name: 'Boutique / E-commerce',
    category: 'Commerce',
    icon: '🛍️',
    description: 'Vente de produits',
    lucideIcon: 'ShoppingBag',
    section: 'proximity',
    legacyCodes: ['boutique', 'retail', 'wholesale', 'mixed', 'shop', 'commerce'],
    showInVendorSignup: true,
    showInProximity: true,
  },

  // ===== SERVICES PROFESSIONNELS =====
  // Synchronisés avec Auth.tsx "Services Professionnels"
  {
    code: 'sport',
    name: 'Sport & Fitness',
    category: 'Sport',
    icon: '🏋️',
    description: 'Coaching & salles',
    lucideIcon: 'Dumbbell',
    section: 'professional',
    legacyCodes: ['fitness', 'gym', 'coaching_sport'],
    showInVendorSignup: true,
    showInProximity: false,
  },
  {
    code: 'location',
    name: 'Immobilier',
    category: 'Immobilier',
    icon: '🏢',
    description: 'Location & vente',
    lucideIcon: 'Building2',
    section: 'professional',
    legacyCodes: ['immobilier', 'real_estate', 'housing'],
    showInVendorSignup: true,
    showInProximity: false,
  },
  {
    code: 'media',
    name: 'Photo & Vidéo',
    category: 'Média',
    icon: '📸',
    description: 'Événements & créations',
    lucideIcon: 'Camera',
    section: 'professional',
    legacyCodes: ['photographe', 'photo', 'video', 'videaste', 'creation'],
    showInVendorSignup: true,
    showInProximity: false,
  },
  {
    code: 'construction',
    name: 'Construction & BTP',
    category: 'Construction',
    icon: '🏗️',
    description: 'Bâtiment & travaux',
    lucideIcon: 'HardHat',
    section: 'professional',
    legacyCodes: ['btp', 'building', 'batiment'],
    showInVendorSignup: true,
    showInProximity: false,
  },
  {
    code: 'agriculture',
    name: 'Agriculture',
    category: 'Agriculture',
    icon: '🌾',
    description: 'Produits locaux',
    lucideIcon: 'Tractor',
    section: 'professional',
    legacyCodes: ['farming', 'agricole', 'ferme'],
    showInVendorSignup: true,
    showInProximity: false,
  },
  {
    code: 'freelance',
    name: 'Administratif',
    category: 'Professionnel',
    icon: '💼',
    description: 'Secrétariat & conseil',
    lucideIcon: 'Briefcase',
    section: 'professional',
    legacyCodes: ['services_pro', 'admin', 'secretariat', 'consulting'],
    showInVendorSignup: true,
    showInProximity: false,
  },
  {
    code: 'sante',
    name: 'Santé & Bien-être',
    category: 'Santé',
    icon: '💊',
    description: 'Pharmacie & soins',
    lucideIcon: 'Heart',
    section: 'professional',
    legacyCodes: ['health', 'medical', 'pharmacie', 'pharma'],
    showInVendorSignup: true,
    showInProximity: false,
  },
  {
    code: 'maison',
    name: 'Maison & Déco',
    category: 'Maison',
    icon: '🏠',
    description: 'Intérieur & déco',
    lucideIcon: 'Home',
    section: 'professional',
    legacyCodes: ['home_decor', 'decoration', 'interieur', 'ameublement'],
    showInVendorSignup: true,
    showInProximity: false,
  },
  // Services non affichés dans le formulaire inscription (mais existants)
  {
    code: 'education',
    name: 'Formation',
    category: 'Éducation',
    icon: '🎓',
    description: 'Cours & coaching',
    lucideIcon: 'GraduationCap',
    section: 'digital',
    legacyCodes: ['formation', 'teaching', 'cours', 'school'],
    showInVendorSignup: false,
    showInProximity: false,
  },
  {
    code: 'voyage',
    name: 'Voyage / Tourisme',
    category: 'Tourisme',
    icon: '✈️',
    description: 'Agence & billetterie',
    lucideIcon: 'Plane',
    section: 'professional',
    legacyCodes: ['tourism', 'travel', 'agence_voyage'],
    showInVendorSignup: false,
    showInProximity: false,
  },
];

// ===== SERVICES DIGITAUX (extensions) =====
export const DIGITAL_SERVICES: { code: string; name: string; icon: string; description: string }[] = [
  { code: 'digital_logiciel', name: 'Logiciel', icon: '💻', description: 'Antivirus & SaaS' },
  { code: 'dropshipping', name: 'Dropshipping', icon: '📦', description: 'Amazon, AliExpress' },
  { code: 'digital_livre', name: 'Livres', icon: '📚', description: 'eBooks & affiliation' },
];

// ===== HELPER FUNCTIONS =====

/**
 * Obtenir un type de service par son code (officiel ou legacy)
 */
export function getServiceTypeByCode(code: string): ServiceTypeConfig | undefined {
  // Chercher par code exact
  const exact = SERVICE_TYPES_CONFIG.find(s => s.code === code);
  if (exact) return exact;
  
  // Chercher dans les codes legacy
  return SERVICE_TYPES_CONFIG.find(s => s.legacyCodes.includes(code));
}

/**
 * Obtenir le code officiel à partir d'un code (legacy ou officiel)
 */
export function normalizeServiceCode(code: string): string {
  const service = getServiceTypeByCode(code);
  return service?.code || code;
}

/**
 * Liste des services pour le formulaire d'inscription vendeur
 */
export function getVendorSignupServices(): ServiceTypeConfig[] {
  return SERVICE_TYPES_CONFIG.filter(s => s.showInVendorSignup);
}

/**
 * Liste des services par section
 */
export function getServicesBySection(section: 'proximity' | 'professional' | 'digital'): ServiceTypeConfig[] {
  return SERVICE_TYPES_CONFIG.filter(s => s.section === section);
}

/**
 * Liste des services affichés dans "Services de proximité"
 */
export function getProximityServices(): ServiceTypeConfig[] {
  return SERVICE_TYPES_CONFIG.filter(s => s.showInProximity);
}

/**
 * Générer les options pour un select (VENDOR_SERVICE_TYPES compatible)
 */
export function getServiceTypesForSelect(): { value: string; label: string }[] {
  return SERVICE_TYPES_CONFIG.map(s => ({
    value: s.code,
    label: s.name
  }));
}
