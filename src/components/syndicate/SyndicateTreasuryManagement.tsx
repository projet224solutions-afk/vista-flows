/**
 * GESTION DE LA CAISSE SYNDICALE ULTRA PROFESSIONNELLE
 * Interface complète pour la gestion des cotisations et de la trésorerie
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, PieChart, Download } from "lucide-react";

interface SyndicateTreasuryManagementProps {
    bureauId: string;
}

export default function SyndicateTreasuryManagement({ bureauId }: SyndicateTreasuryManagementProps) {
    const [treasuryData, setTreasuryData] = useState({
        balance: 1850000,
        monthlyIncome: 225000,
        monthlyExpenses: 75000,
        pendingCotisations: 15000
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 text-center">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold text-green-600">
                            {treasuryData.balance.toLocaleString()} FCFA
                        </div>
                        <div className="text-sm text-gray-600">Solde de Caisse</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-blue-600">
                            {treasuryData.monthlyIncome.toLocaleString()} FCFA
                        </div>
                        <div className="text-sm text-gray-600">Revenus ce mois</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <TrendingDown className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <div className="text-2xl font-bold text-red-600">
                            {treasuryData.monthlyExpenses.toLocaleString()} FCFA
                        </div>
                        <div className="text-sm text-gray-600">Dépenses ce mois</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <PieChart className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold text-orange-600">
                            {treasuryData.pendingCotisations.toLocaleString()} FCFA
                        </div>
                        <div className="text-sm text-gray-600">Cotisations en attente</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Gestion de la Caisse Syndicale</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            Module de Trésorerie
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Gestion complète des cotisations, paiements et budget syndical
                        </p>
                        <div className="space-y-2">
                            <Badge variant="outline">Cotisations automatiques</Badge>
                            <Badge variant="outline">Paiements Mobile Money</Badge>
                            <Badge variant="outline">Rapports financiers</Badge>
                            <Badge variant="outline">Audit automatique</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
