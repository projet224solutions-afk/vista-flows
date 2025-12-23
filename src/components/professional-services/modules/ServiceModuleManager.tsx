/**
 * GESTIONNAIRE DE MODULES MÉTIERS
 * Charge dynamiquement le module approprié selon le type de service
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
  businessName: string;
}

export function ServiceModuleManager({
  serviceId,
  serviceTypeId,
  serviceTypeName,
  businessName
}: ServiceModuleManagerProps) {
  
  const props = { serviceId, businessName };

  switch (serviceTypeId) {
    case '1': // Restaurant
      return <RestaurantModule {...props} />;
    
    case '2': // E-commerce
      return <EcommerceModule {...props} />;
    
    case '3': // Salon de Beauté
      return <BeautyModule {...props} />;
    
    case '4': // Taxi/VTC
      return <TransportModule {...props} />;
    
    case '5': // Cabinet Médical
      return <HealthModule {...props} />;
    
    case '6': // Centre de Formation
      return <EducationModule {...props} />;
    
    case '7': // Studio Photo
      return <PhotoStudioModule {...props} />;
    
    case '8': // Développeur Web
      return <DeveloperModule {...props} />;
    
    case '9': // Livraison Express
      return <DeliveryModule {...props} />;
    
    case '10': // Gym/Fitness
      return <FitnessModule {...props} />;
    
    case '11': // Coiffeur
      return <HairdresserModule {...props} />;
    
    case '12': // Traiteur
      return <CateringModule {...props} />;
    
    case '13': // Boutique Mode
      return <FashionModule {...props} />;
    
    case '14': // Agence Immobilière
      return <RealEstateModule {...props} />;
    
    case '15': // Coach Sportif
      return <CoachModule {...props} />;
    
    default:
      return (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            Module métier pour "{serviceTypeName}" en cours de développement
          </p>
        </div>
      );
  }
}
