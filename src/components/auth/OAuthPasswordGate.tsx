import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Gate global: si un utilisateur connecté via OAuth (Google/Facebook)
 * n'a pas encore défini (ou ignoré) un mot de passe, on force l'affichage
 * de la page /auth/set-password.
 *
 * IMPORTANT: ce composant doit être monté dans l'app (dans le Router)
 * pour fonctionner même quand Supabase redirige vers "/" après OAuth.
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

    const appProvider = session.user?.app_metadata?.provider;
    const identities = (session.user as any)?.identities as Array<{ provider?: string }> | undefined;
    const identityProviders = (identities || []).map((i) => i?.provider).filter(Boolean);

    const isOAuthUser =
      appProvider === "google" ||
      appProvider === "facebook" ||
      identityProviders.includes("google") ||
      identityProviders.includes("facebook");

    if (!isOAuthUser) return;

    // Seul "true" est accepté - "skipped" n'est plus valide (mot de passe obligatoire)
    const hasSetPassword = localStorage.getItem(`oauth_password_set_${user.id}`);
    if (hasSetPassword === "true") return;

    console.log("🔐 [OAuthPasswordGate] OAuth user sans mot de passe -> /auth/set-password", {
      from: location.pathname,
      provider: appProvider,
    });

    localStorage.setItem("needs_oauth_password", "true");
    navigate("/auth/set-password", { replace: true, state: { from: location.pathname } });
  }, [loading, user, session, location.pathname, navigate]);

  return null;
}
