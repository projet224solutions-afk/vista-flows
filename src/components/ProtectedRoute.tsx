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

  // 🛡️ SÉCURISÉ: Plus d'auth locale - utilise uniquement Supabase
  // L'authentification admin doit passer par la base de données user_roles

  // Vérification d'authentification sécurisée
  useEffect(() => {
    if (!loading && !user) {
      console.log("🔒 Utilisateur non authentifié, redirection vers /auth");
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Attendre que le profil soit chargé ou que le chargement soit terminé
  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  // Vérification des rôles réactivée
  if (!user || (profile && !allowedRoles.includes(profile.role))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Accès non autorisé</h2>
          <p className="mb-4">Vous n'avez pas les permissions pour accéder à cette page.</p>
          <button
            onClick={() => navigate('/auth')}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Se connecter
          </button>
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