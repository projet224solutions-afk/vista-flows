/**
 * AGENT KYC STATUS BADGE - 224SOLUTIONS
 * Badge de statut KYC pour l'interface agent
 */

import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Shield, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AgentKYCStatusProps {
  kyc_status?: 'verified' | 'pending' | 'rejected' | 'unverified';
}

export const AgentKYCStatus = ({ kyc_status = 'unverified' }: AgentKYCStatusProps) => {
  const navigate = useNavigate();

  const handleVerifyClick = () => {
    navigate('/agent/settings?tab=kyc');
  };

  // Agent vérifié
  if (kyc_status === 'verified') {
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600 gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Compte vérifié</span>
      </Badge>
    );
  }

  // Vérification en cours
  if (kyc_status === 'pending') {
    return (
      <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 gap-1.5">
        <Shield className="h-3.5 w-3.5" />
        <span>Vérification en cours...</span>
      </Badge>
    );
  }

  // Rejeté
  if (kyc_status === 'rejected') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Vérifié rejeté</span>
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={handleVerifyClick}
          className="h-7 text-xs"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  // Non vérifié (défaut)
  return (
    <div className="flex items-center gap-2">
      <Badge variant="destructive" className="gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>Non vérifié</span>
      </Badge>
      <Button
        size="sm"
        variant="outline"
        onClick={handleVerifyClick}
        className="h-7 text-xs"
      >
        Vérifier maintenant
      </Button>
    </div>
  );
};
