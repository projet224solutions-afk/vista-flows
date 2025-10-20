import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Search, Eye, CheckCircle, Plus, Users, Bike, AlertCircle, Send, Settings, Mail, Copy, Edit, Trash2, UserCircle } from 'lucide-react';
import { usePDGSyndicatData, Bureau } from '@/hooks/usePDGSyndicatData';

export default function PDGSyndicatManagement() {
  const {
    bureaus,
    workers,
    alerts,
    features,
    members,
    loading,
    stats,
    validateBureau,
    createBureau,
    updateBureau,
    deleteBureau,
    copyBureauLink,
    resendBureauLink,
    updateWorker,
    deleteWorker,
    updateMember,
    deleteMember,
  } = usePDGSyndicatData();

  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBureau, setSelectedBureau] = useState<Bureau | null>(null);
  const [editingBureau, setEditingBureau] = useState<Bureau | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [isWorkerDialogOpen, setIsWorkerDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    bureau_code: '',
    prefecture: '',
    commune: '',
    president_name: '',
    president_email: '',
    president_phone: '',
    full_location: ''
  });

  const handleValidate = async (bureauId: string) => {
    await validateBureau(bureauId);
  };

  const handleCreateBureau = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await createBureau(formData);
    
    if (result) {
      setIsDialogOpen(false);
      setFormData({
        bureau_code: '',
        prefecture: '',
        commune: '',
        president_name: '',
        president_email: '',
        president_phone: '',
        full_location: ''
      });
    }
  };

  const handleCopyBureau = async (bureau: Bureau) => {
    await copyBureauLink(bureau);
  };

  const handleEditBureau = (bureau: Bureau) => {
    setEditingBureau(bureau);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingBureau) return;

    const success = await updateBureau(editingBureau.id, {
      bureau_code: editingBureau.bureau_code,
      commune: editingBureau.commune,
      prefecture: editingBureau.prefecture,
      president_name: editingBureau.president_name,
      president_email: editingBureau.president_email,
      president_phone: editingBureau.president_phone,
      full_location: editingBureau.full_location,
      status: editingBureau.status
    });

    if (success) {
      setIsEditDialogOpen(false);
      setEditingBureau(null);
    }
  };

  const handleDeleteBureau = async (bureauId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce bureau ? Cette action supprimera également tous les travailleurs, membres et véhicules associés.")) return;
    await deleteBureau(bureauId);
  };

  const handleResendLink = async (bureau: Bureau) => {
    setSendingEmail(bureau.id);
    await resendBureauLink(bureau);
    setSendingEmail(null);
  };

  const handleEditWorker = (worker: any) => {
    setEditingWorker(worker);
    setIsWorkerDialogOpen(true);
  };

  const handleSaveWorker = async () => {
    if (!editingWorker) return;

    const success = await updateWorker(editingWorker.id, {
      nom: editingWorker.nom,
      email: editingWorker.email,
      telephone: editingWorker.telephone,
      access_level: editingWorker.access_level,
      is_active: editingWorker.is_active
    });

    if (success) {
      setIsWorkerDialogOpen(false);
      setEditingWorker(null);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce travailleur ?")) return;
    await deleteWorker(workerId);
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setIsMemberDialogOpen(true);
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;

    const success = await updateMember(editingMember.id, {
      full_name: editingMember.full_name,
      email: editingMember.email,
      phone: editingMember.phone,
      status: editingMember.status
    });

    if (success) {
      setIsMemberDialogOpen(false);
      setEditingMember(null);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce membre ?")) return;
    await deleteMember(memberId);
  };

  const filteredBureaus = bureaus.filter(bureau =>
    bureau.bureau_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bureau.prefecture.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bureau.commune.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gestion des Bureaux Syndicaux</h2>
          <p className="text-muted-foreground mt-1">Administration des bureaux syndicaux de taxi-motos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Bureau
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouveau bureau syndical</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBureau} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bureau_code">Code Bureau *</Label>
                  <Input
                    id="bureau_code"
                    required
                    value={formData.bureau_code}
                    onChange={(e) => setFormData({ ...formData, bureau_code: e.target.value })}
                    placeholder="Ex: BUR-CON-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefecture">Préfecture *</Label>
                  <Input
                    id="prefecture"
                    required
                    value={formData.prefecture}
                    onChange={(e) => setFormData({ ...formData, prefecture: e.target.value })}
                    placeholder="Ex: Conakry"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commune">Commune *</Label>
                <Input
                  id="commune"
                  required
                  value={formData.commune}
                  onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                  placeholder="Ex: Kaloum"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_location">Adresse complète</Label>
                <Input
                  id="full_location"
                  value={formData.full_location}
                  onChange={(e) => setFormData({ ...formData, full_location: e.target.value })}
                  placeholder="Ex: Avenue de la République, près du marché central"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Informations du Président</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="president_name">Nom complet du président</Label>
                    <Input
                      id="president_name"
                      value={formData.president_name}
                      onChange={(e) => setFormData({ ...formData, president_name: e.target.value })}
                      placeholder="Ex: Mohamed Camara"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="president_email">Email</Label>
                      <Input
                        id="president_email"
                        type="email"
                        value={formData.president_email}
                        onChange={(e) => setFormData({ ...formData, president_email: e.target.value })}
                        placeholder="president@bureau.gn"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="president_phone">Téléphone</Label>
                      <Input
                        id="president_phone"
                        type="tel"
                        value={formData.president_phone}
                        onChange={(e) => setFormData({ ...formData, president_phone: e.target.value })}
                        placeholder="+224 XXX XX XX XX"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer le bureau
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bureaux</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBureaus}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Travailleurs</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.totalWorkers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Membres</CardTitle>
            <Users className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {bureaus.reduce((acc, b) => acc + b.total_members, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Véhicules</CardTitle>
            <Bike className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {bureaus.reduce((acc, b) => acc + b.total_vehicles, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alertes Critiques</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.criticalAlerts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs pour les différentes sections */}
      <Tabs defaultValue="bureaus" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="bureaus">
            <Building2 className="w-4 h-4 mr-2" />
            Bureaux ({stats.totalBureaus})
          </TabsTrigger>
          <TabsTrigger value="workers">
            <Users className="w-4 h-4 mr-2" />
            Travailleurs ({stats.totalWorkers})
          </TabsTrigger>
          <TabsTrigger value="members">
            <UserCircle className="w-4 h-4 mr-2" />
            Membres ({stats.totalMembers})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertCircle className="w-4 h-4 mr-2" />
            Alertes ({stats.criticalAlerts})
          </TabsTrigger>
          <TabsTrigger value="features">
            <Settings className="w-4 h-4 mr-2" />
            Fonctionnalités ({features.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bureaus" className="space-y-4">
          {/* Recherche */}
          <Card>
            <CardHeader>
              <CardTitle>Rechercher un bureau</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par code, préfecture ou commune..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Liste des bureaux */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des Bureaux ({filteredBureaus.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredBureaus.map((bureau) => (
                  <div
                    key={bureau.id}
                    className="p-6 rounded-lg border bg-card hover:shadow-md transition-shadow space-y-4"
                  >
                    {/* En-tête avec infos principales */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{bureau.bureau_code}</h3>
                            {bureau.status === 'active' ? (
                              <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                Actif
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                                En attente
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            📍 {bureau.prefecture} - {bureau.commune}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>👥 {bureau.total_members} membres</span>
                            <span>🏍️ {bureau.total_vehicles} véhicules</span>
                          </div>
                          {bureau.president_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              👤 Président: <span className="font-medium">{bureau.president_name}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Lien d'accès à l'interface */}
                    {bureau.access_token && (
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                              <span className="text-primary">🔗</span> Lien d'accès à l'interface
                            </p>
                            <p className="text-xs font-mono text-muted-foreground truncate bg-background p-2 rounded border">
                              {window.location.origin}/bureau/{bureau.access_token}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="shrink-0"
                            onClick={() => window.open(`/bureau/${bureau.access_token}`, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ouvrir l'interface
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button variant="ghost" size="sm" onClick={() => handleCopyBureau(bureau)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditBureau(bureau)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteBureau(bureau.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedBureau(bureau)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {bureau.president_email && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleResendLink(bureau)}
                          disabled={sendingEmail === bureau.id}
                          className="gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          {sendingEmail === bureau.id ? 'Envoi...' : 'Renvoyer'}
                        </Button>
                      )}
                      {bureau.status !== 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleValidate(bureau.id)}
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredBureaus.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun bureau trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liste des Travailleurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workers.map((worker) => {
                  const bureau = bureaus.find(b => b.id === worker.bureau_id);
                  return (
                    <div key={worker.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <h3 className="font-medium">{worker.nom}</h3>
                        <p className="text-sm text-muted-foreground">
                          {worker.email} • Bureau: {bureau?.bureau_code || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Accès: {worker.access_level}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {worker.is_active ? (
                          <Badge className="bg-green-500">Actif</Badge>
                        ) : (
                          <Badge className="bg-gray-500">Inactif</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditWorker(worker)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteWorker(worker.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {workers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun travailleur trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dialog pour modifier un travailleur */}
        <Dialog open={isWorkerDialogOpen} onOpenChange={setIsWorkerDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier le travailleur</DialogTitle>
            </DialogHeader>
            {editingWorker && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="worker_nom">Nom</Label>
                  <Input
                    id="worker_nom"
                    value={editingWorker.nom}
                    onChange={(e) => setEditingWorker({ ...editingWorker, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker_email">Email</Label>
                  <Input
                    id="worker_email"
                    type="email"
                    value={editingWorker.email}
                    onChange={(e) => setEditingWorker({ ...editingWorker, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker_phone">Téléphone</Label>
                  <Input
                    id="worker_phone"
                    value={editingWorker.telephone || ''}
                    onChange={(e) => setEditingWorker({ ...editingWorker, telephone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker_access">Niveau d'accès</Label>
                  <Input
                    id="worker_access"
                    value={editingWorker.access_level}
                    onChange={(e) => setEditingWorker({ ...editingWorker, access_level: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="worker_active"
                    checked={editingWorker.is_active}
                    onChange={(e) => setEditingWorker({ ...editingWorker, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="worker_active">Actif</Label>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsWorkerDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSaveWorker}>
                    Sauvegarder
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liste des Membres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => {
                  const bureau = bureaus.find(b => b.id === member.bureau_id);
                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <h3 className="font-medium">{member.full_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {member.email || 'Pas d\'email'} • Bureau: {bureau?.bureau_code || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Code: {member.member_code} • Tél: {member.phone || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.status === 'active' ? (
                          <Badge className="bg-green-500">Actif</Badge>
                        ) : (
                          <Badge className="bg-gray-500">Inactif</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMember(member)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {members.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun membre trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dialog pour modifier un membre */}
        <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier le membre</DialogTitle>
            </DialogHeader>
            {editingMember && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="member_name">Nom complet</Label>
                  <Input
                    id="member_name"
                    value={editingMember.full_name}
                    onChange={(e) => setEditingMember({ ...editingMember, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member_email">Email</Label>
                  <Input
                    id="member_email"
                    type="email"
                    value={editingMember.email || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member_phone">Téléphone</Label>
                  <Input
                    id="member_phone"
                    value={editingMember.phone || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member_status">Statut</Label>
                  <select
                    id="member_status"
                    value={editingMember.status}
                    onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsMemberDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSaveMember}>
                    Sauvegarder
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertes Critiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.filter(a => a.is_critical).map((alert) => {
                  const bureau = bureaus.find(b => b.id === alert.bureau_id);
                  return (
                    <div key={alert.id} className="flex items-start gap-4 p-4 rounded-lg border border-red-200 bg-red-50">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-red-900">{alert.title}</h3>
                        <p className="text-sm text-red-700 mt-1">{alert.message}</p>
                        <p className="text-xs text-red-600 mt-2">
                          Bureau: {bureau?.bureau_code || 'N/A'} • {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge className="bg-red-500">{alert.severity}</Badge>
                    </div>
                  );
                })}
                {alerts.filter(a => a.is_critical).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucune alerte critique
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fonctionnalités Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {features.map((feature) => (
                  <div key={feature.id} className="flex items-start justify-between p-4 rounded-lg border">
                    <div className="flex-1">
                      <h3 className="font-medium">{feature.feature_name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Version: {feature.version} • Code: {feature.feature_code}
                      </p>
                    </div>
                    {feature.is_active ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-500">Inactive</Badge>
                    )}
                  </div>
                ))}
                {features.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucune fonctionnalité trouvée
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le bureau</DialogTitle>
          </DialogHeader>
          {editingBureau && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code Bureau</Label>
                  <Input
                    value={editingBureau.bureau_code}
                    onChange={(e) => setEditingBureau({...editingBureau, bureau_code: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commune</Label>
                  <Input
                    value={editingBureau.commune}
                    onChange={(e) => setEditingBureau({...editingBureau, commune: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Préfecture</Label>
                  <Input
                    value={editingBureau.prefecture}
                    onChange={(e) => setEditingBureau({...editingBureau, prefecture: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom du Président</Label>
                  <Input
                    value={editingBureau.president_name || ''}
                    onChange={(e) => setEditingBureau({...editingBureau, president_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email du Président</Label>
                  <Input
                    type="email"
                    value={editingBureau.president_email || ''}
                    onChange={(e) => setEditingBureau({...editingBureau, president_email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone du Président</Label>
                  <Input
                    value={editingBureau.president_phone || ''}
                    onChange={(e) => setEditingBureau({...editingBureau, president_phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Localisation complète</Label>
                  <Input
                    value={editingBureau.full_location || ''}
                    onChange={(e) => setEditingBureau({...editingBureau, full_location: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Input
                    value={editingBureau.status}
                    onChange={(e) => setEditingBureau({...editingBureau, status: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSaveEdit}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
