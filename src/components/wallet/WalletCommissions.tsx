/**
 * Gestion des commissions - Tableau de bord Wallet
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Settings, Plus, Edit, Save, X, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import WalletTransactionService, { CommissionConfig } from '@/services/walletTransactionService';

// ===================================================
// TYPES
// ===================================================

interface CommissionStats {
    total_collected: number;
    today_collected: number;
    avg_rate: number;
    top_service: string;
}

// ===================================================
// COMPOSANT
// ===================================================

const WalletCommissions: React.FC = () => {
    const [commissionConfig, setCommissionConfig] = useState<CommissionConfig[]>([]);
    const [editingConfig, setEditingConfig] = useState<string | null>(null);
    const [newConfig, setNewConfig] = useState<Partial<CommissionConfig>>({});
    const [showNewForm, setShowNewForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<CommissionStats>({
        total_collected: 0,
        today_collected: 0,
        avg_rate: 0,
        top_service: ''
    });

    // ===================================================
    // CHARGEMENT DES DONNÉES
    // ===================================================

    useEffect(() => {
        loadCommissionData();
    }, []);

    const loadCommissionData = async () => {
        try {
            setLoading(true);

            // Charger la configuration des commissions
            const config = await WalletTransactionService.getCommissionConfig();
            setCommissionConfig(config);

            // Simuler des statistiques (à remplacer par une vraie API)
            setStats({
                total_collected: 12450000,
                today_collected: 186000,
                avg_rate: 1.8,
                top_service: 'Orange Money'
            });

        } catch (error) {
            console.error('Erreur chargement commissions:', error);
            toast.error('Erreur lors du chargement des commissions');
        } finally {
            setLoading(false);
        }
    };

    // ===================================================
    // GESTION DES COMMISSIONS
    // ===================================================

    const toggleCommissionStatus = async (configId: string) => {
        try {
            const config = commissionConfig.find(c => c.id === configId);
            if (!config) return;

            const success = await WalletTransactionService.updateCommissionConfig({
                ...config,
                is_active: !config.is_active
            });

            if (success) {
                setCommissionConfig(prev =>
                    prev.map(c => c.id === configId ? { ...c, is_active: !c.is_active } : c)
                );
                toast.success(
                    `Commission ${config.is_active ? 'désactivée' : 'activée'} pour ${config.service_name}`
                );
            }
        } catch (error) {
            console.error('Erreur changement statut commission:', error);
            toast.error('Impossible de changer le statut');
        }
    };

    const updateCommissionValue = async (configId: string, field: string, value: any) => {
        try {
            const config = commissionConfig.find(c => c.id === configId);
            if (!config) return;

            const updatedConfig = { ...config, [field]: value };

            const success = await WalletTransactionService.updateCommissionConfig(updatedConfig);

            if (success) {
                setCommissionConfig(prev =>
                    prev.map(c => c.id === configId ? updatedConfig : c)
                );
                setEditingConfig(null);
                toast.success('Commission mise à jour avec succès');
            }
        } catch (error) {
            console.error('Erreur mise à jour commission:', error);
            toast.error('Impossible de mettre à jour la commission');
        }
    };

    const saveNewConfig = async () => {
        try {
            if (!newConfig.service_name || !newConfig.transaction_type || !newConfig.commission_value) {
                toast.error('Veuillez remplir tous les champs obligatoires');
                return;
            }

            // Ici, vous ajouteriez la logique pour créer une nouvelle configuration
            // const success = await WalletTransactionService.createCommissionConfig(newConfig);

            // Simulation pour l'instant
            const mockNewConfig: CommissionConfig = {
                id: `config_${Date.now()}`,
                service_name: newConfig.service_name!,
                transaction_type: newConfig.transaction_type as any,
                commission_type: newConfig.commission_type || 'percentage',
                commission_value: newConfig.commission_value!,
                min_commission: newConfig.min_commission || 0,
                max_commission: newConfig.max_commission,
                min_amount: newConfig.min_amount || 0,
                max_amount: newConfig.max_amount,
                is_active: true,
                effective_from: new Date().toISOString(),
                effective_until: newConfig.effective_until
            };

            setCommissionConfig(prev => [...prev, mockNewConfig]);
            setNewConfig({});
            setShowNewForm(false);
            toast.success('Nouvelle configuration de commission créée');

        } catch (error) {
            console.error('Erreur création commission:', error);
            toast.error('Impossible de créer la configuration');
        }
    };

    // ===================================================
    // UTILITAIRES
    // ===================================================

    const formatCurrency = (amount: number) => WalletTransactionService.formatAmount(amount);

    const getServiceColor = (serviceName: string) => {
        const colors: Record<string, string> = {
            'orange_money': 'bg-orange-100 text-orange-800',
            'mtn_momo': 'bg-yellow-100 text-yellow-800',
            'visa': 'bg-blue-100 text-blue-800',
            'mastercard': 'bg-red-100 text-red-800',
            'bank_transfer': 'bg-green-100 text-green-800',
            'internal': 'bg-gray-100 text-gray-800'
        };
        return colors[serviceName] || 'bg-gray-100 text-gray-800';
    };

    const getTransactionTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'transfer': 'Transfert',
            'deposit': 'Dépôt',
            'withdrawal': 'Retrait',
            'payment': 'Paiement',
            'mobile_money_in': 'Mobile Money (Entrée)',
            'mobile_money_out': 'Mobile Money (Sortie)',
            'card_payment': 'Paiement Carte',
            'bank_transfer': 'Virement Bancaire'
        };
        return labels[type] || type;
    };

    // ===================================================
    // RENDU
    // ===================================================

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Chargement des commissions...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Statistiques des commissions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Collecté</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.total_collected)}</div>
                        <p className="text-xs text-green-600">+15.3% ce mois</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aujourd'hui</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.today_collected)}</div>
                        <p className="text-xs text-green-600">+8.2% vs hier</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taux Moyen</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avg_rate}%</div>
                        <p className="text-xs text-muted-foreground">Commission moyenne</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Service</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{stats.top_service}</div>
                        <p className="text-xs text-muted-foreground">Plus rentable</p>
                    </CardContent>
                </Card>

            </div>

            {/* Configuration des commissions */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center space-x-2">
                                <Settings className="w-5 h-5" />
                                <span>Configuration des commissions</span>
                            </CardTitle>
                            <CardDescription>
                                Gérer les taux de commission par service et type de transaction
                            </CardDescription>
                        </div>
                        <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nouvelle commission
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Créer une nouvelle commission</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Service</Label>
                                            <Select
                                                value={newConfig.service_name}
                                                onValueChange={(value) => setNewConfig({ ...newConfig, service_name: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un service" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="orange_money">Orange Money</SelectItem>
                                                    <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                                                    <SelectItem value="visa">Visa</SelectItem>
                                                    <SelectItem value="mastercard">Mastercard</SelectItem>
                                                    <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                                                    <SelectItem value="internal">Interne</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Type de transaction</Label>
                                            <Select
                                                value={newConfig.transaction_type}
                                                onValueChange={(value) => setNewConfig({ ...newConfig, transaction_type: value as any })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Type de transaction" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="transfer">Transfert</SelectItem>
                                                    <SelectItem value="deposit">Dépôt</SelectItem>
                                                    <SelectItem value="withdrawal">Retrait</SelectItem>
                                                    <SelectItem value="payment">Paiement</SelectItem>
                                                    <SelectItem value="mobile_money_in">Mobile Money (Entrée)</SelectItem>
                                                    <SelectItem value="mobile_money_out">Mobile Money (Sortie)</SelectItem>
                                                    <SelectItem value="card_payment">Paiement Carte</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Taux (%)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="1.5"
                                                value={newConfig.commission_value || ''}
                                                onChange={(e) => setNewConfig({ ...newConfig, commission_value: parseFloat(e.target.value) })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Commission min (XAF)</Label>
                                            <Input
                                                type="number"
                                                placeholder="100"
                                                value={newConfig.min_commission || ''}
                                                onChange={(e) => setNewConfig({ ...newConfig, min_commission: parseFloat(e.target.value) })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Commission max (XAF)</Label>
                                            <Input
                                                type="number"
                                                placeholder="5000"
                                                value={newConfig.max_commission || ''}
                                                onChange={(e) => setNewConfig({ ...newConfig, max_commission: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowNewForm(false)}>
                                        Annuler
                                    </Button>
                                    <Button onClick={saveNewConfig}>
                                        <Save className="w-4 h-4 mr-2" />
                                        Créer
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>

                    {commissionConfig.length === 0 ? (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Aucune configuration de commission trouvée. Créez votre première commission.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            {commissionConfig.map(config => (
                                <div key={config.id} className="border rounded-lg p-4 space-y-4">

                                    {/* En-tête de la configuration */}
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-3">
                                            <Badge className={getServiceColor(config.service_name)}>
                                                {config.service_name.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {getTransactionTypeLabel(config.transaction_type)}
                                            </span>
                                            {!config.is_active && (
                                                <Badge variant="secondary">Inactif</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={config.is_active}
                                                onCheckedChange={() => toggleCommissionStatus(config.id)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditingConfig(editingConfig === config.id ? null : config.id)}
                                            >
                                                {editingConfig === config.id ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Champs de configuration */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                                        <div className="space-y-2">
                                            <Label>Taux (%)</Label>
                                            {editingConfig === config.id ? (
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={config.commission_value}
                                                    onBlur={(e) => updateCommissionValue(config.id, 'commission_value', parseFloat(e.target.value))}
                                                />
                                            ) : (
                                                <div className="text-lg font-medium text-blue-600">
                                                    {config.commission_value}%
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Commission min</Label>
                                            {editingConfig === config.id ? (
                                                <Input
                                                    type="number"
                                                    defaultValue={config.min_commission}
                                                    onBlur={(e) => updateCommissionValue(config.id, 'min_commission', parseFloat(e.target.value))}
                                                />
                                            ) : (
                                                <div className="font-medium">
                                                    {formatCurrency(config.min_commission)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Commission max</Label>
                                            {editingConfig === config.id ? (
                                                <Input
                                                    type="number"
                                                    defaultValue={config.max_commission || ''}
                                                    onBlur={(e) => updateCommissionValue(config.id, 'max_commission', parseFloat(e.target.value) || null)}
                                                />
                                            ) : (
                                                <div className="font-medium">
                                                    {config.max_commission ? formatCurrency(config.max_commission) : 'Illimité'}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <Badge variant="outline" className="w-full justify-center">
                                                {config.commission_type.toUpperCase()}
                                            </Badge>
                                        </div>

                                    </div>

                                    {/* Informations supplémentaires */}
                                    <div className="text-xs text-muted-foreground border-t pt-2">
                                        <div className="flex justify-between">
                                            <span>Effectif depuis : {new Date(config.effective_from).toLocaleDateString('fr-FR')}</span>
                                            {config.effective_until && (
                                                <span>Jusqu'au : {new Date(config.effective_until).toLocaleDateString('fr-FR')}</span>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}

                </CardContent>
            </Card>

            {/* Historique des commissions collectées */}
            <Card>
                <CardHeader>
                    <CardTitle>Historique des commissions (dernières 24h)</CardTitle>
                    <CardDescription>
                        Détail des commissions collectées récemment
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transaction</TableHead>
                                <TableHead>Service</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Montant transaction</TableHead>
                                <TableHead>Taux appliqué</TableHead>
                                <TableHead>Commission</TableHead>
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
                                    <TableCell>
                                        <Badge className={getServiceColor(['orange_money', 'mtn_momo', 'visa'][i % 3])}>
                                            {['Orange Money', 'MTN MoMo', 'Visa'][i % 3]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {['Transfer', 'Payment', 'Deposit'][i % 3]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {formatCurrency(100000 + i * 50000)}
                                    </TableCell>
                                    <TableCell>
                                        {(1.5 + i * 0.2).toFixed(2)}%
                                    </TableCell>
                                    <TableCell className="font-medium text-green-600">
                                        {formatCurrency((100000 + i * 50000) * (1.5 + i * 0.2) / 100)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {new Date(Date.now() - i * 1800000).toLocaleString('fr-FR')}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
};

export default WalletCommissions;

