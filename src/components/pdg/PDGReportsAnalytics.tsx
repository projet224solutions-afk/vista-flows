/**
 * 📊 RAPPORTS & ANALYTIQUES - 224SOLUTIONS
 * Interface simplifiée de génération et consultation des rapports pour PDG
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertTriangle, Download, TrendingUp } from 'lucide-react';

export default function PDGReportsAnalytics() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rapports & Analytiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Module en construction. Nécessite des tables supplémentaires dans la base de données.
            </AlertDescription>
          </Alert>
          
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rapports mensuels</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rapports trimestriels</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rapports annuels</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <Download className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
