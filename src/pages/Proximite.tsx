import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Store, 
  Bike, 
  Package, 
  Scissors, 
  Utensils, 
  Car, 
  Wrench, 
  Sparkles,
  Building2,
  ShoppingBag,
  Heart,
  Laptop,
  Home,
  GraduationCap,
  Camera,
  Dumbbell,
  Search,
  MapPin,
  Star,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import QuickFooter from "@/components/QuickFooter";

// Catégories de services de proximité
const serviceCategories = [
  {
    id: "boutiques",
    title: "Boutiques",
    icon: Store,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
    count: 124,
    path: "/marketplace?category=boutiques",
    description: "Commerces locaux",
    trending: true
  },
  {
    id: "taxi-moto",
    title: "Taxi-Moto",
    icon: Bike,
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-600",
    count: 89,
    path: "/taxi-moto",
    description: "Transport rapide",
    trending: true
  },
  {
    id: "livraison",
    title: "Livraison",
    icon: Package,
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600",
    count: 56,
    path: "/delivery",
    description: "Colis & courses",
    trending: false
  },
  {
    id: "beaute",
    title: "Beauté & Coiffure",
    icon: Scissors,
    color: "from-pink-500 to-pink-600",
    bgColor: "bg-pink-50",
    textColor: "text-pink-600",
    count: 78,
    path: "/services-proximite?type=beaute",
    description: "Soins & styling"
  },
  {
    id: "restaurant",
    title: "Restaurants",
    icon: Utensils,
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    textColor: "text-red-600",
    count: 145,
    path: "/marketplace?category=restaurant",
    description: "Cuisine locale"
  },
  {
    id: "transport",
    title: "Transport VTC",
    icon: Car,
    color: "from-slate-600 to-slate-700",
    bgColor: "bg-slate-50",
    textColor: "text-slate-600",
    count: 34,
    path: "/taxi",
    description: "Véhicules privés"
  },
  {
    id: "reparation",
    title: "Réparation",
    icon: Wrench,
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    textColor: "text-amber-600",
    count: 67,
    path: "/services-proximite?type=reparation",
    description: "Électro & mécanique"
  },
  {
    id: "nettoyage",
    title: "Nettoyage",
    icon: Sparkles,
    color: "from-cyan-500 to-cyan-600",
    bgColor: "bg-cyan-50",
    textColor: "text-cyan-600",
    count: 45,
    path: "/services-proximite?type=nettoyage",
    description: "Ménage & pressing"
  }
];

// Catégories de produits
const productCategories = [
  {
    id: "mode",
    title: "Mode & Vêtements",
    icon: ShoppingBag,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600",
    count: 234
  },
  {
    id: "sante",
    title: "Santé & Bien-être",
    icon: Heart,
    color: "from-rose-500 to-rose-600",
    bgColor: "bg-rose-50",
    textColor: "text-rose-600",
    count: 89
  },
  {
    id: "electronique",
    title: "Électronique",
    icon: Laptop,
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-600",
    count: 156
  },
  {
    id: "maison",
    title: "Maison & Déco",
    icon: Home,
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-50",
    textColor: "text-teal-600",
    count: 112
  }
];

// Services professionnels
const professionalServices = [
  {
    id: "immobilier",
    title: "Immobilier",
    icon: Building2,
    color: "from-violet-500 to-violet-600",
    bgColor: "bg-violet-50",
    textColor: "text-violet-600",
    description: "Achats, ventes, locations"
  },
  {
    id: "formation",
    title: "Formation",
    icon: GraduationCap,
    color: "from-sky-500 to-sky-600",
    bgColor: "bg-sky-50",
    textColor: "text-sky-600",
    description: "Cours & coaching"
  },
  {
    id: "photo-video",
    title: "Photo & Vidéo",
    icon: Camera,
    color: "from-fuchsia-500 to-fuchsia-600",
    bgColor: "bg-fuchsia-50",
    textColor: "text-fuchsia-600",
    description: "Événements & création"
  },
  {
    id: "sport",
    title: "Sport & Fitness",
    icon: Dumbbell,
    color: "from-lime-500 to-lime-600",
    bgColor: "bg-lime-50",
    textColor: "text-lime-600",
    description: "Coaching & salles"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Proximite() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleServiceClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-24">
      {/* Header avec recherche */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Services de Proximité</h1>
              <p className="text-xs text-muted-foreground">Tout ce dont vous avez besoin près de chez vous</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un service ou produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Services principaux */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Services Populaires
              </h2>
              <p className="text-sm text-muted-foreground">Les plus demandés près de vous</p>
            </div>
          </div>

          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {serviceCategories.map((service) => {
              const Icon = service.icon;
              return (
                <motion.button
                  key={service.id}
                  variants={itemVariants}
                  onClick={() => handleServiceClick(service.path)}
                  className="group relative bg-card rounded-2xl p-4 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-left overflow-hidden"
                >
                  {service.trending && (
                    <Badge className="absolute top-2 right-2 bg-primary/10 text-primary border-0 text-[10px] px-1.5">
                      Tendance
                    </Badge>
                  )}
                  
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                    service.bgColor
                  )}>
                    <Icon className={cn("w-6 h-6", service.textColor)} />
                  </div>
                  
                  <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">{service.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">{service.count} disponibles</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </section>

        {/* Catégories de produits */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Catégories de Produits
              </h2>
              <p className="text-sm text-muted-foreground">Explorez par catégorie</p>
            </div>
            <button 
              onClick={() => navigate('/marketplace')}
              className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {productCategories.map((category) => {
              const Icon = category.icon;
              return (
                <motion.button
                  key={category.id}
                  variants={itemVariants}
                  onClick={() => navigate(`/marketplace?category=${category.id}`)}
                  className="group bg-card rounded-2xl p-4 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-left"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                    category.bgColor
                  )}>
                    <Icon className={cn("w-5 h-5", category.textColor)} />
                  </div>
                  
                  <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{category.count} articles</span>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </section>

        {/* Services professionnels */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Services Professionnels
              </h2>
              <p className="text-sm text-muted-foreground">Experts qualifiés à votre service</p>
            </div>
            <button 
              onClick={() => navigate('/services-proximite')}
              className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              Explorer <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {professionalServices.map((service) => {
              const Icon = service.icon;
              return (
                <motion.button
                  key={service.id}
                  variants={itemVariants}
                  onClick={() => navigate(`/services-proximite?type=${service.id}`)}
                  className="group relative bg-gradient-to-br from-card to-muted/30 rounded-2xl p-4 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-left overflow-hidden"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                    service.bgColor
                  )}>
                    <Icon className={cn("w-5 h-5", service.textColor)} />
                  </div>
                  
                  <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </motion.button>
              );
            })}
          </motion.div>
        </section>

        {/* Banner promotionnel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Devenez prestataire</h3>
            <p className="text-sm opacity-90 mb-4 max-w-md">
              Rejoignez 224Solutions et développez votre activité avec notre plateforme de services de proximité.
            </p>
            <button 
              onClick={() => navigate('/auth')}
              className="bg-white text-primary px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors shadow-lg"
            >
              S'inscrire maintenant
            </button>
          </div>
        </motion.div>
      </div>

      <QuickFooter />
    </div>
  );
}