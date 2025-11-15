/**
 * 🏛️ GESTION SYNDICATS - 224SOLUTIONS  
 * Interface simplifiée de gestion des bureaux syndicaux pour PDG
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, AlertTriangle } from 'lucide-react';

export default function PDGSyndicatManagement() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Gestion Bureaux Syndicaux
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Module en construction. Nécessite les tables bureaux_syndicaux, travailleurs et motos dans la base de données.
            </AlertDescription>
          </Alert>
          
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bureaux syndicaux</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
