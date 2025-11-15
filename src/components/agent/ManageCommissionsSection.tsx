import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Commission {
  id: string;
  amount: number;
  date: string;
  status: string;
  description?: string;
}

interface ManageCommissionsSectionProps {
  agentId: string;
  totalCommissions: number;
  commissionRate: number;
}

export function ManageCommissionsSection({ 
  agentId, 
  totalCommissions, 
  commissionRate 
}: ManageCommissionsSectionProps) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommissions();
  }, [agentId]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      // Simulation de données de commissions (à remplacer par des vraies données)
      setCommissions([]);
    } catch (error) {
      console.error('Erreur chargement commissions:', error);
      toast.error('Erreur lors du chargement des commissions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Commissions</span>
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {totalCommissions.toLocaleString()} GNF
              </div>
              <p className="text-xs text-muted-foreground">Depuis le début</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taux Commission</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{commissionRate}%</div>
              <p className="text-xs text-muted-foreground">Taux actuel</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ce Mois</span>
                <Calendar className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-purple-600">0 GNF</div>
              <p className="text-xs text-muted-foreground">Commissions du mois</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Historique des Commissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Aucune commission pour le moment</p>
              <p className="text-sm mt-2">Les commissions apparaîtront ici dès que vous créerez des utilisateurs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commissions.map((commission) => (
                <Card key={commission.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">{commission.amount.toLocaleString()} GNF</p>
                        {commission.description && (
                          <p className="text-sm text-muted-foreground">{commission.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(commission.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                        {commission.status === 'paid' ? 'Payé' : 'En attente'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
