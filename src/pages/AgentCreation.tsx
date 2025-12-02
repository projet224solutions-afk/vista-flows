/**
 * Page de Création d'Agent
 * Formulaire complet avec génération auto d'ID
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Upload, Loader2, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function AgentCreation() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    agentCode: '', // Optionnel - auto-généré si vide
    typeAgent: 'principal',
    canCreateSubAgent: true
  });

  // Vérification des permissions
  if (!profile || (profile.role !== 'admin' && profile.role !== 'agent')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Accès refusé. Seuls les administrateurs et agents principaux peuvent créer des agents.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `agent_${Date.now()}.${fileExt}`;
      const filePath = `agents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('❌ Erreur upload photo:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (formData.password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      // Upload de la photo si fournie
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }

      // Hash du mot de passe (utilise SHA-256 comme dans l'Edge Function)
      const encoder = new TextEncoder();
      const data = encoder.encode(formData.password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Récupérer le PDG ID depuis l'utilisateur connecté
      const { data: pdgData } = await supabase
        .from('pdg_management')
        .select('id')
        .eq('user_id', profile?.id)
        .single();

      const pdgId = pdgData?.id;

      if (!pdgId) {
        throw new Error('Impossible de déterminer votre organisation');
      }

      // Créer l'agent
      const { data: newAgent, error: insertError } = await supabase
        .from('agents_management')
        .insert({
          name: `${formData.firstName} ${formData.lastName}`,
          full_name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          password_hash: passwordHash,
          agent_code: formData.agentCode || undefined, // Auto-généré par trigger si vide
          type_agent: formData.typeAgent,
          can_create_sub_agent: formData.canCreateSubAgent,
          role: 'agent',
          is_active: true,
          pdg_id: pdgId,
          permissions: {
            photo_url: photoUrl,
            gender: formData.gender
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('✅ Agent créé avec succès:', newAgent);
      
      toast.success('Agent créé avec succès !', {
        description: `Code agent: ${newAgent.agent_code}`
      });

      // Redirection
      setTimeout(() => {
        navigate('/agent-dashboard');
      }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Erreur création agent:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-3xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-primary/10 p-3 rounded-lg">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Créer un nouvel agent</h1>
              <p className="text-muted-foreground">Remplissez le formulaire pour ajouter un agent</p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Informations de l'agent</CardTitle>
            <CardDescription>
              Le code agent sera généré automatiquement si non fourni
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Photo de profil */}
              <div className="space-y-2">
                <Label>Photo de profil (optionnel)</Label>
                <div className="flex items-center gap-4">
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="Aperçu"
                      className="w-20 h-20 rounded-full object-cover border-2 border-border"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Identité */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Sexe */}
              <div className="space-y-2">
                <Label htmlFor="gender">Sexe *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Féminin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="620123456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="agent@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Code agent (optionnel) */}
              <div className="space-y-2">
                <Label htmlFor="agentCode">Code Agent (optionnel)</Label>
                <Input
                  id="agentCode"
                  placeholder="Laissez vide pour génération automatique"
                  value={formData.agentCode}
                  onChange={(e) => setFormData({ ...formData, agentCode: e.target.value })}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Si vide, un code sera généré automatiquement (ex: AGT12345)
                </p>
              </div>

              {/* Type d'agent */}
              <div className="space-y-2">
                <Label htmlFor="typeAgent">Type d'agent</Label>
                <Select
                  value={formData.typeAgent}
                  onValueChange={(value) => setFormData({ ...formData, typeAgent: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal">Agent Principal</SelectItem>
                    <SelectItem value="sous_agent">Sous-Agent</SelectItem>
                    <SelectItem value="agent_regional">Agent Régional</SelectItem>
                    <SelectItem value="agent_local">Agent Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mot de passe */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 caractères"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Répéter le mot de passe"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Message d'erreur */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Boutons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Créer l'agent
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
