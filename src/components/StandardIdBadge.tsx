/**
 * 🆔 COMPOSANT: BADGE ID STANDARDISÉ
 * Affiche un ID au format AAA0001 avec style et copyable
 */

import { Badge } from '@/components/ui/badge';
import { Hash, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StandardIdBadgeProps {
  standardId: string | null | undefined;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  copyable?: boolean;
  className?: string;
}

/**
 * Badge pour afficher les IDs standardisés 224SOLUTIONS
 */
export function StandardIdBadge({
  standardId,
  variant = 'default',
  size = 'md',
  showIcon = true,
  copyable = true,
  className
}: StandardIdBadgeProps) {
  const [copied, setCopied] = useState(false);

  const formattedId = standardId ? standardId.toUpperCase().trim() : '';

  const handleCopy = async () => {
    if (!formattedId || !copyable) return;

    try {
      await navigator.clipboard.writeText(formattedId);
      setCopied(true);
      toast.success('ID copié', {
        description: formattedId
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Échec copie ID');
    }
  };

  if (!formattedId) {
    return (
      <Badge variant="outline" className={className}>
        <Hash className="w-3 h-3 mr-1" />
        N/A
      </Badge>
    );
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  // Extraire préfixe (4 chiffres) et lettres (3 lettres) pour styling
  const prefix = formattedId.substring(0, 4); // 0002
  const letters = formattedId.substring(4);     // ABC

  return (
    <Badge
      variant={variant}
      className={cn(
        'font-mono font-semibold tracking-wide',
        sizeClasses[size],
        copyable && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={handleCopy}
    >
      {showIcon && <Hash className="w-3 h-3 mr-1" />}
      <span className="text-primary font-bold">{prefix}</span>
      <span className="text-muted-foreground">{letters}</span>
      {copyable && (
        copied ? (
          <Check className="w-3 h-3 ml-1 text-green-500" />
        ) : (
          <Copy className="w-3 h-3 ml-1 opacity-50" />
        )
      )}
    </Badge>
  );
}

export default StandardIdBadge;
