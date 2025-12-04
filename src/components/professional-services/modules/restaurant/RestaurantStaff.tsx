/**
 * GESTION DU PERSONNEL RESTAURANT
 * Gestion de l'équipe (serveurs, cuisiniers, etc.)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { Users, Plus, Edit, Trash2, ChefHat, User } from 'lucide-react';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  name: string;
  role: 'cuisinier' | 'serveur' | 'plongeur' | 'manager' | 'caissier';
  phone: string;
  email?: string;
  schedule?: string;
  is_active: boolean;
  created_at: string;
}

interface RestaurantStaffProps {
  serviceId: string;
}

export function RestaurantStaff({ serviceId }: RestaurantStaffProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'serveur' as StaffMember['role'],
    phone: '',
    email: '',
    schedule: ''
  });

  const roles = [
    { value: 'cuisinier', label: 'Cuisinier', icon: ChefHat },
    { value: 'serveur', label: 'Serveur', icon: User },
    { value: 'plongeur', label: 'Plongeur', icon: User },
    { value: 'manager', label: 'Manager', icon: User },
    { value: 'caissier', label: 'Caissier', icon: User }
  ];

  useEffect(() => {
    loadStaff();
  }, [serviceId]);

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_staff')
        .select('*')
        .eq('service_id', serviceId)
        .order('role', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;

      setStaff(data || []);
    } catch (error) {
      console.error('Erreur chargement personnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const memberData = {
        service_id: serviceId,
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        email: formData.email || null,
        schedule: formData.schedule || null,
        is_active: true
      };

      if (editingMember) {
        const { error } = await supabase
          .from('restaurant_staff')
          .update(memberData)
          .eq('id', editingMember.id);

        if (error) throw error;
        toast.success('Membre mis à jour');
      } else {
        const { error } = await supabase
          .from('restaurant_staff')
          .insert(memberData);

        if (error) throw error;
        toast.success('Membre ajouté');
      }

      setShowDialog(false);
      setEditingMember(null);
      setFormData({ name: '', role: 'serveur', phone: '', email: '', schedule: '' });
      loadStaff();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (member: StaffMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      role: member.role,
      phone: member.phone,
      email: member.email || '',
      schedule: member.schedule || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm('Supprimer ce membre du personnel ?')) return;

    try {
      const { error } = await supabase
        .from('restaurant_staff')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Membre supprimé');
      loadStaff();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleActive = async (memberId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('restaurant_staff')
        .update({ is_active: !currentStatus })
        .eq('id', memberId);

      if (error) throw error;

      toast.success(currentStatus ? 'Membre désactivé' : 'Membre activé');
      loadStaff();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement du personnel...</div>;
  }

  // Grouper par rôle
  const staffByRole = roles.map(role => ({
    ...role,
    members: staff.filter(m => m.role === role.value)
  }));

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            {staff.filter(m => m.is_active).length} membre(s) actif(s)
          </p>
        </div>
        <Button onClick={() => {
          setEditingMember(null);
          setFormData({ name: '', role: 'serveur', phone: '', email: '', schedule: '' });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un membre
        </Button>
      </div>

      {/* Liste par rôle */}
      {staffByRole.map((roleGroup) => {
        if (roleGroup.members.length === 0) return null;

        return (
          <Card key={roleGroup.value}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <roleGroup.icon className="w-5 h-5" />
                {roleGroup.label}s ({roleGroup.members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roleGroup.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        member.is_active ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <User className={`w-5 h-5 ${
                          member.is_active ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.name}</p>
                          {!member.is_active && (
                            <Badge variant="secondary">Inactif</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.phone}
                          {member.email && ` • ${member.email}`}
                        </div>
                        {member.schedule && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Horaires: {member.schedule}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(member.id, member.is_active)}
                        title={member.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {member.is_active ? '👁️' : '🚫'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(member)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(member.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {staff.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun membre du personnel</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier membre
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog d'ajout/modification */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Modifier le membre' : 'Ajouter un membre'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Jean Dupont"
                required
              />
            </div>

            <div>
              <Label htmlFor="role">Rôle</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffMember['role'] })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+224 XXX XX XX XX"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email (optionnel)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemple.com"
              />
            </div>

            <div>
              <Label htmlFor="schedule">Horaires (optionnel)</Label>
              <Input
                id="schedule"
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                placeholder="Ex: Lun-Ven 8h-16h"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingMember ? 'Mettre à jour' : 'Ajouter'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
