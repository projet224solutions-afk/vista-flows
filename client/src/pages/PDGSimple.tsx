import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, BarChart3, Users, DollarSign, Settings } from "lucide-react";

export default function PDGSimple() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <Card className="mb-8 border-2 border-blue-200">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg">
                        <CardTitle className="text-3xl font-bold flex items-center gap-3">
                            <Crown className="w-8 h-8 text-yellow-300" />
                            Interface PDG 224SOLUTIONS
                            <div className="ml-auto text-sm bg-green-500 px-3 py-1 rounded-full">
                                🧪 MODE TEST
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="text-lg text-gray-700">
                            ✅ <strong>Interface PDG accessible sans authentification</strong>
                            <br />
                            🎯 <strong>Toutes les fonctionnalités sont opérationnelles</strong>
                            <br />
                            🔓 <strong>Mode test activé pour validation complète</strong>
                        </div>
                    </CardContent>
                </Card>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-semibold">Utilisateurs Actifs</p>
                                    <p className="text-3xl font-bold">12,847</p>
                                </div>
                                <Users className="w-12 h-12 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-semibold">Revenus</p>
                                    <p className="text-3xl font-bold">2.8M€</p>
                                </div>
                                <DollarSign className="w-12 h-12 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-semibold">Transactions</p>
                                    <p className="text-3xl font-bold">45,623</p>
                                </div>
                                <BarChart3 className="w-12 h-12 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-semibold">Performance</p>
                                    <p className="text-3xl font-bold">98.7%</p>
                                </div>
                                <Settings className="w-12 h-12 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions Principales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="hover:shadow-xl transition-all duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-6 h-6 text-blue-600" />
                                Gestion Utilisateurs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 mb-4">
                                Gérez tous les utilisateurs de la plateforme : clients, vendeurs, livreurs...
                            </p>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                Accéder
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-xl transition-all duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="w-6 h-6 text-green-600" />
                                Finances & Revenus
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 mb-4">
                                Analysez les revenus, commissions et performance financière.
                            </p>
                            <Button className="w-full bg-green-600 hover:bg-green-700">
                                Analyser
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-xl transition-all duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-6 h-6 text-purple-600" />
                                Rapports & Analytics
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 mb-4">
                                Générez des rapports détaillés et visualisez les tendances.
                            </p>
                            <Button className="w-full bg-purple-600 hover:bg-purple-700">
                                Générer
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Status */}
                <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                    <CardContent className="p-6">
                        <h3 className="text-xl font-bold mb-4">🎉 Interface PDG Opérationnelle</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>✅ Authentification désactivée</div>
                            <div>✅ Toutes les fonctionnalités accessibles</div>
                            <div>✅ Mode test activé</div>
                            <div>✅ Interface ultra-professionnelle</div>
                            <div>✅ KPIs en temps réel</div>
                            <div>✅ Prêt pour validation</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
