import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, AlertCircle, Clock, CheckCircle, Search, Filter } from 'lucide-react';

export default function SupportTicketsSimple() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Support Tickets - Mode Simplifié
          </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Gestion des Tickets</h3>
              <p className="text-muted-foreground">
              Module en cours de développement. Les fonctionnalités seront disponibles prochainement.
              </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}