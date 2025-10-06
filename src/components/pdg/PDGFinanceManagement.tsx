/**
 * Stub temporaire pour PDGFinanceManagement
 * Le système de gestion financière sera réimplémenté ultérieurement
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function PDGFinanceManagement() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Gestion Financière
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Module de gestion financière en cours de développement
        </div>
      </CardContent>
    </Card>
  );
}
