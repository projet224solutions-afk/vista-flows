/**
 * 👷 DASHBOARD TRAVAILLEUR - TEMPORAIREMENT DÉSACTIVÉ
 * Interface pour les travailleurs
 * 
 * RAISON: Tables manquantes dans la base de données (motos, alertes)
 * TODO: Créer les migrations nécessaires pour activer cette fonctionnalité
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function TravailleurDashboard() {
  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            Dashboard Travailleur - En Construction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Cette fonctionnalité nécessite la création de tables supplémentaires dans la base de données :
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><code className="bg-muted px-2 py-1 rounded">motos</code> - Gestion des motos</li>
              <li><code className="bg-muted px-2 py-1 rounded">alertes</code> - Système d'alertes</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              Contactez l'administrateur système pour activer cette fonctionnalité.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
