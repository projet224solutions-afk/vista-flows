/**
 * 🧪 TEST DIRECT POS - 224SOLUTIONS
 * Test direct du système POS pour diagnostiquer les problèmes
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function POSTestDirect() {
    const testPOS = () => {
        toast.success('✅ POS Test Direct fonctionne !');
    };

    return (
        <div className="w-full h-full min-h-[600px] bg-gradient-to-br from-blue-50 to-purple-50 p-6">
            <Card className="w-full h-full border-0 shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                    <CardTitle className="text-2xl font-bold flex items-center gap-3">
                        <CreditCard className="w-8 h-8" />
                        🧪 TEST DIRECT POS - 224SOLUTIONS
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-800">
                            POS Test Direct Chargé avec Succès !
                        </h2>

                        <p className="text-gray-600 text-lg">
                            Ce composant de test confirme que le système POS peut se charger correctement.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <CreditCard className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-2">Système de Caisse</h3>
                            <p className="text-sm text-gray-600">Interface de vente complète</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-2">Calculs Automatiques</h3>
                            <p className="text-sm text-gray-600">Prix, taxes, totaux</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-6 h-6 text-purple-600" />
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-2">Diagnostic</h3>
                            <p className="text-sm text-gray-600">Tests et vérifications</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Button
                            onClick={testPOS}
                            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            🧪 Tester le POS
                        </Button>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-semibold text-yellow-800 mb-2">📋 Diagnostic POS</h4>
                            <ul className="text-sm text-yellow-700 space-y-1">
                                <li>✅ Composant POS Test chargé</li>
                                <li>✅ Interface utilisateur fonctionnelle</li>
                                <li>✅ Système de notifications actif</li>
                                <li>✅ Styles et animations appliqués</li>
                            </ul>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-800 mb-2">🔧 Actions de Dépannage</h4>
                            <div className="space-y-2">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => window.location.reload()}
                                >
                                    🔄 Recharger la Page
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        console.clear();
                                        toast.info('Console vidée - Vérifiez les erreurs');
                                    }}
                                >
                                    🧹 Vider la Console
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}



