/**
 * MODULES STUBS - Services professionnels restants
 */

// Livraison
export function DeliveryModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return <div className="text-center py-16 text-muted-foreground">📦 Module Livraison - {businessName}</div>;
}

// Studio Photo
export function PhotoStudioModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return <div className="text-center py-16 text-muted-foreground">📸 Module Studio Photo - {businessName}</div>;
}

// Développeur
export function DeveloperModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return <div className="text-center py-16 text-muted-foreground">💻 Module Développeur - {businessName}</div>;
}

// Fitness
export function FitnessModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return <div className="text-center py-16 text-muted-foreground">💪 Module Fitness - {businessName}</div>;
}

// Coiffeur
export function HairdresserModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return <div className="text-center py-16 text-muted-foreground">✂️ Module Coiffeur - {businessName}</div>;
}

// Traiteur
export function CateringModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return <div className="text-center py-16 text-muted-foreground">🍱 Module Traiteur - {businessName}</div>;
}

// Mode
export function FashionModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return <div className="text-center py-16 text-muted-foreground">👗 Module Mode - {businessName}</div>;
}

// Hôtel
export function HotelModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return <div className="text-center py-16 text-muted-foreground">🏨 Module Hôtel - {businessName}</div>;
}

// Réparation
export function RepairModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return <div className="text-center py-16 text-muted-foreground">🔧 Module Réparation - {businessName}</div>;
}

export default {
  DeliveryModule,
  PhotoStudioModule,
  DeveloperModule,
  FitnessModule,
  HairdresserModule,
  CateringModule,
  FashionModule,
  HotelModule,
  RepairModule
};
