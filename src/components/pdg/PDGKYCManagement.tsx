/**
 * GESTION KYC - INTERFACE PDG
 * Permet au PDG d'activer/désactiver le KYC pour chaque type d'utilisateur
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, Users, Store, Truck, Car, Building2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KYCSettings {
  vendeur: boolean;
  client: boolean;
  livreur: boolean;
  taxi_moto: boolean;
  bureau_syndicat: boolean;
  transitaire: boolean;
  agent: boolean;
}

const userTypes = [
  { key: 'vendeur', label: 'Vendeurs', icon: Store, description: 'Vérification des marchands' },
  { key: 'client', label: 'Clients', icon: Users, description: 'Vérification des acheteurs' },
  { key: 'livreur', label: 'Livreurs', icon: Truck, description: 'Vérification des chauffeurs livreurs' },
  { key: 'taxi_moto', label: 'Taxi-Moto', icon: Car, description: 'Vérification des chauffeurs taxi-moto' },
  { key: 'bureau_syndicat', label: 'Bureaux Syndicaux', icon: Building2, description: 'Vérification des bureaux' },
  { key: 'transitaire', label: 'Transitaires', icon: Globe, description: 'Vérification des transitaires' },
  { key: 'agent', label: 'Agents', icon: Users, description: 'Vérification des agents' },
] as const;

export default function PDGKYCManagement() {
  const [settings, setSettings] = useState<KYCSettings>({
    vendeur: false,
    client: false,
    livreur: false,
    taxi_moto: false,
    bureau_syndicat: false,
    transitaire: false,
    agent: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings' as any)
        .select('*')
        .eq('category', 'kyc')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur chargement settings KYC:', error);
      }

      if ((data as any)?.settings) {
        setSettings((data as any).settings as KYCSettings);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof KYCSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings' as any)
        .upsert({
          category: 'kyc',
          settings: settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'category' });

      if (error) throw error;

      toast.success('Paramètres KYC enregistrés');
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(settings).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Gestion KYC</CardTitle>
                <CardDescription>
                  Activer ou désactiver la vérification KYC par type d'utilisateur
                </CardDescription>
              </div>
            </div>
            <Badge variant={enabledCount > 0 ? "default" : "secondary"} className="text-sm">
              {enabledCount} / {userTypes.length} actif(s)
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {userTypes.map(({ key, label, icon: Icon, description }) => (
          <Card 
            key={key} 
            className={`transition-all duration-200 ${
              settings[key as keyof KYCSettings] 
                ? 'border-green-500/50 bg-green-500/5' 
                : 'border-muted'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    settings[key as keyof KYCSettings]
                      ? 'bg-green-500/20 text-green-600'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <Label htmlFor={key} className="font-medium cursor-pointer">
                      {label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {settings[key as keyof KYCSettings] && (
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                  )}
                  <Switch
                    id={key}
                    checked={settings[key as keyof KYCSettings]}
                    onCheckedChange={() => handleToggle(key as keyof KYCSettings)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Les modifications seront appliquées immédiatement après l'enregistrement.
            </p>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Enregistrer les paramètres
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">À propos du KYC</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Quand le KYC est activé, les utilisateurs doivent vérifier leur identité</li>
            <li>• Les utilisateurs non vérifiés peuvent avoir des restrictions</li>
            <li>• Vous pouvez activer/désactiver le KYC à tout moment</li>
            <li>• Les statuts KYC existants sont conservés</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
