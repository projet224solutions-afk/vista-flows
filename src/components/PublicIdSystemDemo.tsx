/**
 * 🔧 COMPOSANT DÉMO: SYSTÈME D'ID PUBLIC
 * Démonstrateur du système de génération d'IDs uniques
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePublicId } from '@/hooks/usePublicId';
import { PublicIdBadge } from '@/components/PublicIdBadge';
import { PublicIdInput } from '@/components/PublicIdInput';
import { Loader2, Sparkles, Database, Hash } from 'lucide-react';
import { toast } from 'sonner';

export function PublicIdSystemDemo() {
  const { generatePublicId, generateBatchPublicIds, validatePublicId, loading } = usePublicId();
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const [inputId, setInputId] = useState('');

  const handleGenerateSingle = async () => {
    const id = await generatePublicId('demo', true);
    if (id) {
      setGeneratedIds(prev => [id, ...prev].slice(0, 10));
    }
  };

  const handleGenerateBatch = async () => {
    toast.info('Génération de 5 IDs...');
    const ids = await generateBatchPublicIds('demo', 5);
    if (ids.length > 0) {
      setGeneratedIds(prev => [...ids, ...prev].slice(0, 10));
      toast.success(`${ids.length} IDs générés !`);
    }
  };

  const handleValidateInput = () => {
    const isValid = validatePublicId(inputId);
    if (isValid) {
      toast.success(`ID valide: ${inputId}`);
    } else {
      toast.error('Format d\'ID invalide');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Système d'ID Unique LLLDDDD
        </CardTitle>
        <CardDescription>
          Génération automatique d'identifiants uniques au format 3 lettres + 4 chiffres
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Génération d'IDs */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Génération d'IDs
          </h3>
          
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateSingle}
              disabled={loading}
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                'Générer 1 ID'
              )}
            </Button>
            
            <Button
              onClick={handleGenerateBatch}
              disabled={loading}
              variant="outline"
            >
              Générer 5 IDs
            </Button>
          </div>

          {/* Liste des IDs générés */}
          {generatedIds.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="w-4 h-4" />
                <span>IDs générés ({generatedIds.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {generatedIds.map((id, index) => (
                  <PublicIdBadge
                    key={`${id}-${index}`}
                    publicId={id}
                    variant="secondary"
                    size="md"
                    copyable={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Validation d'ID */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold">Validation d'ID</h3>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <PublicIdInput
                value={inputId}
                onChange={setInputId}
                label=""
                placeholder="ABC1234"
                showValidation={true}
              />
            </div>
            <Button
              onClick={handleValidateInput}
              disabled={!inputId}
              variant="outline"
              className="mt-auto"
            >
              Valider
            </Button>
          </div>
        </div>

        {/* Informations */}
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg text-sm">
          <p className="font-semibold">Format: LLLDDDD</p>
          <ul className="space-y-1 text-muted-foreground ml-4">
            <li>• 3 lettres majuscules (A-Z, sans I, L, O)</li>
            <li>• 4 chiffres (0-9)</li>
            <li>• Exemples valides: ABC1234, XYZ9876, DEF5432</li>
            <li>• Exemples invalides: ABC123, AB1234, ILO1234</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default PublicIdSystemDemo;
