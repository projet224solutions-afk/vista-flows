/**
 * COMPOSANT CLIENT KYC STATUS - 224SOLUTIONS
 * Badge de statut de vÃ©rification KYC pour les clients
 * 4 Ã©tats: pending, verified, rejected, incomplete
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export type ClientKYCStatus = 'pending' | 'verified' | 'rejected' | 'incomplete';

interface ClientKYCStatusProps {
  kyc_status?: ClientKYCStatus | null;
  className?: string;
  showIcon?: boolean;
}

export function ClientKYCStatus({ 
  kyc_status = 'incomplete', 
  className = '',
  showIcon = true 
}: ClientKYCStatusProps) {
  const status = kyc_status || 'incomplete';

  const statusConfig: Record<ClientKYCStatus, {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
    icon: React.ReactNode;
  }> = {
    verified: {
      label: 'Client VÃ©rifiÃ©',
      variant: 'default',
      className: 'bg-primary-blue-600 hover:bg-primary-orange-600 text-white',
      icon: <CheckCircle className="w-3 h-3 mr-1" />
    },
    pending: {
      label: 'VÃ©rification en cours',
      variant: 'secondary',
      className: 'bg-orange-500 hover:bg-orange-600 text-white',
      icon: <Clock className="w-3 h-3 mr-1" />
    },
    rejected: {
      label: 'VÃ©rification refusÃ©e',
      variant: 'destructive',
      className: 'bg-red-500 hover:bg-red-600 text-white',
      icon: <XCircle className="w-3 h-3 mr-1" />
    },
    incomplete: {
      label: 'Profil incomplet',
      variant: 'outline',
      className: 'bg-gray-500 hover:bg-gray-600 text-white border-0',
      icon: <AlertCircle className="w-3 h-3 mr-1" />
    }
  };

  const config = statusConfig[status];

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className}`}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}

// Variante compacte pour les espaces rÃ©duits
export function ClientKYCStatusCompact({ 
  kyc_status = 'incomplete', 
  className = '' 
}: ClientKYCStatusProps) {
  const status = kyc_status || 'incomplete';

  const iconMap: Record<ClientKYCStatus, React.ReactNode> = {
    verified: <CheckCircle className="w-4 h-4 text-primary-orange-500" />,
    pending: <Clock className="w-4 h-4 text-orange-500" />,
    rejected: <XCircle className="w-4 h-4 text-red-500" />,
    incomplete: <AlertCircle className="w-4 h-4 text-gray-500" />
  };

  return (
    <div className={`inline-flex ${className}`} title={`Statut: ${status}`}>
      {iconMap[status]}
    </div>
  );
}
