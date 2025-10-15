/**
 * GESTION DES TICKETS ROUTIERS ULTRA PROFESSIONNELLE
 * Interface complète pour la génération et gestion des tickets routiers
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, QrCode, Download, Plus, Calendar, Search, Filter, Eye } from "lucide-react";
import { toast } from "sonner";

interface SyndicateRoadTicketsProps {
    bureauId: string;
}

interface RoadTicket {
    id: string;
    ticketNumber: string;
    memberName: string;
    memberId: string;
    vehicleSerial: string;
    ticketType: 'daily' | 'weekly' | 'monthly';
    amount: number;
    status: 'active' | 'expired' | 'used';
    issuedDate: string;
    expiryDate: string;
    qrCode: string;
    issuedBy: string;
}

export default function SyndicateRoadTickets({ bureauId }: SyndicateRoadTicketsProps) {
    const [tickets, setTickets] = useState<RoadTicket[]>([]);
    const [newTicket, setNewTicket] = useState({
        memberName: '',
        memberId: '',
        vehicleSerial: '',
        ticketType: 'daily' as 'daily' | 'weekly' | 'monthly'
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'used'>('all');
    const [showGenerateForm, setShowGenerateForm] = useState(false);

    // Statistiques en temps réel
    const [ticketStats, setTicketStats] = useState({
        totalTickets: 0,
        activeTickets: 0,
        expiredTickets: 0,
        monthlyRevenue: 0
    });

    useEffect(() => {
        loadTicketsData();
    }, [bureauId]);

    const loadTicketsData = async () => {
        try {
            // Simuler le chargement des tickets
            const mockTickets: RoadTicket[] = [
                {
                    id: '1',
                    ticketNumber: 'TKT-2025-000001',
                    memberName: 'Amadou Ba',
                    memberId: 'MBR-001',
                    vehicleSerial: 'MT-001-2024',
                    ticketType: 'daily',
                    amount: 500,
                    status: 'active',
                    issuedDate: new Date().toISOString(),
                    expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    qrCode: 'QR-CODE-001',
                    issuedBy: 'Président'
                },
                {
                    id: '2',
                    ticketNumber: 'TKT-2025-000002',
                    memberName: 'Fatou Diallo',
                    memberId: 'MBR-002',
                    vehicleSerial: 'TX-002-2024',
                    ticketType: 'weekly',
                    amount: 3000,
                    status: 'active',
                    issuedDate: new Date().toISOString(),
                    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    qrCode: 'QR-CODE-002',
                    issuedBy: 'Secrétaire'
                }
            ];

            setTickets(mockTickets);
            updateStats(mockTickets);
        } catch (error) {
            console.error('Erreur chargement tickets:', error);
            toast.error('Erreur lors du chargement des tickets');
        }
    };

    const updateStats = (ticketsList: RoadTicket[]) => {
        const total = ticketsList.length;
        const active = ticketsList.filter(t => t.status === 'active').length;
        const expired = ticketsList.filter(t => t.status === 'expired').length;
        const revenue = ticketsList
            .filter(t => t.status === 'active')
            .reduce((sum, t) => sum + t.amount, 0);

        setTicketStats({
            totalTickets: total,
            activeTickets: active,
            expiredTickets: expired,
            monthlyRevenue: revenue
        });
    };

    const generateTicket = async () => {
        if (!newTicket.memberName || !newTicket.memberId || !newTicket.vehicleSerial) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        try {
            const ticketNumber = `TKT-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(6, '0')}`;
            const amounts = { daily: 500, weekly: 3000, monthly: 10000 };
            const expiryDays = { daily: 1, weekly: 7, monthly: 30 };

            const ticket: RoadTicket = {
                id: Date.now().toString(),
                ticketNumber,
                memberName: newTicket.memberName,
                memberId: newTicket.memberId,
                vehicleSerial: newTicket.vehicleSerial,
                ticketType: newTicket.ticketType,
                amount: amounts[newTicket.ticketType],
                status: 'active',
                issuedDate: new Date().toISOString(),
                expiryDate: new Date(Date.now() + expiryDays[newTicket.ticketType] * 24 * 60 * 60 * 1000).toISOString(),
                qrCode: `QR-${ticketNumber}`,
                issuedBy: 'Président'
            };

            setTickets(prev => [ticket, ...prev]);
            setNewTicket({ memberName: '', memberId: '', vehicleSerial: '', ticketType: 'daily' });
            setShowGenerateForm(false);
            updateStats([ticket, ...tickets]);
            toast.success('Ticket généré avec succès');
        } catch (error) {
            console.error('Erreur génération ticket:', error);
            toast.error('Erreur lors de la génération du ticket');
        }
    };

    const downloadTicket = (ticket: RoadTicket) => {
        // Simuler le téléchargement du ticket
        const ticketData = {
            ticketNumber: ticket.ticketNumber,
            memberName: ticket.memberName,
            vehicleSerial: ticket.vehicleSerial,
            amount: ticket.amount,
            expiryDate: ticket.expiryDate,
            qrCode: ticket.qrCode
        };

        const dataStr = JSON.stringify(ticketData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `ticket-${ticket.ticketNumber}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        toast.success('Ticket téléchargé avec succès');
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = searchTerm === '' ||
            ticket.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.vehicleSerial.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterStatus === 'all' || ticket.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6">
            {/* Statistiques en temps réel */}
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
                            {ticketStats.monthlyRevenue.toLocaleString()} GNF
                        </div>
                        <div className="text-sm text-gray-600">Revenus ce mois</div>
                    </CardContent>
                </Card>
            </div>

            {/* Formulaire de génération de ticket */}
            {showGenerateForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Générer un Nouveau Ticket</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                placeholder="Nom du membre"
                                value={newTicket.memberName}
                                onChange={(e) => setNewTicket(prev => ({ ...prev, memberName: e.target.value }))}
                            />
                            <Input
                                placeholder="ID du membre"
                                value={newTicket.memberId}
                                onChange={(e) => setNewTicket(prev => ({ ...prev, memberId: e.target.value }))}
                            />
                            <Input
                                placeholder="Numéro de série du véhicule"
                                value={newTicket.vehicleSerial}
                                onChange={(e) => setNewTicket(prev => ({ ...prev, vehicleSerial: e.target.value }))}
                            />
                            <Select
                                value={newTicket.ticketType}
                                onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                                    setNewTicket(prev => ({ ...prev, ticketType: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Type de ticket" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Journalier (0 GNF)</SelectItem>
                                    <SelectItem value="weekly">Hebdomadaire (0 GNF)</SelectItem>
                                    <SelectItem value="monthly">Mensuel (0 GNF)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex space-x-2 mt-4">
                            <Button onClick={generateTicket} className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Générer Ticket
                            </Button>
                            <Button variant="outline" onClick={() => setShowGenerateForm(false)}>
                                Annuler
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Liste des tickets */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Tickets Routiers
                        <div className="flex space-x-2">
                            <Button
                                onClick={() => setShowGenerateForm(!showGenerateForm)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {showGenerateForm ? 'Masquer Formulaire' : 'Générer Ticket'}
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Filtres et recherche */}
                    <div className="flex space-x-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Rechercher par nom, numéro de ticket ou véhicule..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filtrer par statut" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les tickets</SelectItem>
                                <SelectItem value="active">Tickets actifs</SelectItem>
                                <SelectItem value="expired">Tickets expirés</SelectItem>
                                <SelectItem value="used">Tickets utilisés</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Liste des tickets */}
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {filteredTickets.map((ticket) => (
                            <div key={ticket.id} className="p-4 rounded-lg border bg-gray-50">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="font-semibold text-sm text-gray-700">{ticket.memberName}</span>
                                            <Badge variant={ticket.status === 'active' ? 'default' : 'secondary'}>
                                                {ticket.status}
                                            </Badge>
                                            <Badge variant="outline">
                                                {ticket.ticketType}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <div>Ticket: {ticket.ticketNumber}</div>
                                            <div>Véhicule: {ticket.vehicleSerial}</div>
                                            <div>Montant: {ticket.amount.toLocaleString()} GNF</div>
                                            <div>Expire le: {new Date(ticket.expiryDate).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2 ml-4">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => downloadTicket(ticket)}
                                        >
                                            <Download className="w-4 h-4 mr-1" />
                                            Télécharger
                                        </Button>
                                        <Button size="sm" variant="outline">
                                            <Eye className="w-4 h-4 mr-1" />
                                            Voir QR
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredTickets.length === 0 && (
                            <div className="text-center py-8">
                                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <p className="text-gray-600">Aucun ticket trouvé</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
