/**
 * Dashboard pour sous-agents (version simplifiée)
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, AlertTriangle } from 'lucide-react';

export default function SubAgentDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Dashboard Sous-Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Module en construction. Nécessite des tables supplémentaires dans la base de données.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
