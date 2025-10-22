/**
 * PARAMÈTRES CHAUFFEUR
 * Gestion des zones de service et préférences
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  MapPin, Bell, Volume2, Clock, 
  Settings as SettingsIcon, Save 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DriverSettingsProps {
  driverId: string;
}

export function DriverSettings({ driverId }: DriverSettingsProps) {
  const [settings, setSettings] = useState({
    autoAccept: false,
    soundNotifications: true,
    vibrationNotifications: true,
    serviceRadius: 5, // km
    preferredZones: [] as string[],
    minRidePrice: 5000,
    acceptPooled: true
  });

  const [loading, setLoading] = useState(false);

  // Charger les paramètres sauvegardés du localStorage
  useEffect(() => {
    loadSettings();
  }, [driverId]);

  const loadSettings = async () => {
    try {
      const saved = localStorage.getItem(`driver_settings_${driverId}`);
      if (saved) {
        setSettings({ ...settings, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      localStorage.setItem(`driver_settings_${driverId}`, JSON.stringify(settings));
      toast.success('✅ Paramètres enregistrés');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const zones = [
    'Kaloum',
    'Dixinn',
    'Matam',
    'Ratoma',
    'Matoto',
    'Coléah',
    'Hamdallaye',
    'Landréah'
  ];

  const toggleZone = (zone: string) => {
    setSettings(prev => ({
      ...prev,
      preferredZones: prev.preferredZones.includes(zone)
        ? prev.preferredZones.filter(z => z !== zone)
        : [...prev.preferredZones, zone]
    }));
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            Paramètres de service
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notifications */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="sound" className="text-sm">Notifications sonores</Label>
              <Switch
                id="sound"
                checked={settings.soundNotifications}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, soundNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="vibration" className="text-sm">Vibrations</Label>
              <Switch
                id="vibration"
                checked={settings.vibrationNotifications}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, vibrationNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto" className="text-sm">Acceptation automatique</Label>
              <Switch
                id="auto"
                checked={settings.autoAccept}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, autoAccept: checked }))
                }
              />
            </div>
          </div>

          {/* Rayon de service */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Rayon de service
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="20"
                value={settings.serviceRadius}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  serviceRadius: parseInt(e.target.value) 
                }))}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-blue-600 w-16">
                {settings.serviceRadius} km
              </span>
            </div>
          </div>

          {/* Prix minimum */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Prix minimum accepté</h3>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="2000"
                max="50000"
                step="1000"
                value={settings.minRidePrice}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  minRidePrice: parseInt(e.target.value) 
                }))}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <span className="text-sm font-semibold">GNF</span>
            </div>
          </div>

          {/* Zones préférées */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Zones de service préférées
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {zones.map(zone => (
                <Button
                  key={zone}
                  onClick={() => toggleZone(zone)}
                  variant={settings.preferredZones.includes(zone) ? 'default' : 'outline'}
                  size="sm"
                  className={settings.preferredZones.includes(zone) 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : ''
                  }
                >
                  {settings.preferredZones.includes(zone) && '✓ '}
                  {zone}
                </Button>
              ))}
            </div>
          </div>

          {/* Bouton Enregistrer */}
          <Button
            onClick={saveSettings}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-bold"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
