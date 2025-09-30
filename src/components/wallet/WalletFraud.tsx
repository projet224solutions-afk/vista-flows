/**
 * Système anti-fraude - Tableau de bord Wallet
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
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Alert, AlertDescription
} from "@/components/ui/alert";
import {
    Shield, AlertTriangle, TrendingUp, Activity, Clock, Ban, CheckCircle, XCircle
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import WalletTransactionService from '@/services/walletTransactionService';

// ===================================================
// DONNÉES SIMULÉES
// ===================================================

const mockFraudData = [
    { date: '25/11', detected: 12, blocked: 8, amount: 4200000 },
    { date: '26/11', detected: 15, blocked: 11, amount: 5800000 },
    { date: '27/11', detected: 9, blocked: 6, amount: 2900000 },
    { date: '28/11', detected: 18, blocked: 14, amount: 7100000 },
    { date: '29/11', detected: 13, blocked: 9, amount: 4600000 },
    { date: '30/11', detected: 21, blocked: 16, amount: 8200000 },
    { date: '01/12', detected: 16, blocked: 12, amount: 6300000 }
];

const mockRiskDistribution = [
    { name: 'Faible', value: 65, color: '#10B981', count: 456 },
    { name: 'Moyen', value: 25, color: '#F59E0B', count: 175 },
    { name: 'Élevé', value: 8, color: '#EF4444', count: 56 },
    { name: 'Critique', value: 2, color: '#DC2626', count: 14 }
];

const mockFraudRules = [
    {
        id: 'high_volume',
        name: 'Volume quotidien élevé',
        description: '> 50 transactions par jour',
        enabled: true,
        triggered_today: 12,
        blocked_today: 8
    },
    {
        id: 'suspicious_amount',
        name: 'Montant suspect',
        description: '> 10x la moyenne utilisateur',
        enabled: true,
        triggered_today: 6,
        blocked_today: 6
    },
    {
        id: 'multiple_locations',
        name: 'Localisations multiples',
        description: '> 3 adresses IP différentes/heure',
        enabled: true,
        triggered_today: 4,
        blocked_today: 2
    },
    {
        id: 'high_frequency',
        name: 'Fréquence anormale',
        description: '> 10 transactions par heure',
        enabled: true,
        triggered_today: 8,
        blocked_today: 5
    },
    {
        id: 'blacklist_ip',
        name: 'IP blacklistée',
        description: 'Adresses IP suspectes connues',
        enabled: true,
        triggered_today: 3,
        blocked_today: 3
    },
    {
        id: 'device_change',
        name: 'Changement d\'appareil',
        description: 'Nouvel appareil pour l\'utilisateur',
        enabled: false,
        triggered_today: 0,
        blocked_today: 0
    }
];

// ===================================================
// COMPOSANT
// ===================================================

const WalletFraud: React.FC = () => {
    const [rules, setRules] = useState(mockFraudRules);
    const [selectedPeriod, setSelectedPeriod] = useState('7d');

    const formatCurrency = (amount: number) => WalletTransactionService.formatAmount(amount);

    const toggleRule = (ruleId: string) => {
        setRules(prev =>
            prev.map(rule =>
                rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
            )
        );
    };

    const getRiskBadge = (level: string) => {
        const config = {
            'Faible': 'bg-green-100 text-green-800',
            'Moyen': 'bg-yellow-100 text-yellow-800',
            'Élevé': 'bg-orange-100 text-orange-800',
            'Critique': 'bg-red-100 text-red-800'
        };
        return <Badge className={config[level as keyof typeof config]}>{level}</Badge>;
    };

    const getActionBadge = (action: string) => {
        const config = {
            'blocked': { icon: Ban, color: 'bg-red-100 text-red-800', label: 'Bloqué' },
            'allowed': { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Autorisé' },
            'review': { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'En révision' },
            'rejected': { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejeté' }
        };

        const cfg = config[action as keyof typeof config] || config.review;
        const Icon = cfg.icon;

        return (
            <Badge className={cfg.color}>
                <Icon className="w-3 h-3 mr-1" />
                {cfg.label}
            </Badge>
        );
    };

    // Calculs des statistiques
    const totalDetected = mockFraudData.reduce((sum, day) => sum + day.detected, 0);
    const totalBlocked = mockFraudData.reduce((sum, day) => sum + day.blocked, 0);
    const totalAmount = mockFraudData.reduce((sum, day) => sum + day.amount, 0);
    const blockRate = totalDetected > 0 ? (totalBlocked / totalDetected * 100) : 0;

    return (
        <div className="space-y-6">

            {/* Statistiques anti-fraude */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Détections</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{totalDetected}</div>
                        <p className="text-xs text-muted-foreground">7 derniers jours</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bloquées</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{totalBlocked}</div>
                        <p className="text-xs text-green-600">+12% vs semaine précédente</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Montant protégé</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
                        <p className="text-xs text-muted-foreground">Fraudes évitées</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taux de blocage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{blockRate.toFixed(1)}%</div>
                        <p className="text-xs text-green-600">Efficacité du système</p>
                    </CardContent>
                </Card>

            </div>

            {/* Graphiques et analyse */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Évolution des détections */}
                <Card>
                    <CardHeader>
                        <CardTitle>Détections de fraude (7 derniers jours)</CardTitle>
                        <CardDescription>Évolution quotidienne des tentatives détectées et bloquées</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={mockFraudData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="detected" fill="#F59E0B" name="Détectées" />
                                <Bar dataKey="blocked" fill="#EF4444" name="Bloquées" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Répartition par niveau de risque */}
                <Card>
                    <CardHeader>
                        <CardTitle>Répartition par niveau de risque</CardTitle>
                        <CardDescription>Distribution des transactions selon leur score de risque</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={mockRiskDistribution}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}%`}
                                >
                                    {mockRiskDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Détails */}
                        <div className="mt-4 space-y-2">
                            {mockRiskDistribution.map((risk, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: risk.color }}
                                        />
                                        <span className="text-sm">{risk.name}</span>
                                    </div>
                                    <div className="text-sm font-medium">
                                        {risk.count} transactions
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Règles anti-fraude */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Shield className="w-5 h-5" />
                        <span>Règles anti-fraude</span>
                    </CardTitle>
                    <CardDescription>
                        Configuration et statistiques des règles de détection
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {rules.map(rule => (
                            <div key={rule.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start">

                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h4 className="font-medium">{rule.name}</h4>
                                            <Switch
                                                checked={rule.enabled}
                                                onCheckedChange={() => toggleRule(rule.id)}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {rule.description}
                                        </p>

                                        {rule.enabled && (
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Déclenchements</div>
                                                    <div className="font-medium text-orange-600">
                                                        {rule.triggered_today} aujourd'hui
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Blocages</div>
                                                    <div className="font-medium text-red-600">
                                                        {rule.blocked_today} aujourd'hui
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Efficacité</div>
                                                    <div className="font-medium text-blue-600">
                                                        {rule.triggered_today > 0
                                                            ? Math.round((rule.blocked_today / rule.triggered_today) * 100)
                                                            : 0
                                                        }%
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="ml-4">
                                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                                            {rule.enabled ? 'Actif' : 'Inactif'}
                                        </Badge>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Incidents récents */}
            <Card>
                <CardHeader>
                    <CardTitle>Incidents de fraude récents</CardTitle>
                    <CardDescription>
                        Dernières tentatives de fraude détectées et actions prises
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transaction</TableHead>
                                <TableHead>Utilisateur</TableHead>
                                <TableHead>Montant</TableHead>
                                <TableHead>Score de risque</TableHead>
                                <TableHead>Règles déclenchées</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Données simulées */}
                            {Array.from({ length: 10 }, (_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-mono text-xs">
                                        224TXN{new Date().getFullYear()}{String(Date.now() + i).slice(-6)}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        frauduser_{i}@email.com
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {formatCurrency(500000 + i * 1000000)}
                                    </TableCell>
                                    <TableCell>
                                        {getRiskBadge(['Critique', 'Élevé', 'Moyen'][i % 3])}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {i % 2 === 0 ? 'Volume élevé, Montant suspect' : 'IP multiple, Fréquence'}
                                    </TableCell>
                                    <TableCell>
                                        {getActionBadge(['blocked', 'review', 'blocked', 'rejected'][i % 4])}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {new Date(Date.now() - i * 3600000).toLocaleString('fr-FR')}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Alertes de sécurité */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <Card>
                    <CardHeader>
                        <CardTitle className="text-orange-600">Alertes actives</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Alert className="border-orange-500 bg-orange-50">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Pic de fraude détecté</strong> - 16 tentatives dans la dernière heure
                            </AlertDescription>
                        </Alert>

                        <Alert className="border-yellow-500 bg-yellow-50">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Nouvelle IP suspecte</strong> - 5 transactions depuis 192.168.1.100
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-green-600">Système opérationnel</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm">Moteur anti-fraude</span>
                            <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Actif
                            </Badge>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm">Base de données des menaces</span>
                            <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                À jour
                            </Badge>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm">Surveillance temps réel</span>
                            <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Opérationnel
                            </Badge>
                        </div>

                        <div className="pt-2 border-t">
                            <div className="text-xs text-muted-foreground">Dernière mise à jour</div>
                            <div className="text-sm font-medium">
                                {new Date().toLocaleString('fr-FR')}
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>

        </div>
    );
};

export default WalletFraud;

