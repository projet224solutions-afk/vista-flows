/**
 * 🔄 RESTAURATION UTILISATEURS SUPPRIMÉS
 * Workflow: Recherche par ID/Email → Affichage profil → Restauration
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  RefreshCw, Search, UserX, RotateCcw, Clock, AlertTriangle,
  User, Mail, Phone, Calendar, Shield, Eye, Wallet, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';

interface DeletedUser {
  id: string;
  original_user_id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: string | null;
  public_id: string | null;
  profile_data: Json | null;
  wallet_data: Json | null;
  user_ids_data: Json | null;
  role_specific_data: Json | null;
  deletion_reason: string | null;
  deletion_method: string | null;
  deleted_at: string;
  deleted_by: string | null;
  expires_at: string | null;
  is_restored: boolean;
  restored_at: string | null;
  restored_by: string | null;
  restoration_notes: string | null;
  original_created_at: string | null;
}

export default function DeletedUsersRestore() {
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<DeletedUser | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreNotes, setRestoreNotes] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [searched, setSearched] = useState(false);

  // Charger les utilisateurs supprimés au montage
  useEffect(() => {
    fetchAllDeletedUsers();
  }, [showRestored]);

  const fetchAllDeletedUsers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('deleted_users_archive')
        .select('*')
        .order('deleted_at', { ascending: false });
      
      if (!showRestored) {
        query = query.eq('is_restored', false);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setDeletedUsers(data || []);
      setSearched(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Recherche par ID ou email via Edge Function
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      fetchAllDeletedUsers();
      return;
    }

    try {
      setLoading(true);
      setSearched(true);

      const { data, error } = await supabase.functions.invoke('restore-user', {
        body: { search_query: searchQuery.trim() }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erreur de recherche');
      }

      setDeletedUsers(data.data || []);
      
      if (data.count === 0) {
        toast.info('Aucun utilisateur supprimé trouvé avec ces critères');
      } else {
        toast.success(`${data.count} utilisateur(s) trouvé(s)`);
      }
    } catch (error: unknown) {
      console.error('Erreur recherche:', error);
      const msg = error instanceof Error ? error.message : 'Erreur de recherche';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Restauration de l'utilisateur
  const handleRestore = async () => {
    if (!selectedUser) return;
    
    try {
      setRestoring(true);
      
      const { data, error } = await supabase.functions.invoke('restore-user', {
        body: {
          archive_id: selectedUser.id,
          restoration_notes: restoreNotes || "Restauration depuis l'interface PDG",
        },
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la restauration');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erreur lors de la restauration');
      }

      toast.success(`✅ Utilisateur ${selectedUser.public_id || selectedUser.email} restauré!`);

      if (data?.data?.new_user_created) {
        toast.info("Un nouveau compte a été créé. L'utilisateur devra réinitialiser son mot de passe.", {
          duration: 6000,
        });
      }
      
      setRestoreDialogOpen(false);
      setDetailsOpen(false);
      setRestoreNotes('');
      setSelectedUser(null);
      
      // Rafraîchir la liste
      if (searched && searchQuery) {
        handleSearch();
      } else {
        fetchAllDeletedUsers();
      }
    } catch (error: unknown) {
      console.error('Erreur restauration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur: ${errorMessage}`);
    } finally {
      setRestoring(false);
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'pdg':
        return 'bg-purple-500';
      case 'vendor':
        return 'bg-blue-500';
      case 'client':
        return 'bg-green-500';
      case 'driver':
      case 'taxi':
      case 'livreur':
        return 'bg-orange-500';
      case 'agent':
        return 'bg-pink-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getExpirationStatus = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const expDate = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return { status: 'expired', text: 'Expiré', color: 'text-red-500' };
    if (daysLeft <= 7) return { status: 'warning', text: `${daysLeft}j restants`, color: 'text-orange-500' };
    return { status: 'ok', text: `${daysLeft}j restants`, color: 'text-muted-foreground' };
  };

  const openUserDetails = (user: DeletedUser) => {
    setSelectedUser(user);
    setDetailsOpen(true);
  };

  const openRestoreDialog = (user: DeletedUser) => {
    setSelectedUser(user);
    setRestoreDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header avec recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Restauration Utilisateurs
          </CardTitle>
          <CardDescription>
            Recherchez un utilisateur supprimé par son ID (USR0001) ou email pour le restaurer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par ID (USR0001), email ou téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Rechercher
              </Button>
              <Button
                variant={showRestored ? "default" : "outline"}
                onClick={() => setShowRestored(!showRestored)}
                size="sm"
              >
                {showRestored ? 'Masquer restaurés' : 'Voir restaurés'}
              </Button>
              <Button variant="outline" onClick={fetchAllDeletedUsers} size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{deletedUsers.filter(u => !u.is_restored).length}</p>
                <p className="text-xs text-muted-foreground">À restaurer</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{deletedUsers.filter(u => u.is_restored).length}</p>
                <p className="text-xs text-muted-foreground">Restaurés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">
                  {deletedUsers.filter(u => {
                    const exp = getExpirationStatus(u.expires_at);
                    return exp?.status === 'warning' && !u.is_restored;
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground">Expirent bientôt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">30j</p>
                <p className="text-xs text-muted-foreground">Conservation max</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {searched ? 'Résultats de recherche' : 'Utilisateurs supprimés'} ({deletedUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : deletedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserX className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Aucun utilisateur supprimé trouvé</p>
              <p className="text-xs mt-2 max-w-md mx-auto">
                {searched 
                  ? "Aucun résultat pour votre recherche. Essayez avec un ID complet (USR0001) ou un email."
                  : "Les utilisateurs supprimés via l'application sont archivés pendant 30 jours pour restauration."
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>ID Public</TableHead>
                    <TableHead>Supprimé</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedUsers.map((user) => {
                    const expStatus = getExpirationStatus(user.expires_at);
                    return (
                      <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={() => openUserDetails(user)}>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.full_name || 'Sans nom'}</span>
                            <span className="text-xs text-muted-foreground">{user.email || user.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>
                            {user.role || 'Inconnu'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {user.public_id || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(new Date(user.deleted_at), 'dd/MM/yyyy', { locale: fr })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(user.deleted_at), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {expStatus && (
                            <span className={`text-sm ${expStatus.color}`}>
                              {expStatus.text}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.is_restored ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              ✓ Restauré
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              En attente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openUserDetails(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!user.is_restored && expStatus?.status !== 'expired' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openRestoreDialog(user)}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restaurer
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog Détails de l'utilisateur */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil utilisateur supprimé
            </DialogTitle>
            <DialogDescription>
              Données archivées avant suppression - Vérifiez les informations avant restauration
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nom complet</label>
                  <p className="font-medium text-lg">{selectedUser.full_name || 'Non renseigné'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">ID Public</label>
                  <code className="text-lg bg-primary/10 px-3 py-1 rounded font-mono block w-fit">
                    {selectedUser.public_id || '-'}
                  </code>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <p>{selectedUser.email || 'Non renseigné'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Téléphone
                  </label>
                  <p>{selectedUser.phone || 'Non renseigné'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Rôle
                  </label>
                  <Badge className={`${getRoleBadgeColor(selectedUser.role)} text-white`}>
                    {selectedUser.role || 'Inconnu'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Créé le
                  </label>
                  <p>
                    {selectedUser.original_created_at 
                      ? format(new Date(selectedUser.original_created_at), 'dd MMMM yyyy', { locale: fr })
                      : 'Inconnu'
                    }
                  </p>
                </div>
              </div>

              {/* Données du wallet */}
              {selectedUser.wallet_data && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Wallet className="h-4 w-4" />
                    Données du portefeuille
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Solde:</span>
                      <span className="ml-2 font-medium">
                        {((selectedUser.wallet_data as Record<string, unknown>)?.balance as number || 0).toLocaleString()} 
                        {' '}
                        {(selectedUser.wallet_data as Record<string, unknown>)?.currency as string || 'GNF'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Statut:</span>
                      <span className="ml-2">
                        {(selectedUser.wallet_data as Record<string, unknown>)?.wallet_status as string || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Informations de suppression */}
              <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                <h4 className="font-medium text-destructive mb-3">Informations de suppression</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Supprimé le:</span>
                    <span className="ml-2">
                      {format(new Date(selectedUser.deleted_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Méthode:</span>
                    <span className="ml-2">{selectedUser.deletion_method || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Raison:</span>
                    <span className="ml-2">{selectedUser.deletion_reason || 'Non spécifiée'}</span>
                  </div>
                  {selectedUser.expires_at && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Expire le:</span>
                      <span className={`ml-2 ${getExpirationStatus(selectedUser.expires_at)?.color}`}>
                        {format(new Date(selectedUser.expires_at), 'dd MMMM yyyy', { locale: fr })}
                        {' '}({getExpirationStatus(selectedUser.expires_at)?.text})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Statut de restauration */}
              {selectedUser.is_restored && (
                <div className="p-4 border border-green-500/30 rounded-lg bg-green-500/5">
                  <h4 className="font-medium text-green-600 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Restauré avec succès
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Restauré le:</span>
                      <span className="ml-2">
                        {selectedUser.restored_at 
                          ? format(new Date(selectedUser.restored_at), 'dd/MM/yyyy à HH:mm', { locale: fr })
                          : 'N/A'
                        }
                      </span>
                    </div>
                    {selectedUser.restoration_notes && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Notes:</span>
                        <span className="ml-2">{selectedUser.restoration_notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fermer
            </Button>
            {selectedUser && !selectedUser.is_restored && getExpirationStatus(selectedUser.expires_at)?.status !== 'expired' && (
              <Button onClick={() => {
                setDetailsOpen(false);
                openRestoreDialog(selectedUser);
              }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurer cet utilisateur
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de restauration */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Confirmer la restauration
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Vous allez restaurer l'utilisateur{' '}
                  <strong>{selectedUser?.public_id || selectedUser?.email}</strong>.
                </p>
                
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">Ce qui sera restauré:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Profil utilisateur (nom, email, téléphone)</li>
                    <li>Identifiant public ({selectedUser?.public_id})</li>
                    {selectedUser?.wallet_data && <li>Portefeuille et solde</li>}
                    <li>Compte d'authentification (mot de passe à réinitialiser)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes de restauration (optionnel)</label>
                  <Textarea
                    placeholder="Raison de la restauration..."
                    value={restoreNotes}
                    onChange={(e) => setRestoreNotes(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoring}
              className="bg-primary"
            >
              {restoring ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Restauration...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirmer la restauration
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
