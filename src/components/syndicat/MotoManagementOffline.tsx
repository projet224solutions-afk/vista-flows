/**
 * GESTION DES MOTOS AVEC MODE HORS LIGNE
 * Extension du tableau de gestion avec support offline
 * 224SOLUTIONS - Bureau Syndicat
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StolenMotoReportButton from './StolenMotoReportButton';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Props {
  moto: any;
  bureauName: string;
  bureauLocation: string;
  onUpdate?: () => void;
}

export default function MotoManagementOffline({ moto, bureauName, bureauLocation, onUpdate }: Props) {
  const getSyncBadge = () => {
    if (moto.synced_from_firestore || moto.synced_from_supabase) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Synchronisé
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        En attente de sync
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {getSyncBadge()}
      <StolenMotoReportButton 
        moto={moto}
        bureauName={bureauName}
        bureauLocation={bureauLocation}
      />
    </div>
  );
}
