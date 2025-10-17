/**
 * 🚨 WIDGET ALERTES FINANCIÈRES - 224SOLUTIONS
 * Composant pour afficher les alertes de paiements en attente
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Users, 
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface PaymentAlert {
  id: string;
  payment_id: string;
  vendeur_id: string;
  client_id: string;
  alert_level: 'warning' | 'critical';
  hours_pending: number;
  amount: number;
  currency: string;
  status: 'active' | 'resolved';
  created_at: string;
  payment: {
    id: string;
    montant: number;
    devise: string;
    status: string;
    created_at: string;
    vendeur: {
      id: string;
      first_name: string;
      last_name: string;
      business_name: string;
      email: string;
    };
    client: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

interface FinancialAlertsWidgetProps {
  onViewPayment?: (paymentId: string) => void;
  onResolveAlert?: (alertId: string) => void;
}

export const FinancialAlertsWidget: React.FC<FinancialAlertsWidgetProps> = ({
  onViewPayment,
  onResolveAlert
}) => {
  const [alerts, setAlerts] = useState<PaymentAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState({
    total_alerts: 0,
    critical_alerts: 0,
    total_amount: 0,
    avg_pending_hours: 0
  });
  const { toast } = useToast();

  // Charger les alertes au montage du composant
  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/financial-alerts');
      const data = await response.json();

      if (data.success) {
        setAlerts(data.alerts || []);
        setStats(data.stats || {});
      } else {
        setError(data.error || 'Erreur chargement alertes');
      }
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Résoudre une alerte
  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/financial-alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Alerte résolue",
          description: "L'alerte a été marquée comme résolue",
        });
        loadAlerts();
        onResolveAlert?.(alertId);
      } else {
        setError(data.error || 'Erreur résolution alerte');
      }
    } catch (error) {
      console.error('Erreur résolution alerte:', error);
      setError('Erreur de résolution');
    }
  };

  // Obtenir la couleur selon le niveau d'alerte
  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'warning':
        return 'bg-orange-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // Obtenir l'icône selon le niveau d'alerte
  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Formater la durée en attente
  const formatPendingTime = (hours: number) => {
    if (hours < 24) {
      return `${hours}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}j ${remainingHours}h`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertes Financières
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={loadAlerts}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.total_alerts}</div>
            <div className="text-sm text-blue-800">Total Alertes</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.critical_alerts}</div>
            <div className="text-sm text-red-800">Critiques</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.total_amount.toLocaleString()} GNF
            </div>
            <div className="text-sm text-green-800">Montant Total</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(stats.avg_pending_hours)}h
            </div>
            <div className="text-sm text-orange-800">Moyenne</div>
          </div>
        </div>

        {/* État de chargement */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des alertes...</p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Liste des alertes */}
        {!isLoading && !error && (
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                <p>Aucune alerte financière</p>
                <p className="text-sm">Tous les paiements sont à jour</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getAlertIcon(alert.alert_level)}
                      <h4 className="font-semibold">
                        Paiement en attente - {alert.payment.vendeur.business_name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getAlertColor(alert.alert_level)}>
                        {alert.alert_level.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {formatPendingTime(alert.hours_pending)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Montant:</strong> {alert.amount.toLocaleString()} {alert.currency}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Client:</strong> {alert.payment.client.first_name} {alert.payment.client.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Vendeur:</strong> {alert.payment.vendeur.business_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Email:</strong> {alert.payment.vendeur.email}
                      </p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h5 className="font-medium text-yellow-900 mb-1">Action recommandée :</h5>
                    <p className="text-sm text-yellow-800">
                      Contacter le client pour finaliser le paiement. 
                      {alert.alert_level === 'critical' && ' URGENT: Paiement en attente depuis plus de 72h.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewPayment?.(alert.payment_id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Voir le paiement
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marquer comme résolu
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500">
                    Alerte créée le {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
