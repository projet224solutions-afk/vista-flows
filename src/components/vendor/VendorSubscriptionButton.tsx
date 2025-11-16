import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVendorSubscription } from "@/hooks/useVendorSubscription";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function VendorSubscriptionButton() {
  const { subscription, loading } = useVendorSubscription();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
        <Calendar className="w-3 h-3" />
        <span className="hidden sm:inline">...</span>
      </Button>
    );
  }

  if (!subscription) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-1 text-xs h-8 border-gray-300"
        onClick={() => navigate('/subscriptions')}
      >
        <Calendar className="w-3 h-3" />
        <span className="hidden sm:inline">Aucun abonnement</span>
      </Button>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
    } catch (error) {
      return "Date invalide";
    }
  };

  const endDate = subscription.current_period_end ? formatDate(subscription.current_period_end) : 'N/A';
  const isActive = subscription.status === 'active';
  const isExpired = subscription.status === 'expired';
  const daysRemaining = subscription.current_period_end 
    ? Math.floor((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-1 text-xs h-8 ${
            isActive 
              ? 'border-green-300 bg-green-50 hover:bg-green-100' 
              : isExpired
              ? 'border-red-300 bg-red-50 hover:bg-red-100'
              : 'border-gray-300'
          }`}
        >
          <Calendar className={`w-3 h-3 ${
            isActive ? 'text-green-600' : isExpired ? 'text-red-600' : 'text-gray-600'
          }`} />
          <span className="hidden sm:inline">
            {isActive ? `${daysRemaining}j restant${daysRemaining > 1 ? 's' : ''}` : isExpired ? 'Expiré' : 'Abonnement'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Mon Abonnement
          </h4>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan:</span>
              <span className="font-medium">{subscription.plan_display_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fin:</span>
              <span className="font-medium">{endDate}</span>
            </div>
          </div>

          {daysRemaining > 0 && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-center text-blue-800 font-medium">
              ⏳ {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
            </div>
          )}

          {isExpired && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-center text-red-800 font-bold">
              ⚠️ Abonnement expiré
            </div>
          )}

          {isActive && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-center text-green-800 font-bold">
              ✅ Abonnement actif
            </div>
          )}

          <Button 
            size="sm" 
            className="w-full text-xs h-8"
            onClick={() => navigate('/subscriptions')}
          >
            Gérer mon abonnement
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
