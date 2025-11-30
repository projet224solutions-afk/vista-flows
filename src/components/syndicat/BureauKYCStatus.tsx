/**
 * Badge de statut KYC pour les Bureaux Syndicats
 * Affiche le statut de vérification du bureau
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Shield, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BureauKYCStatusProps {
  status: 'verified' | 'pending' | 'rejected' | 'unverified';
  bureauId?: string;
  className?: string;
}

export function BureauKYCStatus({ status, bureauId, className }: BureauKYCStatusProps) {
  const navigate = useNavigate();

  const handleVerifyClick = () => {
    if (bureauId) {
      // Navigate vers la page de vérification KYC du bureau
      navigate(`/bureau/${bureauId}/settings?tab=kyc`);
    }
  };

  if (status === 'verified') {
    return (
      <Badge className={`bg-green-500 hover:bg-green-600 text-white gap-1 ${className}`}>
        <ShieldCheck className="w-3 h-3" />
        Bureau vérifié
      </Badge>
    );
  }

  if (status === 'pending') {
    return (
      <Badge className={`bg-yellow-500 hover:bg-yellow-600 text-white gap-1 ${className}`}>
        <Shield className="w-3 h-3" />
        Vérification en cours...
      </Badge>
    );
  }

  if (status === 'rejected') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge className="bg-red-500 hover:bg-red-600 text-white gap-1">
          <ShieldAlert className="w-3 h-3" />
          Vérification rejetée
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={handleVerifyClick}
          className="text-xs h-7"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  // unverified
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="w-3 h-3" />
        Bureau non vérifié
      </Badge>
      <Button
        size="sm"
        variant="outline"
        onClick={handleVerifyClick}
        className="text-xs h-7"
      >
        Vérifier maintenant
      </Button>
    </div>
  );
}
