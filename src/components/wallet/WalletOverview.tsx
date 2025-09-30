/**
 * Vue d'ensemble du tableau de bord Wallet
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import React from 'react';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import WalletTransactionService from '@/services/walletTransactionService';

// ===================================================
// TYPES
// ===================================================

interface WalletStats {
    total_users: number;
    total_wallets: number;
    total_volume: number;
    total_commissions: number;
    active_transactions: number;
}

interface WalletOverviewProps {
    stats: WalletStats;
}

// ===================================================
// DONNÉES SIMULÉES
// ===================================================

const mockRevenueData = [
    { date: '25/11', revenue: 2450000, transactions: 156, commissions: 98000 },
    { date: '26/11', revenue: 3120000, transactions: 203, commissions: 124800 },
    { date: '27/11', revenue: 2890000, transactions: 189, commissions: 115600 },
    { date: '28/11', revenue: 4200000, transactions: 267, commissions: 168000 },
    { date: '29/11', revenue: 3850000, transactions: 245, commissions: 154000 },
    { date: '30/11', revenue: 5100000, transactions: 324, commissions: 204000 },
    { date: '01/12', revenue: 4650000, transactions: 298, commissions: 186000 }
];

const mockServiceData = [
    { name: 'Orange Money', value: 45, volume: 15600000, color: '#FF6B00' },
    { name: 'MTN MoMo', value: 35, volume: 12200000, color: '#FFCC00' },
    { name: 'Cartes Bancaires', value: 15, volume: 5200000, color: '#0066CC' },
    { name: 'Virements', value: 5, volume: 1800000, color: '#00AA44' }
];

// ===================================================
// COMPOSANT
// ===================================================

const WalletOverview: React.FC<WalletOverviewProps> = ({ stats }) => {

    const formatCurrency = (amount: number) => WalletTransactionService.formatAmount(amount);

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            completed: { color: 'bg-green-100 text-green-800', label: 'Complété' },
            pending: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
            processing: { color: 'bg-blue-100 text-blue-800', label: 'En cours' },
            failed: { color: 'bg-red-100 text-red-800', label: 'Échoué' },
            cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Annulé' }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        return <Badge className={config.color}>{config.label}</Badge>;
    };

    const getRiskBadge = (score: number) => {
        if (score >= 80) return <Badge className="bg-red-100 text-red-800">Critique</Badge>;
        if (score >= 60) return <Badge className="bg-orange-100 text-orange-800">Élevé</Badge>;
        if (score >= 30) return <Badge className="bg-yellow-100 text-yellow-800">Moyen</Badge>;
        return <Badge className="bg-green-100 text-green-800">Faible</Badge>;
    };

    return (
        <div className="space-y-6">

            {/* Graphiques principaux */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Graphique des revenus */}
                <Card>
                    <CardHeader>
                        <CardTitle>Évolution des revenus (7 derniers jours)</CardTitle>
                        <CardDescription>Volume total et commissions collectées</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={mockRevenueData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: number, name: string) => [
                                        formatCurrency(value),
                                        name === 'revenue' ? 'Revenus' : 'Commissions'
                                    ]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3B82F6"
                                    fill="#3B82F6"
                                    fillOpacity={0.2}
                                    name="revenue"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="commissions"
                                    stroke="#10B981"
                                    fill="#10B981"
                                    fillOpacity={0.2}
                                    name="commissions"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Répartition par service */}
                <Card>
                    <CardHeader>
                        <CardTitle>Répartition par service</CardTitle>
                        <CardDescription>Volume des transactions par méthode de paiement</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={mockServiceData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}%`}
                                >
                                    {mockServiceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`${value}%`, 'Part']} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Légende détaillée */}
                        <div className="mt-4 space-y-2">
                            {mockServiceData.map((service, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: service.color }}
                                        />
                                        <span className="text-sm">{service.name}</span>
                                    </div>
                                    <div className="text-sm font-medium">
                                        {formatCurrency(service.volume)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Transactions récentes */}
            <Card>
                <CardHeader>
                    <CardTitle>Transactions importantes récentes</CardTitle>
                    <CardDescription>Les 10 dernières transactions de montant élevé</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID Transaction</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Montant</TableHead>
                                <TableHead>Commission</TableHead>
                                <TableHead>Service</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Risque</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Données simulées */}
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">
                                        224TXN{new Date().getFullYear()}{String(Date.now() + i).slice(-6)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {i % 4 === 0 ? 'Retrait' : i % 4 === 1 ? 'Dépôt' : i % 4 === 2 ? 'Transfert' : 'Paiement'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {formatCurrency(150000 + i * 125000)}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrency((150000 + i * 125000) * 0.02)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {i % 3 === 0 ? 'Orange Money' : i % 3 === 1 ? 'MTN MoMo' : 'Visa'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(i % 5 === 0 ? 'failed' : i % 5 === 1 ? 'pending' : 'completed')}
                                    </TableCell>
                                    <TableCell>
                                        {getRiskBadge(10 + i * 8)}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {new Date(Date.now() - i * 1800000).toLocaleString('fr-FR')}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Métriques de performance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Taux de réussite</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">97.8%</div>
                        <p className="text-sm text-muted-foreground">
                            Transactions réussies ce mois
                        </p>
                        <div className="mt-2 text-xs text-green-600">
                            +0.3% vs mois précédent
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Temps moyen</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">2.4s</div>
                        <p className="text-sm text-muted-foreground">
                            Délai de traitement moyen
                        </p>
                        <div className="mt-2 text-xs text-green-600">
                            -0.2s vs mois précédent
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Pic journalier</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">18h-20h</div>
                        <p className="text-sm text-muted-foreground">
                            Heures de forte activité
                        </p>
                        <div className="mt-2 text-xs text-muted-foreground">
                            45% du volume quotidien
                        </div>
                    </CardContent>
                </Card>

            </div>

        </div>
    );
};

export default WalletOverview;

