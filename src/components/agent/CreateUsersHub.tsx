import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  UserPlus, 
  Users, 
  ShoppingBag, 
  Truck, 
  Car, 
  Ship, 
  Building2, 
  Shield,
  Mail,
  Phone,
  MapPin,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateUsersHubProps {
  agentId: string;
  agentCode: string;
  pdgId: string;
  canCreateSubAgent?: boolean;
  onUserCreated?: () => void;
}

const USER_ROLES = [
  { value: 'client', label: 'Client', icon: Users, description: 'Utilisateur acheteur', color: 'text-green-600' },
  { value: 'vendeur', label: 'Vendeur', icon: ShoppingBag, description: 'Boutique/Commerce', color: 'text-blue-600' },
  { value: 'livreur', label: 'Livreur', icon: Truck, description: 'Livraison de colis', color: 'text-yellow-600' },
  { value: 'taxi', label: 'Taxi', icon: Car, description: 'Transport de personnes', color: 'text-purple-600' },
  { value: 'transitaire', label: 'Transitaire', icon: Ship, description: 'Logistique internationale', color: 'text-orange-600' },
  { value: 'syndicat', label: 'Syndicat', icon: Building2, description: 'Organisation syndicale', color: 'text-pink-600' },
];

export function CreateUsersHub({ 
  agentId, 
  agentCode, 
  pdgId,
  canCreateSubAgent,
  onUserCreated 
}: CreateUsersHubProps) {
  const [activeTab, setActiveTab] = useState('users');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Formulaire utilisateur standard
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'client',
    country: 'Guinée',
    city: '',
  });

  // Formulaire sous-agent
  const [subAgentData, setSubAgentData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_rate: 5,
    permissions: {
      create_users: true,
      view_reports: true,
      manage_commissions: false,
      manage_users: false,
      create_sub_agents: false,
    }
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData.firstName || !userData.email || !userData.phone) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase.functions.invoke('create-user-by-agent', {
        body: {
          email: userData.email,
          password: Math.random().toString(36).slice(-8) + 'Aa1!',
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          role: userData.role,
          country: userData.country,
          city: userData.city,
          agentId: agentId,
          agentCode: agentCode,
        },
      });

      if (error || data?.error) {
        if (data?.code === 'EMAIL_EXISTS') {
          toast.error('Cet email est déjà utilisé');
        } else {
          toast.error(data?.error || error.message || 'Erreur lors de la création');
        }
        return;
      }

      toast.success(`Utilisateur ${userData.role} créé avec succès!`);
      setUserData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'client',
        country: 'Guinée',
        city: '',
      });
      
      if (onUserCreated) {
        onUserCreated();
      }
    } catch (error: any) {
      console.error('Erreur création utilisateur:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subAgentData.name || !subAgentData.email || !subAgentData.phone) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setIsSubmitting(true);

      // Extraire le token de l'URL
      const currentPath = window.location.pathname;
      const tokenMatch = currentPath.match(/\/agent\/([^\/]+)/);
      const agentToken = tokenMatch ? tokenMatch[1] : null;

      if (!agentToken) {
        toast.error('Token agent introuvable');
        return;
      }

      const permissions = Object.entries(subAgentData.permissions)
        .filter(([_, value]) => value)
        .map(([key]) => key);

      const { data, error } = await supabase.functions.invoke('create-sub-agent', {
        body: {
          agentToken,
          name: subAgentData.name,
          email: subAgentData.email,
          phone: subAgentData.phone,
          commission_rate: subAgentData.commission_rate,
          permissions,
          pdgId,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || error.message || 'Erreur lors de la création du sous-agent');
        return;
      }

      toast.success('Sous-agent créé avec succès!');
      setSubAgentData({
        name: '',
        email: '',
        phone: '',
        commission_rate: 5,
        permissions: {
          create_users: true,
          view_reports: true,
          manage_commissions: false,
          manage_users: false,
          create_sub_agents: false,
        }
      });
      
      if (onUserCreated) {
        onUserCreated();
      }
    } catch (error: any) {
      console.error('Erreur création sous-agent:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRole = USER_ROLES.find(r => r.value === userData.role);
  const RoleIcon = selectedRole?.icon || Users;

  return (
    <Card className="border-2 border-primary/20 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardTitle className="text-2xl flex items-center gap-2">
          <UserPlus className="w-6 h-6" />
          Centre de Création
        </CardTitle>
        <CardDescription className="text-primary-foreground/80">
          Créez des utilisateurs et gérez votre réseau
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="users" className="text-base">
              <Users className="w-4 h-4 mr-2" />
              Créer Utilisateur
            </TabsTrigger>
            {canCreateSubAgent && (
              <TabsTrigger value="sub-agents" className="text-base">
                <Shield className="w-4 h-4 mr-2" />
                Créer Sous-Agent
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="users">
            <form onSubmit={handleCreateUser} className="space-y-6">
              {/* Sélection du type d'utilisateur */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Type d'utilisateur *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {USER_ROLES.map((role) => {
                    const Icon = role.icon;
                    const isSelected = userData.role === role.value;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setUserData({ ...userData, role: role.value })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50 hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className={`w-5 h-5 ${isSelected ? role.color : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold ${isSelected ? 'text-primary' : ''}`}>
                              {role.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {role.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informations de base */}
              <div className="space-y-4 p-4 bg-accent/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RoleIcon className={`w-5 h-5 ${selectedRole?.color}`} />
                  <h3 className="font-semibold">Informations {selectedRole?.label}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      Prénom *
                    </Label>
                    <Input
                      id="firstName"
                      required
                      value={userData.firstName}
                      onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                      placeholder="Prénom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      Nom
                    </Label>
                    <Input
                      id="lastName"
                      value={userData.lastName}
                      onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                      placeholder="Nom"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={userData.email}
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    placeholder="email@exemple.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    Téléphone *
                  </Label>
                  <Input
                    id="phone"
                    required
                    value={userData.phone}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    placeholder="622123456"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country" className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      Pays
                    </Label>
                    <Input
                      id="country"
                      value={userData.country}
                      onChange={(e) => setUserData({ ...userData, country: e.target.value })}
                      placeholder="Guinée"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      Ville
                    </Label>
                    <Input
                      id="city"
                      value={userData.city}
                      onChange={(e) => setUserData({ ...userData, city: e.target.value })}
                      placeholder="Conakry"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-12 text-base"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Créer l'Utilisateur {selectedRole?.label}
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          {canCreateSubAgent && (
            <TabsContent value="sub-agents">
              <form onSubmit={handleCreateSubAgent} className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Créez des sous-agents qui pourront créer des utilisateurs sous votre supervision
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="agent-name" className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      Nom complet *
                    </Label>
                    <Input
                      id="agent-name"
                      required
                      value={subAgentData.name}
                      onChange={(e) => setSubAgentData({ ...subAgentData, name: e.target.value })}
                      placeholder="Ex: Jean Dupont"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-email" className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      Email *
                    </Label>
                    <Input
                      id="agent-email"
                      type="email"
                      required
                      value={subAgentData.email}
                      onChange={(e) => setSubAgentData({ ...subAgentData, email: e.target.value })}
                      placeholder="agent@exemple.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-phone" className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      Téléphone *
                    </Label>
                    <Input
                      id="agent-phone"
                      required
                      value={subAgentData.phone}
                      onChange={(e) => setSubAgentData({ ...subAgentData, phone: e.target.value })}
                      placeholder="622123456"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-commission" className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5" />
                      Taux de commission (%)
                    </Label>
                    <Input
                      id="agent-commission"
                      type="number"
                      min="0"
                      max="100"
                      value={subAgentData.commission_rate}
                      onChange={(e) => setSubAgentData({ ...subAgentData, commission_rate: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-accent/50 rounded-lg">
                  <Label className="text-base font-semibold">Permissions</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="perm-create-users"
                        checked={subAgentData.permissions.create_users}
                        onCheckedChange={(checked) => setSubAgentData({
                          ...subAgentData,
                          permissions: { ...subAgentData.permissions, create_users: checked as boolean }
                        })}
                      />
                      <label htmlFor="perm-create-users" className="text-sm font-medium">
                        Créer des utilisateurs
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="perm-view-reports"
                        checked={subAgentData.permissions.view_reports}
                        onCheckedChange={(checked) => setSubAgentData({
                          ...subAgentData,
                          permissions: { ...subAgentData.permissions, view_reports: checked as boolean }
                        })}
                      />
                      <label htmlFor="perm-view-reports" className="text-sm font-medium">
                        Voir les rapports
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="perm-manage-commissions"
                        checked={subAgentData.permissions.manage_commissions}
                        onCheckedChange={(checked) => setSubAgentData({
                          ...subAgentData,
                          permissions: { ...subAgentData.permissions, manage_commissions: checked as boolean }
                        })}
                      />
                      <label htmlFor="perm-manage-commissions" className="text-sm font-medium">
                        Gérer les commissions
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="perm-manage-users"
                        checked={subAgentData.permissions.manage_users}
                        onCheckedChange={(checked) => setSubAgentData({
                          ...subAgentData,
                          permissions: { ...subAgentData.permissions, manage_users: checked as boolean }
                        })}
                      />
                      <label htmlFor="perm-manage-users" className="text-sm font-medium">
                        Gérer les utilisateurs
                      </label>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      Créer le Sous-Agent
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
