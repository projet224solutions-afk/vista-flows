import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Save, Building2 } from 'lucide-react';

interface VendorBusinessSettingsProps {
  vendorId: string;
}

export default function VendorBusinessSettings({ vendorId }: VendorBusinessSettingsProps) {
  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadVendorData();
  }, [vendorId]);

  const loadVendorData = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('business_name, logo_url')
        .eq('id', vendorId)
        .single();

      if (error) throw error;

      if (data) {
        setBusinessName(data.business_name || '');
        setLogoUrl(data.logo_url || '');
        setLogoPreview(data.logo_url || null);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type et la taille
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner une image');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('L\'image ne doit pas dépasser 2 MB');
        return;
      }

      setLogoFile(file);
      // Créer un aperçu
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return logoUrl;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${vendorId}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, logoFile, {
          contentType: logoFile.type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Erreur upload logo:', error);
      toast.error('Erreur lors du téléchargement du logo');
      return logoUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload du logo si un nouveau fichier a été sélectionné
      let newLogoUrl = logoUrl;
      if (logoFile) {
        newLogoUrl = await uploadLogo() || logoUrl;
      }

      // Mise à jour des données vendeur
      const { error } = await supabase
        .from('vendors')
        .update({
          business_name: businessName,
          logo_url: newLogoUrl
        })
        .eq('id', vendorId);

      if (error) throw error;

      setLogoUrl(newLogoUrl);
      setLogoFile(null);
      toast.success('Informations mises à jour avec succès');
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Informations de l'entreprise
        </CardTitle>
        <CardDescription>
          Personnalisez le nom et le logo de votre entreprise qui apparaîtront sur vos devis et factures
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom de l'entreprise */}
          <div className="space-y-2">
            <Label htmlFor="businessName">Nom de l'entreprise</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex: 224Solutions SARL"
              required
            />
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label htmlFor="logo">Logo de l'entreprise</Label>
            <div className="flex items-start gap-4">
              {/* Aperçu du logo */}
              {logoPreview && (
                <div className="w-24 h-24 border-2 border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              {/* Upload */}
              <div className="flex-1">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Format: PNG, JPG, SVG • Taille max: 2 MB • Recommandé: 500x500px
                </p>
              </div>
            </div>
          </div>

          {/* Bouton de sauvegarde */}
          <Button
            type="submit"
            disabled={loading || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-spin" />
                Téléchargement du logo...
              </>
            ) : loading ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
