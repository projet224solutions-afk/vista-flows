import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building, Plus, Settings, Download, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface SyndicateBureau {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email?: string;
  manager?: string;
  status: 'active' | 'inactive';
  installedAt?: string;
  appVersion?: string;
}

export default function SyndicateBureauManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    manager: ''
  });

  const { data: bureaus = [], isLoading } = useQuery<SyndicateBureau[]>({
    queryKey: ['/api/syndicate-bureaus'],
  });

  const createBureauMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('/api/syndicate-bureaus', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: 'Bureau créé',
        description: 'Le bureau syndicat a été créé avec succès'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/syndicate-bureaus'] });
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        city: '',
        address: '',
        phone: '',
        email: '',
        manager: ''
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const installBureauMutation = useMutation({
    mutationFn: async (bureauId: string) => {
      return apiRequest(`/api/syndicate-bureaus/${bureauId}/install`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Installation initiée',
        description: 'Le processus d\'installation a été lancé'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/syndicate-bureaus'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur d\'installation',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bureauId, status }: { bureauId: string; status: 'active' | 'inactive' }) => {
      return apiRequest(`/api/syndicate-bureaus/${bureauId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },
    onSuccess: () => {
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du bureau a été modifié'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/syndicate-bureaus'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleCreateBureau = () => {
    if (!formData.name || !formData.city || !formData.phone) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive'
      });
      return;
    }
    createBureauMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des bureaux...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bureaux Syndicats</h2>
          <p className="text-muted-foreground">
            Gérez les bureaux syndicats et leur installation
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-bureau">
              <Plus className="mr-2 h-4 w-4" />
              Créer un bureau
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau bureau syndicat</DialogTitle>
              <DialogDescription>
                Remplissez les informations du bureau syndicat
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du bureau *</Label>
                <Input
                  id="name"
                  data-testid="input-bureau-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Bureau Conakry Centre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => setFormData({ ...formData, city: value })}
                >
                  <SelectTrigger data-testid="select-city">
                    <SelectValue placeholder="Sélectionner une ville" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conakry">Conakry</SelectItem>
                    <SelectItem value="Kindia">Kindia</SelectItem>
                    <SelectItem value="Boké">Boké</SelectItem>
                    <SelectItem value="Kankan">Kankan</SelectItem>
                    <SelectItem value="Labé">Labé</SelectItem>
                    <SelectItem value="N'Zérékoré">N'Zérékoré</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse *</Label>
                <Input
                  id="address"
                  data-testid="input-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Quartier, rue, bâtiment"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  data-testid="input-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+224 XXX XX XX XX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="bureau@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager">Responsable</Label>
                <Input
                  id="manager"
                  data-testid="input-manager"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="Nom du responsable"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateBureau}
                disabled={createBureauMutation.isPending}
                data-testid="button-submit"
              >
                {createBureauMutation.isPending ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bureaus.map((bureau) => (
          <Card key={bureau.id} data-testid={`card-bureau-${bureau.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <Building className="h-8 w-8 text-primary" />
                <Badge
                  variant={bureau.status === 'active' ? 'default' : 'secondary'}
                  data-testid={`status-${bureau.id}`}
                >
                  {bureau.status === 'active' ? (
                    <><CheckCircle className="mr-1 h-3 w-3" /> Actif</>
                  ) : (
                    <><XCircle className="mr-1 h-3 w-3" /> Inactif</>
                  )}
                </Badge>
              </div>
              <CardTitle className="mt-2" data-testid={`text-bureau-name-${bureau.id}`}>
                {bureau.name}
              </CardTitle>
              <CardDescription data-testid={`text-bureau-city-${bureau.id}`}>
                {bureau.city}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adresse:</span>
                  <span className="font-medium">{bureau.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Téléphone:</span>
                  <span className="font-medium">{bureau.phone}</span>
                </div>
                {bureau.manager && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Responsable:</span>
                    <span className="font-medium">{bureau.manager}</span>
                  </div>
                )}
                {bureau.installedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Installé:</span>
                    <span className="font-medium text-xs">
                      {new Date(bureau.installedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => installBureauMutation.mutate(bureau.id)}
                  disabled={installBureauMutation.isPending}
                  data-testid={`button-install-${bureau.id}`}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Installer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatusMutation.mutate({
                    bureauId: bureau.id,
                    status: bureau.status === 'active' ? 'inactive' : 'active'
                  })}
                  disabled={updateStatusMutation.isPending}
                  data-testid={`button-toggle-status-${bureau.id}`}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bureaus.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Aucun bureau syndicat créé.<br />
              Cliquez sur "Créer un bureau" pour commencer.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
