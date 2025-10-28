import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateSubAgentFormProps {
  parentAgentId: string;
  pdgId: string;
}

export function CreateSubAgentForm({ parentAgentId, pdgId }: CreateSubAgentFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_rate: 5,
    permissions: {
      create_users: true,
      view_reports: false,
      manage_commissions: false,
      manage_users: false,
      manage_products: false
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setIsSubmitting(true);

      // Générer un code agent unique
      const agentCode = `SAG-${Date.now().toString(36).toUpperCase()}`;

      const permissions = Object.entries(formData.permissions)
        .filter(([_, value]) => value)
        .map(([key]) => key);

      const { data, error } = await supabase
        .from('agents_management')
        .insert({
          pdg_id: pdgId,
          agent_code: agentCode,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          permissions: permissions,
          commission_rate: formData.commission_rate,
          can_create_sub_agent: false, // Les sous-agents ne peuvent pas créer d'autres sous-agents
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Sous-agent créé avec succès!');
      setFormData({
        name: '',
        email: '',
        phone: '',
        commission_rate: 5,
        permissions: {
          create_users: true,
          view_reports: false,
          manage_commissions: false,
          manage_users: false,
          manage_products: false
        }
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error('Erreur création sous-agent:', error);
      toast.error(error.message || 'Erreur lors de la création du sous-agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg" variant="secondary">
          <Users className="w-5 h-5 mr-2" />
          Créer un Sous-Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un Sous-Agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom Complet *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Jean Dupont"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="agent@exemple.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone *</Label>
            <Input
              id="phone"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="622123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission">Taux Commission (%)</Label>
            <Input
              id="commission"
              type="number"
              min="0"
              max="100"
              value={formData.commission_rate}
              onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <Label>Permissions</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="create_users_sub"
                  checked={formData.permissions.create_users}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    permissions: { ...formData.permissions, create_users: checked as boolean }
                  })}
                />
                <label htmlFor="create_users_sub" className="text-sm">Créer des utilisateurs</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="view_reports_sub"
                  checked={formData.permissions.view_reports}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    permissions: { ...formData.permissions, view_reports: checked as boolean }
                  })}
                />
                <label htmlFor="view_reports_sub" className="text-sm">Voir les rapports</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="manage_commissions_sub"
                  checked={formData.permissions.manage_commissions}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    permissions: { ...formData.permissions, manage_commissions: checked as boolean }
                  })}
                />
                <label htmlFor="manage_commissions_sub" className="text-sm">Gérer les commissions</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="manage_users_sub"
                  checked={formData.permissions.manage_users}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    permissions: { ...formData.permissions, manage_users: checked as boolean }
                  })}
                />
                <label htmlFor="manage_users_sub" className="text-sm">Gérer les utilisateurs</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="manage_products_sub"
                  checked={formData.permissions.manage_products}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    permissions: { ...formData.permissions, manage_products: checked as boolean }
                  })}
                />
                <label htmlFor="manage_products_sub" className="text-sm">Gérer les produits</label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Création...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Créer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
