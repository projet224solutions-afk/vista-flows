import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  // Redirection si non authentifié
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Vérification des rôles
  if (profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Accès non autorisé</h2>
          <p className="mb-4">Vous n'avez pas les permissions pour accéder à cette page.</p>
          <Navigate to="/auth" replace />
        </div>
      </div>
    );
  }

  // S'assurer qu'il y a assez d'espace pour le footer fixe
  return (
    <div className="min-h-screen pb-20">
      {children}
    </div>
  );
}