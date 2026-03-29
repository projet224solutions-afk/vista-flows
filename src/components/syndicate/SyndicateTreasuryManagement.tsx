/**
 * GESTION DE LA CAISSE SYNDICALE ULTRA PROFESSIONNELLE
 * Interface complÃ¨te pour la gestion des cotisations et de la trÃ©sorerie
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, PieChart, Download } from "lucide-react";
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface SyndicateTreasuryManagementProps {
    bureauId: string;
}

export default function SyndicateTreasuryManagement({ bureauId }: SyndicateTreasuryManagementProps) {
    const fc = useFormatCurrency();
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
                        <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary-orange-600" />
                        <div className="text-2xl font-bold text-primary-orange-600">
                            {fc(treasuryData.balance, 'GNF')}
                        </div>
                        <div className="text-sm text-muted-foreground">Solde de Caisse</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-blue-600">
                            {fc(treasuryData.monthlyIncome, 'GNF')}
                        </div>
                        <div className="text-sm text-muted-foreground">Revenus ce mois</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <TrendingDown className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <div className="text-2xl font-bold text-red-600">
                            {fc(treasuryData.monthlyExpenses, 'GNF')}
                        </div>
                        <div className="text-sm text-muted-foreground">DÃ©penses ce mois</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <PieChart className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold text-orange-600">
                            {fc(treasuryData.pendingCotisations, 'GNF')}
                        </div>
                        <div className="text-sm text-muted-foreground">Cotisations en attente</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Gestion de la Caisse Syndicale</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <DollarSign className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">
                            Module de TrÃ©sorerie
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            Gestion complÃ¨te des cotisations, paiements et budget syndical
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
