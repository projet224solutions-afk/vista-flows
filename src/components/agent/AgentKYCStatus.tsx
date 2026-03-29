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

  // Agent vÃ©rifiÃ©
  if (kyc_status === 'verified') {
    return (
      <Badge variant="default" className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500 hover:bg-primary-orange-600 gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Compte vÃ©rifiÃ©</span>
      </Badge>
    );
  }

  // VÃ©rification en cours
  if (kyc_status === 'pending') {
    return (
      <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 gap-1.5">
        <Shield className="h-3.5 w-3.5" />
        <span>VÃ©rification en cours...</span>
      </Badge>
    );
  }

  // RejetÃ©
  if (kyc_status === 'rejected') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>VÃ©rifiÃ© rejetÃ©</span>
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={handleVerifyClick}
          className="h-7 text-xs"
        >
          RÃ©essayer
        </Button>
      </div>
    );
  }

  // Non vÃ©rifiÃ© (dÃ©faut)
  return (
    <div className="flex items-center gap-2">
      <Badge variant="destructive" className="gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>Non vÃ©rifiÃ©</span>
      </Badge>
      <Button
        size="sm"
        variant="outline"
        onClick={handleVerifyClick}
        className="h-7 text-xs"
      >
        VÃ©rifier maintenant
      </Button>
    </div>
  );
};
