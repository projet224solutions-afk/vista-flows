import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVendorSubscription } from "@/hooks/useVendorSubscription.tsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { VendorSubscriptionPlanSelector } from "./VendorSubscriptionPlanSelector";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { SubscriptionService } from "@/services/subscriptionService";

export function VendorSubscriptionInfo() {
  const { subscription, loading, refresh } = useVendorSubscription();
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
    } catch (error) {
      return "Date invalide";
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.subscription_id) return;

    try {
      setCancelling(true);
      const success = await SubscriptionService.cancelSubscription(subscription.subscription_id);
      
      if (success) {
        toast.success("Abonnement annulé avec succès", {
          description: "Votre abonnement restera actif jusqu'à la date de fin prévue."
        });
        await refresh();
      } else {
        toast.error("Erreur lors de l'annulation de l'abonnement");
      }
    } catch (error) {
      console.error("Erreur annulation:", error);
      toast.error("Erreur système lors de l'annulation");
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            📅 Mon Abonnement
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
      <Card>
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
          onSuccess={refresh}
        />
      </Card>
    );
  }

  const isActive = subscription.status === 'active';
  const isExpired = subscription.status === 'expired';
  const isCancelled = subscription.status === 'cancelled';
  const daysRemaining = subscription.current_period_end 
    ? Math.floor((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            📅 Mon Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statut de l'abonnement */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Statut</span>
            <Badge 
              variant={isActive ? "default" : isExpired ? "destructive" : "secondary"}
              className="gap-1"
            >
              {isActive && <CheckCircle className="w-3 h-3" />}
              {isExpired && <XCircle className="w-3 h-3" />}
              {isCancelled && <AlertCircle className="w-3 h-3" />}
              {isActive ? "Actif" : isExpired ? "Expiré" : isCancelled ? "Annulé" : subscription.status}
            </Badge>
          </div>

          {/* Plan actuel */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan actuel</span>
            <span className="font-semibold">{subscription.plan_display_name}</span>
          </div>

          {/* Date de début */}
          {subscription.current_period_end && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Date de début</span>
              <span className="font-medium">
                {formatDate(new Date(new Date(subscription.current_period_end).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())}
              </span>
            </div>
          )}

          {/* Date de fin */}
          {subscription.current_period_end && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Date de fin</span>
              <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
            </div>
          )}

          {/* Compteur de jours restants */}
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
                {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''} avant expiration
              </p>
            </div>
          )}

          {/* Message d'expiration */}
          {isExpired && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 font-bold mb-1">
                <AlertCircle className="w-5 h-5" />
                Abonnement expiré
              </div>
              <p className="text-sm text-red-700">
                Votre abonnement a expiré. Choisissez un nouveau plan pour continuer à utiliser toutes les fonctionnalités.
              </p>
            </div>
          )}

          {/* Message d'annulation */}
          {isCancelled && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-800 font-bold mb-1">
                <AlertCircle className="w-5 h-5" />
                Abonnement annulé
              </div>
              <p className="text-sm text-orange-700">
                Votre abonnement a été annulé mais reste actif jusqu'au {subscription.current_period_end ? formatDate(subscription.current_period_end) : 'N/A'}.
              </p>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowPlanSelector(true)}
            >
              🟩 Choisir un plan
            </Button>
            
            {isActive && !isCancelled && (
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => setShowCancelDialog(true)}
              >
                🔴 Annuler l'abonnement
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de sélection de plan */}
      <VendorSubscriptionPlanSelector 
        open={showPlanSelector} 
        onOpenChange={setShowPlanSelector}
        onSuccess={refresh}
      />

      {/* Dialog de confirmation d'annulation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler l'abonnement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment annuler votre abonnement ? Cette action n'arrête pas immédiatement vos accès 
              mais bloque le renouvellement automatique. Votre abonnement restera actif jusqu'au{" "}
              <strong>{subscription.current_period_end ? formatDate(subscription.current_period_end) : 'N/A'}</strong>.
              <br /><br />
              <strong className="text-destructive">Attention :</strong> Cette action est irréversible. 
              Vous ne pourrez pas reprendre cet abonnement, seulement racheter un nouveau plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Annulation..." : "Confirmer l'annulation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
