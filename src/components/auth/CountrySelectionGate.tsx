import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const EXEMPT_PREFIXES = ["/auth/", "/agent/", "/bureau/"];
const EXEMPT_EXACT   = ["/", "/auth", "/login", "/universal-login", "/reset-password"];

/**
 * Gate global: si un utilisateur connecté via Google/Facebook n'a pas encore
 * sélectionné son pays de résidence, on le force vers /auth/select-country.
 *
 * Ne s'applique QU'AUX utilisateurs OAuth (Google/Facebook).
 * Les utilisateurs email/password ont déjà renseigné leur pays lors de l'inscription.
 *
 * Ordre d'exécution dans App.tsx:
 *   <OAuthPasswordGate />      ← 1er : mot de passe obligatoire
 *   <CountrySelectionGate />   ← 2e  : pays obligatoire
 */
export default function CountrySelectionGate() {
  const { user, session, profile, loading, profileLoading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    // Attendre la fin du chargement
    if (loading || profileLoading) return;
    if (!user || !session) return;

    // Chemins exemptés
    const path = location.pathname;
    if (EXEMPT_EXACT.includes(path)) return;
    if (EXEMPT_PREFIXES.some((p) => path.startsWith(p))) return;

    // Vérifier que l'utilisateur a une identité OAuth (Google ou Facebook)
    const identities = (session.user as any)?.identities as
      Array<{ provider?: string }> | undefined;
    const hasOAuth = identities?.some(
      (i) => i?.provider === "google" || i?.provider === "facebook"
    );
    if (!hasOAuth) return;

    // Vérifier si le pays est déjà défini
    if (profile?.detected_country && profile.detected_country.length >= 2) return;
    if (profile?.profile_completed === true) return;

    // Pays manquant → rediriger vers la page de sélection
    console.log("🌍 [CountrySelectionGate] Pays non défini → /auth/select-country", {
      path,
      detected_country: profile?.detected_country,
      profile_completed: profile?.profile_completed,
    });

    navigate("/auth/select-country", {
      replace: true,
      state: { from: path },
    });
  }, [loading, profileLoading, user, session, profile, location.pathname, navigate]);

  return null;
}
