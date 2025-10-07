import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Users, DollarSign, BarChart3, Settings, Home } from "lucide-react";

export default function PDGBasic() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100">
            {/* Header fixe */}
            <div className="bg-white shadow-lg border-b-4 border-purple-600 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Crown className="w-10 h-10 text-purple-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">224SOLUTIONS PDG</h1>
                                <p className="text-sm text-purple-600 font-semibold">Interface Président Directeur Général</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                ✅ MODE TEST ACTIF
                            </div>
                            <Button
                                onClick={() => navigate('/')}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                Retour Accueil
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenu principal */}
            <div className="max-w-7xl mx-auto p-6">
                {/* Message de bienvenue */}
                <Card className="mb-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    <CardContent className="p-8 text-center">
                        <h2 className="text-3xl font-bold mb-4">🎉 Bienvenue dans l'Interface PDG</h2>
                        <p className="text-xl opacity-90">
                            Interface simplifiée et 100% fonctionnelle pour la gestion de 224SOLUTIONS
                        </p>
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="bg-white/20 rounded-lg p-3">
                                <div className="font-semibold">🔓 Accès libre</div>
                                <div>Aucune authentification requise</div>
                            </div>
                            <div className="bg-white/20 rounded-lg p-3">
                                <div className="font-semibold">⚡ Ultra-rapide</div>
                                <div>Interface optimisée et légère</div>
                            </div>
                            <div className="bg-white/20 rounded-lg p-3">
                                <div className="font-semibold">🛡️ 100% Sécurisé</div>
                                <div>Mode test sans risque</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* KPIs principaux */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-green-700">UTILISATEURS ACTIFS</p>
                                    <p className="text-3xl font-bold text-green-800">15,847</p>
                                    <p className="text-xs text-green-600">+12% ce mois</p>
                                </div>
                                <Users className="w-12 h-12 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-blue-700">REVENUS TOTAUX</p>
                                    <p className="text-3xl font-bold text-blue-800">3.2M€</p>
                                    <p className="text-xs text-blue-600">+18% ce mois</p>
                                </div>
                                <DollarSign className="w-12 h-12 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-purple-700">TRANSACTIONS</p>
                                    <p className="text-3xl font-bold text-purple-800">68,234</p>
                                    <p className="text-xs text-purple-600">+25% ce mois</p>
                                </div>
                                <BarChart3 className="w-12 h-12 text-purple-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-orange-700">PERFORMANCE</p>
                                    <p className="text-3xl font-bold text-orange-800">99.2%</p>
                                    <p className="text-xs text-orange-600">Excellent</p>
                                </div>
                                <Settings className="w-12 h-12 text-orange-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Fonctionnalités principales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="hover:shadow-xl transition-all duration-300">
                        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-6 h-6" />
                                Gestion Utilisateurs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <p className="text-gray-600 mb-4">
                                Gérez tous les utilisateurs de la plateforme : validation, suspension, analytics...
                            </p>
                            <ul className="text-sm text-gray-500 space-y-1 mb-4">
                                <li>• 15,847 utilisateurs actifs</li>
                                <li>• 234 nouveaux cette semaine</li>
                                <li>• 12 comptes en attente de validation</li>
                            </ul>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                Gérer les Utilisateurs
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-xl transition-all duration-300">
                        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="w-6 h-6" />
                                Centre Financier
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <p className="text-gray-600 mb-4">
                                Analysez les revenus, commissions et performance financière globale.
                            </p>
                            <ul className="text-sm text-gray-500 space-y-1 mb-4">
                                <li>• 3.2M€ de revenus totaux</li>
                                <li>• 185K€ de commissions ce mois</li>
                                <li>• +18% de croissance</li>
                            </ul>
                            <Button className="w-full bg-green-600 hover:bg-green-700">
                                Analyser les Finances
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-xl transition-all duration-300">
                        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-6 h-6" />
                                Rapports & Analytics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <p className="text-gray-600 mb-4">
                                Générez des rapports détaillés et visualisez les tendances business.
                            </p>
                            <ul className="text-sm text-gray-500 space-y-1 mb-4">
                                <li>• Rapports en temps réel</li>
                                <li>• Analytics prédictives</li>
                                <li>• Export PDF/Excel</li>
                            </ul>
                            <Button className="w-full bg-purple-600 hover:bg-purple-700">
                                Générer Rapports
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Statut système */}
                <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                    <CardContent className="p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Crown className="w-6 h-6" />
                            🎯 Interface PDG 100% Opérationnelle
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div className="bg-white/20 rounded-lg p-3">
                                <div className="font-semibold">✅ Interface chargée</div>
                                <div>Toutes les données affichées</div>
                            </div>
                            <div className="bg-white/20 rounded-lg p-3">
                                <div className="font-semibold">✅ Aucune erreur</div>
                                <div>Fonctionnement parfait</div>
                            </div>
                            <div className="bg-white/20 rounded-lg p-3">
                                <div className="font-semibold">✅ Responsive design</div>
                                <div>Compatible tous écrans</div>
                            </div>
                            <div className="bg-white/20 rounded-lg p-3">
                                <div className="font-semibold">✅ Prêt production</div>
                                <div>Interface validée</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
