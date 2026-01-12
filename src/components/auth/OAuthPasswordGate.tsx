import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Gate global: si un utilisateur connecté via OAuth (Google/Facebook)
 * n'a pas encore défini (ou ignoré) un mot de passe, on force l'affichage
 * de la page /auth/set-password.
 *
 * IMPORTANT: Ce composant ne s'applique QUE si l'utilisateur s'est connecté
 * via OAuth dans cette session (pas email/mot de passe).
 */
export default function OAuthPasswordGate() {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user || !session) return;

    // Ne pas boucler si on est déjà sur la page cible
    if (location.pathname === "/auth/set-password") return;

    // ⚡ IMPORTANT: Vérifier le AMR (Authentication Methods Reference) pour savoir
    // COMMENT l'utilisateur s'est connecté dans cette session
    const amr = (session.user as any)?.amr as Array<{ method?: string }> | undefined;
    const currentAuthMethod = amr?.[0]?.method;
    
    // Si l'utilisateur s'est connecté avec email/password, ne PAS afficher la page
    if (currentAuthMethod === "password") {
      console.log("🔐 [OAuthPasswordGate] Connexion par mot de passe détectée, pas de redirection");
      // Marquer automatiquement comme ayant un mot de passe
      localStorage.setItem(`oauth_password_set_${user.id}`, "true");
      localStorage.removeItem("needs_oauth_password");
      return;
    }

    const appProvider = session.user?.app_metadata?.provider;
    const identities = (session.user as any)?.identities as Array<{ provider?: string }> | undefined;
    const identityProviders = (identities || []).map((i) => i?.provider).filter(Boolean);

    // Vérifier si c'est un utilisateur OAuth (a des identités Google/Facebook)
    const hasOAuthIdentity =
      identityProviders.includes("google") ||
      identityProviders.includes("facebook");

    // Si l'utilisateur n'a PAS d'identité OAuth, ne pas appliquer la gate
    if (!hasOAuthIdentity) return;

    // Vérifier si la méthode actuelle est OAuth
    const isCurrentSessionOAuth = currentAuthMethod === "oauth" || 
      appProvider === "google" || 
      appProvider === "facebook";

    // Si l'utilisateur ne s'est pas connecté via OAuth dans cette session, ignorer
    if (!isCurrentSessionOAuth) {
      console.log("🔐 [OAuthPasswordGate] Session non-OAuth, pas de redirection");
      return;
    }

    // Vérifier si le mot de passe a déjà été défini
    const hasSetPassword = localStorage.getItem(`oauth_password_set_${user.id}`);
    if (hasSetPassword === "true") return;

    console.log("🔐 [OAuthPasswordGate] OAuth user sans mot de passe -> /auth/set-password", {
      from: location.pathname,
      provider: appProvider,
      currentAuthMethod,
    });

    localStorage.setItem("needs_oauth_password", "true");
    navigate("/auth/set-password", { replace: true, state: { from: location.pathname } });
  }, [loading, user, session, location.pathname, navigate]);

  return null;
}
