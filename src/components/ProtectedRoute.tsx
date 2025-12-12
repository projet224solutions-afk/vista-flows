import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

// Fonction pour vérifier les sessions custom (Agent/Bureau)
function checkCustomSession(allowedRoles: string[]): { isValid: boolean; role: string | null } {
  // Vérifier session Agent (localStorage puis sessionStorage pour compatibilité)
  if (allowedRoles.includes('agent') || allowedRoles.includes('admin')) {
    const agentSession = localStorage.getItem('agent_session') || sessionStorage.getItem('agent_session');
    const agentUser = localStorage.getItem('agent_user') || sessionStorage.getItem('agent_user');
    
    if (agentSession && agentUser) {
      try {
        const userData = JSON.parse(agentUser);
        // Vérifier que la session n'est pas expirée
        if (userData.expires_at && new Date(userData.expires_at) > new Date()) {
          console.log('✅ Session Agent valide détectée');
          return { isValid: true, role: 'agent' };
        } else if (!userData.expires_at) {
          // Si pas d'expiration, considérer comme valide
          console.log('✅ Session Agent détectée (sans expiration)');
          return { isValid: true, role: 'agent' };
        }
      } catch (e) {
        console.error('❌ Erreur parsing session agent:', e);
      }
    }
  }

  // Vérifier session Bureau (localStorage puis sessionStorage pour compatibilité)
  if (allowedRoles.includes('syndicat') || allowedRoles.includes('bureau') || allowedRoles.includes('admin')) {
    const bureauSession = localStorage.getItem('bureau_session') || sessionStorage.getItem('bureau_session');
    const bureauUser = localStorage.getItem('bureau_user') || sessionStorage.getItem('bureau_user');
    
    if (bureauSession && bureauUser) {
      try {
        const userData = JSON.parse(bureauUser);
        // Vérifier que la session n'est pas expirée
        if (userData.expires_at && new Date(userData.expires_at) > new Date()) {
          console.log('✅ Session Bureau valide détectée');
          return { isValid: true, role: 'syndicat' };
        } else if (!userData.expires_at) {
          console.log('✅ Session Bureau détectée (sans expiration)');
          return { isValid: true, role: 'syndicat' };
        }
      } catch (e) {
        console.error('❌ Erreur parsing session bureau:', e);
      }
    }
  }

  return { isValid: false, role: null };
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [customAuth, setCustomAuth] = useState<{ checked: boolean; isValid: boolean; role: string | null }>({
    checked: false,
    isValid: false,
    role: null
  });

  // Vérifier les sessions custom au montage
  useEffect(() => {
    const result = checkCustomSession(allowedRoles);
    setCustomAuth({ checked: true, ...result });
  }, [allowedRoles]);

  // Vérification d'authentification sécurisée
  useEffect(() => {
    if (!loading && customAuth.checked && !user && !customAuth.isValid) {
      console.log("🔒 Utilisateur non authentifié, redirection vers /auth");
      navigate('/auth');
    }
  }, [user, loading, navigate, customAuth]);

  // Attendre que les vérifications soient terminées
  if (loading || !customAuth.checked || (user && !profile && !customAuth.isValid)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  // Vérifier si l'utilisateur est authentifié via Supabase OU session custom
  const isAuthenticated = !!user || customAuth.isValid;
  const effectiveRole = profile?.role || customAuth.role;

  // Vérification des rôles
  if (!isAuthenticated || (effectiveRole && !allowedRoles.includes(effectiveRole))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Accès non autorisé</h2>
          <p className="mb-4">Vous n'avez pas les permissions pour accéder à cette page.</p>
          <button
            onClick={() => navigate('/auth')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
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
