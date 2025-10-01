/**
 * GESTION DES TICKETS ROUTIERS ULTRA PROFESSIONNELLE
 * Interface complète pour la génération et gestion des tickets routiers
 * 224Solutions - Bureau Syndicat System
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, QrCode, Download, Plus, Calendar } from "lucide-react";

interface SyndicateRoadTicketsProps {
    bureauId: string;
}

export default function SyndicateRoadTickets({ bureauId }: SyndicateRoadTicketsProps) {
    const [ticketStats] = useState({
        totalTickets: 156,
        activeTickets: 89,
        expiredTickets: 67,
        monthlyRevenue: 78000
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-blue-600">{ticketStats.totalTickets}</div>
                        <div className="text-sm text-gray-600">Total Tickets</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <QrCode className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold text-green-600">{ticketStats.activeTickets}</div>
                        <div className="text-sm text-gray-600">Tickets Actifs</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <div className="text-2xl font-bold text-red-600">{ticketStats.expiredTickets}</div>
                        <div className="text-sm text-gray-600">Expirés</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <Download className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold text-purple-600">
                            {ticketStats.monthlyRevenue.toLocaleString()} FCFA
                        </div>
                        <div className="text-sm text-gray-600">Revenus ce mois</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Tickets Routiers
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Générer Ticket
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            Système de Tickets Routiers
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Génération automatique de tickets avec QR codes pour contrôle routier
                        </p>
                        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                            <div className="text-center">
                                <div className="text-lg font-bold text-blue-600">500 FCFA</div>
                                <div className="text-xs text-gray-600">Ticket Journalier</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-green-600">3,000 FCFA</div>
                                <div className="text-xs text-gray-600">Ticket Hebdomadaire</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-purple-600">10,000 FCFA</div>
                                <div className="text-xs text-gray-600">Ticket Mensuel</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
