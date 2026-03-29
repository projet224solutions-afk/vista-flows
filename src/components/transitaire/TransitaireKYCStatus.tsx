/**
 * Badge de statut KYC pour les Transitaires Internationaux
 * Affiche le statut de vÃ©rification du transitaire
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Shield, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TransitaireKYCStatusProps {
  status?: 'verified' | 'pending' | 'rejected' | 'unverified';
  className?: string;
}

export function TransitaireKYCStatus({ 
  status = 'unverified', 
  className = '' 
}: TransitaireKYCStatusProps) {
  const navigate = useNavigate();

  const handleVerifyClick = () => {
    // Navigate vers la page de vÃ©rification KYC du transitaire
    navigate('/transitaire/settings?tab=kyc');
  };

  // verified - Transitaire vÃ©rifiÃ©
  if (status === 'verified') {
    return (
      <Badge className={`bg-gradient-to-br from-primary-blue-500 to-primary-orange-500 hover:bg-primary-orange-600 text-white gap-1 ${className}`}>
        <ShieldCheck className="w-3 h-3" />
        Transitaire certifiÃ©
      </Badge>
    );
  }

  // pending - VÃ©rification en cours
  if (status === 'pending') {
    return (
      <Badge className={`bg-yellow-500 hover:bg-yellow-600 text-white gap-1 ${className}`}>
        <Shield className="w-3 h-3" />
        Certification en cours...
      </Badge>
    );
  }

  // rejected - VÃ©rification rejetÃ©e
  if (status === 'rejected') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge className="bg-red-500 hover:bg-red-600 text-white gap-1">
          <ShieldAlert className="w-3 h-3" />
          Certification rejetÃ©e
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

  // unverified - Par dÃ©faut, non vÃ©rifiÃ©
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="w-3 h-3" />
        Transitaire non certifiÃ©
      </Badge>
      <Button
        size="sm"
        variant="outline"
        onClick={handleVerifyClick}
        className="text-xs h-7"
      >
        Certifier maintenant
      </Button>
    </div>
  );
}
