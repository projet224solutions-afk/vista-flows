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
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { useAgentActions, CreateUserData } from '@/hooks/useAgentActions';

const USER_ROLES = [
  { value: 'client', label: 'Client', icon: Users, description: 'Utilisateur acheteur', color: 'text-green-600' },
  { value: 'vendeur', label: 'Vendeur', icon: ShoppingBag, description: 'Boutique/Commerce', color: 'text-blue-600' },
  { value: 'livreur', label: 'Livreur', icon: Truck, description: 'Livraison de colis', color: 'text-yellow-600' },
  { value: 'taxi', label: 'Taxi', icon: Car, description: 'Transport de personnes', color: 'text-purple-600' },
  { value: 'transitaire', label: 'Transitaire', icon: Ship, description: 'Logistique internationale', color: 'text-orange-600' },
  { value: 'syndicat', label: 'Syndicat', icon: Building2, description: 'Organisation syndicale', color: 'text-pink-600' },
];

// ✅ SYNCHRONISÉ avec la migration SQL 20260111_sync_service_types_inscription.sql
// Les codes correspondent exactement à la table service_types
const VENDOR_SERVICE_TYPES = [
  // Services de Proximité Populaires
  { value: 'ecommerce', label: 'Boutique / E-commerce' },
  { value: 'restaurant', label: 'Restaurant / Alimentation' },
  { value: 'beaute', label: 'Beauté & Bien-être (Coiffure, Esthétique)' },
  { value: 'reparation', label: 'Réparation / Mécanique' },
  { value: 'vtc', label: 'VTC / Transport' },
  { value: 'menage', label: 'Ménage & Entretien' },
  { value: 'informatique', label: 'Informatique / Tech' },
  
  // Services Professionnels
  { value: 'location', label: 'Immobilier / Location' },
  { value: 'media', label: 'Photographe / Vidéaste' },
  { value: 'education', label: 'Éducation / Formation' },
  { value: 'sante', label: 'Santé & Bien-être' },
  { value: 'voyage', label: 'Voyage / Tourisme' },
  { value: 'freelance', label: 'Services Professionnels' },
  { value: 'construction', label: 'Construction / BTP' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'livraison', label: 'Livraison / Coursier' },
  
  // Produits Numériques (nouveaux)
  { value: 'sport', label: 'Sport & Fitness' },
  { value: 'maison', label: 'Maison & Déco' },
] as const;
interface CreateUserFormProps {
  agentId: string;
  agentCode: string;
  accessToken?: string; // Token d'accès pour les agents/sous-agents publics
  onUserCreated?: () => void; // Callback après création réussie
}

export function CreateUserForm({ agentId, agentCode, accessToken, onUserCreated }: CreateUserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createUser } = useAgentActions({ onUserCreated });
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'client' as CreateUserData['role'],
    country: 'Guinée',
    city: '',
    // Données syndicat
    bureau_code: '',
    prefecture: '',
    commune: '',
    full_location: '',
    // Données vendeur
    business_name: '',
    business_description: '',
    business_address: '',
    service_type: '',
    // Données taxi/livreur
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

    try {
      // Préparer les données selon le rôle
      const userData: CreateUserData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        country: formData.country,
        city: formData.city
      };

      // Ajouter données spécifiques selon le rôle
      if (formData.role === 'syndicat') {
        userData.syndicatData = {
          bureau_code: formData.bureau_code,
          prefecture: formData.prefecture,
          commune: formData.commune,
          full_location: formData.full_location
        };
      } else if (formData.role === 'vendeur') {
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
      console.log('🔄 [CreateUserForm] Tentative création utilisateur:', {
        agentId,
        agentCode,
        role: userData.role,
        email: userData.email,
        hasAccessToken: !!accessToken
      });

      const result = await createUser(userData, agentId, agentCode, accessToken);

      console.log('📥 [CreateUserForm] Résultat:', result);

      if (result.success) {
        toast.success('✅ Utilisateur créé avec succès!');
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'client',
          country: 'Guinée',
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
        setIsOpen(false);
      } else {
        console.error('❌ [CreateUserForm] Erreur:', result.error);
        toast.error(result.error || 'Erreur lors de la création');
      }
    } catch (error: any) {
      console.error('Erreur création utilisateur:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'utilisateur');
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
          Créer un Utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] h-[80vh] flex flex-col p-0 top-[10%] translate-y-0">
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-green-600 text-white p-4 rounded-t-lg">
          <DialogTitle className="text-lg font-bold">Créer un Nouvel Utilisateur</DialogTitle>
          <DialogDescription className="text-emerald-100">
            Sélectionnez le type d'utilisateur et remplissez les informations
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sélection du type d'utilisateur */}
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
                  Prénom *
                </Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Prénom"
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
                  Téléphone *
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
                  placeholder="Guinée"
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

          {/* Champs spécifiques au rôle Syndicat */}
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
                  <Label htmlFor="prefecture" className="text-sm">Préfecture *</Label>
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
                    placeholder="Ex: Près du marché"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Champs spécifiques au rôle Vendeur */}
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
                    <option value="">Sélectionnez…</option>
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
                  <Label htmlFor="business_description" className="text-sm">Description de l'activité</Label>
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
                    placeholder="Ex: Marché Madina, Conakry"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Champs spécifiques aux rôles Taxi et Livreur */}
          {(formData.role === 'taxi' || formData.role === 'livreur') && (
            <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                {formData.role === 'taxi' ? (
                  <Car className="w-5 h-5 text-yellow-600" />
                ) : (
                  <Truck className="w-5 h-5 text-yellow-600" />
                )}
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Informations du Véhicule
                </h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="license_number" className="text-sm">Numéro de permis *</Label>
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
                  <Label htmlFor="vehicle_type" className="text-sm">Type de véhicule *</Label>
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
                  <Label htmlFor="vehicle_model" className="text-sm">Modèle</Label>
                  <Input
                    id="vehicle_model"
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                    placeholder="Ex: Corolla"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle_year" className="text-sm">Année</Label>
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
                Création...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Créer l'utilisateur
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
