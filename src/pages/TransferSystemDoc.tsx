/**
 * PAGE DE DOCUMENTATION DU SYSTÈME DE TRANSFERT UNIFIÉ
 * Explique comment utiliser les nouveaux composants et fonctions
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Code, Database, Zap } from "lucide-react";

export default function TransferSystemDoc() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Zap className="w-8 h-8 text-primary" />
              Système de Transfert Wallet Unifié
            </CardTitle>
            <CardDescription>
              Documentation complète du nouveau système de transfert standardisé
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Vue d'ensemble */}
        <Card>
          <CardHeader>
            <CardTitle>✨ Vue d'ensemble</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Le nouveau système de transfert unifié résout tous les problèmes d'incohérence des IDs 
              et standardise les transferts wallet dans toute l'application.
            </p>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Avantages clés :</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Recherche automatique dans tous les types d'IDs (custom_id, public_id)</li>
                  <li>Prévisualisation complète avec frais avant confirmation</li>
                  <li>Application correcte des frais de transfert</li>
                  <li>Interface unifiée dans toute l'application</li>
                  <li>Gestion d'erreurs améliorée</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Fonctions RPC */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Fonctions RPC Créées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <Badge variant="default" className="mb-2">find_user_by_code</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Trouve un utilisateur depuis n'importe quel type de code (custom_id ou public_id)
                </p>
                <pre className="text-xs mt-2 p-2 bg-background rounded">
{`SELECT find_user_by_code('USR0001');
-- Retourne: UUID de l'utilisateur`}
                </pre>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <Badge variant="default" className="mb-2">preview_wallet_transfer_by_code</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Prévisualise un transfert avec calcul des frais et vérifications
                </p>
                <pre className="text-xs mt-2 p-2 bg-background rounded overflow-x-auto">
{`SELECT preview_wallet_transfer_by_code(
  'USR0001',  -- Code expéditeur
  'USR0002',  -- Code destinataire
  10000,      -- Montant
  'GNF'       -- Devise
);`}
                </pre>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <Badge variant="default" className="mb-2">process_wallet_transfer_with_fees</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Exécute le transfert avec application automatique des frais
                </p>
                <pre className="text-xs mt-2 p-2 bg-background rounded overflow-x-auto">
{`SELECT process_wallet_transfer_with_fees(
  'USR0001',           -- Code expéditeur
  'USR0002',           -- Code destinataire
  10000,               -- Montant
  'GNF',               -- Devise
  'Paiement produit'   -- Description
);`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Composants React */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Composants React
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <Badge variant="default" className="mb-2">UnifiedTransferDialog</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Composant principal de transfert avec prévisualisation
                </p>
                <pre className="text-xs mt-2 p-2 bg-background rounded overflow-x-auto">
{`import { UnifiedTransferDialog } from '@/components/wallet/UnifiedTransferDialog';

<UnifiedTransferDialog
  senderCode="USR0001"
  variant="default"
  size="default"
  showText={true}
  onSuccess={() => console.log('Transfert réussi !')}
/>`}
                </pre>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <Badge variant="default" className="mb-2">QuickTransferButton</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Bouton de transfert rapide (utilise UnifiedTransferDialog en interne)
                </p>
                <pre className="text-xs mt-2 p-2 bg-background rounded overflow-x-auto">
{`import { QuickTransferButton } from '@/components/wallet/QuickTransferButton';

<QuickTransferButton
  variant="outline"
  size="sm"
  showText={true}
/>`}
                </pre>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <Badge variant="default" className="mb-2">useUserCode</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Hook pour récupérer le code ID de l'utilisateur connecté
                </p>
                <pre className="text-xs mt-2 p-2 bg-background rounded overflow-x-auto">
{`import { useUserCode } from '@/hooks/useUserCode';

function MyComponent() {
  const { userCode, loading } = useUserCode();
  
  if (loading) return <div>Chargement...</div>;
  if (!userCode) return <div>Pas de code</div>;
  
  return <div>Votre code: {userCode}</div>;
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Format des IDs */}
        <Card>
          <CardHeader>
            <CardTitle>🔢 Format des IDs Acceptés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Le système accepte automatiquement ces formats :</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><Badge variant="outline" className="font-mono">USR0001</Badge> - Custom ID clients (table user_ids)</li>
                <li><Badge variant="outline" className="font-mono">USR0002</Badge> - Public ID (table profiles)</li>
                <li><Badge variant="outline" className="font-mono">VND0001</Badge> - Custom ID vendeurs</li>
                <li><Badge variant="outline" className="font-mono">PDG0001</Badge> - Custom ID PDG</li>
                <li><Badge variant="outline" className="font-mono">DRV0001</Badge> - Custom ID chauffeurs</li>
              </ul>
              <Alert className="mt-4">
                <AlertDescription>
                  Le système cherche automatiquement dans user_ids.custom_id, profiles.custom_id, 
                  puis profiles.public_id jusqu'à trouver une correspondance.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Migration */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-600 dark:text-green-400">
              ✅ Migration Effectuée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Les fonctions RPC ont été créées et sont prêtes à l'emploi. Tous les composants de transfert 
              ont été mis à jour pour utiliser ce nouveau système unifié.
            </p>
          </CardContent>
        </Card>

        {/* Prochaines étapes */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 Test du Système</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Pour tester :</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Connectez-vous avec un compte qui a du solde</li>
              <li>Cliquez sur le bouton "Transfert rapide"</li>
              <li>Entrez un code destinataire (USR0001, USR0002, etc.)</li>
              <li>Vérifiez que les informations s'affichent correctement</li>
              <li>Confirmez le transfert</li>
            </ol>
            
            <Alert className="mt-4">
              <AlertDescription>
                <strong>Code de test disponible :</strong> USR0001 (Thierno Bah)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
