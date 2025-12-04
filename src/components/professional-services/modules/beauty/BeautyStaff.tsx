/**
 * GESTION DU PERSONNEL BEAUTÉ
 * Gestion de l'équipe (coiffeurs, esthéticiennes, etc.)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { Users, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  name: string;
  role: 'coiffeur' | 'estheticienne' | 'maquilleuse' | 'masseur' | 'receptionniste' | 'autre';
  phone?: string;
  specialties?: string;
  is_active: boolean;
  created_at: string;
}

interface BeautyStaffProps {
  serviceId: string;
}

export function BeautyStaff({ serviceId }: BeautyStaffProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'coiffeur' as StaffMember['role'],
    phone: '',
    specialties: ''
  });

  const roles = [
    { value: 'coiffeur', label: 'Coiffeur/Coiffeuse', icon: '✂️' },
    { value: 'estheticienne', label: 'Esthéticienne', icon: '💅' },
    { value: 'maquilleuse', label: 'Maquilleuse', icon: '💄' },
    { value: 'masseur', label: 'Masseur/Masseuse', icon: '💆' },
    { value: 'receptionniste', label: 'Réceptionniste', icon: '📞' },
    { value: 'autre', label: 'Autre', icon: '👤' }
  ];

  useEffect(() => {
    loadStaff();
  }, [serviceId]);

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('beauty_staff')
        .select('*')
        .eq('service_id', serviceId)
        .order('name');

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
      const staffData = {
        service_id: serviceId,
        name: formData.name,
        role: formData.role,
        phone: formData.phone || null,
        specialties: formData.specialties || null,
        is_active: true
      };

      if (editingStaff) {
        const { error } = await supabase
          .from('beauty_staff')
          .update(staffData)
          .eq('id', editingStaff.id);

        if (error) throw error;
        toast.success('Membre mis à jour');
      } else {
        const { error } = await supabase
          .from('beauty_staff')
          .insert(staffData);

        if (error) throw error;
        toast.success('Membre ajouté');
      }

      setShowDialog(false);
      setEditingStaff(null);
      setFormData({ name: '', role: 'coiffeur', phone: '', specialties: '' });
      loadStaff();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      role: member.role,
      phone: member.phone || '',
      specialties: member.specialties || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm('Supprimer ce membre ?')) return;

    try {
      const { error } = await supabase
        .from('beauty_staff')
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
        .from('beauty_staff')
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

  const getRoleInfo = (role: string) => {
    return roles.find(r => r.value === role) || roles[roles.length - 1];
  };

  // Statistiques
  const stats = {
    total: staff.length,
    active: staff.filter(s => s.is_active).length,
    byRole: roles.map(role => ({
      ...role,
      count: staff.filter(s => s.role === role.value).length
    }))
  };

  return (
    <div className="space-y-4">
      {/* En-tête et stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Membres</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-sm text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
        {stats.byRole.filter(r => r.count > 0).slice(0, 2).map((role) => (
          <Card key={role.value}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{role.icon}</span>
                <div>
                  <div className="text-2xl font-bold">{role.count}</div>
                  <p className="text-sm text-muted-foreground">{role.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bouton d'ajout */}
      <div className="flex justify-end">
        <Button onClick={() => {
          setEditingStaff(null);
          setFormData({ name: '', role: 'coiffeur', phone: '', specialties: '' });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un membre
        </Button>
      </div>

      {/* Liste du personnel */}
      {staff.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun membre d'équipe</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier membre
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => {
            const roleInfo = getRoleInfo(member.role);
            return (
              <Card key={member.id} className={`hover:shadow-md transition-shadow ${
                !member.is_active ? 'opacity-60' : ''
              }`}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{roleInfo.icon}</div>
                      <div>
                        <h3 className="font-semibold">{member.name}</h3>
                        <p className="text-sm text-muted-foreground">{roleInfo.label}</p>
                      </div>
                    </div>
                    <Badge variant={member.is_active ? 'default' : 'secondary'}>
                      {member.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>

                  {member.phone && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">📞</span> {member.phone}
                    </div>
                  )}

                  {member.specialties && (
                    <div className="text-sm">
                      <span className="text-muted-foreground font-medium">Spécialités:</span>
                      <p className="text-muted-foreground">{member.specialties}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleActive(member.id, member.is_active)}
                    >
                      {member.is_active ? (
                        <><XCircle className="w-4 h-4 mr-1" /> Désactiver</>
                      ) : (
                        <><CheckCircle className="w-4 h-4 mr-1" /> Activer</>
                      )}
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog d'ajout/modification */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? 'Modifier le membre' : 'Ajouter un membre'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                required
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.icon} {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+224 XXX XX XX XX"
              />
            </div>

            <div>
              <Label htmlFor="specialties">Spécialités (optionnel)</Label>
              <Input
                id="specialties"
                value={formData.specialties}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                placeholder="Ex: Coupe homme, tresses, balayage..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingStaff ? 'Mettre à jour' : 'Ajouter'}
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
