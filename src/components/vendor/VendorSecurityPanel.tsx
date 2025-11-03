import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useVendorSecurity } from '@/hooks/useVendorSecurity';
import { Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw, FileCheck } from 'lucide-react';

export function VendorSecurityPanel() {
  const { kyc, trustScore, suspiciousActivities, loading, calculateTrustScore } = useVendorSecurity();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getKYCStatusBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Vérifié</Badge>;
      case 'under_review':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1" />En cours</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Trust Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Score de Confiance</h2>
          </div>
          <Button variant="outline" size="sm" onClick={calculateTrustScore}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recalculer
          </Button>
        </div>

        {trustScore ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(trustScore.score)}`}>
                {trustScore.score}/100
              </div>
              <Progress value={trustScore.score} className="mt-4" />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{trustScore.successful_orders}</p>
                <p className="text-sm text-muted-foreground">Commandes réussies</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{trustScore.total_sales}</p>
                <p className="text-sm text-muted-foreground">Total ventes</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{trustScore.cancelled_orders}</p>
                <p className="text-sm text-muted-foreground">Annulations</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{trustScore.account_age_days}</p>
                <p className="text-sm text-muted-foreground">Jours d'ancienneté</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Score non calculé. Cliquez sur "Recalculer" pour générer votre score.
          </p>
        )}
      </Card>

      {/* KYC Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Vérification d'Identité (KYC)</h2>
          </div>
          {getKYCStatusBadge(kyc?.status)}
        </div>

        {kyc ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span>Téléphone vérifié</span>
              {kyc.phone_verified ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            {kyc.phone_number && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Numéro</span>
                <span className="font-mono">{kyc.phone_number}</span>
              </div>
            )}
            {kyc.id_document_type && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Document</span>
                <span>{kyc.id_document_type}</span>
              </div>
            )}
            {kyc.status === 'rejected' && kyc.rejection_reason && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{kyc.rejection_reason}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Vérifiez votre identité pour augmenter votre score de confiance
            </p>
            <Button>Commencer la vérification</Button>
          </div>
        )}
      </Card>

      {/* Suspicious Activities */}
      {suspiciousActivities.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold">Activités Suspectes</h2>
            <Badge variant="destructive">{suspiciousActivities.length}</Badge>
          </div>

          <div className="space-y-2">
            {suspiciousActivities.map((activity) => (
              <div key={activity.id} className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={
                    activity.severity === 'critical' ? 'destructive' : 
                    activity.severity === 'high' ? 'destructive' :
                    'secondary'
                  }>
                    {activity.severity.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <p className="text-sm">{activity.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
