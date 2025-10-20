// ⚠️ Liste des alertes de sécurité
import React from 'react';
import { Bell, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SecurityAlert } from '@/hooks/useSecurityOps';

interface Props {
  alerts: SecurityAlert[];
  onAcknowledge: (id: string) => void;
}

export const SecurityAlertsList: React.FC<Props> = ({ alerts, onAcknowledge }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-bold">Alertes de Sécurité</h3>
        <p className="text-muted-foreground">Alertes temps réel nécessitant attention</p>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className={!alert.is_acknowledged ? 'border-yellow-500' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {alert.is_acknowledged ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />
                  )}
                  <div>
                    <CardTitle className="text-base">{alert.message}</CardTitle>
                    <CardDescription className="mt-1">
                      {alert.alert_type} • {new Date(alert.created_at).toLocaleString('fr-FR')}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  {!alert.is_acknowledged && (
                    <Button size="sm" variant="outline" onClick={() => onAcknowledge(alert.id)}>
                      <Check className="h-4 w-4 mr-1" />
                      Reconnaître
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {alert.auto_action_taken && (
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">Action Auto</Badge>
                  <span className="text-muted-foreground">{alert.auto_action_taken}</span>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        {alerts.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Aucune alerte active</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
