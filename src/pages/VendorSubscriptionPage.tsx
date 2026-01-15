/**
 * PAGE ABONNEMENT VENDEUR - 224SOLUTIONS
 * Page dédiée pour la gestion des abonnements vendeur
 * Évite la confusion avec DriverSubscriptionPage
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowLeft,
  Star,
  Zap,
  Shield,
  TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVendorSubscription } from "@/hooks/useVendorSubscription";
import { VendorSubscriptionPlanSelector } from "@/components/vendor/VendorSubscriptionPlanSelector";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function VendorSubscriptionPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { subscription, plans, loading, hasAccess, isExpiringSoon, isExpired, getDaysRemaining } = useVendorSubscription();
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  // Rediriger si pas vendeur
  if (profile && profile.role !== 'vendeur' && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Accès Réservé</h2>
            <p className="text-gray-600 mb-4">
              Cette page est réservée aux vendeurs. Votre rôle actuel: {profile?.role}
            </p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non définie';
    try {
      return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const getStatusBadge = () => {
    if (loading) return <Badge variant="outline">Chargement...</Badge>;
    if (!subscription) return <Badge variant="destructive">Aucun abonnement</Badge>;
    if (isExpired) return <Badge variant="destructive">Expiré</Badge>;
    if (isExpiringSoon) return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Expire bientôt</Badge>;
    if (subscription.status === 'active') return <Badge className="bg-green-500">Actif</Badge>;
    return <Badge variant="outline">{subscription.status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Abonnement Vendeur
            </h1>
            <p className="text-gray-600">Gérez votre abonnement et accédez aux fonctionnalités premium</p>
          </div>
        </div>

        {/* Current Subscription Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>État de l'Abonnement</CardTitle>
                  <CardDescription>
                    {subscription?.plans?.display_name || subscription?.plans?.name || 'Aucun plan'}
                  </CardDescription>
                </div>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : subscription ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500">Date d'expiration</p>
                    <p className="font-semibold">{formatDate(subscription.current_period_end)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-500">Jours restants</p>
                    <p className="font-semibold">{getDaysRemaining()} jours</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">Statut</p>
                    <p className="font-semibold capitalize">{subscription.status}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun Abonnement Actif</h3>
                <p className="text-gray-600 mb-4">
                  Souscrivez à un plan pour accéder à toutes les fonctionnalités vendeur.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button 
                onClick={() => setShowPlanSelector(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {subscription ? 'Changer de Plan' : 'Souscrire'}
              </Button>
              {subscription && (
                <Button variant="outline" onClick={() => navigate('/vendeur')}>
                  Retour au Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features by Plan */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Fonctionnalités par Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="starter" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="starter">Starter</TabsTrigger>
                <TabsTrigger value="pro">Pro</TabsTrigger>
                <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
              </TabsList>
              <TabsContent value="starter" className="mt-4 space-y-3">
                <FeatureItem icon={<Shield />} text="Gestion de base des produits" />
                <FeatureItem icon={<TrendingUp />} text="Statistiques simples" />
                <FeatureItem icon={<Zap />} text="Support email" />
              </TabsContent>
              <TabsContent value="pro" className="mt-4 space-y-3">
                <FeatureItem icon={<Shield />} text="Tout Starter +" highlight />
                <FeatureItem icon={<CreditCard />} text="POS complet" />
                <FeatureItem icon={<TrendingUp />} text="Analytics avancés" />
                <FeatureItem icon={<Zap />} text="Support prioritaire" />
              </TabsContent>
              <TabsContent value="enterprise" className="mt-4 space-y-3">
                <FeatureItem icon={<Shield />} text="Tout Pro +" highlight />
                <FeatureItem icon={<Star />} text="Multi-entrepôts" />
                <FeatureItem icon={<TrendingUp />} text="API dédiée" />
                <FeatureItem icon={<Zap />} text="Account Manager dédié" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Plan Selector Modal */}
        {showPlanSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Choisir un Plan</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowPlanSelector(false)}>
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <VendorSubscriptionPlanSelector 
                  onClose={() => setShowPlanSelector(false)}
                  currentPlan={subscription?.plan_id || undefined}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureItem({ icon, text, highlight = false }: { icon: React.ReactNode; text: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${highlight ? 'bg-blue-50 text-blue-700' : 'bg-gray-50'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${highlight ? 'bg-blue-100' : 'bg-gray-200'}`}>
        {icon}
      </div>
      <span className="font-medium">{text}</span>
    </div>
  );
}
