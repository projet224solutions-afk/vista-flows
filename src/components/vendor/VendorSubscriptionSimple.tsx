import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { VendorSubscriptionPlanSelector } from "./VendorSubscriptionPlanSelector";
import { toast } from "sonner";

interface SimpleSubscription {
  subscription_id: string | null;
  plan_display_name: string;
  status: string;
  current_period_end: string | null;
}

export function VendorSubscriptionSimple() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SimpleSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      // Utiliser le client Supabase pour appeler la RPC de façon fiable
      const { data, error } = await supabase.rpc('get_active_vendor_subscription', { p_user_id: user.id });

      if (error) {
        console.error('Erreur RPC get_active_vendor_subscription:', error);
        toast.error('Impossible de charger l\'abonnement');
        return;
      }

      // La RPC peut retourner un objet JSON ou un tableau
      const result = Array.isArray(data) ? data[0] : data;
      if (result) {
        setSubscription({
          subscription_id: result.subscription_id ?? null,
          plan_display_name: result.plan_display_name ?? result.plan_name ?? 'Inconnu',
          status: result.status ?? 'free',
          current_period_end: result.current_period_end ?? null
        });
      }
    } catch (error) {
      console.error('Erreur chargement abonnement:', error);
      toast.error('Erreur lors du chargement de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  const daysRemaining = subscription?.current_period_end 
    ? Math.floor((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  if (loading) {
    return (
      <Card data-subscription-section>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card data-subscription-section>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            📅 Mon Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Aucun abonnement actif</p>
            <Button onClick={() => setShowPlanSelector(true)}>
              🟩 Choisir un plan d'abonnement
            </Button>
          </div>
        </CardContent>
        <VendorSubscriptionPlanSelector 
          open={showPlanSelector} 
          onOpenChange={setShowPlanSelector}
          onSuccess={loadSubscription}
        />
      </Card>
    );
  }

  const isActive = subscription.status === 'active';
  const isExpired = subscription.status === 'expired';

  return (
    <>
      <Card data-subscription-section>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            📅 Mon Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statut */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Statut</span>
            <Badge 
              variant={isActive ? "default" : isExpired ? "destructive" : "secondary"}
              className="gap-1"
            >
              {isActive && <CheckCircle className="w-3 h-3" />}
              {isExpired && <XCircle className="w-3 h-3" />}
              {isActive ? "Actif" : isExpired ? "Expiré" : subscription.status}
            </Badge>
          </div>

          {/* Plan actuel */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan actuel</span>
            <span className="font-semibold">{subscription.plan_display_name}</span>
          </div>

          {/* Date de fin */}
          {subscription.current_period_end && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Date de fin</span>
              <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
            </div>
          )}

          {/* Compteur jours restants */}
          {daysRemaining > 0 && (
            <div className={`p-4 rounded-lg border ${
              daysRemaining <= 7 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-center gap-2">
                <Clock className={`w-5 h-5 ${
                  daysRemaining <= 7 ? 'text-orange-600' : 'text-blue-600'
                }`} />
                <span className={`font-bold text-lg ${
                  daysRemaining <= 7 ? 'text-orange-800' : 'text-blue-800'
                }`}>
                  J-{daysRemaining}
                </span>
              </div>
              <p className={`text-center text-sm mt-1 ${
                daysRemaining <= 7 ? 'text-orange-700' : 'text-blue-700'
              }`}>
                {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Message expiration */}
          {isExpired && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 font-bold mb-1">
                <AlertCircle className="w-5 h-5" />
                Abonnement expiré
              </div>
              <p className="text-sm text-red-700">
                Choisissez un nouveau plan pour continuer.
              </p>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowPlanSelector(true)}
            >
              🟩 Choisir un plan
            </Button>
          </div>
        </CardContent>
      </Card>

      <VendorSubscriptionPlanSelector 
        open={showPlanSelector} 
        onOpenChange={setShowPlanSelector}
        onSuccess={loadSubscription}
      />
    </>
  );
}
