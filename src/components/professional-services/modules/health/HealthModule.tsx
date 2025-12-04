/**
 * MODULE SANTÉ - Consultations, dossiers patients
 */
export default function HealthModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-2xl font-bold mb-4">⚕️ Module Santé</p>
      <p className="text-muted-foreground">{businessName}</p>
      <p className="text-sm text-muted-foreground mt-4">
        Consultations • Dossiers patients • Ordonnances • Rendez-vous
      </p>
    </div>
  );
}
