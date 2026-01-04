/**
 * EXEMPLE COMPLET D'UTILISATION
 * Système de paiement Stripe - 224SOLUTIONS
 * 
 * Ce fichier montre comment utiliser tous les composants
 * dans une page complète de checkout et wallet
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { StripePaymentWrapper } from '@/components/payment/StripePaymentWrapper';
import { WalletDisplay } from '@/components/payment/WalletDisplay';
import { WithdrawalForm } from '@/components/payment/WithdrawalForm';
import { useStripePayment } from '@/hooks/useStripePayment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Package, 
  CreditCard, 
  Wallet,
  TrendingUp,
  Download,
  CheckCircle
} from 'lucide-react';

// ============================================
// EXEMPLE 1 : PAGE DE CHECKOUT (PAIEMENT)
// ============================================

interface CheckoutPageProps {
  order: {
    id: string;
    total: number;
    currency: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
    }>;
  };
  seller: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export function CheckoutPage({ order, seller }: CheckoutPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handlePaymentSuccess = (paymentIntentId: string) => {
    console.log('✅ Paiement réussi:', paymentIntentId);
    setPaymentSuccess(true);
    
    toast.success('Paiement effectué avec succès !', {
      description: 'Votre commande est confirmée',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    });

    // Rediriger vers la confirmation après 2 secondes
    setTimeout(() => {
      router.push(`/orders/${order.id}/confirmation?payment=${paymentIntentId}`);
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    console.error('❌ Erreur de paiement:', error);
    toast.error('Échec du paiement', {
      description: error,
    });
  };

  if (paymentSuccess) {
    return (
      <div className="container max-w-2xl mx-auto py-16">
        <Card>
          <CardContent className="pt-10 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">Paiement réussi !</h2>
            <p className="text-muted-foreground">
              Redirection vers la confirmation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Colonne gauche : Détails de la commande */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Récapitulatif de la commande</span>
              </CardTitle>
              <CardDescription>Commande #{order.id.slice(0, 8)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Liste des articles */}
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Quantité: {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {(item.price * item.quantity).toLocaleString()} GNF
                    </p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Vendeur */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vendeur</span>
                <div className="flex items-center space-x-2">
                  {seller.avatar && (
                    <img
                      src={seller.avatar}
                      alt={seller.name}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="font-medium">{seller.name}</span>
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>{order.total.toLocaleString()} GNF</span>
              </div>
            </CardContent>
          </Card>

          {/* Informations de sécurité */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium">Paiement 100% sécurisé</h4>
                  <p className="text-sm text-muted-foreground">
                    Vos informations bancaires sont protégées par Stripe.
                    Nous ne stockons jamais vos données de carte.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite : Formulaire de paiement */}
        <div>
          <StripePaymentWrapper
            amount={order.total}
            currency={order.currency}
            sellerId={seller.id}
            sellerName={seller.name}
            orderId={order.id}
            orderDescription={`Commande #${order.id.slice(0, 8)} - ${order.items.length} article(s)`}
            metadata={{
              customer_id: user?.id || '',
              customer_email: user?.email || '',
              order_type: 'product',
            }}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXEMPLE 2 : PAGE WALLET (PORTEFEUILLE)
// ============================================

export function WalletPage() {
  const { user } = useAuth();
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const { 
    getUserTransactions,
    getTransactionStats,
  } = useStripePayment();

  const [transactions, setTransactions] = React.useState([]);
  const [stats, setStats] = React.useState<any>(null);

  // Charger les données au montage
  React.useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    // Charger transactions
    const txs = await getUserTransactions(user.id, 20);
    setTransactions(txs);

    // Charger statistiques
    const vendorStats = await getTransactionStats(user.id, 'seller');
    setStats(vendorStats);
  };

  const handleWithdrawalSuccess = (withdrawalId: string) => {
    console.log('✅ Retrait demandé:', withdrawalId);
    toast.success('Demande de retrait envoyée', {
      description: 'Elle sera traitée sous 24-48h',
    });
    setShowWithdrawal(false);
    loadData(); // Recharger les données
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-16 text-center">
        <p className="text-muted-foreground">Veuillez vous connecter</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-3">
          <Wallet className="w-8 h-8" />
          <span>Mon Portefeuille</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Gérez vos fonds et transactions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="withdraw">Retrait</TabsTrigger>
        </TabsList>

        {/* Onglet : Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Solde du wallet */}
            <WalletDisplay
              userId={user.id}
              showActions={true}
              onWithdraw={() => {
                setShowWithdrawal(true);
                setActiveTab('withdraw');
              }}
            />

            {/* Statistiques */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Statistiques</span>
                  </CardTitle>
                  <CardDescription>Performance de vos ventes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total transactions</p>
                      <p className="text-2xl font-bold">{stats.total_transactions}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Réussies</p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.successful_transactions}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Montant total</p>
                      <p className="text-lg font-semibold">
                        {stats.total_amount.toLocaleString()} GNF
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Commission</p>
                      <p className="text-lg font-semibold text-red-600">
                        {stats.total_commission.toLocaleString()} GNF
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Montant net reçu</p>
                    <p className="text-3xl font-bold text-green-600">
                      {stats.net_amount.toLocaleString()} GNF
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Transactions récentes */}
          <Card>
            <CardHeader>
              <CardTitle>Transactions récentes</CardTitle>
              <CardDescription>Vos 5 dernières transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune transaction pour le moment
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx: any) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          tx.status === 'SUCCEEDED' ? 'bg-green-100' :
                          tx.status === 'FAILED' ? 'bg-red-100' :
                          'bg-yellow-100'
                        }`}>
                          <Package className={`w-4 h-4 ${
                            tx.status === 'SUCCEEDED' ? 'text-green-600' :
                            tx.status === 'FAILED' ? 'text-red-600' :
                            'text-yellow-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">
                            {tx.order_id ? `Commande #${tx.order_id.slice(0, 8)}` : 'Transaction'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {tx.seller_net_amount.toLocaleString()} GNF
                        </p>
                        <Badge variant={
                          tx.status === 'SUCCEEDED' ? 'default' :
                          tx.status === 'FAILED' ? 'destructive' :
                          'secondary'
                        }>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setActiveTab('transactions')}
              >
                Voir toutes les transactions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet : Toutes les transactions */}
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique des transactions</CardTitle>
              <CardDescription>
                Toutes vos transactions ({transactions.length})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune transaction
                </p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx: any) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">
                            {tx.amount.toLocaleString()} GNF
                          </p>
                          <Badge variant={
                            tx.status === 'SUCCEEDED' ? 'default' :
                            tx.status === 'FAILED' ? 'destructive' :
                            'secondary'
                          }>
                            {tx.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tx.order_id && `Commande: ${tx.order_id.slice(0, 8)}`}
                          {' • '}
                          {new Date(tx.created_at).toLocaleString('fr-FR')}
                        </p>
                        {tx.commission_amount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Commission: {tx.commission_amount.toLocaleString()} GNF
                            {' • '}
                            Net reçu: {tx.seller_net_amount.toLocaleString()} GNF
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {tx.payment_method_type || 'Card'}
                        </p>
                        {tx.last_four_digits && (
                          <p className="text-xs text-muted-foreground">
                            •••• {tx.last_four_digits}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet : Retrait */}
        <TabsContent value="withdraw" className="space-y-6">
          {showWithdrawal ? (
            <WithdrawalForm
              userId={user.id}
              onSuccess={handleWithdrawalSuccess}
              onCancel={() => {
                setShowWithdrawal(false);
                setActiveTab('overview');
              }}
            />
          ) : (
            <Card>
              <CardContent className="pt-10 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-6">
                    <Download className="w-12 h-12 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Demander un retrait</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Transférez vos fonds vers votre compte bancaire ou Mobile Money.
                  Les retraits sont traités sous 24-48h.
                </p>
                <Button
                  size="lg"
                  onClick={() => setShowWithdrawal(true)}
                  className="mt-4"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Commencer un retrait
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// EXEMPLE 3 : COMPOSANT RAPIDE (WIDGET)
// ============================================

export function QuickPaymentWidget({ 
  amount, 
  sellerId, 
  sellerName, 
  productId 
}: {
  amount: number;
  sellerId: string;
  sellerName: string;
  productId: string;
}) {
  const [showPayment, setShowPayment] = useState(false);

  if (!showPayment) {
    return (
      <Button onClick={() => setShowPayment(true)} size="lg" className="w-full">
        <CreditCard className="w-5 h-5 mr-2" />
        Payer {amount.toLocaleString()} GNF
      </Button>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <StripePaymentWrapper
        amount={amount}
        currency="gnf"
        sellerId={sellerId}
        sellerName={sellerName}
        productId={productId}
        onSuccess={(paymentId) => {
          toast.success('Paiement réussi !');
          console.log('Payment ID:', paymentId);
        }}
        onError={(error) => {
          toast.error(error);
          setShowPayment(false);
        }}
      />
      <Button
        variant="ghost"
        onClick={() => setShowPayment(false)}
        className="w-full mt-4"
      >
        Annuler
      </Button>
    </div>
  );
}

// ============================================
// EXEMPLE 4 : WALLET COMPACT (DASHBOARD)
// ============================================

export function DashboardWalletWidget({ userId }: { userId: string }) {
  return (
    <WalletDisplay
      userId={userId}
      compact={true}
    />
  );
}

// ============================================
// EXPORT DES EXEMPLES
// ============================================

export default {
  CheckoutPage,
  WalletPage,
  QuickPaymentWidget,
  DashboardWalletWidget,
};
