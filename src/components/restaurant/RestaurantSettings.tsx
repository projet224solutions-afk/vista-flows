/**
 * Paramètres du Restaurant - Horaires, Description, Images
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, Save, Store, Phone, Mail, MapPin, 
  Image as ImageIcon, Globe, Upload, X, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RestaurantSettingsProps {
  serviceId: string;
}

interface OpeningHour {
  open: string;
  close: string;
  closed: boolean;
}

interface OpeningHours {
  monday: OpeningHour;
  tuesday: OpeningHour;
  wednesday: OpeningHour;
  thursday: OpeningHour;
  friday: OpeningHour;
  saturday: OpeningHour;
  sunday: OpeningHour;
}

const DAYS_FR: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

const DEFAULT_HOURS: OpeningHours = {
  monday: { open: '08:00', close: '22:00', closed: false },
  tuesday: { open: '08:00', close: '22:00', closed: false },
  wednesday: { open: '08:00', close: '22:00', closed: false },
  thursday: { open: '08:00', close: '22:00', closed: false },
  friday: { open: '08:00', close: '22:00', closed: false },
  saturday: { open: '08:00', close: '22:00', closed: false },
  sunday: { open: '08:00', close: '22:00', closed: true },
};

export function RestaurantSettings({ serviceId }: RestaurantSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  const [formData, setFormData] = useState({
    business_name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    neighborhood: '',
    logo_url: '',
    cover_image_url: '',
  });
  
  const [openingHours, setOpeningHours] = useState<OpeningHours>(DEFAULT_HOURS);

  useEffect(() => {
    loadSettings();
  }, [serviceId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('professional_services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          business_name: data.business_name || '',
          description: data.description || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          address: data.address || '',
          city: data.city || '',
          neighborhood: data.neighborhood || '',
          logo_url: data.logo_url || '',
          cover_image_url: data.cover_image_url || '',
        });
        
        if (data.opening_hours && typeof data.opening_hours === 'object') {
          setOpeningHours({ ...DEFAULT_HOURS, ...(data.opening_hours as Partial<OpeningHours>) });
        }
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Convert opening hours to Json-compatible format
      const openingHoursJson = JSON.parse(JSON.stringify(openingHours));
      
      const { error } = await supabase
        .from('professional_services')
        .update({
          business_name: formData.business_name,
          description: formData.description,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          address: formData.address,
          city: formData.city,
          neighborhood: formData.neighborhood,
          logo_url: formData.logo_url,
          cover_image_url: formData.cover_image_url,
          opening_hours: openingHoursJson,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId);

      if (error) throw error;
      
      toast.success('Paramètres sauvegardés !');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'cover') => {
    if (!file) return;
    
    const isLogo = type === 'logo';
    const setUploading = isLogo ? setUploadingLogo : setUploadingCover;
    const maxSize = isLogo ? 2 : 5; // MB
    
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`L'image ne doit pas dépasser ${maxSize}MB`);
      return;
    }
    
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${serviceId}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `restaurants/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('public-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-images')
        .getPublicUrl(filePath);

      if (isLogo) {
        setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      } else {
        setFormData(prev => ({ ...prev, cover_image_url: publicUrl }));
      }
      
      toast.success('Image uploadée !');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDayChange = (day: keyof OpeningHours, field: keyof OpeningHour, value: string | boolean) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Informations du Restaurant
          </CardTitle>
          <CardDescription>
            Ces informations seront visibles par vos clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom du restaurant</Label>
              <Input
                value={formData.business_name}
                onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                placeholder="Mon Restaurant"
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+224 XXX XX XX XX"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@restaurant.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Site web</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez votre restaurant, votre cuisine, votre ambiance..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Adresse</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rue / Avenue"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quartier</Label>
              <Input
                value={formData.neighborhood}
                onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                placeholder="Kaloum, Ratoma..."
              />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Conakry"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Images du Restaurant
          </CardTitle>
          <CardDescription>
            Logo et image de couverture
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo */}
            <div className="space-y-3">
              <Label>Logo</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {formData.logo_url ? (
                  <div className="relative inline-block">
                    <img 
                      src={formData.logo_url} 
                      alt="Logo" 
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="py-4">
                    <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun logo</p>
                  </div>
                )}
                <label className="mt-3 inline-block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                    disabled={uploadingLogo}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                    <span className="cursor-pointer">
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploadingLogo ? 'Upload...' : 'Changer le logo'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Cover Image */}
            <div className="space-y-3">
              <Label>Image de couverture</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {formData.cover_image_url ? (
                  <div className="relative inline-block">
                    <img 
                      src={formData.cover_image_url} 
                      alt="Cover" 
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, cover_image_url: '' }))}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="py-4">
                    <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune image</p>
                  </div>
                )}
                <label className="mt-3 inline-block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
                    disabled={uploadingCover}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploadingCover}>
                    <span className="cursor-pointer">
                      {uploadingCover ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploadingCover ? 'Upload...' : 'Changer l\'image'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horaires d'ouverture
          </CardTitle>
          <CardDescription>
            Configurez vos heures d'ouverture pour chaque jour
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(Object.keys(openingHours) as Array<keyof OpeningHours>).map((day) => (
              <div key={day} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-24 font-medium text-sm">
                  {DAYS_FR[day]}
                </div>
                <Switch
                  checked={!openingHours[day].closed}
                  onCheckedChange={(checked) => handleDayChange(day, 'closed', !checked)}
                />
                {!openingHours[day].closed && (
                  <>
                    <Input
                      type="time"
                      value={openingHours[day].open}
                      onChange={(e) => handleDayChange(day, 'open', e.target.value)}
                      className="w-28"
                    />
                    <span className="text-muted-foreground">à</span>
                    <Input
                      type="time"
                      value={openingHours[day].close}
                      onChange={(e) => handleDayChange(day, 'close', e.target.value)}
                      className="w-28"
                    />
                  </>
                )}
                {openingHours[day].closed && (
                  <span className="text-sm text-muted-foreground">Fermé</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
        </Button>
      </div>
    </div>
  );
}

export default RestaurantSettings;
