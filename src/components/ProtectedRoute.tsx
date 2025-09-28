import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
        return;
      }

      if (profile && !allowedRoles.includes(profile.role)) {
        navigate('/');
        return;
      }
    }
  }, [user, profile, loading, navigate, allowedRoles]);

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

  if (!user || (profile && !allowedRoles.includes(profile.role))) {
    return null;
  }

  // S'assurer qu'il y a assez d'espace pour le footer fixe
  return (
    <div className="min-h-screen pb-20">
      {children}
    </div>
  );
}