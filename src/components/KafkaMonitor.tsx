/**
 * 🔄 Composant de Monitoring Kafka pour 224Solutions
 * 
 * Interface de test et monitoring du système Kafka
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Activity,
    AlertCircle,
    CheckCircle,
    XCircle,
    Play,
    Square,
    RefreshCw,
    Database,
    MessageSquare,
    TrendingUp,
    Truck,
    CreditCard,
    Bell,
    BarChart3
} from 'lucide-react';
import { useKafka } from '@/services/kafka224Service';
import { toast } from 'sonner';

interface KafkaHealth {
    status: string;
    topics: string[];
    errors: string[];
}

interface TestResult {
    id: string;
    type: string;
    status: 'pending' | 'success' | 'error';
    message: string;
    timestamp: Date;
}

export const KafkaMonitor: React.FC = () => {
    const kafka = useKafka();

    // États
    const [isConnected, setIsConnected] = useState(false);
    const [health, setHealth] = useState<KafkaHealth | null>(null);
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [autoTest, setAutoTest] = useState(false);

    // Données de test
    const [testData, setTestData] = useState({
        orderId: 'TEST-' + Date.now(),
        customerId: 'CUST-TEST-001',
        vendorId: 'VEND-TEST-001',
        amount: 25000,
        deliveryId: 'DEL-' + Date.now(),
        latitude: 14.6928, // Dakar
        longitude: -17.4467,
        userId: 'USER-TEST-001'
    });

    // Vérifier la santé de Kafka
    const checkKafkaHealth = async () => {
        try {
            const healthData = await kafka.getHealth();
            setHealth(healthData);
            setIsConnected(healthData.status === 'healthy');
        } catch (error) {
            console.error('Erreur check health:', error);
            setIsConnected(false);
        }
    };

    // Connecter à Kafka
    const connectKafka = async () => {
        setIsLoading(true);
        try {
            await kafka.connect();
            setIsConnected(true);
            toast.success('Connexion Kafka réussie');
            await checkKafkaHealth();
        } catch (error) {
            toast.error('Erreur connexion Kafka');
            console.error('Erreur connexion:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Déconnecter Kafka
    const disconnectKafka = async () => {
        setIsLoading(true);
        try {
            await kafka.disconnect();
            setIsConnected(false);
            setHealth(null);
            toast.info('Kafka déconnecté');
        } catch (error) {
            toast.error('Erreur déconnexion Kafka');
        } finally {
            setIsLoading(false);
        }
    };

    // Ajouter un résultat de test
    const addTestResult = (type: string, status: 'success' | 'error', message: string) => {
        const result: TestResult = {
            id: Date.now().toString(),
            type,
            status,
            message,
            timestamp: new Date()
        };

        setTestResults(prev => [result, ...prev.slice(0, 9)]); // Garder 10 derniers résultats
    };

    // Tests individuels
    const testOrderCreation = async () => {
        try {
            addTestResult('Commande', 'pending', 'Test création commande...');

            await kafka.publishOrderCreated({
                orderId: testData.orderId,
                customerId: testData.customerId,
                vendorId: testData.vendorId,
                amount: testData.amount,
                items: [
                    { name: 'Produit Test Kafka', quantity: 1, price: testData.amount }
                ]
            });

            addTestResult('Commande', 'success', `Commande ${testData.orderId} créée avec succès`);
            toast.success('Test commande réussi');

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
            addTestResult('Commande', 'error', `Erreur: ${errorMsg}`);
            toast.error('Test commande échoué');
        }
    };

    const testOrderUpdate = async () => {
        try {
            addTestResult('Mise à jour', 'pending', 'Test mise à jour commande...');

            await kafka.publishOrderUpdated(testData.orderId, 'confirmed', {
                confirmedBy: 'KAFKA-TEST',
                reason: 'Test automatique système'
            });

            addTestResult('Mise à jour', 'success', `Commande ${testData.orderId} mise à jour`);
            toast.success('Test mise à jour réussi');

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
            addTestResult('Mise à jour', 'error', `Erreur: ${errorMsg}`);
            toast.error('Test mise à jour échoué');
        }
    };

    const testDeliveryTracking = async () => {
        try {
            addTestResult('Tracking', 'pending', 'Test tracking livraison...');

            await kafka.publishDeliveryTracking({
                deliveryId: testData.deliveryId,
                orderId: testData.orderId,
                latitude: testData.latitude,
                longitude: testData.longitude,
                status: 'in-transit'
            });

            addTestResult('Tracking', 'success', `Position mise à jour: ${testData.latitude}, ${testData.longitude}`);
            toast.success('Test tracking réussi');

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
            addTestResult('Tracking', 'error', `Erreur: ${errorMsg}`);
            toast.error('Test tracking échoué');
        }
    };

    const testPayment = async () => {
        try {
            addTestResult('Paiement', 'pending', 'Test paiement...');

            await kafka.publishPaymentCompleted({
                paymentId: 'PAY-' + Date.now(),
                orderId: testData.orderId,
                amount: testData.amount,
                currency: 'XOF',
                method: 'mobile-money'
            });

            addTestResult('Paiement', 'success', `Paiement ${testData.amount} XOF confirmé`);
            toast.success('Test paiement réussi');

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
            addTestResult('Paiement', 'error', `Erreur: ${errorMsg}`);
            toast.error('Test paiement échoué');
        }
    };

    const testNotification = async () => {
        try {
            addTestResult('Notification', 'pending', 'Test notification...');

            await kafka.publishNotification(testData.userId, {
                title: 'Test Kafka 224Solutions',
                body: `Votre commande ${testData.orderId} a été traitée avec succès`,
                type: 'test-notification',
                data: { orderId: testData.orderId, source: 'kafka-test' }
            });

            addTestResult('Notification', 'success', `Notification envoyée à ${testData.userId}`);
            toast.success('Test notification réussi');

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
            addTestResult('Notification', 'error', `Erreur: ${errorMsg}`);
            toast.error('Test notification échoué');
        }
    };

    // Test complet
    const runFullTest = async () => {
        if (!isConnected) {
            toast.error('Kafka non connecté');
            return;
        }

        setIsLoading(true);

        try {
            // Générer de nouvelles données de test
            const newTestData = {
                ...testData,
                orderId: 'FULL-TEST-' + Date.now(),
                deliveryId: 'DEL-FULL-' + Date.now()
            };
            setTestData(newTestData);

            // Exécuter tous les tests en séquence
            await testOrderCreation();
            await new Promise(resolve => setTimeout(resolve, 1000));

            await testOrderUpdate();
            await new Promise(resolve => setTimeout(resolve, 1000));

            await testDeliveryTracking();
            await new Promise(resolve => setTimeout(resolve, 1000));

            await testPayment();
            await new Promise(resolve => setTimeout(resolve, 1000));

            await testNotification();

            toast.success('🎉 Test complet Kafka terminé !');

        } catch (error) {
            toast.error('❌ Erreur pendant le test complet');
        } finally {
            setIsLoading(false);
        }
    };

    // Effet pour vérification périodique
    useEffect(() => {
        if (autoTest && isConnected) {
            const interval = setInterval(() => {
                checkKafkaHealth();
            }, 30000); // Toutes les 30 secondes

            return () => clearInterval(interval);
        }
    }, [autoTest, isConnected]);

    // Effet initial
    useEffect(() => {
        checkKafkaHealth();
    }, []);

    return (
        <div className="space-y-6">
            {/* Header avec status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Monitoring Kafka 224Solutions
                        <Badge variant={isConnected ? "default" : "destructive"}>
                            {isConnected ? "Connecté" : "Déconnecté"}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-center">
                        <Button
                            onClick={isConnected ? disconnectKafka : connectKafka}
                            disabled={isLoading}
                            variant={isConnected ? "destructive" : "default"}
                        >
                            {isLoading ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : isConnected ? (
                                <Square className="h-4 w-4 mr-2" />
                            ) : (
                                <Play className="h-4 w-4 mr-2" />
                            )}
                            {isConnected ? "Déconnecter" : "Connecter"}
                        </Button>

                        <Button onClick={checkKafkaHealth} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Vérifier Santé
                        </Button>

                        <Button onClick={runFullTest} disabled={!isConnected || isLoading}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Test Complet
                        </Button>
                    </div>

                    {health && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                            <h4 className="font-semibold mb-2">État du système Kafka:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label>Status:</Label>
                                    <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>
                                        {health.status}
                                    </Badge>
                                </div>
                                <div>
                                    <Label>Topics disponibles:</Label>
                                    <p className="text-sm text-gray-600">{health.topics.length} topics</p>
                                </div>
                                <div>
                                    <Label>Erreurs:</Label>
                                    <p className="text-sm text-gray-600">{health.errors.length} erreurs</p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tests individuels */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Test Commandes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            onClick={testOrderCreation}
                            disabled={!isConnected}
                            size="sm"
                            className="w-full"
                        >
                            Créer Commande
                        </Button>
                        <Button
                            onClick={testOrderUpdate}
                            disabled={!isConnected}
                            size="sm"
                            variant="outline"
                            className="w-full"
                        >
                            Mettre à jour
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Test Livraisons
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={testDeliveryTracking}
                            disabled={!isConnected}
                            size="sm"
                            className="w-full"
                        >
                            Tracking GPS
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Test Paiements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={testPayment}
                            disabled={!isConnected}
                            size="sm"
                            className="w-full"
                        >
                            Confirmer Paiement
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Test Notifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={testNotification}
                            disabled={!isConnected}
                            size="sm"
                            className="w-full"
                        >
                            Envoyer Notification
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Configuration de test */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Configuration Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="orderId">ID Commande</Label>
                            <Input
                                id="orderId"
                                value={testData.orderId}
                                onChange={(e) => setTestData(prev => ({ ...prev, orderId: e.target.value }))}
                                placeholder="TEST-ORDER-001"
                            />
                        </div>
                        <div>
                            <Label htmlFor="amount">Montant (XOF)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={testData.amount}
                                onChange={(e) => setTestData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                                placeholder="25000"
                            />
                        </div>
                        <div>
                            <Label htmlFor="userId">ID Utilisateur</Label>
                            <Input
                                id="userId"
                                value={testData.userId}
                                onChange={(e) => setTestData(prev => ({ ...prev, userId: e.target.value }))}
                                placeholder="USER-TEST-001"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Résultats des tests */}
            {testResults.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Résultats des Tests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {testResults.map((result) => (
                                <Alert key={result.id} variant={result.status === 'error' ? 'destructive' : 'default'}>
                                    <div className="flex items-center gap-2">
                                        {result.status === 'success' && <CheckCircle className="h-4 w-4" />}
                                        {result.status === 'error' && <XCircle className="h-4 w-4" />}
                                        {result.status === 'pending' && <RefreshCw className="h-4 w-4 animate-spin" />}
                                        <span className="font-medium">{result.type}</span>
                                        <span className="text-xs text-gray-500">
                                            {result.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <AlertDescription className="mt-1">
                                        {result.message}
                                    </AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default KafkaMonitor;
