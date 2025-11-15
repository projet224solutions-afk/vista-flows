/**
 * 🔗 ACTIVATION UTILISATEUR - Module temporairement désactivé
 * Nécessite les tables: agent_users, agent_audit_logs
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function UserActivation() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Module Activation Utilisateur Temporairement Désactivé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ce module nécessite la migration de la base de données pour les tables :
            agent_users, agent_audit_logs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
