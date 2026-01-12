/**
 * HERO SECTION - Ultra Compact E-Commerce Design
 * 224Solutions - Premium Mobile-First Hero
 * Inspired by Uber, Deliveroo, Glovo
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Utensils, Truck, Car, Sparkles, ChevronRight, Package, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { AvailableServicesModal } from '@/components/professional-services/AvailableServicesModal';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  gradient: string;
}

const getQuickActions = (t: (key: string) => string): QuickAction[] => [
  { 
    id: 'restaurant', 
    icon: <Utensils className="w-5 h-5" />, 
    label: t('home.restaurant'),
    gradient: 'from-orange-500 to-red-500'
  },
  { 
    id: 'boutique', 
    icon: <Store className="w-5 h-5" />, 
    label: t('home.boutique'),
    gradient: 'from-blue-500 to-indigo-500'
  },
  { 
    id: 'livraison', 
    icon: <Truck className="w-5 h-5" />, 
    label: t('home.delivery'),
    gradient: 'from-emerald-500 to-teal-500'
  },
  { 
    id: 'transport', 
    icon: <Car className="w-5 h-5" />, 
    label: t('home.transport'),
    gradient: 'from-violet-500 to-purple-500'
  },
];

interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const quickActions = getQuickActions(t);
  
  const [showServicesModal, setShowServicesModal] = useState(false);

  const handleStartNowClick = () => {
    if (user) {
      // User is logged in - show available services modal
      setShowServicesModal(true);
    } else {
      // User is not logged in - navigate to auth page
      navigate('/auth');
    }
  };

  const handleQuickActionClick = (actionId: string) => {
    if (user) {
      // User is logged in - show available services modal
      setShowServicesModal(true);
    } else {
      // User is not logged in - navigate to auth page
      navigate('/auth');
    }
  };

  return (
    <section className={cn('relative', className)}>
      {/* Compact Header */}
      <div className="px-4 pt-4 pb-6">
        {/* Welcome Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">224Solutions</span>
          </div>
        </div>

        {/* Main Title - Compact */}
        <h1 className="text-xl font-bold text-foreground leading-tight mb-2">
          {t('home.createService')}
        </h1>
        
        {/* Subtitle - Short */}
        <p className="text-sm text-muted-foreground mb-5">
          {t('home.professionalCategories')} • {t('home.completeTools') || t('home.withCompleteTools')}
        </p>

        {/* CTA Buttons - Différent selon si l'utilisateur est connecté ou non */}
        {user ? (
          <>
            {/* Bouton Mon Dashboard - pour utilisateur connecté */}
            <Button
              onClick={() => {
                // Rediriger vers le dashboard approprié selon le rôle
                const role = (user as any)?.user_metadata?.role || 'client';
                const dashboards: Record<string, string> = {
                  admin: '/pdg',
                  ceo: '/pdg',
                  vendeur: '/vendeur',
                  livreur: '/livreur',
                  taxi: '/taxi-moto/driver',
                  syndicat: '/syndicat',
                  transitaire: '/transitaire',
                  client: '/client',
                  agent: '/agent',
                };
                navigate(dashboards[role] || '/profil');
              }}
              size="lg"
              className={cn(
                'w-full gap-2 h-12 rounded-xl text-base font-semibold',
                'bg-primary hover:bg-primary/90',
                'shadow-lg shadow-primary/25',
                'active:scale-[0.98] transition-all duration-200'
              )}
            >
              <Store className="w-5 h-5" />
              {t('home.myDashboard') || 'Mon Dashboard'}
            </Button>

            {/* Bouton Créer un service - pour utilisateur connecté */}
            <Button
              onClick={handleStartNowClick}
              variant="outline"
              size="lg"
              className={cn(
                'w-full gap-2 h-11 rounded-xl text-base font-medium mt-3',
                'border-primary/30 text-primary',
                'hover:bg-primary/10 hover:border-primary/50',
                'active:scale-[0.98] transition-all duration-200'
              )}
            >
              <Sparkles className="w-5 h-5" />
              {t('home.createService') || 'Créer un service'}
            </Button>
          </>
        ) : (
          <>
            {/* Bouton Commencer - pour utilisateur non connecté */}
            <Button
              onClick={handleStartNowClick}
              size="lg"
              className={cn(
                'w-full gap-2 h-12 rounded-xl text-base font-semibold',
                'bg-primary hover:bg-primary/90',
                'shadow-lg shadow-primary/25',
                'active:scale-[0.98] transition-all duration-200'
              )}
            >
              <Store className="w-5 h-5" />
              {t('home.startNow')}
            </Button>
          </>
        )}

        {/* Digital Products & Formation Button - toujours visible */}
        <Button
          onClick={() => navigate('/digital-products')}
          variant="outline"
          size="lg"
          className={cn(
            'w-full gap-2 h-11 rounded-xl text-base font-medium mt-3',
            'border-primary/30 text-primary',
            'hover:bg-primary/10 hover:border-primary/50',
            'active:scale-[0.98] transition-all duration-200'
          )}
        >
          <GraduationCap className="w-5 h-5" />
          {t('home.digitalProducts') || 'Formation & Produits numériques'}
        </Button>
      </div>

      {/* Quick Actions Grid - Compact Cards */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">{t('home.popularServices') || t('home.nearbyServices')}</h2>
          <button 
            onClick={() => user ? setShowServicesModal(true) : navigate('/services')}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {t('home.seeAll')}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickActionClick(action.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-2xl',
                'bg-card border border-border/50',
                'hover:border-primary/30 hover:bg-primary/5',
                'active:scale-95 transition-all duration-200'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                'bg-gradient-to-br text-white shadow-sm',
                action.gradient
              )}>
                {action.icon}
              </div>
              <span className="text-[11px] font-medium text-foreground text-center leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* More Services Chip */}
        <button
          onClick={() => user ? setShowServicesModal(true) : navigate('/services')}
          className={cn(
            'w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl',
            'bg-muted/50 border border-border/50',
            'hover:bg-muted hover:border-border',
            'active:scale-[0.98] transition-all duration-200'
          )}
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            {t('home.andMore')}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Available Services Modal - Only shown when user is logged in */}
      <AvailableServicesModal 
        open={showServicesModal} 
        onOpenChange={setShowServicesModal} 
      />
    </section>
  );
}

export default HeroSection;
