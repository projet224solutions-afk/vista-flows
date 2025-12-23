/**
 * GESTIONNAIRE DE MODULES MÉTIERS
 * Charge dynamiquement le module approprié selon le type de service
 * Utilise les codes de service_types pour le mapping
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
import { CateringModule, FashionModule } from './stubs';

interface ServiceModuleManagerProps {
  serviceId: string;
  serviceTypeId: string;
  serviceTypeName: string;
  serviceTypeCode?: string;
  businessName: string;
}

// Mapping des codes de service_types vers les modules
const MODULE_MAP: Record<string, React.FC<{ serviceId: string; businessName?: string }>> = {
  // Food & Restaurant
  'restaurant': RestaurantModule,
  
  // Commerce
  'ecommerce': EcommerceModule,
  
  // Beauté & Bien-être
  'beaute': BeautyModule,
  
  // Transport & Livraison
  'voyage': TransportModule,
  'livraison': DeliveryModule,
  
  // Santé
  'sante': HealthModule,
  
  // Éducation
  'education': EducationModule,
  
  // Créatif & Média
  'media': PhotoStudioModule,
  
  // Services techniques
  'informatique': DeveloperModule,
  'reparation': DeveloperModule,
  
  // Immobilier
  'location': RealEstateModule,
  
  // Construction
  'construction': RealEstateModule,
  
  // Services ménagers
  'menage': CateringModule,
  
  // Agriculture
  'agriculture': CateringModule,
  
  // Freelance & Admin
  'freelance': DeveloperModule,
};

export function ServiceModuleManager({
  serviceId,
  serviceTypeId,
  serviceTypeName,
  serviceTypeCode,
  businessName
}: ServiceModuleManagerProps) {
  
  const props = { serviceId, businessName };
  
  // Essayer d'abord avec le code
  if (serviceTypeCode && MODULE_MAP[serviceTypeCode]) {
    const ModuleComponent = MODULE_MAP[serviceTypeCode];
    return <ModuleComponent {...props} />;
  }
  
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
    return <CateringModule {...props} />;
  }
  if (nameLower.includes('ménage') || nameLower.includes('entretien') || nameLower.includes('nettoyage')) {
    return <CateringModule {...props} />;
  }
  if (nameLower.includes('réparation') || nameLower.includes('repair')) {
    return <DeveloperModule {...props} />;
  }
  if (nameLower.includes('coach')) {
    return <CoachModule {...props} />;
  }
  if (nameLower.includes('admin') || nameLower.includes('freelance')) {
    return <DeveloperModule {...props} />;
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
