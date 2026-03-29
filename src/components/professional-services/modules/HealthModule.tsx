/**
 * MODULE SANTÃ‰ / PHARMACIE â€” Interface professionnelle
 * InspirÃ© CVS Health, Boots, Walgreens, McKesson
 * 
 * Architecture: Composable panels sous-componentisÃ©s
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pill, XCircle, RefreshCw, Plus, Activity,
  ShoppingCart, Package, Users, ClipboardList,
  Settings, Stethoscope
} from 'lucide-react';
import { useServiceHealthStats } from '@/hooks/useServiceHealthStats';
import { useNavigate } from 'react-router-dom';
import { PharmacyQuickActions } from './pharmacy/PharmacyQuickActions';
import { PharmacyKPICards } from './pharmacy/PharmacyKPICards';
import { PharmacyOverviewPanel } from './pharmacy/PharmacyOverviewPanel';
import { PharmacySalesPanel } from './pharmacy/PharmacySalesPanel';
import { PharmacyInventoryPanel } from './pharmacy/PharmacyInventoryPanel';

interface HealthModuleProps {
  serviceId: string;
  businessName?: string;
}

export function HealthModule({ serviceId, businessName }: HealthModuleProps) {
  const { stats, recentSales, loading, error, refresh } = useServiceHealthStats(serviceId);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-9 w-9 rounded-lg mb-3" />
                <Skeleton className="h-6 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={refresh} className="mt-4 gap-2">
            <RefreshCw className="w-4 h-4" />
            RÃ©essayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state â€” onboarding
  if (!stats?.hasData) {
    return (
      <div className="space-y-6">
        <PharmacyHeader businessName={businessName} onRefresh={refresh} />

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r bg-primary-blue-600 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <Pill className="w-7 h-7 text-white" />
              </div>
              <div className="text-white">
                <h3 className="text-xl font-bold mb-1">Bienvenue dans votre Pharmacie</h3>
                <p className="text-white/80 text-sm max-w-md">
                  GÃ©rez vos mÃ©dicaments, suivez votre inventaire, traitez les ordonnances 
                  et analysez vos performances â€” tout depuis un seul endroit.
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/vendeur/products')}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-blue-100 dark:bg-primary-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5 text-primary-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Ajouter des produits</p>
                  <p className="text-xs text-muted-foreground">MÃ©dicaments, parapharmacie</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/vendeur/orders')}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">GÃ©rer les commandes</p>
                  <p className="text-xs text-muted-foreground">Ventes et livraisons</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/vendeur/settings')}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings className="w-5 h-5 text-violet-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Configurer</p>
                  <p className="text-xs text-muted-foreground">Horaires, infos, profil</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <PharmacyHeader businessName={businessName} onRefresh={refresh} />

      {/* Quick Actions */}
      <PharmacyQuickActions onTabChange={setActiveTab} />

      {/* KPI Cards */}
      <PharmacyKPICards stats={stats} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-muted/50 h-auto p-1">
          <TabsTrigger value="overview" className="gap-1.5 text-xs md:text-sm whitespace-nowrap">
            <Activity className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5 text-xs md:text-sm whitespace-nowrap">
            <Package className="w-4 h-4" />
            Inventaire
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 text-xs md:text-sm whitespace-nowrap">
            <ShoppingCart className="w-4 h-4" />
            Ventes
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5 text-xs md:text-sm whitespace-nowrap">
            <Users className="w-4 h-4" />
            Patients
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-1.5 text-xs md:text-sm whitespace-nowrap">
            <ClipboardList className="w-4 h-4" />
            Ordonnances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <PharmacyOverviewPanel stats={stats} recentSales={recentSales} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <PharmacyInventoryPanel stats={stats} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <PharmacySalesPanel stats={stats} recentSales={recentSales} />
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="font-semibold text-lg mb-1">Fichier Patients</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                GÃ©rez vos patients, leur historique d'achats et leurs ordonnances depuis un dossier centralisÃ©.
              </p>
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Users className="w-4 h-4" />
                <span>{stats.clients.total} patient(s) enregistrÃ©(s)</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="font-semibold text-lg mb-1">Gestion des Ordonnances</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                Recevez, validez et suivez les ordonnances de vos patients. TraÃ§abilitÃ© complÃ¨te et historique.
              </p>
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <ClipboardList className="w-4 h-4" />
                <span>{stats.prescriptions.total} ordonnance(s) â€¢ {stats.prescriptions.pending} en attente</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Header rÃ©utilisable */
function PharmacyHeader({ businessName, onRefresh }: { businessName?: string; onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-blue-100 dark:bg-primary-blue-900/30 flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-primary-blue-600 dark:text-primary-blue-400" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold leading-tight">{businessName || 'Ma Pharmacie'}</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Gestion pharmaceutique intÃ©grÃ©e</p>
        </div>
      </div>
      <Button onClick={onRefresh} variant="outline" size="sm" className="gap-1.5">
        <RefreshCw className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Actualiser</span>
      </Button>
    </div>
  );
}

export default HealthModule;
