/**
 * Badge de statut KYC pour les Bureaux Syndicats
 * Affiche le statut de vÃ©rification du bureau
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
    // Ne rien faire pour l'instant, la vÃ©rification KYC se fait dans l'onglet Settings du dashboard
    // Le badge est informatif uniquement
  };

  if (status === 'verified') {
    return (
      <Badge className={`bg-gradient-to-br from-primary-blue-500 to-primary-orange-500 hover:bg-primary-orange-600 text-white gap-1 ${className}`}>
        <ShieldCheck className="w-3 h-3" />
        Bureau vÃ©rifiÃ©
      </Badge>
    );
  }

  if (status === 'pending') {
    return (
      <Badge className={`bg-yellow-500 hover:bg-yellow-600 text-white gap-1 ${className}`}>
        <Shield className="w-3 h-3" />
        VÃ©rification en cours...
      </Badge>
    );
  }

  if (status === 'rejected') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge className="bg-red-500 hover:bg-red-600 text-white gap-1">
          <ShieldAlert className="w-3 h-3" />
          VÃ©rification rejetÃ©e
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={handleVerifyClick}
          className="text-xs h-7"
        >
          RÃ©essayer
        </Button>
      </div>
    );
  }

  // unverified
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="w-3 h-3" />
        Bureau non vÃ©rifiÃ©
      </Badge>
      <Button
        size="sm"
        variant="outline"
        onClick={handleVerifyClick}
        className="text-xs h-7"
      >
        VÃ©rifier maintenant
      </Button>
    </div>
  );
}
