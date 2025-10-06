/**
 * Stub temporaire pour WalletDashboard
 * Le système de wallet sera réimplémenté ultérieurement
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function WalletDashboard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Wallet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Module wallet en cours de développement
        </div>
      </CardContent>
    </Card>
  );
}
