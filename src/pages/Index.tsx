import { Header } from "@/components/Header";
import { InterfaceCard } from "@/components/InterfaceCard";
import { Button } from "@/components/ui/button";
import { 
  Store, 
  Truck, 
  Car, 
  Shield, 
  Ship, 
  Crown, 
  ShoppingBag 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import NavigationFooter from "@/components/NavigationFooter";

const Index = () => {
  const navigate = useNavigate();

  const interfaces = [
    {
      title: "Interface Vendeur",
      description: "Gestion commerciale complète",
      icon: Store,
      roleType: "vendeur" as const,
      features: [
        "Dashboard avec KPIs (CA, bénéfices, stock)",
        "CRM intégré & pipeline commercial",
        "Gestion produits & catalogue SEO",
        "Facturation & paiements automatisés",
        "Analytics & rapports exportables",
        "Gestion multi-entrepôts"
      ],
      onClick: () => navigate("/vendeur")
    },
    {
      title: "Interface Livreur",
      description: "Logistique et livraisons optimisées",
      icon: Truck,
      roleType: "livreur" as const,
      features: [
        "Dashboard temps réel & gains",
        "Suivi GPS & géofencing",
        "Paiements Mobile Money intégrés",
        "Optimisation automatique des tournées",
        "Messagerie client & support 24/7",
        "Sécurité avancée (SOS, alertes)"
      ],
      onClick: () => navigate("/livreur")
    },
    {
      title: "Interface Taxi/Moto",
      description: "Transport urbain intelligent",
      icon: Car,
      roleType: "taxi" as const,
      features: [
        "Courses temps réel & programmées",
        "Tarification dynamique par zones",
        "Sécurité renforcée & vérifications",
        "Gestion multi-véhicules",
        "Fidélisation & promos locales",
        "Reporting et analytics avancés"
      ],
      onClick: () => navigate("/taxi")
    },
    {
      title: "Bureau Syndicat",
      description: "Supervision et sécurité",
      icon: Shield,
      roleType: "syndicat" as const,
      features: [
        "Gestion des mototaxis en temps réel",
        "Système de badges & QR codes",
        "Détection doublons & anti-vol",
        "Supervision GPS & alertes SOS",
        "Communication inter-syndicats",
        "Statistiques & rapports sécurisés"
      ],
      onClick: () => navigate("/syndicat")
    },
    {
      title: "Transitaire International",
      description: "Logistique mondiale",
      icon: Ship,
      roleType: "transitaire" as const,
      features: [
        "Suivi commandes internationales",
        "Gestion douanes & documents",
        "Coordination vendeurs-syndicats",
        "Tracking expéditions temps réel",
        "Gestion taxes & frais douaniers",
        "Statistiques volumes & délais"
      ],
      onClick: () => navigate("/transitaire")
    },
    {
      title: "Interface Admin/PDG",
      description: "Pilotage stratégique global",
      icon: Crown,
      roleType: "admin" as const,
      features: [
        "Vue globale (ventes, utilisateurs)",
        "Gestion utilisateurs & permissions",
        "Supervision financière complète",
        "Analytics & KPIs temps réel",
        "Gestion produits & commandes",
        "Système de mise à jour"
      ],
      onClick: () => navigate("/admin")
    },
    {
      title: "Interface Client",
      description: "Marketplace & achats",
      icon: ShoppingBag,
      roleType: "client" as const,
      features: [
        "Recherche intelligente & filtres",
        "Fiches produit enrichies",
        "Panier & paiement sécurisé",
        "Suivi commande temps réel",
        "Avis & évaluations détaillés",
        "Messagerie & notifications"
      ],
      onClick: () => navigate("/client")
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Choisissez votre interface
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Plateforme e-commerce et logistique complète avec interfaces spécialisées 
            pour chaque rôle. Design ultra-moderne et fonctionnalités professionnelles.
          </p>
          <div className="mt-8 p-6 bg-elegant-gradient rounded-2xl border border-border/50">
            <p className="text-muted-foreground text-sm">
              🚀 <strong>Version de démonstration</strong> - Connectez Supabase pour débloquer toutes les fonctionnalités backend : 
              authentification, base de données, paiements, temps réel, analytics avancés.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {interfaces.map((interface_, index) => (
            <div 
              key={interface_.title} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <InterfaceCard {...interface_} />
            </div>
          ))}
        </div>

        <div className="mt-16 text-center animate-fade-in" style={{ animationDelay: "0.8s" }}>
          <div className="max-w-4xl mx-auto bg-card border border-border/50 rounded-3xl p-8 shadow-elegant">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Fonctionnalités complètes avec Supabase
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm mb-8">
              <div className="space-y-2">
                <h3 className="font-semibold text-vendeur-primary">Authentification</h3>
                <p className="text-muted-foreground">Email, téléphone, biométrie</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-livreur-primary">Paiements</h3>
                <p className="text-muted-foreground">Mobile Money, Stripe, PayPal</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-taxi-primary">Temps réel</h3>
                <p className="text-muted-foreground">GPS, WebSocket, notifications</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-admin-secondary">Analytics</h3>
                <p className="text-muted-foreground">KPIs, rapports, tableaux de bord</p>
              </div>
            </div>
            
            <div className="pt-6 border-t border-border/50">
              <p className="text-muted-foreground mb-4">
                Nouveau sur la plateforme ?
              </p>
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="shadow-elegant hover:shadow-glow transition-all duration-300"
              >
                Créer un compte / Se connecter
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <NavigationFooter />
    </div>
  );
};

export default Index;
