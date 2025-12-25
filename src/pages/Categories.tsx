/**
 * CATEGORIES PAGE - Catégories de produits et services
 * 224Solutions - Page des catégories
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, ShoppingBag, Ticket, GraduationCap, Laptop, Shirt, Smartphone, Home, Car, Utensils, Heart, Gamepad2, BookOpen, Gift, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  gradient: string;
  description: string;
  path: string;
}

const mainCategories: Category[] = [
  {
    id: 'boutiques',
    name: 'Boutiques Digitales',
    icon: <Store className="w-6 h-6" />,
    gradient: 'from-blue-500 to-indigo-600',
    description: 'Explorez les boutiques en ligne',
    path: '/boutiques'
  },
  {
    id: 'billetterie',
    name: 'Billetterie',
    icon: <Ticket className="w-6 h-6" />,
    gradient: 'from-orange-500 to-red-500',
    description: 'Événements, concerts, spectacles',
    path: '/events'
  },
  {
    id: 'formations',
    name: 'Formations',
    icon: <GraduationCap className="w-6 h-6" />,
    gradient: 'from-emerald-500 to-teal-500',
    description: 'Cours et formations en ligne',
    path: '/formations'
  },
];

const productCategories: Category[] = [
  {
    id: 'electronique',
    name: 'Électronique',
    icon: <Smartphone className="w-5 h-5" />,
    gradient: 'from-slate-600 to-slate-800',
    description: 'Téléphones, ordinateurs, accessoires',
    path: '/marketplace?category=electronique'
  },
  {
    id: 'mode',
    name: 'Mode & Vêtements',
    icon: <Shirt className="w-5 h-5" />,
    gradient: 'from-pink-500 to-rose-500',
    description: 'Vêtements, chaussures, accessoires',
    path: '/marketplace?category=mode'
  },
  {
    id: 'maison',
    name: 'Maison & Jardin',
    icon: <Home className="w-5 h-5" />,
    gradient: 'from-amber-500 to-orange-500',
    description: 'Meubles, décoration, jardinage',
    path: '/marketplace?category=maison'
  },
  {
    id: 'automobile',
    name: 'Automobile',
    icon: <Car className="w-5 h-5" />,
    gradient: 'from-gray-600 to-gray-800',
    description: 'Véhicules, pièces, accessoires',
    path: '/marketplace?category=automobile'
  },
  {
    id: 'alimentation',
    name: 'Alimentation',
    icon: <Utensils className="w-5 h-5" />,
    gradient: 'from-green-500 to-emerald-500',
    description: 'Produits alimentaires, boissons',
    path: '/marketplace?category=alimentation'
  },
  {
    id: 'beaute',
    name: 'Beauté & Santé',
    icon: <Heart className="w-5 h-5" />,
    gradient: 'from-purple-500 to-violet-500',
    description: 'Cosmétiques, soins, bien-être',
    path: '/marketplace?category=beaute'
  },
  {
    id: 'informatique',
    name: 'Informatique',
    icon: <Laptop className="w-5 h-5" />,
    gradient: 'from-cyan-500 to-blue-500',
    description: 'Ordinateurs, logiciels, accessoires',
    path: '/marketplace?category=informatique'
  },
  {
    id: 'jeux',
    name: 'Jeux & Loisirs',
    icon: <Gamepad2 className="w-5 h-5" />,
    gradient: 'from-red-500 to-pink-500',
    description: 'Jeux vidéo, jouets, loisirs',
    path: '/marketplace?category=jeux'
  },
  {
    id: 'livres',
    name: 'Livres & Culture',
    icon: <BookOpen className="w-5 h-5" />,
    gradient: 'from-indigo-500 to-purple-500',
    description: 'Livres, musique, films',
    path: '/marketplace?category=livres'
  },
  {
    id: 'cadeaux',
    name: 'Cadeaux',
    icon: <Gift className="w-5 h-5" />,
    gradient: 'from-rose-500 to-red-500',
    description: 'Idées cadeaux pour toutes occasions',
    path: '/marketplace?category=cadeaux'
  },
];

export default function Categories() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Catégories</h1>
            <p className="text-xs text-muted-foreground">Explorez nos produits et services</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Section principale */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Services principaux</h2>
          <div className="space-y-3">
            {mainCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => navigate(category.path)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl',
                  'bg-card border border-border/50',
                  'hover:border-primary/30 hover:shadow-md',
                  'active:scale-[0.98] transition-all duration-200'
                )}
              >
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center',
                  'bg-gradient-to-br text-white shadow-lg',
                  category.gradient
                )}>
                  {category.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-foreground">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>

        {/* Catégories de produits */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Catégories de produits</h2>
            <button 
              onClick={() => navigate('/marketplace')}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Voir tout
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {productCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => navigate(category.path)}
                className={cn(
                  'flex flex-col items-start gap-3 p-4 rounded-2xl',
                  'bg-card border border-border/50',
                  'hover:border-primary/30 hover:shadow-md',
                  'active:scale-[0.98] transition-all duration-200'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  'bg-gradient-to-br text-white shadow-sm',
                  category.gradient
                )}>
                  {category.icon}
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-foreground leading-tight">{category.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{category.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* CTA Marketplace */}
        <section className="pt-2">
          <button
            onClick={() => navigate('/marketplace')}
            className={cn(
              'w-full flex items-center justify-center gap-3 py-4 rounded-2xl',
              'bg-primary/10 border border-primary/20',
              'hover:bg-primary/15 hover:border-primary/30',
              'active:scale-[0.98] transition-all duration-200'
            )}
          >
            <ShoppingBag className="w-5 h-5 text-primary" />
            <span className="font-semibold text-primary">Explorer le Marketplace</span>
            <ChevronRight className="w-5 h-5 text-primary" />
          </button>
        </section>
      </div>
    </div>
  );
}
