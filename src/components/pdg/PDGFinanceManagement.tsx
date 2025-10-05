/**
 * 🏦 INTERFACE PDG - GESTION DES TAUX DE CHANGE
 * Interface complète pour le PDG pour gérer les taux de change manuellement
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { GlobalCurrencyService, Currency } from '@/services/GlobalCurrencyService';
import { PDGExchangeRateService, RateSimulation } from '@/services/PDGExchangeRateService';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calculator, 
  History, 
  Settings, 
  Save, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Globe,
  Edit,
  Trash2
} from 'lucide-react';

interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  lastUpdated: string;
  updatedBy?: string;
}

interface RateHistory {
  fromCurrency: string;
  toCurrency: string;
  oldRate: number;
  newRate: number;
  updatedBy: string;
  updatedAt: string;
  reason?: string;
}

export default function PDGFinanceManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // États principaux
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('rates');
  
  // États pour l'édition des taux
  const [editingRate, setEditingRate] = useState<{
    fromCurrency: string;
    toCurrency: string;
    rate: number;
  } | null>(null);
  const [newRate, setNewRate] = useState('');
  const [updateReason, setUpdateReason] = useState('');
  
  // États pour la simulation
  const [simulation, setSimulation] = useState<RateSimulation | null>(null);
  const [simulationAmount, setSimulationAmount] = useState('');
  const [simulationFromCurrency, setSimulationFromCurrency] = useState('GNF');
  const [simulationToCurrency, setSimulationToCurrency] = useState('USD');
  
  // États de chargement
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Charger les données initiales
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [currenciesData, ratesData, historyData, statsData] = await Promise.all([
        GlobalCurrencyService.getActiveCurrencies(),
        PDGExchangeRateService.getAllExchangeRates(),
        PDGExchangeRateService.getRateHistory(undefined, undefined, 20),
        PDGExchangeRateService.getRateStatistics()
      ]);
      
      setCurrencies(currenciesData);
      setExchangeRates(ratesData);
      setRateHistory(historyData);
      setStatistics(statsData);
      
      // Définir les devises par défaut pour la simulation
      if (currenciesData.length > 0) {
        setSimulationFromCurrency(currenciesData.find(c => c.code === 'GNF')?.code || currenciesData[0].code);
        setSimulationToCurrency(currenciesData.find(c => c.code === 'USD')?.code || currenciesData[1]?.code || currenciesData[0].code);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRate = async () => {
    if (!editingRate || !newRate || !user) return;

    setUpdating(true);
    try {
      const result = await PDGExchangeRateService.updateExchangeRate(
        editingRate.fromCurrency,
        editingRate.toCurrency,
        parseFloat(newRate),
        user.id,
        updateReason
      );

      if (result.success) {
        toast({
          title: "Taux mis à jour",
          description: result.message,
        });
        
        // Recharger les données
        await loadInitialData();
        
        // Réinitialiser l'édition
        setEditingRate(null);
        setNewRate('');
        setUpdateReason('');
      } else {
        toast({
          title: "Erreur",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating rate:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSimulate = async () => {
    if (!simulationAmount || !simulationFromCurrency || !simulationToCurrency) return;

    try {
      const result = await PDGExchangeRateService.simulateConversion(
        simulationFromCurrency,
        simulationToCurrency,
        parseFloat(simulationAmount)
      );

      if (result) {
        setSimulation(result);
      } else {
        toast({
          title: "Erreur",
          description: "Taux de change non trouvé",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error simulating conversion:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la simulation",
        variant: "destructive"
      });
    }
  };

  const formatRate = (rate: number, fromCurrency: string, toCurrency: string): string => {
    return PDGExchangeRateService.formatRate(rate, fromCurrency, toCurrency);
  };

  const formatAmount = (amount: number, currency: string): string => {
    return GlobalCurrencyService.formatAmount(amount, currency);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des données financières...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏦 Gestion Financière PDG
        </h1>
        <p className="text-gray-600">
          Contrôle manuel des taux de change et simulation des conversions
        </p>
      </div>

      {/* Statistiques rapides */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total des taux</p>
                  <p className="text-2xl font-bold">{statistics.totalRates}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taux manuels</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.manualRates}</p>
                </div>
                <Settings className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taux API</p>
                  <p className="text-2xl font-bold text-blue-600">{statistics.apiRates}</p>
                </div>
                <Globe className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Devise active</p>
                  <p className="text-2xl font-bold text-purple-600">{statistics.mostActiveCurrency}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rates" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Taux de Change
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Simulation
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="currencies" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Devises
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Gestion des Taux de Change
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exchangeRates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun taux de change configuré</p>
                  <p className="text-sm mt-2">Commencez par ajouter des taux de change</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paire de devises</TableHead>
                      <TableHead>Taux actuel</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Dernière mise à jour</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangeRates.map((rate, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {rate.fromCurrency} → {rate.toCurrency}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-lg">
                            {formatRate(rate.rate, rate.fromCurrency, rate.toCurrency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rate.source === 'manual' ? 'default' : 'secondary'}>
                            {rate.source === 'manual' ? 'Manuel' : 'API'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(rate.lastUpdated).toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingRate({
                                fromCurrency: rate.fromCurrency,
                                toCurrency: rate.toCurrency,
                                rate: rate.rate
                              });
                              setNewRate(rate.rate.toString());
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Simulateur de Conversion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="simulation-amount">Montant</Label>
                  <Input
                    id="simulation-amount"
                    type="number"
                    step="0.01"
                    placeholder="1000.00"
                    value={simulationAmount}
                    onChange={(e) => setSimulationAmount(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="simulation-from">Devise d'envoi</Label>
                  <Select value={simulationFromCurrency} onValueChange={setSimulationFromCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une devise" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.flag} {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="simulation-to">Devise de réception</Label>
                  <Select value={simulationToCurrency} onValueChange={setSimulationToCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une devise" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.flag} {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSimulate} className="w-full">
                <Calculator className="h-4 w-4 mr-2" />
                Simuler la conversion
              </Button>

              {simulation && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Simulation de conversion</strong>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Conversion</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Montant envoyé:</span>
                          <span className="font-semibold">
                            {formatAmount(simulation.amount, simulation.fromCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taux appliqué:</span>
                          <span className="font-mono">
                            {formatRate(simulation.currentRate, simulation.fromCurrency, simulation.toCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Montant reçu:</span>
                          <span className="font-semibold text-green-600">
                            {formatAmount(simulation.convertedAmount, simulation.toCurrency)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Frais et Commission</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Frais internes:</span>
                          <span className="font-semibold">
                            {formatAmount(simulation.internalFees, simulation.fromCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Commission API:</span>
                          <span className="font-semibold">
                            {formatAmount(simulation.apiCommission, simulation.fromCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total facturé:</span>
                          <span className="font-semibold text-red-600">
                            {formatAmount(simulation.totalCharged, simulation.fromCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gain plateforme:</span>
                          <span className="font-semibold text-blue-600">
                            {formatAmount(simulation.platformGain, simulation.fromCurrency)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique des Modifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rateHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun historique disponible</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paire</TableHead>
                      <TableHead>Ancien taux</TableHead>
                      <TableHead>Nouveau taux</TableHead>
                      <TableHead>Changement</TableHead>
                      <TableHead>Modifié par</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateHistory.map((history, index) => {
                      const change = PDGExchangeRateService.calculateRateChange(history.oldRate, history.newRate);
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {history.fromCurrency} → {history.toCurrency}
                          </TableCell>
                          <TableCell className="font-mono">
                            {history.oldRate.toFixed(6)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {history.newRate.toFixed(6)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={change.direction === 'up' ? 'destructive' : change.direction === 'down' ? 'default' : 'secondary'}>
                              {change.direction === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : 
                               change.direction === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                              {change.percentage.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {history.updatedBy}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(history.updatedAt).toLocaleString('fr-FR')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currencies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Devises Disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currencies.map((currency) => (
                  <div key={currency.code} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{currency.flag}</span>
                      <div>
                        <p className="font-semibold">{currency.code}</p>
                        <p className="text-sm text-gray-600">{currency.name}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Symbole:</span>
                      <span className="font-mono">{currency.symbol}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Décimales:</span>
                      <span>{currency.decimalPlaces}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal d'édition des taux */}
      {editingRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Modifier le taux de change</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Paire de devises</Label>
                <p className="text-sm text-gray-600">
                  {editingRate.fromCurrency} → {editingRate.toCurrency}
                </p>
              </div>
              
              <div>
                <Label htmlFor="new-rate">Nouveau taux</Label>
                <Input
                  id="new-rate"
                  type="number"
                  step="0.000001"
                  placeholder="0.000000"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="update-reason">Raison du changement (optionnel)</Label>
                <Textarea
                  id="update-reason"
                  placeholder="Ex: Mise à jour selon les conditions du marché"
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateRate} 
                  disabled={updating}
                  className="flex-1"
                >
                  {updating ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {updating ? 'Mise à jour...' : 'Enregistrer'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingRate(null);
                    setNewRate('');
                    setUpdateReason('');
                  }}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
