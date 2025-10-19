import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Bureau
        </Button>
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
