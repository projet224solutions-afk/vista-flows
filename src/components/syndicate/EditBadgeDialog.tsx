/**
 * Dialog pour modifier les informations d'un badge
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface EditBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleData: {
    id: string;
    member_name: string;
    driver_photo_url?: string;
    driver_date_of_birth?: string;
    vest_number?: string;
  };
  bureauName?: string;
  onUpdate: () => void;
}

export default function EditBadgeDialog({
  open,
  onOpenChange,
  vehicleData,
  bureauName = 'VOTRE BUREAU',
  onUpdate
}: EditBadgeDialogProps) {
  // Séparer le nom complet en prénom et nom
  const nameParts = vehicleData.member_name.split(' ');
  const initialFirstName = nameParts.slice(0, -1).join(' ') || '';
  const initialLastName = nameParts.slice(-1)[0] || '';

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [vestNumber, setVestNumber] = useState(vehicleData.vest_number || '');
  const [dateOfBirth, setDateOfBirth] = useState(vehicleData.driver_date_of_birth || '');
  const [photoUrl, setPhotoUrl] = useState(vehicleData.driver_photo_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    try {
      setUploading(true);
      toast.info('Upload de la photo en cours...');

      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${vehicleData.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('driver-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('driver-photos')
        .getPublicUrl(filePath);

      setPhotoUrl(publicUrl);
      toast.success('Photo uploadée avec succès');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erreur lors de l\'upload de la photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      toast.info('Enregistrement des modifications...');

      // Combiner prénom et nom
      const fullName = `${firstName} ${lastName}`.trim();

      const { error } = await supabase
        .from('vehicles')
        .update({
          member_name: fullName,
          vest_number: vestNumber || null,
          driver_photo_url: photoUrl || null,
          driver_date_of_birth: dateOfBirth || null,
        })
        .eq('id', vehicleData.id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast.success('Informations mises à jour avec succès');
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating badge info:', error);
      toast.error(`Erreur lors de la mise à jour: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex flex-col">
              <span>Modifier les informations du badge</span>
              <span className="text-sm font-normal text-muted-foreground mt-1">
                TAXI-MOTO DE {bureauName.toUpperCase()}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Nom et Prénom */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">Prénom(s)</Label>
              <Input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom du conducteur"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Nom</Label>
              <Input
                id="last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom du conducteur"
              />
            </div>
          </div>

          {/* Matricule / N° Gilet */}
          <div className="space-y-2">
            <Label htmlFor="vest-number">Matricule / N° Gilet</Label>
            <Input
              id="vest-number"
              type="text"
              value={vestNumber}
              onChange={(e) => setVestNumber(e.target.value)}
              placeholder="Ex: 001, A-123, etc."
            />
          </div>

          {/* Photo du conducteur */}
          <div className="space-y-2">
            <Label>Photo du conducteur</Label>
            {photoUrl && (
              <div className="flex justify-center mb-4">
                <img 
                  src={photoUrl} 
                  alt="Photo du conducteur"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-border"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={uploading}
              >
                <Upload className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Format: JPG, PNG. Taille max: 5MB
            </p>
          </div>

          {/* Date de naissance */}
          <div className="space-y-2">
            <Label htmlFor="date-of-birth">Date de naissance du conducteur</Label>
            <Input
              id="date-of-birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
