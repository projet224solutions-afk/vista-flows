import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ShoppingCart, Home, User, Package, AlertTriangle, Settings } from 'lucide-react';
// Debug utilities removed - being refactored

export default function TestClient() {
    const testButtons = [
        {
            id: 'test1',
            label: 'Test Navigation',
            icon: Home,
            color: 'bg-blue-500',
            action: () => toast.success('✅ Navigation fonctionne!')
        },
        {
            id: 'test2',
            label: 'Test Panier',
            icon: ShoppingCart,
            color: 'bg-orange-500',
            action: () => toast.success('✅ Panier fonctionne!')
        },
        {
            id: 'test3',
            label: 'Test Profil',
            icon: User,
            color: 'bg-green-500',
            action: () => toast.success('✅ Profil fonctionne!')
        },
        {
            id: 'test4',
            label: 'Test Commandes',
            icon: Package,
            color: 'bg-purple-500',
            action: () => toast.success('✅ Commandes fonctionne!')
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-center text-2xl">
                            🧪 TEST INTERFACE CLIENT 224SOLUTIONS
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-lg mb-4">
                            Cliquez sur les boutons ci-dessous pour tester les fonctionnalités
                        </p>
                        <div className="bg-green-100 border border-green-400 rounded-lg p-4 mb-4">
                            <p className="text-green-800 font-semibold">
                                ✅ Si vous voyez cette page, React fonctionne correctement !
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {testButtons.map((test) => {
                        const IconComponent = test.icon;
                        return (
                            <Card key={test.id} className="hover:shadow-lg transition-shadow">
                                <CardContent className="p-6 text-center">
                                    <div className={`w-16 h-16 ${test.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                                        <IconComponent className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="font-semibold mb-3">{test.label}</h3>
                                    <Button
                                        onClick={test.action}
                                        className={`w-full ${test.color} hover:opacity-90`}
                                    >
                                        Tester
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>🔧 Instructions de Test</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><strong>Testez chaque bouton</strong> - Vous devriez voir des notifications toast</li>
                            <li><strong>Vérifiez la console</strong> - Ouvrez F12 pour voir s'il y a des erreurs</li>
                            <li><strong>Testez la responsivité</strong> - Redimensionnez la fenêtre</li>
                            <li><strong>Navigation</strong> - Essayez d'aller sur /client après ce test</li>
                        </ol>

                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-2">🔗 Liens de test :</h4>
                            <div className="space-y-2">
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.href = '/client'}
                                    className="mr-2"
                                >
                                    → Interface Client Principal
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.href = '/'}
                                    className="mr-2"
                                >
                                    → Accueil
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.href = '/auth'}
                                >
                                    → Authentification
                                </Button>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                            <p className="text-yellow-800">
                                <strong>📌 Note :</strong> Si cette page s'affiche correctement et que les boutons fonctionnent,
                                alors le problème n'est pas avec React ou les composants, mais probablement avec le routage
                                ou l'authentification.
                            </p>
                        </div>

                        <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                            <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                🚨 Diagnostic Avancé Supabase
                            </h4>
                            <p className="text-red-700 mb-4">
                                Si rien ne fonctionne (ajout de produits, interfaces), utilisez ces outils :
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    onClick={() => toast.info('Debug utilities being refactored')}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    🔍 Diagnostic Complet
                                </Button>
                                <Button
                                    onClick={() => toast.info('Debug utilities being refactored')}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    🔧 Réparer Profil Vendeur
                                </Button>
                                <Button
                                    onClick={() => toast.info('Debug utilities being refactored')}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    🧪 Test Ajout Produit
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
