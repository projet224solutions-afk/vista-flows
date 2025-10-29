import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";

export default function TransferFeeSettings() {
  const [feePercent, setFeePercent] = useState("");
  const [loading, setLoading] = useState(true);
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
        setFeePercent(data.setting_value);
      }
    } catch (error: any) {
      console.error('Erreur chargement taux:', error);
      toast.error('Erreur lors du chargement du taux actuel');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const newFee = parseFloat(feePercent);
    
    if (isNaN(newFee) || newFee < 0 || newFee > 100) {
      toast.error('Le taux doit être entre 0 et 100');
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: newFee.toString() })
        .eq('setting_key', 'transfer_fee_percent');

      if (error) throw error;

      toast.success(
        `Taux de commission mis à jour : ${newFee}%\nTous les transferts suivants utiliseront ce nouveau taux.`,
        { duration: 5000 }
      );
    } catch (error: any) {
      console.error('Erreur mise à jour taux:', error);
      toast.error(error?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Paramètres des frais de transfert
        </CardTitle>
        <CardDescription>
          Configurez le taux de commission appliqué sur les transferts entre wallets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="feePercent">Taux de commission (%)</Label>
          <div className="flex gap-3">
            <Input
              id="feePercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
              disabled={loading}
              placeholder="Ex: 1.5"
              className="max-w-[200px]"
            />
            <Button 
              onClick={handleSave} 
              disabled={saving || loading || !feePercent}
            >
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Taux actuel : <strong>{feePercent}%</strong>
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
          <h4 className="font-semibold">💡 Exemple avec un taux de {feePercent || "1.5"}% :</h4>
          <div className="space-y-1 text-muted-foreground">
            <p>• Montant à transférer : 10 000 GNF</p>
            <p>• Frais ({feePercent || "1.5"}%) : {Math.round(10000 * (parseFloat(feePercent) || 1.5) / 100).toLocaleString()} GNF</p>
            <p>• Total débité : {(10000 + Math.round(10000 * (parseFloat(feePercent) || 1.5) / 100)).toLocaleString()} GNF</p>
            <p>• Montant reçu : 10 000 GNF</p>
          </div>
        </div>

        <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg text-sm text-blue-800">
          <p>
            <strong>Note :</strong> Tous les frais collectés sont automatiquement crédités sur votre wallet PDG.
            Les transferts affichent toujours une prévisualisation des frais avant confirmation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
