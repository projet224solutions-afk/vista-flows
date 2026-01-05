/**
 * PAGE DE TEST - PAIEMENT STRIPE
 * Test complet du système de paiement par carte
 * 224SOLUTIONS
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StripePaymentWrapper } from '@/components/payment/StripePaymentWrapper';
import { WalletDisplay } from '@/components/payment/WalletDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  CreditCard, 
  TestTube, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Info,
  Copy,
  Wallet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function StripePaymentTest() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [testSeller, setTestSeller] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Paramètres de test
  const [amount, setAmount] = useState('50000');
  const [showPayment, setShowPayment] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    step: string;
    status: 'success' | 'error' | 'pending';
    message: string;
    timestamp: Date;
  }>>([]);

  // Charger l'utilisateur actuel
  React.useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        addTestResult('Authentification', 'success', `Connecté en tant que ${user.email}`);
        
        // Chercher un vendeur de test
        await findTestSeller();
      } else {
        addTestResult('Authentification', 'error', 'Utilisateur non connecté');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      addTestResult('Authentification', 'error', 'Erreur lors du chargement utilisateur');
    }
  };

  const findTestSeller = async () => {
    try {
      // Chercher un utilisateur avec role VENDOR
      const { data: vendors, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'vendeur')
        .limit(1);

      if (error) throw error;

      if (vendors && vendors.length > 0) {
        setTestSeller(vendors[0]);
        addTestResult('Vendeur', 'success', `Vendeur trouvé : ${vendors[0].full_name || vendors[0].id}`);
      } else {
        addTestResult('Vendeur', 'error', 'Aucun vendeur trouvé. Créez un utilisateur avec role="VENDOR"');
      }
    } catch (error) {
      console.error('Error finding seller:', error);
      addTestResult('Vendeur', 'error', 'Erreur lors de la recherche du vendeur');
    }
  };

  const addTestResult = (step: string, status: 'success' | 'error' | 'pending', message: string) => {
    setTestResults(prev => [...prev, {
      step,
      status,
      message,
      timestamp: new Date()
    }]);
  };

  const copyTestCard = () => {
    navigator.clipboard.writeText('4242424242424242');
    toast.success('Numéro de carte copié !');
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    addTestResult('Paiement', 'success', `Paiement réussi ! PaymentIntent: ${paymentIntentId}`);
    toast.success('✅ Test de paiement réussi !', {
      description: `PaymentIntent: ${paymentIntentId}`,
      duration: 5000,
    });

    // Vérifier la transaction dans la base de données
    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('stripe_transactions')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .single();

        if (error) throw error;

        if (data) {
          addTestResult('Base de données', 'success', `Transaction trouvée : ${data.id}`);
          addTestResult('Commission', 'success', `Commission calculée : ${data.commission_amount} ${data.currency}`);
          addTestResult('Wallet', 'pending', 'Vérification du wallet en cours...');
          
          // Recharger les wallets pour voir la mise à jour
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking transaction:', error);
        addTestResult('Base de données', 'error', 'Transaction non trouvée en DB');
      }
    }, 1000);
  };

  const handlePaymentError = (error: string) => {
    addTestResult('Paiement', 'error', `Échec du paiement : ${error}`);
    toast.error('❌ Test de paiement échoué', {
      description: error,
      duration: 5000,
    });
  };

  const startTest = () => {
    if (!testSeller) {
      toast.error('Aucun vendeur trouvé. Créez un utilisateur avec role="VENDOR"');
      return;
    }
    setShowPayment(true);
    addTestResult('Test démarré', 'pending', `Montant : ${amount} GNF`);
  };

  const resetTest = () => {
    setShowPayment(false);
    setTestResults([]);
    setAmount('50000');
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <TestTube className="w-8 h-8" />
            <span>Test Paiement Stripe</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Testez le système de paiement complet avec cartes de test
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Colonne gauche : Configuration du test */}
        <div className="space-y-6">
          {/* Cartes de test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Cartes de Test Stripe</span>
              </CardTitle>
              <CardDescription>
                Utilisez ces numéros de carte pour tester
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-900/10">
                  <div>
                    <p className="font-mono font-bold">4242 4242 4242 4242</p>
                    <p className="text-xs text-muted-foreground">Visa - Paiement réussi</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={copyTestCard}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/10">
                  <div>
                    <p className="font-mono font-bold">4000 0027 6000 3184</p>
                    <p className="text-xs text-muted-foreground">Visa - 3D Secure requis</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-red-50 dark:bg-red-900/10">
                  <div>
                    <p className="font-mono font-bold">4000 0000 0000 0002</p>
                    <p className="text-xs text-muted-foreground">Visa - Paiement refusé</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <p className="font-medium">Informations supplémentaires :</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>CVC : N'importe quel 3 chiffres (ex: 123)</li>
                  <li>Date d'expiration : N'importe quelle date future (ex: 12/25)</li>
                  <li>Code postal : N'importe lequel (ex: 12345)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Configuration du test */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration du Test</CardTitle>
              <CardDescription>Paramètres de la transaction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant (GNF)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                  disabled={showPayment}
                />
                <p className="text-xs text-muted-foreground">
                  Montant du test en Francs Guinéens
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Utilisateur actuel</Label>
                <div className="p-3 rounded-lg border bg-muted/30">
                  {currentUser ? (
                    <>
                      <p className="font-medium">{currentUser.email}</p>
                      <p className="text-xs text-muted-foreground">ID: {currentUser.id.slice(0, 8)}...</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Non connecté</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Vendeur de test</Label>
                <div className="p-3 rounded-lg border bg-muted/30">
                  {testSeller ? (
                    <>
                      <p className="font-medium">{testSeller.full_name || 'Vendeur Test'}</p>
                      <p className="text-xs text-muted-foreground">ID: {testSeller.id.slice(0, 8)}...</p>
                      <Badge variant="outline" className="mt-1">VENDOR</Badge>
                    </>
                  ) : (
                    <p className="text-sm text-destructive">Aucun vendeur trouvé</p>
                  )}
                </div>
              </div>

              {!showPayment ? (
                <Button 
                  className="w-full" 
                  onClick={startTest}
                  disabled={!currentUser || !testSeller}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Démarrer le test
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={resetTest}
                >
                  Réinitialiser le test
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Résultats du test */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Résultats du Test</CardTitle>
                <CardDescription>Étapes du processus de paiement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 rounded-lg border"
                    >
                      <StatusIcon status={result.status} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{result.step}</p>
                        <p className="text-xs text-muted-foreground break-words">
                          {result.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.timestamp.toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne droite : Formulaire de paiement */}
        <div className="space-y-6">
          {showPayment && testSeller ? (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Mode Test :</strong> Utilisez les cartes de test ci-contre.
                  Aucun paiement réel ne sera effectué.
                </AlertDescription>
              </Alert>

              <StripePaymentWrapper
                amount={parseInt(amount)}
                currency="gnf"
                sellerId={testSeller.id}
                sellerName={testSeller.full_name || 'Vendeur Test'}
                orderId={`TEST_${Date.now()}`}
                orderDescription={`Test de paiement - ${new Date().toLocaleString('fr-FR')}`}
                metadata={{
                  test_mode: 'true',
                  test_timestamp: new Date().toISOString(),
                  buyer_email: currentUser?.email || 'test@224solutions.com',
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />

              {/* Wallet du vendeur */}
              {testSeller && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <Wallet className="w-5 h-5" />
                    <span>Wallet Vendeur (après paiement)</span>
                  </h3>
                  <WalletDisplay
                    userId={testSeller.id}
                    showActions={false}
                  />
                </div>
              )}
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="pt-10 pb-10 text-center">
                <TestTube className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Prêt à tester</h3>
                <p className="text-muted-foreground">
                  Configurez les paramètres et cliquez sur "Démarrer le test"
                  pour tester le paiement par carte.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
