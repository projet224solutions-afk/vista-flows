import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Save, RefreshCw } from "lucide-react";

export default function TransferFeeSettings() {
  const [currentFeePercent, setCurrentFeePercent] = useState<string>('1.5');
  const [newFeePercent, setNewFeePercent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentFee();
  }, []);

  const loadCurrentFee = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'transfer_fee_percent')
        .single();

      if (error) throw error;
      
      if (data) {
        setCurrentFeePercent(data.setting_value);
        setNewFeePercent(data.setting_value);
      }
    } catch (e: any) {
      console.error('Erreur chargement taux:', e);
      toast.error('Erreur lors du chargement du taux actuel');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFee = async () => {
    const feeValue = parseFloat(newFeePercent);
    
    if (isNaN(feeValue) || feeValue < 0 || feeValue > 10) {
      toast.error('Le taux doit être entre 0% et 10%');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: feeValue.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'transfer_fee_percent');

      if (error) throw error;

      setCurrentFeePercent(feeValue.toString());
      toast.success(`Taux de commission mis à jour à ${feeValue}%`);
      
      // Recharger pour confirmation
      await loadCurrentFee();
    } catch (e: any) {
      console.error('Erreur mise à jour:', e);
      toast.error(e?.message || 'Erreur lors de la mise à jour du taux');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuration des Frais de Transfert
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Taux actuel */}
        <div className="p-4 bg-slate-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taux actuel</p>
              <p className="text-3xl font-bold text-primary">
                {loading ? '...' : `${currentFeePercent}%`}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadCurrentFee} 
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Explication */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Comment ça marche ?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Ce taux s'applique à tous les transferts entre wallets</li>
            <li>• Les frais sont prélevés sur l'expéditeur</li>
            <li>• Le destinataire reçoit 100% du montant transféré</li>
            <li>• Les frais sont automatiquement crédités sur votre wallet PDG</li>
          </ul>
        </div>

        {/* Exemple de calcul */}
        {newFeePercent && !isNaN(parseFloat(newFeePercent)) && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">📊 Exemple de calcul</h4>
            <div className="text-sm text-green-800 space-y-1">
              <p><strong>Montant à transférer:</strong> 20 000 GNF</p>
              <p><strong>Frais ({newFeePercent}%):</strong> {Math.round(20000 * parseFloat(newFeePercent) / 100).toLocaleString()} GNF</p>
              <p><strong>Total débité:</strong> {(20000 + Math.round(20000 * parseFloat(newFeePercent) / 100)).toLocaleString()} GNF</p>
              <p><strong>Montant reçu:</strong> 20 000 GNF</p>
            </div>
          </div>
        )}

        {/* Formulaire de modification */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-fee">Nouveau taux de commission (%)</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="new-fee"
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="1.5"
                value={newFeePercent}
                onChange={(e) => setNewFeePercent(e.target.value)}
                disabled={saving}
              />
              <span className="text-lg font-semibold">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Taux entre 0% et 10%
            </p>
          </div>

          <Button 
            onClick={handleUpdateFee}
            disabled={saving || !newFeePercent || newFeePercent === currentFeePercent}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Mise à jour...' : 'Mettre à jour le taux'}
          </Button>
        </div>

        {/* Avertissement */}
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>⚠️ Attention:</strong> La modification du taux prendra effet immédiatement pour tous les nouveaux transferts.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}