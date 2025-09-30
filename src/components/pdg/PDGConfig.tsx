import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PDGConfig() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newConfig, setNewConfig] = useState({
    service_name: '',
    transaction_type: '',
    commission_type: 'percentage',
    commission_value: 0
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('commission_config')
        .select('*')
        .order('created_at', { ascending: false });

      setConfigs(data || []);
    } catch (error) {
      console.error('Erreur chargement config:', error);
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      const { error } = await supabase.from('commission_config').insert(newConfig);

      if (error) throw error;

      // Log action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({
        actor_id: user?.id,
        action: 'COMMISSION_CONFIG_CREATED',
        target_type: 'commission_config',
        data_json: newConfig
      });

      toast.success('Configuration sauvegardée');
      loadConfigs();
      setNewConfig({
        service_name: '',
        transaction_type: '',
        commission_type: 'percentage',
        commission_value: 0
      });
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const toggleConfig = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('commission_config')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(currentStatus ? 'Configuration désactivée' : 'Configuration activée');
      loadConfigs();
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New Config Form */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Nouvelle Configuration de Commission
          </CardTitle>
          <CardDescription>Ajouter une règle de commission</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="service" className="text-white">Service</Label>
              <Input
                id="service"
                placeholder="ex: marketplace, taxi, delivery"
                value={newConfig.service_name}
                onChange={(e) => setNewConfig({ ...newConfig, service_name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="transaction" className="text-white">Type de Transaction</Label>
              <Input
                id="transaction"
                placeholder="ex: achat, vente, location"
                value={newConfig.transaction_type}
                onChange={(e) => setNewConfig({ ...newConfig, transaction_type: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="type" className="text-white">Type de Commission</Label>
              <Select
                value={newConfig.commission_type}
                onValueChange={(value) => setNewConfig({ ...newConfig, commission_type: value })}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage</SelectItem>
                  <SelectItem value="fixed">Montant Fixe</SelectItem>
                  <SelectItem value="hybrid">Hybride</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="value" className="text-white">
                Valeur ({newConfig.commission_type === 'percentage' ? '%' : 'GNF'})
              </Label>
              <Input
                id="value"
                type="number"
                value={newConfig.commission_value}
                onChange={(e) => setNewConfig({ ...newConfig, commission_value: Number(e.target.value) })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <Button onClick={saveConfig} className="gap-2">
            <Save className="w-4 h-4" />
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {/* Existing Configs */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Configurations Existantes</CardTitle>
          <CardDescription>Gestion des règles de commission</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold">
                      {config.service_name} - {config.transaction_type}
                    </h4>
                    <p className="text-sm text-slate-400">
                      {config.commission_type === 'percentage' 
                        ? `${config.commission_value}%`
                        : `${config.commission_value} GNF`
                      }
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleConfig(config.id, config.is_active)}
                    className={config.is_active ? 'border-green-500/50' : 'border-red-500/50'}
                  >
                    {config.is_active ? 'Actif' : 'Inactif'}
                  </Button>
                </div>
              </div>
            ))}
            {configs.length === 0 && (
              <p className="text-center text-slate-400 py-8">
                Aucune configuration trouvée
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
