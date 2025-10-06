/**
 * Stub temporaire pour CommunicationModule
 * Le système de communication sera réimplémenté ultérieurement
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function CommunicationModule() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Module Communication
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Module de communication en cours de développement
        </div>
      </CardContent>
    </Card>
  );
}
