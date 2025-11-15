import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface VendorKYCFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VendorKYCForm({ onSuccess, onCancel }: VendorKYCFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 5 Mo');
        return;
      }
      setDocumentFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (!phoneNumber || !documentType || !documentFile) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      // Upload du document
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, documentFile);

      if (uploadError) {
        throw uploadError;
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      // Créer ou mettre à jour le KYC
      const { error: kycError } = await supabase
        .from('vendor_kyc')
        .upsert({
          vendor_id: user.id,
          phone_number: phoneNumber,
          id_document_type: documentType,
          id_document_url: publicUrl,
          status: 'under_review',
          phone_verified: false
        });

      if (kycError) {
        throw kycError;
      }

      toast.success('Documents soumis pour vérification');
      onSuccess?.();
    } catch (error) {
      console.error('Erreur soumission KYC:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="phone">Numéro de téléphone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+224 XXX XXX XXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="docType">Type de document</Label>
          <Select value={documentType} onValueChange={setDocumentType} required>
            <SelectTrigger id="docType">
              <SelectValue placeholder="Sélectionner un document" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="carte_identite">Carte d'identité nationale</SelectItem>
              <SelectItem value="passeport">Passeport</SelectItem>
              <SelectItem value="permis_conduire">Permis de conduire</SelectItem>
              <SelectItem value="registre_commerce">Registre de commerce</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="document">Document d'identité (max 5 Mo)</Label>
          <div className="mt-2">
            {documentPreview ? (
              <div className="relative">
                <img 
                  src={documentPreview} 
                  alt="Aperçu" 
                  className="max-h-48 rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setDocumentFile(null);
                    setDocumentPreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cliquez pour télécharger</span>
                <input
                  id="document"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  required
                />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Soumission...' : 'Soumettre'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
