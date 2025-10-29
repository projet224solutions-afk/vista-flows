import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Upload, CheckCircle2, Bike, User, FileText, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useBureauOfflineSync } from '@/hooks/useBureauOfflineSync';

// Import mode offline pour MotoRegistrationForm
import offlineSyncManager from '@/lib/offlineSyncManager';

interface MotoForm {
  owner_name: string;
  owner_phone: string;
  vest_number: string;
  plate_number: string;
  serial_number: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  documents?: string[];
}

interface Props {
  bureauId: string;
  onSuccess?: () => void;
}

export default function MotoRegistrationForm({ bureauId, onSuccess }: Props) {
  const [activeTab, setActiveTab] = useState('moto');
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [conducteurSearch, setConducteurSearch] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const { storeOfflineEvent, isOnline } = useBureauOfflineSync(bureauId);
  const [form, setForm] = useState<MotoForm>({
    owner_name: '',
    owner_phone: '',
    vest_number: '',
    plate_number: '',
    serial_number: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    documents: [],
  });

  const updateForm = (field: keyof MotoForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (file: File, field: keyof MotoForm) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `motos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      updateForm(field, publicUrl);
      toast.success('Photo téléchargée avec succès');
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingDoc(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `moto-documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setForm(prev => ({
        ...prev,
        documents: [...(prev.documents || []), ...uploadedUrls]
      }));

      toast.success(`${uploadedUrls.length} document(s) téléchargé(s) avec succès`);
    } catch (error) {
      console.error('Erreur upload documents:', error);
      toast.error('Erreur lors du téléchargement des documents');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const removeDocument = (index: number) => {
    setForm(prev => ({
      ...prev,
      documents: prev.documents?.filter((_, i) => i !== index) || []
    }));
    toast.success('Document retiré');
  };

  const searchConducteur = async () => {
    if (!conducteurSearch) return;
    toast.info('Recherche de conducteur - fonctionnalité à venir');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!form.plate_number || !form.serial_number || !form.brand || !form.model) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (form.brand === 'Autre' && !customBrand.trim()) {
      toast.error('Veuillez spécifier la marque de la moto');
      return;
    }

    if (!form.owner_name || !form.owner_phone) {
      toast.error('Informations du propriétaire requises');
      return;
    }

    setLoading(true);
    try {
      const finalBrand = form.brand === 'Autre' ? customBrand : form.brand;
      
      const motoData = {
        id: crypto.randomUUID(),
        bureau_id: bureauId,
        ...form,
        brand: finalBrand,
        status: 'pending',
        registration_date: new Date().toISOString()
      };

      if (isOnline) {
        // Enregistrement direct si en ligne
        const { data, error } = await supabase
          .from('registered_motos')
          .insert([motoData])
          .select()
          .single();

        if (error) throw error;

        toast.success('🏍️ Moto enregistrée avec succès!', {
          description: 'En attente de validation'
        });
      } else {
        // Stockage hors ligne
        await storeOfflineEvent('moto_registration', motoData);
        
        toast.success('📴 Moto enregistrée localement', {
          description: 'Elle sera synchronisée à la reconnexion'
        });
      }
      
      // Reset form
      setForm({
        owner_name: '',
        owner_phone: '',
        vest_number: '',
        plate_number: '',
        serial_number: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        documents: [],
      });
      setCustomBrand('');
      
      setActiveTab('moto');
      onSuccess?.();
    } catch (error: any) {
      console.error('Erreur enregistrement:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bike className="w-5 h-5" />
            Enregistrement de Moto
          </CardTitle>
          <CardDescription>
            Formulaire complet d'enregistrement et de vérification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="moto">
                <Bike className="w-4 h-4 mr-2" />
                Moto
              </TabsTrigger>
              <TabsTrigger value="proprietaire">
                <User className="w-4 h-4 mr-2" />
                Propriétaire
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="photos">
                <Camera className="w-4 h-4 mr-2" />
                Photos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="moto" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plate_number">Plaque d'immatriculation *</Label>
                  <Input
                    id="plate_number"
                    required
                    value={form.plate_number}
                    onChange={(e) => updateForm('plate_number', e.target.value.toUpperCase())}
                    placeholder="GN-1234-AB"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serial_number">Numéro de série *</Label>
                  <Input
                    id="serial_number"
                    required
                    value={form.serial_number}
                    onChange={(e) => updateForm('serial_number', e.target.value)}
                    placeholder="123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vest_number">Numéro de gilet</Label>
                  <Input
                    id="vest_number"
                    value={form.vest_number}
                    onChange={(e) => updateForm('vest_number', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Marque *</Label>
                  <Select value={form.brand} onValueChange={(val) => {
                    updateForm('brand', val);
                    if (val !== 'Autre') {
                      setCustomBrand('');
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TVS">TVS</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.brand === 'Autre' && (
                  <div className="space-y-2">
                    <Label htmlFor="customBrand">Spécifier la marque *</Label>
                    <Input
                      id="customBrand"
                      required
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      placeholder="Ex: Honda, Yamaha, Suzuki..."
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="model">Modèle *</Label>
                  <Input
                    id="model"
                    required
                    value={form.model}
                    onChange={(e) => updateForm('model', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Couleur</Label>
                  <Input
                    id="color"
                    value={form.color}
                    onChange={(e) => updateForm('color', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Année</Label>
                  <Input
                    id="year"
                    type="number"
                    value={form.year}
                    onChange={(e) => updateForm('year', parseInt(e.target.value))}
                    min="1980"
                    max={new Date().getFullYear()}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="proprietaire" className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <Label>Rechercher un conducteur existant</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Téléphone ou nom"
                    value={conducteurSearch}
                    onChange={(e) => setConducteurSearch(e.target.value)}
                  />
                  <Button type="button" onClick={searchConducteur}>
                    Rechercher
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="owner_name">Nom complet *</Label>
                  <Input
                    id="owner_name"
                    required
                    value={form.owner_name}
                    onChange={(e) => updateForm('owner_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_phone">Téléphone *</Label>
                  <Input
                    id="owner_phone"
                    required
                    type="tel"
                    value={form.owner_phone}
                    onChange={(e) => updateForm('owner_phone', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Documents officiels (Carte grise, Assurance, etc.)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingDoc}
                    onClick={() => document.getElementById('doc-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingDoc ? 'Téléchargement...' : 'Ajouter des documents'}
                  </Button>
                  <input
                    id="doc-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    onChange={handleDocumentUpload}
                  />
                </div>

                {form.documents && form.documents.length > 0 ? (
                  <div className="space-y-2">
                    {form.documents.map((docUrl, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-sm">Document {index + 1}</span>
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Téléchargé
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(docUrl, '_blank')}
                          >
                            Voir
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(index)}
                          >
                            Retirer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Aucun document téléchargé
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, Images, Word acceptés
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="photos" className="space-y-4">
              <p className="text-sm text-muted-foreground">Fonctionnalité de téléchargement de photos à venir</p>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-6">
            <Button type="button" variant="outline" onClick={() => {
              const tabs = ['moto', 'proprietaire', 'documents', 'photos'];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
            }}>
              Précédent
            </Button>
            
            {activeTab !== 'photos' ? (
              <Button type="button" onClick={() => {
                const tabs = ['moto', 'proprietaire', 'documents', 'photos'];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
              }}>
                Suivant
              </Button>
            ) : (
              <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer la Moto'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}