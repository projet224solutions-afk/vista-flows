/**
 * SYSTÈME DE COMMUNICATION SYNDICALE ULTRA PROFESSIONNEL
 * Interface complète pour la messagerie et annonces
 * 224Solutions - Bureau Syndicat System
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Bell, Users, Megaphone, Mail } from "lucide-react";

interface SyndicateCommunicationProps {
    bureauId: string;
}

export default function SyndicateCommunication({ bureauId }: SyndicateCommunicationProps) {
    const [commStats] = useState({
        totalMessages: 45,
        unreadMessages: 8,
        announcements: 12,
        claims: 3
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 text-center">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-blue-600">{commStats.totalMessages}</div>
                        <div className="text-sm text-gray-600">Messages</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold text-orange-600">{commStats.unreadMessages}</div>
                        <div className="text-sm text-gray-600">Non lus</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <Megaphone className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold text-green-600">{commStats.announcements}</div>
                        <div className="text-sm text-gray-600">Annonces</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <Users className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <div className="text-2xl font-bold text-red-600">{commStats.claims}</div>
                        <div className="text-sm text-gray-600">Revendications</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Messagerie Interne
                            <Button size="sm">
                                <Send className="w-4 h-4 mr-2" />
                                Nouveau Message
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-6">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-600">
                                Communication sécurisée entre membres du syndicat
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Annonces & Communiqués
                            <Button size="sm" variant="outline">
                                <Megaphone className="w-4 h-4 mr-2" />
                                Publier Annonce
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-6">
                            <Megaphone className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-600">
                                Diffusion d'informations à tous les membres
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Revendications Collectives</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            Dialogue Social
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Canal officiel pour les revendications et négociations
                        </p>
                        <div className="space-y-2">
                            <Badge variant="outline">Médiation automatique</Badge>
                            <Badge variant="outline">Suivi des négociations</Badge>
                            <Badge variant="outline">Historique inviolable</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
