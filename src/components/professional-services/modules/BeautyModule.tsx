/**
 * MODULE SALON DE BEAUTÉ - Interface complète
 * Utilise serviceId pour afficher les données spécifiques au salon
 */

import { useState } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Crown, Users, Calendar, DollarSign, Clock,
  CheckCircle, XCircle, RefreshCw, Eye, Plus,
  TrendingUp, Settings
} from 'lucide-react';
import { useServiceBeautyStats } from '@/hooks/useServiceBeautyStats';
import { _formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface BeautyModuleProps {
  serviceId: string;
  businessName?: string;
}

// formatCurrency is now handled via useFormatCurrency hook inside the component

const statusColors: Record<string, string> = {
  pending: 'bg-orange-100 text-[#ff4000]',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-orange-100 text-[#ff4000]',
  cancelled: 'bg-orange-100 text-[#ff4000]',
  no_show: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent',
};

export function BeautyModule({ serviceId, businessName }: BeautyModuleProps) {
  const formatCurrency = useFormatCurrency();
  const { stats, recentAppointments, loading, error, refresh } = useServiceBeautyStats(serviceId);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
          <Button onClick={refresh} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Message d'onboarding si pas de données
  if (!stats?.hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="w-7 h-7 text-primary" />
              {businessName || 'Salon de Beauté'}
            </h2>
            <p className="text-muted-foreground">Gérez votre salon</p>
          </div>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        <Card className="bg-gradient-to-r from-orange-50 to-blue-50 dark:from-[#ff4000]/20 dark:to-[#04439e]/20 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-[#ff4000]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Bienvenue dans votre espace Beauté !</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configurez vos services, gérez vos rendez-vous et suivez vos performances.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="gap-2 justify-start"
                    onClick={() => setActiveTab('services')}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un service
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 justify-start"
                    onClick={() => navigate('/vendeur/settings')}
                  >
                    <Users className="w-4 h-4" />
                    Gérer le personnel
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 justify-start"
                    onClick={() => navigate('/vendeur/settings')}
                  >
                    <Settings className="w-4 h-4" />
                    Configurer
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-7 h-7 text-primary" />
            {businessName || 'Salon de Beauté'}
          </h2>
          <p className="text-muted-foreground">Gérez vos rendez-vous et services</p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-pink-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rendez-vous</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.appointments.total || 0}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {stats?.todayAppointments > 0 && (
                <Badge variant="secondary" className="text-xs bg-orange-100 text-[#ff4000]">
                  {stats.todayAppointments} aujourd'hui
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.services.total || 0}</div>
            <span className="text-xs text-[#ff4000]">{stats?.services.active || 0} actifs</span>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.staff.total || 0}</div>
            <span className="text-xs text-muted-foreground">membres</span>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">
              {formatCurrency(stats?.sales.totalRevenue || 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(stats?.sales.monthRevenue || 0)} ce mois
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">
            <DollarSign className="w-4 h-4 mr-2 hidden md:block" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <Calendar className="w-4 h-4 mr-2 hidden md:block" />
            Rendez-vous
          </TabsTrigger>
          <TabsTrigger value="services">
            <Crown className="w-4 h-4 mr-2 hidden md:block" />
            Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Résumé des revenus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold text-primary">{formatCurrency(stats?.sales.totalRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Aujourd'hui</span>
                  <span className="font-semibold">{formatCurrency(stats?.sales.todayRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Cette semaine</span>
                  <span className="font-semibold">{formatCurrency(stats?.sales.weekRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Ce mois</span>
                  <span className="font-semibold">{formatCurrency(stats?.sales.monthRevenue || 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Appointments Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  État des rendez-vous
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-orange-50 dark:bg-[#ff4000]/20 border border-orange-200 rounded-lg text-center">
                    <div className="text-xs font-medium text-[#ff4000]">Aujourd'hui</div>
                    <div className="text-xl font-bold text-[#ff4000]">{stats?.todayAppointments || 0}</div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-[#04439e]/20 border border-blue-200 rounded-lg text-center">
                    <div className="text-xs font-medium text-[#04439e]">À venir</div>
                    <div className="text-xl font-bold text-[#04439e]">{stats?.upcomingAppointments || 0}</div>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <div className="flex justify-between items-center p-2 rounded bg-orange-50">
                    <span className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#ff4000]" /> En attente
                    </span>
                    <span className="font-semibold text-[#ff4000]">{stats?.appointments.pending || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-blue-50">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" /> Confirmés
                    </span>
                    <span className="font-semibold text-blue-700">{stats?.appointments.confirmed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-orange-50">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#ff4000]" /> Terminés
                    </span>
                    <span className="font-semibold text-[#ff4000]">{stats?.appointments.completed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-orange-50">
                    <span className="text-sm flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-[#ff4000]" /> Annulés
                    </span>
                    <span className="font-semibold text-[#ff4000]">{stats?.appointments.cancelled || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Rendez-vous récents</CardTitle>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Voir tout
              </Button>
            </CardHeader>
            <CardContent>
              {recentAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun rendez-vous pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{appointment.customer_name || 'Client'}</span>
                          <Badge className={statusColors[appointment.status] || 'bg-gray-100'}>
                            {statusLabels[appointment.status] || appointment.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(appointment.appointment_date), 'PPP à HH:mm', { locale: fr })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(appointment.total_price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Produits & Services
              </CardTitle>
              <Button onClick={() => navigate('/vendeur/products')} className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter un service
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-8 text-muted-foreground">
                <Crown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Gérez vos prestations et produits de beauté</p>
                <p className="text-sm">Les services ajoutés seront visibles sur le marketplace</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate('/vendeur/products')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir tous mes produits
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BeautyModule;
