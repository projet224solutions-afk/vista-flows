import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import CryptoJS from 'crypto-js';

// Clé de chiffrement dérivée de l'ID utilisateur (unique par session)
const getEncryptionKey = (): string => {
  // Utilise une combinaison de données navigateur pour clé unique
  return CryptoJS.SHA256(
    navigator.userAgent + window.location.hostname
  ).toString();
};

// Chiffrer données sensibles
const encryptData = (data: string): string => {
  try {
    return CryptoJS.AES.encrypt(data, getEncryptionKey()).toString();
  } catch (e) {
    console.error('🔴 Erreur chiffrement');
    return data;
  }
};

// Déchiffrer données
const decryptData = (encryptedData: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, getEncryptionKey());
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('🔴 Erreur déchiffrement');
    return null;
  }
};

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

// Fonction pour vérifier les sessions custom (Agent/Bureau)
function checkCustomSession(allowedRoles: string[]): { isValid: boolean; role: string | null } {
  // Vérifier session Agent (localStorage puis sessionStorage pour compatibilité)
  if (allowedRoles.includes('agent') || allowedRoles.includes('admin')) {
    const agentSessionRaw = localStorage.getItem('agent_session') || sessionStorage.getItem('agent_session');
    const agentUserRaw = localStorage.getItem('agent_user') || sessionStorage.getItem('agent_user');
    
    // Déchiffrer si données présentes
    const agentSession = agentSessionRaw ? (decryptData(agentSessionRaw) || agentSessionRaw) : null;
    const agentUser = agentUserRaw ? (decryptData(agentUserRaw) || agentUserRaw) : null;
    
    if (agentSession && agentUser) {
      try {
        const userData = JSON.parse(agentUser);
        // Vérifier que la session n'est pas expirée
        if (userData.expires_at && new Date(userData.expires_at) > new Date()) {
          console.log('✅ Session Agent valide détectée');
          return { isValid: true, role: 'agent' };
        } else if (!userData.expires_at) {
          // Ajouter expiration par défaut (24h) pour anciennes sessions
          const defaultExpiry = new Date();
          defaultExpiry.setHours(defaultExpiry.getHours() + 24);
          userData.expires_at = defaultExpiry.toISOString();
          // Sauvegarder avec expiration
          const encrypted = encryptData(JSON.stringify(userData));
          localStorage.setItem('agent_user', encrypted);
          console.log('✅ Session Agent détectée (expiration ajoutée)');
          return { isValid: true, role: 'agent' };
        } else {
          console.warn('⚠️ Session Agent expirée');
          // Nettoyer session expirée
          localStorage.removeItem('agent_session');
          localStorage.removeItem('agent_user');
          sessionStorage.removeItem('agent_session');
          sessionStorage.removeItem('agent_user');
        }
      } catch (e) {
        console.error('❌ Erreur parsing session agent:', e);
      }
    }
  }

  // Vérifier session Bureau (localStorage puis sessionStorage pour compatibilité)
  if (allowedRoles.includes('syndicat') || allowedRoles.includes('bureau') || allowedRoles.includes('admin')) {
    const bureauSessionRaw = localStorage.getItem('bureau_session') || sessionStorage.getItem('bureau_session');
    const bureauUserRaw = localStorage.getItem('bureau_user') || sessionStorage.getItem('bureau_user');
    
    // Déchiffrer si données présentes
    const bureauSession = bureauSessionRaw ? (decryptData(bureauSessionRaw) || bureauSessionRaw) : null;
    const bureauUser = bureauUserRaw ? (decryptData(bureauUserRaw) || bureauUserRaw) : null;
    
    if (bureauSession && bureauUser) {
      try {
        const userData = JSON.parse(bureauUser);
        // Vérifier que la session n'est pas expirée
        if (userData.expires_at && new Date(userData.expires_at) > new Date()) {
          console.log('✅ Session Bureau valide détectée');
          return { isValid: true, role: 'syndicat' };
        } else if (!userData.expires_at) {
          // Ajouter expiration par défaut (24h)
          const defaultExpiry = new Date();
          defaultExpiry.setHours(defaultExpiry.getHours() + 24);
          userData.expires_at = defaultExpiry.toISOString();
          const encrypted = encryptData(JSON.stringify(userData));
          localStorage.setItem('bureau_user', encrypted);
          console.log('✅ Session Bureau détectée (expiration ajoutée)');
          return { isValid: true, role: 'syndicat' };
        } else {
          console.warn('⚠️ Session Bureau expirée');
          localStorage.removeItem('bureau_session');
          localStorage.removeItem('bureau_user');
          sessionStorage.removeItem('bureau_session');
          sessionStorage.removeItem('bureau_user');
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
