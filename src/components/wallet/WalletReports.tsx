/**
 * Rapports et analytics - Tableau de bord Wallet
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Download, Calendar, TrendingUp, FileText, BarChart3, PieChart,
    Clock, DollarSign, Users, Activity, Zap
} from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { toast } from "sonner";
import WalletTransactionService from '@/services/walletTransactionService';

// ===================================================
// TYPES
// ===================================================

interface ReportFilter {
    period: string;
    service?: string;
    type?: string;
    format: string;
}

// ===================================================
// DONNÉES SIMULÉES
// ===================================================

const mockMonthlyData = [
    { month: 'Jan', revenue: 8500000, transactions: 1240, users: 156, commissions: 340000 },
    { month: 'Fév', revenue: 9200000, transactions: 1380, users: 189, commissions: 368000 },
    { month: 'Mar', revenue: 10100000, transactions: 1520, users: 234, commissions: 404000 },
    { month: 'Avr', revenue: 11300000, transactions: 1690, users: 267, commissions: 452000 },
    { month: 'Mai', revenue: 12800000, transactions: 1840, users: 298, commissions: 512000 },
    { month: 'Jun', revenue: 13900000, transactions: 1980, users: 334, commissions: 556000 },
    { month: 'Jul', revenue: 15200000, transactions: 2150, users: 367, commissions: 608000 },
    { month: 'Aoû', revenue: 16100000, transactions: 2280, users: 412, commissions: 644000 },
    { month: 'Sep', revenue: 17400000, transactions: 2420, users: 456, commissions: 696000 },
    { month: 'Oct', revenue: 18900000, transactions: 2680, users: 489, commissions: 756000 },
    { month: 'Nov', revenue: 20200000, transactions: 2840, users: 523, commissions: 808000 },
    { month: 'Déc', revenue: 21500000, transactions: 3020, users: 567, commissions: 860000 }
];

const mockServicePerformance = [
    {
        service: 'Orange Money',
        volume: 45600000,
        transactions: 8940,
        avg_amount: 5100,
        commission_rate: 1.8,
        growth: 12.5
    },
    {
        service: 'MTN MoMo',
        volume: 38200000,
        transactions: 7650,
        avg_amount: 4990,
        commission_rate: 1.9,
        growth: 15.2
    },
    {
        service: 'Cartes Bancaires',
        volume: 24800000,
        transactions: 3420,
        avg_amount: 7250,
        commission_rate: 2.5,
        growth: 8.7
    },
    {
        service: 'Virements',
        volume: 15600000,
        transactions: 1280,
        avg_amount: 12190,
        commission_rate: 0.8,
        growth: 22.1
    }
];

const mockTopUsers = [
    { email: 'merchant1@224.cm', volume: 5600000, transactions: 234, commissions: 112000 },
    { email: 'enterprise@big.cm', volume: 4200000, transactions: 156, commissions: 105000 },
    { email: 'vendor@market.cm', volume: 3800000, transactions: 189, commissions: 95000 },
    { email: 'shop@online.cm', volume: 3200000, transactions: 167, commissions: 80000 },
    { email: 'trader@goods.cm', volume: 2900000, transactions: 145, commissions: 72500 }
];

const mockPredictiveData = [
    { period: 'Déc 2024', actual: 21500000, predicted: null },
    { period: 'Jan 2025', actual: null, predicted: 23100000 },
    { period: 'Fév 2025', actual: null, predicted: 24800000 },
    { period: 'Mar 2025', actual: null, predicted: 26200000 },
    { period: 'Avr 2025', actual: null, predicted: 27900000 },
    { period: 'Mai 2025', actual: null, predicted: 29400000 }
];

// ===================================================
// COMPOSANT
// ===================================================

const WalletReports: React.FC = () => {
    const [filter, setFilter] = useState<ReportFilter>({
        period: '12m',
        format: 'pdf'
    });
    const [loading, setLoading] = useState(false);

    const formatCurrency = (amount: number) => WalletTransactionService.formatAmount(amount);

    const generateReport = async () => {
        setLoading(true);
        try {
            // Simuler la génération de rapport
            await new Promise(resolve => setTimeout(resolve, 2000));

            const reportName = `rapport-wallet-${filter.period}-${Date.now()}.${filter.format}`;
            toast.success(`Rapport "${reportName}" généré avec succès`);

            // Dans un vrai système, ici vous déclencheriez le téléchargement
            console.log('Génération du rapport:', { filter, reportName });

        } catch (error) {
            console.error('Erreur génération rapport:', error);
            toast.error('Erreur lors de la génération du rapport');
        } finally {
            setLoading(false);
        }
    };

    const exportData = (type: string) => {
        toast.success(`Export ${type} en cours...`);
        // Logique d'export
    };

    return (
        <div className="space-y-6">

            {/* Générateur de rapports */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span>Générateur de rapports</span>
                    </CardTitle>
                    <CardDescription>
                        Créer des rapports personnalisés sur les performances wallet
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">

                        <div className="space-y-2">
                            <Label>Période</Label>
                            <Select
                                value={filter.period}
                                onValueChange={(value) => setFilter({ ...filter, period: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1d">Aujourd'hui</SelectItem>
                                    <SelectItem value="7d">7 derniers jours</SelectItem>
                                    <SelectItem value="30d">30 derniers jours</SelectItem>
                                    <SelectItem value="3m">3 derniers mois</SelectItem>
                                    <SelectItem value="6m">6 derniers mois</SelectItem>
                                    <SelectItem value="12m">12 derniers mois</SelectItem>
                                    <SelectItem value="custom">Personnalisé</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Service</Label>
                            <Select
                                value={filter.service || 'all'}
                                onValueChange={(value) => setFilter({ ...filter, service: value === 'all' ? undefined : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous les services" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les services</SelectItem>
                                    <SelectItem value="orange_money">Orange Money</SelectItem>
                                    <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                                    <SelectItem value="cards">Cartes bancaires</SelectItem>
                                    <SelectItem value="bank">Virements</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Type de transaction</Label>
                            <Select
                                value={filter.type || 'all'}
                                onValueChange={(value) => setFilter({ ...filter, type: value === 'all' ? undefined : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous les types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les types</SelectItem>
                                    <SelectItem value="transfer">Transferts</SelectItem>
                                    <SelectItem value="payment">Paiements</SelectItem>
                                    <SelectItem value="deposit">Dépôts</SelectItem>
                                    <SelectItem value="withdrawal">Retraits</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Format</Label>
                            <Select
                                value={filter.format}
                                onValueChange={(value) => setFilter({ ...filter, format: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="excel">Excel</SelectItem>
                                    <SelectItem value="csv">CSV</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                    </div>

                    <Button
                        onClick={generateReport}
                        disabled={loading}
                        className="w-full md:w-auto"
                    >
                        <Download className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Génération en cours...' : 'Générer le rapport'}
                    </Button>
                </CardContent>
            </Card>

            {/* KPIs de performance */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Croissance annuelle</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+152%</div>
                        <p className="text-xs text-muted-foreground">Volume vs année précédente</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rentabilité</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">4.2%</div>
                        <p className="text-xs text-muted-foreground">Marge sur commissions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rétention</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">94.7%</div>
                        <p className="text-xs text-muted-foreground">Utilisateurs actifs mensuels</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Performance</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">99.2%</div>
                        <p className="text-xs text-muted-foreground">Disponibilité du système</p>
                    </CardContent>
                </Card>

            </div>

            {/* Analyse temporelle */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Évolution annuelle */}
                <Card>
                    <CardHeader>
                        <CardTitle>Évolution des revenus (12 mois)</CardTitle>
                        <CardDescription>Progression mensuelle du chiffre d'affaires</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={mockMonthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3B82F6"
                                    fill="#3B82F6"
                                    fillOpacity={0.2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Prédictions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Prévisions (6 prochains mois)</CardTitle>
                        <CardDescription>Analyse prédictive basée sur l'IA</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={mockPredictiveData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => value ? formatCurrency(value) : 'N/A'} />
                                <Line
                                    type="monotone"
                                    dataKey="actual"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    name="Réel"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="predicted"
                                    stroke="#F59E0B"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    name="Prévu"
                                />
                                <Legend />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

            </div>

            {/* Performance par service */}
            <Card>
                <CardHeader>
                    <CardTitle>Performance par service de paiement</CardTitle>
                    <CardDescription>
                        Analyse comparative des différents moyens de paiement
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Service</TableHead>
                                <TableHead>Volume total</TableHead>
                                <TableHead>Nb transactions</TableHead>
                                <TableHead>Montant moyen</TableHead>
                                <TableHead>Taux commission</TableHead>
                                <TableHead>Croissance</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockServicePerformance.map((service, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{service.service}</TableCell>
                                    <TableCell>{formatCurrency(service.volume)}</TableCell>
                                    <TableCell>{service.transactions.toLocaleString()}</TableCell>
                                    <TableCell>{formatCurrency(service.avg_amount)}</TableCell>
                                    <TableCell>{service.commission_rate}%</TableCell>
                                    <TableCell>
                                        <Badge className="bg-green-100 text-green-800">
                                            +{service.growth}%
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => exportData(service.service)}
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Top utilisateurs */}
            <Card>
                <CardHeader>
                    <CardTitle>Top utilisateurs par volume</CardTitle>
                    <CardDescription>
                        Les 5 utilisateurs générant le plus de revenus
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Utilisateur</TableHead>
                                <TableHead>Volume total</TableHead>
                                <TableHead>Nb transactions</TableHead>
                                <TableHead>Commissions générées</TableHead>
                                <TableHead>Part du CA</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockTopUsers.map((user, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{user.email}</TableCell>
                                    <TableCell>{formatCurrency(user.volume)}</TableCell>
                                    <TableCell>{user.transactions}</TableCell>
                                    <TableCell className="font-medium text-green-600">
                                        {formatCurrency(user.commissions)}
                                    </TableCell>
                                    <TableCell>
                                        {((user.volume / mockServicePerformance.reduce((sum, s) => sum + s.volume, 0)) * 100).toFixed(1)}%
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Rapport quotidien</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Synthèse des activités du jour avec métriques clés
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => exportData('daily')}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger PDF
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Analyse mensuelle</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Bilan complet du mois avec tendances et projections
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => exportData('monthly')}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger Excel
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Export données brutes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Export complet des transactions pour analyse avancée
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => exportData('raw')}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger CSV
                        </Button>
                    </CardContent>
                </Card>

            </div>

            {/* Alertes et recommandations */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-orange-600">Recommandations IA</CardTitle>
                    <CardDescription>
                        Suggestions d'optimisation basées sur l'analyse des données
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    <div className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-medium text-blue-800">Optimisation des commissions</h4>
                        <p className="text-sm text-muted-foreground">
                            Le taux de commission MTN MoMo pourrait être augmenté de 0.2% sans impact sur le volume
                        </p>
                    </div>

                    <div className="border-l-4 border-green-500 pl-4">
                        <h4 className="font-medium text-green-800">Croissance prévue</h4>
                        <p className="text-sm text-muted-foreground">
                            Les virements bancaires montrent une croissance de 22%. Considérer une promotion ciblée
                        </p>
                    </div>

                    <div className="border-l-4 border-yellow-500 pl-4">
                        <h4 className="font-medium text-yellow-800">Surveillance requise</h4>
                        <p className="text-sm text-muted-foreground">
                            Pic d'activité inhabituel détecté chez 3 utilisateurs. Vérification recommandée
                        </p>
                    </div>

                </CardContent>
            </Card>

        </div>
    );
};

export default WalletReports;

