import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Save, RefreshCw, TrendingUp } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export default function TransferFeeSettings() {
  const [currentFee, setCurrentFee] = useState<number>(1.5);
  const [newFee, setNewFee] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalFees, setTotalFees] = useState<number>(0);
  const [transactionsCount, setTransactionsCount] = useState<number>(0);

  const fetchCurrentFee = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'transfer_fee_percent')
        .single();

      if (error) throw error;
      
      const fee = parseFloat(data.setting_value);
      setCurrentFee(fee);
      setNewFee(fee.toString());
    } catch (e: any) {
      console.error('Erreur lors du chargement du taux:', e);
      toast.error('Erreur lors du chargement du taux de commission');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeesStats = async () => {
    try {
      // Calculer le total des frais collectés depuis les métadonnées
      const { data, error } = await supabase
        .from('enhanced_transactions')
        .select('metadata')
        .eq('method', 'wallet')
        .eq('status', 'completed');

      if (error) throw error;

      if (data) {
        let total = 0;
        let count = 0;
        data.forEach((tx: any) => {
          if (tx.metadata?.fee_amount) {
            total += parseFloat(tx.metadata.fee_amount);
            count++;
          }
        });
        setTotalFees(total);
        setTransactionsCount(count);
      }
    } catch (e: any) {
      console.error('Erreur stats frais:', e);
    }
  };

  useEffect(() => {
    fetchCurrentFee();
    fetchFeesStats();
  }, []);

  const handleUpdateFee = async () => {
    const fee = parseFloat(newFee);
    
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error('Taux invalide. Doit être entre 0 et 100%');
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: fee.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'transfer_fee_percent');

      if (error) throw error;

      setCurrentFee(fee);
      toast.success(`✅ Taux de commission mis à jour : ${fee}%`);
      
      // Recharger pour confirmation
      await fetchCurrentFee();
      await fetchFeesStats();
    } catch (e: any) {
      console.error('Erreur lors de la mise à jour:', e);
      toast.error(e?.message || 'Erreur lors de la mise à jour du taux');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' GNF';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuration des Frais de Transfert Wallet
        </CardTitle>
        <CardDescription>
          Gérer le taux de commission appliqué sur les transferts entre wallets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques des frais collectés */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-700 font-medium">Total Frais Collectés</p>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {formatPrice(totalFees)}
            </p>
            <p className="text-xs text-green-600 mt-1">{transactionsCount} transactions</p>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-700 font-medium">Taux Actuel</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {loading ? '...' : `${currentFee}%`}
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { fetchCurrentFee(); fetchFeesStats(); }}
              disabled={loading}
              className="mt-1 h-6 px-2 text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-fee">Nouveau taux de commission (%)</Label>
              <div className="flex gap-2">
                <Input
                  id="new-fee"
                  type="number"
                  placeholder="1.5"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={loading || saving}
                />
                <Button
                  onClick={handleUpdateFee}
                  disabled={loading || saving || !newFee || parseFloat(newFee) === currentFee}
                  className="min-w-[140px]"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Mettre à jour
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Exemple : Pour un transfert de 10 000 GNF avec {parseFloat(newFee || "1.5")}% de frais :
                <br />
                • Frais : {Math.round(10000 * parseFloat(newFee || "1.5") / 100).toLocaleString()} GNF
                <br />
                • Total débité : {Math.round(10000 + (10000 * parseFloat(newFee || "1.5") / 100)).toLocaleString()} GNF
                <br />
                • Montant reçu : 10 000 GNF
              </p>
            </div>
          </div>

          {/* Exemples de calcul plus détaillés */}
          <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
            <h4 className="font-medium mb-2">📊 Exemples de calcul avec {parseFloat(newFee || "1.5")}%</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-muted-foreground">Transfert de 10,000 GNF</span>
                <div className="text-right">
                  <p className="font-semibold">Frais: {Math.round(10000 * parseFloat(newFee || "1.5") / 100).toLocaleString()} GNF</p>
                  <p className="text-xs text-orange-600">Total débité: {(10000 + Math.round(10000 * parseFloat(newFee || "1.5") / 100)).toLocaleString()} GNF</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-muted-foreground">Transfert de 100,000 GNF</span>
                <div className="text-right">
                  <p className="font-semibold">Frais: {Math.round(100000 * parseFloat(newFee || "1.5") / 100).toLocaleString()} GNF</p>
                  <p className="text-xs text-orange-600">Total débité: {(100000 + Math.round(100000 * parseFloat(newFee || "1.5") / 100)).toLocaleString()} GNF</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-muted-foreground">Transfert de 1,000,000 GNF</span>
                <div className="text-right">
                  <p className="font-semibold">Frais: {Math.round(1000000 * parseFloat(newFee || "1.5") / 100).toLocaleString()} GNF</p>
                  <p className="text-xs text-orange-600">Total débité: {(1000000 + Math.round(1000000 * parseFloat(newFee || "1.5") / 100)).toLocaleString()} GNF</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">💡 Fonctionnement du système</h4>
            <ul className="text-sm space-y-1 text-blue-800 list-disc list-inside">
              <li>Les frais sont calculés automatiquement lors de chaque transfert</li>
              <li>L'expéditeur paie le montant + les frais</li>
              <li>Le destinataire reçoit le montant net (sans frais)</li>
              <li>Les frais sont crédités au compte PDG</li>
              <li>Une prévisualisation est affichée avant chaque transfert</li>
            </ul>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              ⚠️ <strong>Attention :</strong> Les modifications prennent effet immédiatement pour toutes les nouvelles transactions.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
