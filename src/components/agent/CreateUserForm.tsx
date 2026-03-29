import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  UserPlus, 
  Users, 
  ShoppingBag, 
  Truck, 
  Car, 
  Ship, 
  Building2,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useAgentActions, CreateUserData } from '@/hooks/useAgentActions';

const USER_ROLES = [
  { value: 'client', label: 'Client', icon: Users, description: 'Utilisateur acheteur', color: 'text-primary-orange-600' },
  { value: 'vendeur', label: 'Vendeur', icon: ShoppingBag, description: 'Boutique/Commerce', color: 'text-blue-600' },
  { value: 'livreur', label: 'Livreur', icon: Truck, description: 'Livraison de colis', color: 'text-yellow-600' },
  { value: 'taxi', label: 'Taxi', icon: Car, description: 'Transport de personnes', color: 'text-purple-600' },
  { value: 'transitaire', label: 'Transitaire', icon: Ship, description: 'Logistique internationale', color: 'text-orange-600' },
  { value: 'syndicat', label: 'Syndicat', icon: Building2, description: 'Organisation syndicale', color: 'text-pink-600' },
  { value: 'prestataire', label: 'Prestataire', icon: Building2, description: 'Service de proximitÃ©', color: 'text-primary-orange-600' },
];

// Codes synchronisÃ©s avec service_types en BDD
const VENDOR_SERVICE_TYPES = [
  { value: 'ecommerce', label: 'Boutique / E-commerce' },
  { value: 'restaurant', label: 'Restaurant / Alimentation' },
  { value: 'beaute', label: 'BeautÃ© & Bien-Ãªtre' },
  { value: 'reparation', label: 'RÃ©paration / MÃ©canique' },
  { value: 'location', label: 'Location ImmobiliÃ¨re' },
  { value: 'freelance', label: 'Services Professionnels' },
  { value: 'media', label: 'Photographe / VidÃ©aste' },
  { value: 'education', label: 'Ã‰ducation / Formation' },
  { value: 'sante', label: 'SantÃ© & Bien-Ãªtre' },
  { value: 'voyage', label: 'Voyage / Tourisme' },
  { value: 'menage', label: 'MÃ©nage & Entretien' },
  { value: 'informatique', label: 'Informatique / Tech' },
  { value: 'construction', label: 'Construction / BTP' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'livraison', label: 'Livraison / Coursier' },
  { value: 'vtc', label: 'VTC / Transport' },
] as const;
interface CreateUserFormProps {
  agentId: string;
  agentCode: string;
  accessToken?: string; // Token d'accÃ¨s pour les agents/sous-agents publics
  onUserCreated?: () => void; // Callback aprÃ¨s crÃ©ation rÃ©ussie
}

export function CreateUserForm({ agentId, agentCode, accessToken, onUserCreated }: CreateUserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { createUser } = useAgentActions({ onUserCreated });
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'client' as CreateUserData['role'],
    country: 'GuinÃ©e',
    city: '',
    // DonnÃ©es syndicat
    bureau_code: '',
    prefecture: '',
    commune: '',
    full_location: '',
    // DonnÃ©es vendeur
    business_name: '',
    business_description: '',
    business_address: '',
    service_type: '',
    // DonnÃ©es taxi/livreur
    license_number: '',
    vehicle_type: 'moto',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_plate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation du mot de passe
    if (!formData.password || formData.password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractÃ¨res');
      setIsSubmitting(false);
      return;
    }

    try {
      // PrÃ©parer les donnÃ©es selon le rÃ´le
      const userData: CreateUserData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        country: formData.country,
        city: formData.city
      };

      // Ajouter donnÃ©es spÃ©cifiques selon le rÃ´le
      if (formData.role === 'syndicat') {
        userData.syndicatData = {
          bureau_code: formData.bureau_code,
          prefecture: formData.prefecture,
          commune: formData.commune,
          full_location: formData.full_location
        };
      } else if (formData.role === 'vendeur' || formData.role === 'prestataire') {
        userData.vendeurData = {
          business_name: formData.business_name,
          business_description: formData.business_description,
          business_address: formData.business_address,
          service_type: formData.service_type,
        };
      } else if (formData.role === 'taxi' || formData.role === 'livreur') {
        userData.driverData = {
          license_number: formData.license_number,
          vehicle_type: formData.vehicle_type,
          vehicle_brand: formData.vehicle_brand,
          vehicle_model: formData.vehicle_model,
          vehicle_year: formData.vehicle_year,
          vehicle_plate: formData.vehicle_plate
        };
      }

      // Appeler le hook
      console.log('ðŸ”„ [CreateUserForm] Tentative crÃ©ation utilisateur:', {
        agentId,
        agentCode,
        role: userData.role,
        email: userData.email,
        hasAccessToken: !!accessToken
      });

      const result = await createUser(userData, agentId, agentCode, accessToken);

      console.log('ðŸ“¥ [CreateUserForm] RÃ©sultat:', result);

      if (result.success) {
        toast.success('âœ… Utilisateur crÃ©Ã© avec succÃ¨s!');
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          role: 'client',
          country: 'GuinÃ©e',
          city: '',
          bureau_code: '',
          prefecture: '',
          commune: '',
          full_location: '',
          business_name: '',
          business_description: '',
          business_address: '',
          service_type: '',
          license_number: '',
          vehicle_type: 'moto',
          vehicle_brand: '',
          vehicle_model: '',
          vehicle_year: '',
          vehicle_plate: '',
        });
        setShowPassword(false);
        setIsOpen(false);
      } else {
        console.error('âŒ [CreateUserForm] Erreur:', result.error);
        toast.error(result.error || 'Erreur lors de la crÃ©ation');
      }
    } catch (error: any) {
      console.error('Erreur crÃ©ation utilisateur:', error);
      toast.error(error.message || 'Erreur lors de la crÃ©ation de l\'utilisateur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRole = USER_ROLES.find(r => r.value === formData.role);
  const RoleIcon = selectedRole?.icon || Users;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <UserPlus className="w-5 h-5 mr-2" />
          CrÃ©er un Utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] h-[80vh] flex flex-col p-0 top-[10%] translate-y-0">
        <DialogHeader className="flex-shrink-0 bg-primary-blue-600 text-white p-4 rounded-t-lg">
          <DialogTitle className="text-lg font-bold">CrÃ©er un Nouvel Utilisateur</DialogTitle>
          <DialogDescription className="text-primary-blue-100">
            SÃ©lectionnez le type d'utilisateur et remplissez les informations
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SÃ©lection du type d'utilisateur */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Type d'utilisateur *</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {USER_ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = formData.role === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: role.value as CreateUserData['role'] })}
                    className={`p-2 rounded-lg border-2 transition-all text-center ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20' : 'bg-muted'}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? role.color : 'text-muted-foreground'}`} />
                      </div>
                      <p className={`font-semibold text-xs ${isSelected ? 'text-primary' : ''}`}>
                        {role.label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Informations de base */}
          <div className="space-y-4 p-4 bg-accent/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <RoleIcon className={`w-5 h-5 ${selectedRole?.color}`} />
              <h3 className="font-semibold">Informations {selectedRole?.label}</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="flex items-center gap-1 text-sm">
                  <Users className="w-3 h-3" />
                  PrÃ©nom *
                </Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="PrÃ©nom"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="flex items-center gap-1 text-sm">
                  <Users className="w-3 h-3" />
                  Nom
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Nom"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-1 text-sm">
                  <Mail className="w-3 h-3" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemple.com"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-1 text-sm">
                  <Phone className="w-3 h-3" />
                  TÃ©lÃ©phone *
                </Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="622123456"
                  className="h-9"
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="flex items-center gap-1 text-sm">
                <Lock className="w-3 h-3" />
                Mot de passe *
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 8 caractÃ¨res"
                  className="h-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ce mot de passe sera utilisÃ© par l'utilisateur pour se connecter
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="country" className="flex items-center gap-1 text-sm">
                  <MapPin className="w-3 h-3" />
                  Pays
                </Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="GuinÃ©e"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city" className="flex items-center gap-1 text-sm">
                  <MapPin className="w-3 h-3" />
                  Ville
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Conakry"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Champs spÃ©cifiques au rÃ´le Syndicat */}
          {formData.role === 'syndicat' && (
            <div className="space-y-3 p-4 bg-pink-50 dark:bg-pink-950/20 rounded-lg border-2 border-pink-200 dark:border-pink-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-pink-600" />
                <h3 className="font-semibold text-pink-900 dark:text-pink-100">Informations du Bureau Syndical</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bureau_code" className="text-sm">Code Bureau *</Label>
                  <Input
                    id="bureau_code"
                    required
                    value={formData.bureau_code}
                    onChange={(e) => setFormData({ ...formData, bureau_code: e.target.value })}
                    placeholder="Ex: BUR-CON-001"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prefecture" className="text-sm">PrÃ©fecture *</Label>
                  <Input
                    id="prefecture"
                    required
                    value={formData.prefecture}
                    onChange={(e) => setFormData({ ...formData, prefecture: e.target.value })}
                    placeholder="Ex: Conakry"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="commune" className="text-sm">Commune *</Label>
                  <Input
                    id="commune"
                    required
                    value={formData.commune}
                    onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                    placeholder="Ex: Matam"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="full_location" className="text-sm">Localisation</Label>
                  <Input
                    id="full_location"
                    value={formData.full_location}
                    onChange={(e) => setFormData({ ...formData, full_location: e.target.value })}
                    placeholder="Ex: PrÃ¨s du marchÃ©"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Champs spÃ©cifiques au rÃ´le Vendeur */}
          {formData.role === 'vendeur' && (
            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Informations de l'Entreprise</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="service_type" className="text-sm">Type de service *</Label>
                  <select
                    id="service_type"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    required
                  >
                    <option value="">SÃ©lectionnezâ€¦</option>
                    {VENDOR_SERVICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="business_name" className="text-sm">Nom de l'entreprise *</Label>
                  <Input
                    id="business_name"
                    required
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="Ex: Boutique centrale"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="business_description" className="text-sm">Description de l'activitÃ©</Label>
                  <Input
                    id="business_description"
                    value={formData.business_description}
                    onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                    placeholder="Ex: Vente de produits alimentaires"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="business_address" className="text-sm">Adresse de l'entreprise</Label>
                  <Input
                    id="business_address"
                    value={formData.business_address}
                    onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                    placeholder="Ex: MarchÃ© Madina, Conakry"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Champs spÃ©cifiques au rÃ´le Prestataire */}
          {formData.role === 'prestataire' && (
            <div className="space-y-3 p-4 bg-primary-orange-50 dark:bg-primary-orange-950/20 rounded-lg border-2 border-primary-orange-200 dark:border-primary-orange-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-orange-600" />
                <h3 className="font-semibold text-primary-orange-900 dark:text-primary-orange-100">Informations du Service</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="service_type_prest" className="text-sm">Type de service *</Label>
                  <select
                    id="service_type_prest"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    required
                  >
                    <option value="">SÃ©lectionnezâ€¦</option>
                    {VENDOR_SERVICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="business_name_prest" className="text-sm">Nom du service *</Label>
                  <Input
                    id="business_name_prest"
                    required
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="Ex: Salon de coiffure Aminata"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="business_description_prest" className="text-sm">Description</Label>
                  <Input
                    id="business_description_prest"
                    value={formData.business_description}
                    onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                    placeholder="DÃ©crivez votre service..."
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="business_address_prest" className="text-sm">Adresse</Label>
                  <Input
                    id="business_address_prest"
                    value={formData.business_address}
                    onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                    placeholder="Ex: Quartier Madina, Conakry"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}
          {/* Champs spÃ©cifiques aux rÃ´les Taxi et Livreur */}
          {(formData.role === 'taxi' || formData.role === 'livreur') && (
            <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                {formData.role === 'taxi' ? (
                  <Car className="w-5 h-5 text-yellow-600" />
                ) : (
                  <Truck className="w-5 h-5 text-yellow-600" />
                )}
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Informations du VÃ©hicule
                </h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="license_number" className="text-sm">NumÃ©ro de permis *</Label>
                  <Input
                    id="license_number"
                    required
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    placeholder="Ex: GN123456"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle_type" className="text-sm">Type de vÃ©hicule *</Label>
                  <select
                    id="vehicle_type"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  >
                    <option value="moto">Moto</option>
                    <option value="car">Voiture</option>
                    <option value="van">Camionnette</option>
                    <option value="truck">Camion</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle_brand" className="text-sm">Marque</Label>
                  <Input
                    id="vehicle_brand"
                    value={formData.vehicle_brand}
                    onChange={(e) => setFormData({ ...formData, vehicle_brand: e.target.value })}
                    placeholder="Ex: Toyota"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle_model" className="text-sm">ModÃ¨le</Label>
                  <Input
                    id="vehicle_model"
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                    placeholder="Ex: Corolla"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle_year" className="text-sm">AnnÃ©e</Label>
                  <Input
                    id="vehicle_year"
                    value={formData.vehicle_year}
                    onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                    placeholder="Ex: 2020"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle_plate" className="text-sm">Plaque</Label>
                  <Input
                    id="vehicle_plate"
                    value={formData.vehicle_plate}
                    onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                    placeholder="Ex: AB-1234-CD"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}
        </form>
        </div>
        
        {/* Boutons d'action - toujours visibles en bas */}
        <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t bg-background rounded-b-lg">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="h-11"
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="min-w-[160px] h-11"
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                CrÃ©ation...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                CrÃ©er l'utilisateur
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
