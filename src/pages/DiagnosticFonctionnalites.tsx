import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertTriangle, Loader, ArrowRight } from 'lucide-react';

interface TestResult {
    name: string;
    status: 'pending' | 'success' | 'error';
    message: string;
    details?: string;
}

export default function DiagnosticFonctionnalites() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [tests, setTests] = useState<TestResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const updateTest = (name: string, status: TestResult['status'], message: string, details?: string) => {
        setTests(prev => {
            const exists = prev.find(t => t.name === name);
            const newTest = { name, status, message, details };

            if (exists) {
                return prev.map(t => t.name === name ? newTest : t);
            } else {
                return [...prev, newTest];
            }
        });
    };

    const runDiagnostic = async () => {
        setIsRunning(true);
        setTests([]);

        try {
            // Test 1: Vérifier la session utilisateur
            updateTest('session', 'pending', 'Vérification de la session...');
            if (user && profile) {
                updateTest('session', 'success', `Connecté en tant que ${profile.role}`, `Email: ${user.email}`);
            } else {
                updateTest('session', 'error', 'Session invalide ou profil manquant');
                return;
            }

            // Test 2: Test de connexion Supabase
            updateTest('supabase', 'pending', 'Test de connexion Supabase...');
            try {
                const { data, error } = await supabase.from('profiles').select('count').limit(1);
                if (error) throw error;
                updateTest('supabase', 'success', 'Connexion Supabase OK');
            } catch (error) {
                updateTest('supabase', 'error', 'Erreur Supabase', error.message);
            }

            // Test 3: Vérifier le profil vendeur (si applicable)
            if (profile.role === 'vendeur') {
                updateTest('vendor-profile', 'pending', 'Vérification profil vendeur...');
                try {
                    const { data: vendor, error } = await supabase
                        .from('vendors')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();

                    if (error || !vendor) {
                        updateTest('vendor-profile', 'error', 'Profil vendeur manquant', 'Nécessaire pour ajouter des produits');
                    } else {
                        updateTest('vendor-profile', 'success', 'Profil vendeur trouvé', `ID: ${vendor.id}`);
                    }
                } catch (error) {
                    updateTest('vendor-profile', 'error', 'Erreur profil vendeur', error.message);
                }
            }

            // Test 4: Test des catégories
            updateTest('categories', 'pending', 'Vérification des catégories...');
            try {
                const { data: categories, error } = await supabase
                    .from('categories')
                    .select('id, name')
                    .eq('is_active', true)
                    .limit(5);

                if (error) throw error;
                updateTest('categories', 'success', `${categories?.length || 0} catégories disponibles`);
            } catch (error) {
                updateTest('categories', 'error', 'Erreur catégories', error.message);
            }

            // Test 5: Test d'écriture (ajout produit test)
            if (profile.role === 'vendeur') {
                updateTest('product-creation', 'pending', 'Test création produit...');
                try {
                    const { data: vendor } = await supabase
                        .from('vendors')
                        .select('id')
                        .eq('user_id', user.id)
                        .single();

                    if (vendor) {
                        const testProduct = {
                            vendor_id: vendor.id,
                            name: `Test Diagnostic ${Date.now()}`,
                            description: 'Produit test créé par le diagnostic',
                            price: 1000,
                            stock_quantity: 1,
                            is_active: true
                        };

                        const { data: product, error } = await supabase
                            .from('products')
                            .insert(testProduct)
                            .select()
                            .single();

                        if (error) throw error;

                        updateTest('product-creation', 'success', 'Création produit OK', `ID: ${product.id}`);

                        // Nettoyer le produit test
                        await supabase.from('products').delete().eq('id', product.id);
                    } else {
                        updateTest('product-creation', 'error', 'Pas de profil vendeur pour le test');
                    }
                } catch (error) {
                    updateTest('product-creation', 'error', 'Erreur création produit', error.message);
                }
            }

            // Test 6: Test wallet
            updateTest('wallet', 'pending', 'Vérification wallet...');
            try {
                const { data: wallet, error } = await supabase
                    .from('wallets')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error || !wallet) {
                    updateTest('wallet', 'error', 'Wallet manquant', 'Nécessaire pour les transactions');
                } else {
                    updateTest('wallet', 'success', `Wallet trouvé - Balance: ${wallet.balance} ${wallet.currency}`);
                }
            } catch (error) {
                updateTest('wallet', 'error', 'Erreur wallet', error.message);
            }

            // Test 7: Test permissions RLS
            updateTest('permissions', 'pending', 'Test des permissions...');
            try {
                // Test lecture de ses propres données
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                updateTest('permissions', 'success', 'Permissions de lecture OK');
            } catch (error) {
                updateTest('permissions', 'error', 'Erreur permissions', error.message);
            }

        } catch (error) {
            console.error('Erreur générale diagnostic:', error);
            toast.error('Erreur lors du diagnostic');
        } finally {
            setIsRunning(false);
        }
    };

    const getStatusIcon = (status: TestResult['status']) => {
        switch (status) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'pending': return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
        }
    };

    const getStatusColor = (status: TestResult['status']) => {
        switch (status) {
            case 'success': return 'border-green-200 bg-green-50';
            case 'error': return 'border-red-200 bg-red-50';
            case 'pending': return 'border-blue-200 bg-blue-50';
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="p-6 text-center">
                        <h2 className="text-xl font-bold mb-4">Connexion requise</h2>
                        <Button onClick={() => navigate('/auth')}>
                            Se connecter
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <Card className="bg-blue-600 text-white">
                    <CardHeader>
                        <CardTitle className="text-center text-2xl">
                            🔍 DIAGNOSTIC DES FONCTIONNALITÉS
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="mb-4">
                            Connecté en tant que : <strong>{profile?.first_name || user.email}</strong> ({profile?.role})
                        </p>
                        <p className="text-sm opacity-90">
                            Ce diagnostic va tester toutes les fonctionnalités de votre compte
                        </p>
                    </CardContent>
                </Card>

                {/* Bouton de lancement */}
                <Card>
                    <CardContent className="p-6 text-center">
                        <Button
                            onClick={runDiagnostic}
                            disabled={isRunning}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                            size="lg"
                        >
                            {isRunning ? (
                                <>
                                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                                    Diagnostic en cours...
                                </>
                            ) : (
                                <>
                                    🚀 Lancer le diagnostic complet
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Résultats des tests */}
                {tests.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>📊 Résultats du diagnostic</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {tests.map((test, index) => (
                                <div
                                    key={index}
                                    className={`p-4 border rounded-lg ${getStatusColor(test.status)}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(test.status)}
                                            <div>
                                                <h4 className="font-semibold">{test.name}</h4>
                                                <p className="text-sm text-gray-600">{test.message}</p>
                                                {test.details && (
                                                    <p className="text-xs text-gray-500 mt-1">{test.details}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Actions de navigation */}
                <Card>
                    <CardHeader>
                        <CardTitle>🧭 Navigation rapide</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Button
                                onClick={() => navigate(`/${profile?.role}`)}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <ArrowRight className="w-4 h-4" />
                                Mon Dashboard
                            </Button>

                            {profile?.role === 'vendeur' && (
                                <Button
                                    onClick={() => navigate('/vendeur-simple')}
                                    variant="outline"
                                    className="flex items-center gap-2"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                    Test Vendeur Simple
                                </Button>
                            )}

                            <Button
                                onClick={() => navigate('/test-ultra-basic')}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <ArrowRight className="w-4 h-4" />
                                Test Ultra-Basic
                            </Button>

                            <Button
                                onClick={() => navigate('/')}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <ArrowRight className="w-4 h-4" />
                                Accueil
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
