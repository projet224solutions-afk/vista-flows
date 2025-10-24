/**
 * PARAMÈTRES CHAUFFEUR
 * Gestion complète du profil et préférences avec connexion base de données
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, Bell, User, Phone, Mail, Car, 
  Settings as SettingsIcon, Save, LogOut, Loader2, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface DriverSettingsProps {
  driverId: string;
}

interface DriverProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  vehicle_type: string;
  vehicle_plate: string | null;
  rating: number;
  total_rides: number;
  kyc_verified: boolean;
}

export function DriverSettings({ driverId }: DriverSettingsProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [settings, setSettings] = useState({
    autoAccept: false,
    soundNotifications: true,
    vibrationNotifications: true,
    serviceRadius: 5,
    preferredZones: [] as string[],
    minRidePrice: 5000,
  });

  // Charger le profil et les paramètres
  useEffect(() => {
    loadDriverData();
  }, [driverId]);

  const loadDriverData = async () => {
    try {
      setLoading(true);

      // Charger les données du chauffeur
      const { data: driverData, error: driverError } = await supabase
        .from('taxi_drivers')
        .select('*')
        .eq('id', driverId)
        .single();

      if (driverError) throw driverError;

      // Charger le profil utilisateur
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', driverData.user_id)
        .single();

      if (profileError) throw profileError;

      setProfile({
        id: driverId,
        user_id: driverData.user_id,
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        avatar_url: profileData.avatar_url,
        vehicle_type: driverData.vehicle_type || 'moto',
        vehicle_plate: driverData.vehicle_plate,
        rating: driverData.rating || 5,
        total_rides: driverData.total_rides || 0,
        kyc_verified: driverData.kyc_verified || false,
      });

      // Charger les paramètres depuis localStorage
      const saved = localStorage.getItem(`driver_settings_${driverId}`);
      if (saved) {
        setSettings({ ...settings, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Sauvegarder dans localStorage
      localStorage.setItem(`driver_settings_${driverId}`, JSON.stringify(settings));
      
      // Mettre à jour le profil si modifié
      if (profile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone,
          })
          .eq('id', profile.user_id);

        if (profileError) throw profileError;

        const { error: driverError } = await supabase
          .from('taxi_drivers')
          .update({
            vehicle_plate: profile.vehicle_plate,
          })
          .eq('id', driverId);

        if (driverError) throw driverError;
      }

      toast.success('✅ Paramètres enregistrés');
      loadDriverData();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Déconnexion réussie');
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Erreur lors de la déconnexion');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Impossible de charger le profil</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Profil du chauffeur */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Mon Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar et infos de base */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-blue-600 text-white text-2xl">
                {profile.first_name[0]}{profile.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-bold">
                {profile.first_name} {profile.last_name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>⭐ {profile.rating.toFixed(1)}</span>
                <span>•</span>
                <span>{profile.total_rides} courses</span>
              </div>
              {profile.kyc_verified && (
                <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                  <Shield className="w-4 h-4" />
                  <span>Vérifié</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Informations de contact */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="first_name" className="text-sm">Prénom</Label>
              <Input
                id="first_name"
                value={profile.first_name}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="last_name" className="text-sm">Nom</Label>
              <Input
                id="last_name"
                value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Téléphone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <Separator />

          {/* Informations du véhicule */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Car className="w-4 h-4" />
              Véhicule
            </h4>

            <div>
              <Label htmlFor="vehicle_type" className="text-sm">Type</Label>
              <Input
                id="vehicle_type"
                value={profile.vehicle_type}
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="vehicle_plate" className="text-sm">Plaque d'immatriculation</Label>
              <Input
                id="vehicle_plate"
                value={profile.vehicle_plate || ''}
                onChange={(e) => setProfile({ ...profile, vehicle_plate: e.target.value })}
                placeholder="Ex: GN-1234-ABC"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paramètres de service */}
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
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-bold"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer les paramètres
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Déconnexion */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-6">
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}