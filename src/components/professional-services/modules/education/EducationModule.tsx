/**
 * MODULE ÉDUCATION - Cours, formations, inscriptions
 */
export default function EducationModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-2xl font-bold mb-4">🎓 Module Éducation</p>
      <p className="text-muted-foreground">{businessName}</p>
      <p className="text-sm text-muted-foreground mt-4">
        Cours • Inscriptions • Étudiants • Certificats
      </p>
    </div>
  );
}
