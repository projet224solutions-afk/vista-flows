/**
 * COMPOSANT AFFICHAGE DES GAINS
 * Stats de revenus du livreur
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, Calendar, DollarSign } from 'lucide-react';

interface EarningsDisplayProps {
  totalEarnings: number;
  todayEarnings: number;
  todayDeliveries: number;
  weekEarnings: number;
  weekDeliveries: number;
  monthEarnings: number;
  monthDeliveries: number;
}

export function EarningsDisplay({
  totalEarnings,
  todayEarnings,
  todayDeliveries,
  weekEarnings,
  weekDeliveries,
  monthEarnings,
  monthDeliveries,
}: EarningsDisplayProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Gains */}
      <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            Gains Totaux
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {totalEarnings.toLocaleString()} GNF
          </div>
        </CardContent>
      </Card>

      {/* Aujourd'hui */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Aujourd'hui
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {todayEarnings.toLocaleString()} GNF
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <Package className="h-3 w-3 inline mr-1" />
            {todayDeliveries} livraisons
          </p>
        </CardContent>
      </Card>

      {/* Cette Semaine */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Cette Semaine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {weekEarnings.toLocaleString()} GNF
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <Package className="h-3 w-3 inline mr-1" />
            {weekDeliveries} livraisons
          </p>
        </CardContent>
      </Card>

      {/* Ce Mois */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            Ce Mois
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {monthEarnings.toLocaleString()} GNF
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <Package className="h-3 w-3 inline mr-1" />
            {monthDeliveries} livraisons
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
