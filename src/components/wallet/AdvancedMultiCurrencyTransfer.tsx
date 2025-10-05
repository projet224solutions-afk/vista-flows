/**
 * 🌍 COMPOSANT DE TRANSFERT MULTI-DEVISES AVANCÉ
 * Interface utilisateur complète pour les transferts avec détection automatique du pays
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AdvancedMultiCurrencyService, UserCurrencyProfile } from '@/services/AdvancedMultiCurrencyService';
import { GlobalCurrencyService, Currency } from '@/services/GlobalCurrencyService';
import { PDGExchangeRateService, RateSimulation } from '@/services/PDGExchangeRateService';
import { 
  Globe, 
  Send, 
  Calculator, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Search,
  Filter,
  History,
  BarChart3,
  DollarSign,
  ArrowRightLeft,
  Shield,
  Zap
} from 'lucide-react';

interface TransferForm {
  receiverEmail: string;
  receiverUserId: string;
  transferMethod: 'email' | 'user_id';
  amount: string;
  currencySent: string;
  currencyReceived: string;
  description: string;
  autoDetectCurrency: boolean;
}

interface TransferLimits {
  canTransfer: boolean;
  dailyRemaining: number;
  monthlyRemaining: number;
  currency: string;
  reason?: string;
}

export default function AdvancedMultiCurrencyTransfer() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // États principaux
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [userProfile, setUserProfile] = useState<UserCurrencyProfile | null>(null);
  const [transferLimits, setTransferLimits] = useState<TransferLimits | null>(null);
  const [simulation, setSimulation] = useState<RateSimulation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('transfer');
  
  // États du formulaire
  const [form, setForm] = useState<TransferForm>({
    receiverEmail: '',
    receiverUserId: '',
    transferMethod: 'email',
    amount: '',
    currencySent: 'GNF',
    currencyReceived: 'USD',
    description: '',
    autoDetectCurrency: true
  });
  
  // États de chargement
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Charger les données initiales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Charger les données quand le montant change
  useEffect(() => {
    if (form.amount && form.currencySent && form.currencyReceived) {
      handleSimulation();
    }
  }, [form.amount, form.currencySent, form.currencyReceived]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [currenciesData, profileData] = await Promise.all([
        GlobalCurrencyService.getActiveCurrencies(),
        user ? AdvancedMultiCurrencyService.detectUserCurrencyProfile(user.id) : null
      ]);
      
      setCurrencies(currenciesData);
      
      if (profileData) {
        setUserProfile(profileData);
        setForm(prev => ({
          ...prev,
          currencySent: profileData.defaultCurrency,
          autoDetectCurrency: true
        }));
      } else {
        // Fallback sur les devises principales si pas de détection
        setForm(prev => ({
          ...prev,
          currencySent: 'GNF',
          currencyReceived: 'USD'
        }));
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

  const handleSimulation = async () => {
    if (!form.amount || !form.currencySent || !form.currencyReceived || !user) return;

    setSimulating(true);
    try {
      const result = await AdvancedMultiCurrencyService.simulateConversion(
        form.currencySent,
        form.currencyReceived,
        parseFloat(form.amount)
      );

      if (result) {
        setSimulation(result);
      }

      // Vérifier les limites
      const limits = await AdvancedMultiCurrencyService.checkTransferLimits(
        user.id,
        parseFloat(form.amount),
        form.currencySent
      );
      setTransferLimits(limits);
    } catch (error) {
      console.error('Error simulating conversion:', error);
    } finally {
      setSimulating(false);
    }
  };

  const handleTransfer = async () => {
    if (!user) return;

    // Validation
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({
        title: "Erreur",
        description: "Montant invalide",
        variant: "destructive"
      });
      return;
    }

    if (form.transferMethod === 'email' && !form.receiverEmail) {
      toast({
        title: "Erreur",
        description: "Email du destinataire requis",
        variant: "destructive"
      });
      return;
    }

    if (form.transferMethod === 'user_id' && !form.receiverUserId) {
      toast({
        title: "Erreur",
        description: "ID du destinataire requis",
        variant: "destructive"
      });
      return;
    }

    if (form.transferMethod === 'email' && !AdvancedMultiCurrencyService.isValidEmail(form.receiverEmail)) {
      toast({
        title: "Erreur",
        description: "Format d'email invalide",
        variant: "destructive"
      });
      return;
    }

    if (form.transferMethod === 'user_id' && !AdvancedMultiCurrencyService.isValidUserId(form.receiverUserId)) {
      toast({
        title: "Erreur",
        description: "Format d'ID utilisateur invalide",
        variant: "destructive"
      });
      return;
    }

    if (transferLimits && !transferLimits.canTransfer) {
      toast({
        title: "Erreur",
        description: transferLimits.reason || "Limite de transfert dépassée",
        variant: "destructive"
      });
      return;
    }

    setTransferring(true);
    try {
      const result = await AdvancedMultiCurrencyService.performAdvancedTransfer({
        receiverEmail: form.transferMethod === 'email' ? form.receiverEmail : undefined,
        receiverUserId: form.transferMethod === 'user_id' ? form.receiverUserId : undefined,
        amount: parseFloat(form.amount),
        currencySent: form.currencySent,
        currencyReceived: form.currencyReceived,
        description: form.description,
        reference: `TXN-${Date.now()}`
      });

      if (result.success) {
        toast({
          title: "Transfert réussi",
          description: `${AdvancedMultiCurrencyService.formatAmount(result.amountSent!, result.currencySent!)} envoyé avec succès`,
        });
        
        // Réinitialiser le formulaire
        setForm(prev => ({
          ...prev,
          receiverEmail: '',
          receiverUserId: '',
          amount: '',
          description: ''
        }));
        setSimulation(null);
        setTransferLimits(null);
      } else {
        toast({
          title: "Erreur de transfert",
          description: result.error || "Erreur inconnue",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error performing transfer:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du transfert",
        variant: "destructive"
      });
    } finally {
      setTransferring(false);
    }
  };

  const filteredCurrencies = currencies.filter(currency =>
    currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    currency.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des devises...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🌍 Transfert Multi-Devises Avancé
        </h1>
        <p className="text-gray-600">
          Envoyez de l'argent dans le monde entier avec conversion automatique
        </p>
      </div>

      {/* Profil utilisateur détecté */}
      {userProfile && (
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription>
            <strong>Pays détecté:</strong> {userProfile.detectedCountry} 
            <br />
            <strong>Devise par défaut:</strong> {userProfile.defaultCurrency}
            {form.autoDetectCurrency && (
              <span className="ml-2 text-green-600">✓ Détection automatique activée</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transfer" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Transfert
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Simulation
          </TabsTrigger>
          <TabsTrigger value="currencies" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Devises
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transfer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Nouveau Transfert
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Méthode de transfert */}
              <div>
                <Label>Méthode de transfert</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={form.transferMethod === 'email' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm(prev => ({ ...prev, transferMethod: 'email' }))}
                  >
                    📧 Par Email
                  </Button>
                  <Button
                    type="button"
                    variant={form.transferMethod === 'user_id' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm(prev => ({ ...prev, transferMethod: 'user_id' }))}
                  >
                    🆔 Par ID Utilisateur
                  </Button>
                </div>
              </div>

              {/* Champ destinataire */}
              {form.transferMethod === 'email' ? (
                <div>
                  <Label htmlFor="receiver-email">Email du destinataire</Label>
                  <Input
                    id="receiver-email"
                    type="email"
                    placeholder="destinataire@exemple.com"
                    value={form.receiverEmail}
                    onChange={(e) => setForm(prev => ({ ...prev, receiverEmail: e.target.value }))}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="receiver-user-id">ID du destinataire</Label>
                  <Input
                    id="receiver-user-id"
                    type="text"
                    placeholder="UUID du profil destinataire"
                    value={form.receiverUserId}
                    onChange={(e) => setForm(prev => ({ ...prev, receiverUserId: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 L'ID utilisateur se trouve dans le profil du destinataire
                  </p>
                </div>
              )}

              {/* Montant et devises */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="amount">Montant</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="1000.00"
                    value={form.amount}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="currency-sent">Devise d'envoi</Label>
                  <Select 
                    value={form.currencySent} 
                    onValueChange={(value) => setForm(prev => ({ ...prev, currencySent: value }))}
                  >
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
                  <Label htmlFor="currency-received">Devise de réception</Label>
                  <Select 
                    value={form.currencyReceived} 
                    onValueChange={(value) => setForm(prev => ({ ...prev, currencyReceived: value }))}
                  >
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

              {/* Description */}
              <div>
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  placeholder="Paiement pour..."
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Simulation en temps réel */}
              {simulation && (
                <div className="space-y-4">
                  <Alert>
                    <Calculator className="h-4 w-4" />
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
                            {AdvancedMultiCurrencyService.formatAmount(simulation.amount, simulation.fromCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taux appliqué:</span>
                          <span className="font-mono">
                            {PDGExchangeRateService.formatRate(simulation.currentRate, simulation.fromCurrency, simulation.toCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Montant reçu:</span>
                          <span className="font-semibold text-green-600">
                            {AdvancedMultiCurrencyService.formatAmount(simulation.convertedAmount, simulation.toCurrency)}
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
                            {AdvancedMultiCurrencyService.formatAmount(simulation.internalFees, simulation.fromCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Commission API:</span>
                          <span className="font-semibold">
                            {AdvancedMultiCurrencyService.formatAmount(simulation.apiCommission, simulation.fromCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total facturé:</span>
                          <span className="font-semibold text-red-600">
                            {AdvancedMultiCurrencyService.formatAmount(simulation.totalCharged, simulation.fromCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gain plateforme:</span>
                          <span className="font-semibold text-blue-600">
                            {AdvancedMultiCurrencyService.formatAmount(simulation.platformGain, simulation.fromCurrency)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Limites de transfert */}
              {transferLimits && (
                <div className={`p-4 rounded-lg ${transferLimits.canTransfer ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {transferLimits.canTransfer ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-semibold">
                      {transferLimits.canTransfer ? 'Transfert autorisé' : 'Transfert non autorisé'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Limite quotidienne:</span>
                      <span className="ml-2 font-semibold">
                        {AdvancedMultiCurrencyService.formatAmount(transferLimits.dailyRemaining, form.currencySent)} restant
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Limite mensuelle:</span>
                      <span className="ml-2 font-semibold">
                        {AdvancedMultiCurrencyService.formatAmount(transferLimits.monthlyRemaining, form.currencySent)} restant
                      </span>
                    </div>
                  </div>
                  
                  {!transferLimits.canTransfer && transferLimits.reason && (
                    <p className="text-red-600 text-sm mt-2">⚠️ {transferLimits.reason}</p>
                  )}
                </div>
              )}

              {/* Bouton de transfert */}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleTransfer}
                disabled={
                  transferring ||
                  !form.amount ||
                  (form.transferMethod === 'email' && !form.receiverEmail) ||
                  (form.transferMethod === 'user_id' && !form.receiverUserId) ||
                  (transferLimits && !transferLimits.canTransfer)
                }
              >
                {transferring ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {transferring ? 'Transfert en cours...' : 'Envoyer maintenant'}
              </Button>
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
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>La simulation se met à jour automatiquement</p>
                <p className="text-sm mt-2">Modifiez le montant et les devises pour voir les résultats</p>
              </div>
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
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher une devise..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCurrencies.map((currency) => (
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
                      <span>Pays:</span>
                      <span>{currency.country}</span>
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
    </div>
  );
}
