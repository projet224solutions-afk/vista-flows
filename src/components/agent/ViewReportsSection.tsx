import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Package, DollarSign } from 'lucide-react';

interface ViewReportsSectionProps {
  agentId: string;
  agentData: {
    total_users_created?: number;
    total_commissions_earned?: number;
    commission_rate: number;
  };
}

export function ViewReportsSection({ agentId, agentData }: ViewReportsSectionProps) {
  const [stats] = useState({
    usersThisMonth: 0,
    productsAdded: 0,
    commissionsThisMonth: 0,
    totalRevenue: 0,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Rapports et Statistiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Utilisateurs Créés</span>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold">{agentData.total_users_created || 0}</div>
                  <p className="text-xs text-muted-foreground">Total depuis le début</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Taux Commission</span>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold">{agentData.commission_rate}%</div>
                  <p className="text-xs text-muted-foreground">Taux appliqué</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Commissions</span>
                    <DollarSign className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold">
                    {(agentData.total_commissions_earned || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">GNF gagnés</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Produits</span>
                    <Package className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold">{stats.productsAdded}</div>
                  <p className="text-xs text-muted-foreground">Produits ajoutés</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphique des performances */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Performance Mensuelle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Utilisateurs créés ce mois</span>
                    <span className="font-semibold">{stats.usersThisMonth}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: '0%' }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Commissions ce mois</span>
                    <span className="font-semibold">{stats.commissionsThisMonth.toLocaleString()} GNF</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: '0%' }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
