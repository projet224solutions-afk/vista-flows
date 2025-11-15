import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CommissionsManagement() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Gagné</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              0 GNF
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              0 commissions au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <DollarSign className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              0 GNF
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              À payer prochainement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payées</CardTitle>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              0 GNF
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Commissions versées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              0%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Commission par vente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Required Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Système de Commissions</AlertTitle>
        <AlertDescription>
          Le système de suivi des commissions est en cours de configuration. 
          Les commissions seront automatiquement calculées et affichées ici une fois le système activé.
          <br /><br />
          <strong>Fonctionnalités prévues :</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Calcul automatique des commissions sur les ventes</li>
            <li>Historique détaillé des gains</li>
            <li>Suivi des paiements en temps réel</li>
            <li>Export des rapports de commissions</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Placeholder for future commissions list */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Commissions</CardTitle>
          <CardDescription>
            Les commissions apparaîtront ici une fois le système activé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune commission enregistrée</p>
            <p className="text-sm mt-2">
              Le système sera bientôt opérationnel
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

