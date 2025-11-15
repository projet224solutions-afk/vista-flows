import { UserCustomIdDisplay } from '@/components/wallet/UserCustomIdDisplay';
import { UniversalWalletTransactions } from '@/components/wallet/UniversalWalletTransactions';
import { QuickTransferButton } from '@/components/wallet/QuickTransferButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export default function WalletTest() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Système de Wallet 224Solutions</h1>
          <p className="text-muted-foreground">
            Testez le système de transfert entre utilisateurs avec les codes d'identification
          </p>
        </div>

        <Alert className="mb-6">
          <InfoIcon className="w-4 h-4" />
          <AlertTitle>Comment ça marche ?</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Copiez votre code d'identification personnel</li>
              <li>Partagez-le avec d'autres utilisateurs pour recevoir des paiements</li>
              <li>Pour envoyer de l'argent, utilisez le code du destinataire</li>
              <li>Tous les transferts sont sécurisés et instantanés</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Affichage du custom ID */}
        <div className="mb-6">
          <UserCustomIdDisplay />
        </div>

        {/* Bouton de transfert rapide */}
        <div className="mb-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Transfert rapide</CardTitle>
              <CardDescription>
                Envoyez de l'argent rapidement avec un code d'identification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuickTransferButton 
                variant="default" 
                size="lg" 
                className="w-full"
                showText
              />
            </CardContent>
          </Card>
        </div>

        {/* Panel de transactions complet */}
        <UniversalWalletTransactions />

        {/* Codes de test disponibles */}
        <Card className="mt-6 shadow-elegant">
          <CardHeader>
            <CardTitle>Codes de Test Disponibles</CardTitle>
            <CardDescription>
              Utilisez ces codes pour tester les transferts entre utilisateurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Code: <span className="font-mono text-lg">GAD6447</span></p>
                <p className="text-xs text-muted-foreground">yoyotog2@gmail.com</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Code: <span className="font-mono text-lg">IBQ0815</span></p>
                <p className="text-xs text-muted-foreground">limatiktok224@gmail.com</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Code: <span className="font-mono text-lg">XFA4052</span></p>
                <p className="text-xs text-muted-foreground">projet224solutions@gmail.com</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Code: <span className="font-mono text-lg">QQC4114</span></p>
                <p className="text-xs text-muted-foreground">edreamscompagnie@gmail.com</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
