import { Header } from "@/components/Header";
import { InterfaceCard } from "@/components/InterfaceCard";
import { Button } from "@/components/ui/button";
import { PDGAuthButton } from "@/components/PDGAuthButton";
import { PDGTestButton } from "@/components/PDGTestButton";
import QuickFooter from "@/components/QuickFooter";
import {
  Home,
  ShoppingBag,
  MapPin,
  User,
  BarChart3,
  Crown,
  Zap,
  Shield,
  Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  useRoleRedirect(); // Redirection automatique vers le dashboard approprié

  // Interfaces principales basées sur le footer - Architecture professionnelle
  const coreInterfaces = [
    {
      title: "🏠 Accueil",
      description: "Tableau de bord principal et vue d'ensemble",
      icon: Home,
      path: "/home",
      features: [
        "Dashboard personnalisé selon votre rôle",
        "Notifications et alertes importantes", 
        "Raccourcis vers vos outils favoris",
        "Statistiques et métriques clés",
        "Actualités et mises à jour système"
      ],
      onClick: () => navigate("/home")
    },
    {
      title: "🛒 Marketplace",
      description: "Plateforme de commerce et services",
      icon: ShoppingBag,
      path: "/marketplace",
      roleType: "client" as const,
      features: [
        "Catalogue complet de produits et services",
        "Recherche avancée avec filtres intelligents",
        "Comparaison de prix et évaluations",
        "Panier et commande sécurisée",
        "Gestion des favoris et listes"
      ],
      onClick: () => navigate("/marketplace")
    },
    {
      title: "📍 Suivi & Tracking",
      description: "Géolocalisation et suivi en temps réel",
      icon: MapPin,
      path: "/tracking",
      roleType: "client" as const,
      features: [
        "Suivi GPS en temps réel",
        "Historique des déplacements",
        "Notifications de livraison",
        "Estimation des temps d'arrivée",
        "Cartes interactives avancées"
      ],
      onClick: () => navigate("/tracking")
    },
    {
      title: "📊 Mon Espace",
      description: "Dashboard personnel et gestion métier",
      icon: BarChart3,
      path: profile?.role ? `/${profile.role}` : "/client",
      roleType: "client" as const,
      features: [
        "Tableau de bord personnalisé",
        "Gestion de vos activités professionnelles",
        "Statistiques et performances détaillées",
        "Outils métier spécialisés",
        "Rapports et analytics avancés"
      ],
      onClick: () => {
        const role = profile?.role || "client";
        navigate(`/${role}`);
      }
    },
    {
      title: "👤 Profil",
      description: "Gestion de compte et paramètres",
      icon: User,
      path: "/profil",
      roleType: "client" as const,
      features: [
        "Informations personnelles et sécurité",
        "Paramètres et préférences",
        "Historique d'activité complet",
        "Notifications et alertes",
        "Support et assistance technique"
      ],
      onClick: () => navigate("/profil")
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Bouton PDG sécurisé */}
      <PDGAuthButton />

      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Bienvenue sur 224Solutions
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Plateforme intégrée multi-services avec navigation simplifiée.
            Accédez rapidement à toutes vos fonctionnalités essentielles.
          </p>
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-border/50">
            <p className="text-muted-foreground text-sm">
              ⚡ <strong>Navigation optimisée</strong> - Utilisez la barre de navigation en bas pour accéder rapidement à vos outils.
              {!profile && " Connectez-vous pour accéder à votre espace personnalisé."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {coreInterfaces.map((interface_, index) => (
            <div
              key={interface_.title}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <InterfaceCard {...interface_} />
            </div>
          ))}
        </div>

        {/* Bouton de test PDG pour Lovable */}
        <div className="mt-12 max-w-md mx-auto animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <PDGTestButton />
        </div>

        <div className="mt-16 text-center animate-fade-in" style={{ animationDelay: "0.8s" }}>
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-50 to-blue-50 border border-border/50 rounded-3xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Plateforme 224Solutions
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Une solution complète intégrant commerce, logistique, transport et services.
              Navigation simplifiée via la barre de navigation en bas d'écran.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
              <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600 mb-2" />
                <span className="font-medium">Sécurisé</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
                <Globe className="h-6 w-6 text-green-600 mb-2" />
                <span className="font-medium">Multi-services</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
                <Zap className="h-6 w-6 text-yellow-600 mb-2" />
                <span className="font-medium">Temps réel</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
                <Crown className="h-6 w-6 text-purple-600 mb-2" />
                <span className="font-medium">Professionnel</span>
              </div>
            </div>

            {!profile && (
              <div className="pt-6 border-t border-border/20">
                <p className="text-muted-foreground mb-4">
                  Nouveau sur la plateforme ?
                </p>
                <Button
                  onClick={() => navigate('/auth')}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  Créer un compte / Se connecter
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
};

export default Index;
