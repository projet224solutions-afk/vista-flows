import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAutoId } from "@/hooks/useAutoId";
import { RoleType } from "@/lib/autoIdGenerator";
import { AutoIdDisplay } from "./AutoIdDisplay";

interface AutoIdGeneratorProps {
  roleType: RoleType;
  onIdGenerated?: (id: string) => void;
  initialId?: string;
  showCard?: boolean;
}

/**
 * Composant de génération manuelle d'ID
 * Peut être intégré dans n'importe quel formulaire
 */
export function AutoIdGenerator({ 
  roleType, 
  onIdGenerated,
  initialId,
  showCard = true 
}: AutoIdGeneratorProps) {
  const { id, loading, generateId, setId } = useAutoId(roleType, false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (initialId) {
      setId(initialId);
    }
  }, [initialId]);

  const handleGenerate = async () => {
    const newId = await generateId();
    if (newId) {
      toast.success(`ID généré: ${newId}`);
      if (onIdGenerated) {
        onIdGenerated(newId);
      }
    }
  };

  const handleCopy = async () => {
    if (!id) return;
    
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success('ID copié');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {id ? (
            <AutoIdDisplay id={id} roleType={roleType} showCopy={false} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun ID généré
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {id && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              disabled={!id}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {id ? 'Regénérer' : 'Générer ID'}
          </Button>
        </div>
      </div>
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Génération d'ID automatique</CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
