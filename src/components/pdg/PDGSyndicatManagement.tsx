import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Search, Eye, CheckCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Bureau {
  id: string;
  bureau_code: string;
  prefecture: string;
  commune: string;
  president_name?: string;
  president_email?: string;
  president_phone?: string;
  total_members: number;
  total_vehicles: number;
  total_cotisations: number;
  status: string;
  created_at: string;
}

export default function PDGSyndicatManagement() {
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    bureau_code: '',
    prefecture: '',
    commune: '',
    president_name: '',
    president_email: '',
    president_phone: '',
    full_location: ''
  });

  useEffect(() => {
    loadBureaus();
  }, []);

  const loadBureaus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bureaus')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBureaus(data || []);
    } catch (error) {
      console.error('Erreur chargement bureaux:', error);
      toast.error('Erreur lors du chargement des bureaux syndicaux');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (bureauId: string) => {
    try {
      const { error } = await supabase
        .from('bureaus')
        .update({ 
          status: 'active',
          validated_at: new Date().toISOString()
        })
        .eq('id', bureauId);

      if (error) throw error;

      toast.success('Bureau validé avec succès');
      await loadBureaus();
    } catch (error) {
      console.error('Erreur validation bureau:', error);
      toast.error('Erreur lors de la validation du bureau');
    }
  };

  const handleCreateBureau = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('bureaus')
        .insert([{
          bureau_code: formData.bureau_code,
          prefecture: formData.prefecture,
          commune: formData.commune,
          president_name: formData.president_name,
          president_email: formData.president_email,
          president_phone: formData.president_phone,
          full_location: formData.full_location,
          status: 'active',
          total_members: 0,
          total_vehicles: 0,
          total_cotisations: 0
        }]);

      if (error) throw error;

      toast.success('Bureau créé avec succès');
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
      await loadBureaus();
    } catch (error) {
      console.error('Erreur création bureau:', error);
      toast.error('Erreur lors de la création du bureau');
    }
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bureaux</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bureaus.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Membres</CardTitle>
            <Building2 className="w-4 h-4 text-green-500" />
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
            <Building2 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {bureaus.reduce((acc, b) => acc + b.total_vehicles, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cotisations Totales</CardTitle>
            <Building2 className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {bureaus.reduce((acc, b) => acc + b.total_cotisations, 0).toLocaleString()} GNF
            </div>
          </CardContent>
        </Card>
      </div>

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
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Building2 className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1">
                    <h3 className="font-medium">{bureau.bureau_code}</h3>
                    <p className="text-sm text-muted-foreground">
                      {bureau.prefecture} - {bureau.commune} • {bureau.total_members} membres • {bureau.total_vehicles} véhicules
                    </p>
                    {bureau.president_name && (
                      <p className="text-xs text-muted-foreground">
                        Président: {bureau.president_name}
                      </p>
                    )}
                  </div>
                  {bureau.status === 'active' ? (
                    <Badge className="bg-green-500">Actif</Badge>
                  ) : (
                    <Badge className="bg-yellow-500">En attente</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
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
    </div>
  );
}
