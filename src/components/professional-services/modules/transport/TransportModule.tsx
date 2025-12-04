/**
 * MODULE TRANSPORT/VTC - Courses, réservations, GPS
 */
export default function TransportModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-2xl font-bold mb-4">🚕 Module Transport/VTC</p>
      <p className="text-muted-foreground">{businessName}</p>
      <p className="text-sm text-muted-foreground mt-4">
        Courses en temps réel • Véhicules • Chauffeurs • Tarification
      </p>
    </div>
  );
}
