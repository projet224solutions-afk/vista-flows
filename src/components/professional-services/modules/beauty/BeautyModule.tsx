/**
 * MODULE BEAUTÉ - Salons de beauté, coiffure, esthétique
 */
export default function BeautyModule({ serviceId, businessName }: { serviceId: string; businessName: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-2xl font-bold mb-4">💅 Module Beauté</p>
      <p className="text-muted-foreground">{businessName}</p>
      <p className="text-sm text-muted-foreground mt-4">
        Rendez-vous • Personnel • Services • Analytics
      </p>
    </div>
  );
}
