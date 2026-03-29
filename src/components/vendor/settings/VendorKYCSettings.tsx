/**
 * VENDOR KYC SETTINGS - Section KYC dans les paramètres vendeur
 * Affiche le formulaire KYC si activé par le PDG
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface VendorKYCSettingsProps {
  vendorId: string;
}

interface KYCData {
  id: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  phone_number: string | null;
  phone_verified: boolean;
  id_document_type: string | null;
  id_document_url: string | null;
  rejection_reason: string | null;
  created_at: string | null;
  verified_at: string | null;
}

export default function VendorKYCSettings({ vendorId }: VendorKYCSettingsProps) {
  const { user } = useAuth();
  const [kycEnabled, setKycEnabled] = useState<boolean>(false);
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);

  useEffect(() => {
    loadKYCSettings();
  }, [vendorId]);

  const loadKYCSettings = async () => {
    try {
      setLoading(true);
      
      // 1. Vérifier si le KYC est activé globalement pour les vendeurs
      const { data: settings } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'kyc_settings')
        .maybeSingle();

      if (settings?.setting_value) {
        try {
          const parsed = JSON.parse(settings.setting_value);
          setKycEnabled(parsed.vendeur === true);
        } catch (e) {
          console.error('Erreur parsing KYC settings:', e);
        }
      }

      // 2. Charger les données KYC existantes du vendeur
      const { data: kycRow } = await supabase
        .from('vendor_kyc')
        .select('*')
        .eq('vendor_id', vendorId)
        .maybeSingle();

      if (kycRow) {
        setKycData(kycRow as KYCData);
        setPhoneNumber(kycRow.phone_number || '');
        setDocumentType(kycRow.id_document_type || '');
        if (kycRow.id_document_url) {
          setDocumentPreview(kycRow.id_document_url);
        }
      }
    } catch (error) {
      console.error('Erreur chargement KYC:', error);
    } finally {
      setLoading(false);
    }
  };

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

    if (!phoneNumber || !documentType) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Si pas de nouveau fichier et pas d'ancien document
    if (!documentFile && !kycData?.id_document_url) {
      toast.error('Veuillez télécharger un document d\'identité');
      return;
    }

    setSubmitting(true);

    try {
      let documentUrl = kycData?.id_document_url || '';

      // Upload du nouveau document si présent
      if (documentFile) {
        const fileExt = documentFile.name.split('.').pop();
        const fileName = `${vendorId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(fileName, documentFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('kyc-documents')
          .getPublicUrl(fileName);

        documentUrl = publicUrl;
      }

      // Créer ou mettre à jour le KYC
      const { error: kycError } = await supabase
        .from('vendor_kyc')
        .upsert({
          vendor_id: vendorId,
          phone_number: phoneNumber,
          id_document_type: documentType,
          id_document_url: documentUrl,
          status: 'under_review',
          submitted_at: new Date().toISOString(),
          phone_verified: false
        }, {
          onConflict: 'vendor_id'
        });

      if (kycError) {
        throw kycError;
      }

      toast.success('Documents KYC soumis pour vérification');
      await loadKYCSettings();
    } catch (error: any) {
      console.error('Erreur soumission KYC:', error);
      toast.error(error.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 gap-1">
            <ShieldCheck className="w-3 h-3" />
            Vérifié
          </Badge>
        );
      case 'under_review':
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 gap-1">
            <Shield className="w-3 h-3" />
            En cours de vérification
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <ShieldX className="w-3 h-3" />
            Rejeté
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <ShieldAlert className="w-3 h-3" />
            Non soumis
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Si le KYC n'est pas activé pour les vendeurs
  if (!kycEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Vérification KYC
          </CardTitle>
          <CardDescription>
            Vérification d'identité pour votre compte vendeur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium">La vérification KYC n'est pas requise actuellement</p>
            <p className="text-sm mt-2">
              L'administrateur n'a pas activé la vérification KYC pour les vendeurs.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si le KYC est déjà approuvé
  if (kycData?.status === 'approved') {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <ShieldCheck className="w-5 h-5" />
            Vérification KYC
          </CardTitle>
          <CardDescription>
            Votre identité a été vérifiée avec succès
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">Compte vérifié</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Votre vérification d'identité a été approuvée le{' '}
              {kycData.verified_at ? new Date(kycData.verified_at).toLocaleDateString('fr-FR') : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Vérification KYC
            </CardTitle>
            <CardDescription>
              Soumettez vos documents pour vérifier votre identité
            </CardDescription>
          </div>
          {kycData && getStatusBadge(kycData.status)}
        </div>
      </CardHeader>
      <CardContent>
        {/* Message de rejet */}
        {kycData?.status === 'rejected' && kycData.rejection_reason && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Raison du rejet:
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {kycData.rejection_reason}
            </p>
          </div>
        )}

        {/* Message en cours de vérification */}
        {(kycData?.status === 'under_review' || kycData?.status === 'pending') && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Vos documents sont en cours de vérification. Nous vous notifierons dès que le processus sera terminé.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+224 XXX XXX XXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={kycData?.status === 'under_review'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="docType">Type de document *</Label>
            <Select 
              value={documentType} 
              onValueChange={setDocumentType}
              disabled={kycData?.status === 'under_review'}
            >
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

          <div className="space-y-2">
            <Label htmlFor="document">Document d'identité * (max 5 Mo)</Label>
            <div className="mt-2">
              {documentPreview ? (
                <div className="relative">
                  <img 
                    src={documentPreview} 
                    alt="Aperçu" 
                    className="max-h-48 rounded-lg border"
                  />
                  {kycData?.status !== 'under_review' && (
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
                  )}
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
                    disabled={kycData?.status === 'under_review'}
                  />
                </label>
              )}
            </div>
          </div>

          {kycData?.status !== 'under_review' && (
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : kycData ? (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Soumettre à nouveau
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Soumettre pour vérification
                </>
              )}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
