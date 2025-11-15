/**
 * 👷 TRAVAILLEUR DASHBOARD - Module en construction
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function TravailleurDashboard() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Module Travailleur en Construction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ce module nécessite la migration de la base de données pour les tables :
            travailleurs, motos, alertes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
