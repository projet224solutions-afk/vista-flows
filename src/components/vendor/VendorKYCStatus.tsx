/**
 * Badge KYC Status pour interface vendeur
 * Affiche le statut de vérification KYC dans le header
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VendorKYCStatusProps {
  kycStatus: 'verified' | 'pending' | 'rejected' | 'unverified' | null;
  className?: string;
}

export function VendorKYCStatus({ kycStatus, className = "" }: VendorKYCStatusProps) {
  const navigate = useNavigate();

  if (kycStatus === 'verified') {
    return (
      <Badge 
        variant="default" 
        className={`bg-green-100 text-green-800 border-green-300 gap-1 ${className}`}
      >
        <ShieldCheck className="w-3 h-3" />
        KYC Vérifié
      </Badge>
    );
  }

  if (kycStatus === 'pending') {
    return (
      <Badge 
        variant="default" 
        className={`bg-yellow-100 text-yellow-800 border-yellow-300 gap-1 ${className}`}
      >
        <Shield className="w-3 h-3" />
        KYC En cours
      </Badge>
    );
  }

  if (kycStatus === 'rejected') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="destructive" className="gap-1">
          <ShieldAlert className="w-3 h-3" />
          KYC Refusé
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/vendeur/settings?tab=kyc')}
          className="h-7 text-xs"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  // unverified or null
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="w-3 h-3" />
        KYC Non vérifié
      </Badge>
      <Button
        size="sm"
        variant="default"
        onClick={() => navigate('/vendeur/settings?tab=kyc')}
        className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
      >
        Vérifier maintenant
      </Button>
    </div>
  );
}
