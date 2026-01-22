/**
 * 📊 ANALYSE DE PROFIT MENSUEL - 224SOLUTIONS
 * Calcul du profit basé sur les ventes, achats et coûts fixes (loyer, abonnement)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Zap,
  Wifi,
  Shield,
  Users,
  HelpCircle,
  Calculator,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface FixedCost {
  id: string;
  vendor_id: string;
  cost_type: 'loyer' | 'abonnement' | 'salaires' | 'electricite' | 'internet' | 'assurance' | 'autre';
  label: string;
  amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MonthlyProfitAnalysisProps {
  vendorId: string; // ID de vendors (pour orders, stock_purchases)
  userId: string;   // ID de auth.users (pour vendor_expenses, vendor_fixed_costs)
}

const COST_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  loyer: { label: 'Loyer', icon: <Home className="w-4 h-4" />, color: '#EF4444' },
  abonnement: { label: 'Abonnement', icon: <CreditCard className="w-4 h-4" />, color: '#8B5CF6' },
  salaires: { label: 'Salaires', icon: <Users className="w-4 h-4" />, color: '#3B82F6' },
  electricite: { label: 'Électricité', icon: <Zap className="w-4 h-4" />, color: '#F59E0B' },
  internet: { label: 'Internet', icon: <Wifi className="w-4 h-4" />, color: '#06B6D4' },
  assurance: { label: 'Assurance', icon: <Shield className="w-4 h-4" />, color: '#10B981' },
  autre: { label: 'Autre', icon: <HelpCircle className="w-4 h-4" />, color: '#6B7280' }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-GN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount) + ' GNF';
};

export function MonthlyProfitAnalysis({ vendorId, userId }: MonthlyProfitAnalysisProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null);
  const [formData, setFormData] = useState({
    cost_type: 'loyer' as FixedCost['cost_type'],
    label: '',
    amount: ''
  });

  // Récupérer les coûts fixes (utilise userId car vendor_fixed_costs référence auth.users)
  const { data: fixedCosts = [], isLoading: loadingCosts } = useQuery({
    queryKey: ['vendor-fixed-costs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_fixed_costs')
        .select('*')
        .eq('vendor_id', userId)
        .eq('is_active', true)
        .order('cost_type');
      
      if (error) throw error;
      return (data || []) as FixedCost[];
    },
    enabled: !!userId
  });

  // Récupérer les ventes du mois (orders - utilise vendorId car orders référence vendors)
  const { data: monthlySales = 0, isLoading: loadingSales } = useQuery({
    queryKey: ['vendor-monthly-sales', vendorId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      const { data, error } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('vendor_id', vendorId)
        .in('status', ['completed', 'delivered'])
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      if (error) throw error;
      return (data || []).reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    },
    enabled: !!vendorId
  });

  // Récupérer les achats du mois (stock_purchases - utilise vendorId)
  const { data: monthlyPurchases = 0, isLoading: loadingPurchases } = useQuery({
    queryKey: ['vendor-monthly-purchases', vendorId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      const { data, error } = await supabase
        .from('stock_purchases')
        .select('total_purchase_amount')
        .eq('vendor_id', vendorId)
        .in('status', ['validated', 'completed'])
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      if (error) throw error;
      return (data || []).reduce((sum, p) => sum + Number(p.total_purchase_amount || 0), 0);
    },
    enabled: !!vendorId
  });

  // Mutation pour ajouter un coût fixe (utilise userId)
  const addCostMutation = useMutation({
    mutationFn: async (data: { cost_type: string; label: string; amount: number }) => {
      const { error } = await supabase
        .from('vendor_fixed_costs')
        .insert({
          vendor_id: userId,
          cost_type: data.cost_type,
          label: data.label,
          amount: data.amount,
          is_active: true
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-fixed-costs', userId] });
      toast({ title: 'Coût fixe ajouté avec succès' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter le coût fixe', variant: 'destructive' });
    }
  });

  // Mutation pour mettre à jour un coût fixe
  const updateCostMutation = useMutation({
    mutationFn: async (data: { id: string; cost_type: string; label: string; amount: number }) => {
      const { error } = await supabase
        .from('vendor_fixed_costs')
        .update({
          cost_type: data.cost_type,
          label: data.label,
          amount: data.amount
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-fixed-costs', userId] });
      toast({ title: 'Coût fixe mis à jour' });
      setEditingCost(null);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour', variant: 'destructive' });
    }
  });

  // Mutation pour supprimer un coût fixe
  const deleteCostMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vendor_fixed_costs')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-fixed-costs', userId] });
      toast({ title: 'Coût fixe supprimé' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({ cost_type: 'loyer', label: '', amount: '' });
  };

  const handleSubmit = () => {
    if (!formData.label || !formData.amount) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir tous les champs', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount < 0) {
      toast({ title: 'Montant invalide', variant: 'destructive' });
      return;
    }

    if (editingCost) {
      updateCostMutation.mutate({
        id: editingCost.id,
        cost_type: formData.cost_type,
        label: formData.label,
        amount
      });
    } else {
      addCostMutation.mutate({
        cost_type: formData.cost_type,
        label: formData.label,
        amount
      });
    }
  };

  const handleEdit = (cost: FixedCost) => {
    setEditingCost(cost);
    setFormData({
      cost_type: cost.cost_type,
      label: cost.label,
      amount: cost.amount.toString()
    });
    setIsAddDialogOpen(true);
  };

  // Calculs
  const totalFixedCosts = useMemo(() => {
    return fixedCosts.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
  }, [fixedCosts]);

  const grossProfit = useMemo(() => {
    return monthlySales - monthlyPurchases;
  }, [monthlySales, monthlyPurchases]);

  const netProfit = useMemo(() => {
    return grossProfit - totalFixedCosts;
  }, [grossProfit, totalFixedCosts]);

  const profitMargin = useMemo(() => {
    if (monthlySales === 0) return 0;
    return (netProfit / monthlySales) * 100;
  }, [netProfit, monthlySales]);

  // Données pour le graphique en secteurs
  const pieData = useMemo(() => {
    const costsByType: Record<string, number> = {};
    fixedCosts.forEach(cost => {
      costsByType[cost.cost_type] = (costsByType[cost.cost_type] || 0) + Number(cost.amount);
    });
    
    return Object.entries(costsByType).map(([type, amount]) => ({
      name: COST_TYPE_LABELS[type]?.label || type,
      value: amount,
      color: COST_TYPE_LABELS[type]?.color || '#6B7280'
    }));
  }, [fixedCosts]);

  const isLoading = loadingCosts || loadingSales || loadingPurchases;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: fr });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analyse de Profit Mensuel</h3>
          <p className="text-sm text-muted-foreground">{currentMonth}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingCost(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un coût fixe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCost ? 'Modifier le coût fixe' : 'Ajouter un coût fixe mensuel'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Type de coût</Label>
                <Select
                  value={formData.cost_type}
                  onValueChange={(value: FixedCost['cost_type']) => 
                    setFormData(prev => ({ ...prev, cost_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COST_TYPE_LABELS).map(([key, { label, icon }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {icon}
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Libellé</Label>
                <Input
                  placeholder="Ex: Loyer boutique"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>
              <div>
                <Label>Montant mensuel (GNF)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <Button 
                onClick={handleSubmit} 
                className="w-full"
                disabled={addCostMutation.isPending || updateCostMutation.isPending}
              >
                {(addCostMutation.isPending || updateCostMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingCost ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Résumé principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chiffre d'affaires */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventes du mois</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(monthlySales)}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coût des achats */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Achats du mois</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(monthlyPurchases)}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coûts fixes */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Coûts fixes</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(totalFixedCosts)}</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <Home className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit net */}
        <Card className={netProfit >= 0 ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profit net</p>
                <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </p>
                <p className={`text-xs ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  Marge: {profitMargin.toFixed(1)}%
                </p>
              </div>
              <div className={`p-2 rounded-full ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {netProfit >= 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détail du calcul */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="w-4 h-4" />
            Détail du calcul
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Chiffre d'affaires (ventes)</span>
              <span className="font-medium text-green-600">+ {formatCurrency(monthlySales)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Coût des achats (stock)</span>
              <span className="font-medium text-red-600">- {formatCurrency(monthlyPurchases)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2 bg-muted/50 rounded px-2">
              <span className="font-medium">Marge brute</span>
              <span className={`font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(grossProfit)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Total coûts fixes</span>
              <span className="font-medium text-red-600">- {formatCurrency(totalFixedCosts)}</span>
            </div>
            <Separator />
            <div className={`flex justify-between items-center py-3 rounded px-2 ${
              netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className="font-bold">Profit net mensuel</span>
              <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grille: Coûts fixes + Graphique */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des coûts fixes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coûts fixes mensuels</CardTitle>
          </CardHeader>
          <CardContent>
            {fixedCosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun coût fixe configuré</p>
                <p className="text-sm">Ajoutez votre loyer, abonnement, etc.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fixedCosts.map((cost) => {
                  const typeInfo = COST_TYPE_LABELS[cost.cost_type] || COST_TYPE_LABELS.autre;
                  return (
                    <div
                      key={cost.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-full" 
                          style={{ backgroundColor: `${typeInfo.color}20` }}
                        >
                          {React.cloneElement(typeInfo.icon as React.ReactElement, { 
                            style: { color: typeInfo.color } 
                          })}
                        </div>
                        <div>
                          <p className="font-medium">{cost.label}</p>
                          <Badge variant="outline" className="text-xs">
                            {typeInfo.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{formatCurrency(cost.amount)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cost)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCostMutation.mutate(cost.id)}
                          disabled={deleteCostMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Graphique répartition */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition des coûts fixes</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerte si profit négatif */}
      {netProfit < 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>Attention !</strong> Votre profit net est négatif ce mois-ci. 
            Vos dépenses ({formatCurrency(monthlyPurchases + totalFixedCosts)}) dépassent 
            vos ventes ({formatCurrency(monthlySales)}). 
            Considérez réduire vos coûts fixes ou augmenter vos ventes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
