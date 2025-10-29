import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Save, RefreshCw } from "lucide-react";
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

  useEffect(() => {
    fetchCurrentFee();
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
      toast.success(`Taux de commission mis à jour : ${fee}%`);
    } catch (e: any) {
      console.error('Erreur lors de la mise à jour:', e);
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
        <CardDescription>
          Gérer le taux de commission appliqué sur les transferts entre wallets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTitle className="text-lg font-semibold">
            Taux actuel : {currentFee}%
          </AlertTitle>
          <AlertDescription className="mt-2">
            Ce taux est automatiquement appliqué à tous les transferts entre utilisateurs.
            Les frais sont déduits du solde de l'expéditeur et crédités au compte PDG.
          </AlertDescription>
        </Alert>

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

          <div className="p-4 bg-slate-50 rounded-lg border">
            <h4 className="font-medium mb-2">Fonctionnement du système</h4>
            <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
              <li>Les frais sont calculés automatiquement lors de chaque transfert</li>
              <li>L'expéditeur paie le montant + les frais</li>
              <li>Le destinataire reçoit le montant net (sans frais)</li>
              <li>Les frais sont crédités au compte PDG</li>
              <li>Une prévisualisation est affichée avant chaque transfert</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
