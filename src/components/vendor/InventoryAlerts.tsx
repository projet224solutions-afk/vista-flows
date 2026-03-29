import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { InventoryAlert } from "@/hooks/useInventoryService";

interface InventoryAlertsProps {
  alerts: InventoryAlert[];
  onMarkAsRead: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}

export default function InventoryAlerts({ alerts, onMarkAsRead, onResolve }: InventoryAlertsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getAlertIcon = (type: string) => {
    return <AlertTriangle className="w-5 h-5" />;
  };

  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Aucune alerte active
          </h3>
          <p className="text-green-600">
            Tous vos produits sont en bon état de stock 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="w-5 h-5" />
            Alertes Actives ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-2 ${getSeverityColor(alert.severity)} ${
                alert.is_read ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getAlertIcon(alert.alert_type)}
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    {!alert.is_read && (
                      <Badge variant="outline" className="bg-white">
                        Nouveau
                      </Badge>
                    )}
                  </div>
                  
                  <p className="font-semibold mb-1">
                    {alert.message}
                  </p>
                  
                  {alert.product && (
                    <p className="text-sm opacity-80">
                      Produit: {alert.product.name}
                      {alert.product.sku && ` (${alert.product.sku})`}
                    </p>
                  )}
                  
                  <p className="text-xs opacity-70 mt-2">
                    {new Date(alert.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {!alert.is_read && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMarkAsRead(alert.id)}
                      className="whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Marquer lu
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => onResolve(alert.id)}
                    className="whitespace-nowrap"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Résoudre
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}