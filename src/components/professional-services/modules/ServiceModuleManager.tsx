/**
 * GESTIONNAIRE DE MODULES MÉTIERS
 * Charge dynamiquement le module approprié selon le type de service
 * Utilise les codes de service_types pour le mapping
 * Synchronisé avec src/config/serviceTypesConfig.ts
 */

// Import des modules complets
import { RestaurantModule } from './RestaurantModule';
import { EcommerceModule } from './EcommerceModule';
import { BeautyModule } from './BeautyModule';
import { TransportModule } from './TransportModule';
import { HealthModule } from './HealthModule';
import { EducationModule } from './EducationModule';
import { PhotoStudioModule } from './PhotoStudioModule';
import { DeveloperModule } from './DeveloperModule';
import { DeliveryModule } from './DeliveryModule';
import { RealEstateModule } from './RealEstateModule';
import { CoachModule } from './CoachModule';
import { FitnessModule } from './FitnessModule';
import { HairdresserModule } from './HairdresserModule';
// Nouveaux modules professionnels
import { VTCModule } from './VTCModule';
import { RepairModule } from './RepairModule';
import { CleaningModule } from './CleaningModule';
import { FashionModule } from './FashionModule';
import { ElectronicsModule } from './ElectronicsModule';
import { HomeDecorModule } from './HomeDecorModule';
import { FreelanceModule } from './FreelanceModule';
import { AgricultureModule } from './AgricultureModule';
import { ConstructionModule } from './ConstructionModule';
import { DropshippingModule } from './DropshippingModule';
import { CateringModule } from './stubs';
import { normalizeServiceCode } from '@/config/serviceTypesConfig';

interface ServiceModuleManagerProps {
  serviceId: string;
  serviceTypeId: string;
  serviceTypeName: string;
  serviceTypeCode?: string;
  businessName: string;
}

// Mapping des 18 codes officiels de service_types vers les modules
// Synchronisé avec Auth.tsx et AddServiceModal.tsx
const MODULE_MAP: Record<string, React.FC<{ serviceId: string; businessName?: string }>> = {
  // ===== Services de Proximité Populaires (6) =====
  'restaurant': RestaurantModule,       // Restaurant - Cuisine & plats
  'beaute': BeautyModule,               // Beauté & Coiffure - Soins & styling
  'vtc': VTCModule,                     // Transport VTC - Véhicules privés
  'reparation': RepairModule,           // Réparation - Électro & mécanique
  'menage': CleaningModule,             // Nettoyage - Ménage & pressing
  'informatique': DeveloperModule,      // Informatique - Tech & dépannage
  
  // ===== Services Professionnels (8) =====
  'sport': FitnessModule,               // Sport & Fitness - Coaching
  'location': RealEstateModule,         // Immobilier - Location & vente
  'media': PhotoStudioModule,           // Photo & Vidéo - Événements
  'construction': ConstructionModule,   // Construction & BTP - Bâtiment
  'agriculture': AgricultureModule,     // Agriculture - Produits locaux
  'freelance': FreelanceModule,         // Administratif - Secrétariat
  'sante': HealthModule,                // Santé & Bien-être - Pharmacie & soins
  'maison': HomeDecorModule,            // Maison & Déco - Intérieur
  
  // ===== Autres Services (4) =====
  'education': EducationModule,         // Formation - Cours & coaching
  'livraison': DeliveryModule,          // Livraison - Coursier & colis
  'voyage': TransportModule,            // Voyage - Tourisme & voyages
  'ecommerce': EcommerceModule,         // Boutique - E-commerce
  
  // ===== Extensions legacy (compatibilité) =====
  'mode': FashionModule,
  'electronique': ElectronicsModule,
  'dropshipping': DropshippingModule,
  'coiff': HairdresserModule,
  'coach': CoachModule,
};

export function ServiceModuleManager({
  serviceId,
  serviceTypeId,
  serviceTypeName,
  serviceTypeCode,
  businessName
}: ServiceModuleManagerProps) {
  
  const props = { serviceId, businessName };
  
  // Debug logging
  console.log('🔍 ServiceModuleManager - Props reçus:', {
    serviceId,
    serviceTypeId,
    serviceTypeName,
    serviceTypeCode,
    businessName
  });
  
  // Essayer d'abord avec le code
  if (serviceTypeCode && MODULE_MAP[serviceTypeCode]) {
    console.log('✅ Module trouvé par code:', serviceTypeCode);
    const ModuleComponent = MODULE_MAP[serviceTypeCode];
    return <ModuleComponent {...props} />;
  }
  
  console.log('⚠️ Code non trouvé dans MODULE_MAP, utilisation du fallback par nom:', serviceTypeName);
  
  // Fallback basé sur le nom du service type
  const nameLower = serviceTypeName.toLowerCase();
  
  if (nameLower.includes('restaurant') || nameLower.includes('restauration')) {
    return <RestaurantModule {...props} />;
  }
  if (nameLower.includes('boutique') || nameLower.includes('commerce') || nameLower.includes('ecommerce')) {
    return <EcommerceModule {...props} />;
  }
  if (nameLower.includes('beauté') || nameLower.includes('beauty') || nameLower.includes('bien-être')) {
    return <BeautyModule {...props} />;
  }
  if (nameLower.includes('transport') || nameLower.includes('voyage') || nameLower.includes('taxi')) {
    return <TransportModule {...props} />;
  }
  if (nameLower.includes('santé') || nameLower.includes('health') || nameLower.includes('médical')) {
    return <HealthModule {...props} />;
  }
  if (nameLower.includes('éducation') || nameLower.includes('formation') || nameLower.includes('education')) {
    return <EducationModule {...props} />;
  }
  if (nameLower.includes('photo') || nameLower.includes('média') || nameLower.includes('création')) {
    return <PhotoStudioModule {...props} />;
  }
  if (nameLower.includes('informatique') || nameLower.includes('technique') || nameLower.includes('développ')) {
    return <DeveloperModule {...props} />;
  }
  if (nameLower.includes('livraison') || nameLower.includes('coursier')) {
    return <DeliveryModule {...props} />;
  }
  if (nameLower.includes('immobili') || nameLower.includes('location')) {
    return <RealEstateModule {...props} />;
  }
  if (nameLower.includes('construction') || nameLower.includes('btp')) {
    return <RealEstateModule {...props} />;
  }
  if (nameLower.includes('fitness') || nameLower.includes('gym') || nameLower.includes('sport')) {
    return <FitnessModule {...props} />;
  }
  if (nameLower.includes('coiff') || nameLower.includes('hair')) {
    return <HairdresserModule {...props} />;
  }
  if (nameLower.includes('traiteur') || nameLower.includes('catering')) {
    return <CateringModule {...props} />;
  }
  if (nameLower.includes('mode') || nameLower.includes('fashion') || nameLower.includes('vêtement')) {
    return <FashionModule {...props} />;
  }
  if (nameLower.includes('agricole') || nameLower.includes('agriculture')) {
    return <AgricultureModule {...props} />;
  }
  if (nameLower.includes('ménage') || nameLower.includes('entretien') || nameLower.includes('nettoyage')) {
    return <CleaningModule {...props} />;
  }
  if (nameLower.includes('réparation') || nameLower.includes('repair') || nameLower.includes('mécanique')) {
    return <RepairModule {...props} />;
  }
  if (nameLower.includes('coach')) {
    return <CoachModule {...props} />;
  }
  if (nameLower.includes('admin') || nameLower.includes('freelance') || nameLower.includes('administratif')) {
    return <FreelanceModule {...props} />;
  }
  
  // Module par défaut
  return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">
        Module métier pour "{serviceTypeName}" en cours de développement
      </p>
    </div>
  );
}
