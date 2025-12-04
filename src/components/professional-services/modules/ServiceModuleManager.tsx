/**
 * GESTIONNAIRE DE MODULES MÉTIERS
 * Charge dynamiquement le module approprié selon le type de service
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Import des modules métiers principaux
const RestaurantModule = lazy(() => import('./restaurant/RestaurantModule'));
const EcommerceModule = lazy(() => import('./ecommerce/EcommerceModule'));
const BeautyModule = lazy(() => import('./beauty/BeautyModule'));
const TransportModule = lazy(() => import('./transport/TransportModule'));
const HealthModule = lazy(() => import('./health/HealthModule'));
const EducationModule = lazy(() => import('./education/EducationModule'));

// Import des modules stubs
import { 
  DeliveryModule, 
  PhotoStudioModule, 
  DeveloperModule, 
  FitnessModule, 
  HairdresserModule, 
  CateringModule, 
  FashionModule, 
  HotelModule, 
  RepairModule 
} from './stubs';

interface ServiceModuleManagerProps {
  serviceId: string;
  serviceTypeId: string;
  serviceTypeName: string;
  businessName: string;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-16">
    <div className="text-center space-y-4">
      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
      <p className="text-muted-foreground">Chargement du module métier...</p>
    </div>
  </div>
);

export function ServiceModuleManager({
  serviceId,
  serviceTypeId,
  serviceTypeName,
  businessName
}: ServiceModuleManagerProps) {
  
  const renderModule = () => {
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
      
      case '14': // Hôtel
        return <HotelModule {...props} />;
      
      case '15': // Réparation Auto
        return <RepairModule {...props} />;
      
      default:
        return (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              Module métier pour "{serviceTypeName}" en cours de développement
            </p>
          </div>
        );
    }
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
      {renderModule()}
    </Suspense>
  );
}
