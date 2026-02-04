/**
 * 🔄 RESTAURATION UTILISATEURS SUPPRIMÉS
 * Permet de restaurer les utilisateurs supprimés par accident
 * Accessible uniquement aux PDG/Admin
 */

import { useState, useEffect } from 'react';
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
  User, Mail, Phone, Calendar, Shield, Trash2, Eye
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<DeletedUser | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreNotes, setRestoreNotes] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    fetchDeletedUsers();
  }, [showRestored]);

  const fetchDeletedUsers = async () => {
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
    } catch (error) {
      console.error('Erreur chargement utilisateurs supprimés:', error);
      toast.error('Erreur lors du chargement des utilisateurs supprimés');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedUser) return;
    
    try {
      setRestoring(true);
      
      // Marquer comme restauré dans l'archive
      const { error: updateError } = await supabase
        .from('deleted_users_archive')
        .update({
          is_restored: true,
          restored_at: new Date().toISOString(),
          restored_by: (await supabase.auth.getUser()).data.user?.id,
          restoration_notes: restoreNotes || 'Restauration manuelle depuis l\'interface PDG'
        })
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      toast.success(`Utilisateur ${selectedUser.public_id || selectedUser.email} marqué comme restauré`);
      toast.info('Note: Les données Supabase Auth doivent être restaurées manuellement via le dashboard Supabase', {
        duration: 6000
      });
      
      setRestoreDialogOpen(false);
      setRestoreNotes('');
      setSelectedUser(null);
      fetchDeletedUsers();
    } catch (error) {
      console.error('Erreur restauration:', error);
      toast.error('Erreur lors de la restauration');
    } finally {
      setRestoring(false);
    }
  };

  const filteredUsers = deletedUsers.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query) ||
      user.public_id?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Restauration Utilisateurs
          </CardTitle>
          <CardDescription>
            Restaurez les utilisateurs supprimés par accident (conservation: 30 jours)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email, téléphone, nom, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={showRestored ? "default" : "outline"}
                onClick={() => setShowRestored(!showRestored)}
                size="sm"
              >
                {showRestored ? 'Masquer restaurés' : 'Afficher restaurés'}
              </Button>
              <Button variant="outline" onClick={fetchDeletedUsers} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
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
              <RotateCcw className="h-5 w-5 text-green-500" />
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
                    return exp?.status === 'warning';
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
            Utilisateurs supprimés ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserX className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun utilisateur supprimé trouvé</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>ID Public</TableHead>
                    <TableHead>Supprimé le</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const expStatus = getExpirationStatus(user.expires_at);
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
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
                          <code className="text-xs bg-muted px-2 py-1 rounded">
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
                              Restauré
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
                              onClick={() => {
                                setSelectedUser(user);
                                setDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!user.is_restored && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setRestoreDialogOpen(true);
                                }}
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

      {/* Dialog Détails */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Détails utilisateur supprimé
            </DialogTitle>
            <DialogDescription>
              Informations archivées avant suppression
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nom complet</label>
                  <p className="font-medium">{selectedUser.full_name || 'Non renseigné'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">ID Public</label>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{selectedUser.public_id || '-'}</code>
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
                  <p>{selectedUser.original_created_at ? format(new Date(selectedUser.original_created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-500" />
                  Informations de suppression
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-muted-foreground">Supprimé le</label>
                    <p>{format(new Date(selectedUser.deleted_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Méthode</label>
                    <p>{selectedUser.deletion_method || 'Manuel'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Raison</label>
                    <p>{selectedUser.deletion_reason || 'Non spécifiée'}</p>
                  </div>
                </div>
              </div>

              {selectedUser.wallet_data && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Données Wallet</h4>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(selectedUser.wallet_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedUser.is_restored && (
                <div className="border-t pt-4 bg-green-50 dark:bg-green-950 rounded p-3">
                  <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">✅ Restauré</h4>
                  <p className="text-sm text-muted-foreground">
                    Restauré le {selectedUser.restored_at ? format(new Date(selectedUser.restored_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                  </p>
                  {selectedUser.restoration_notes && (
                    <p className="text-sm mt-1">{selectedUser.restoration_notes}</p>
                  )}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fermer
            </Button>
            {selectedUser && !selectedUser.is_restored && (
              <Button onClick={() => {
                setDetailsOpen(false);
                setRestoreDialogOpen(true);
              }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmation Restauration */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la restauration</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Vous allez marquer l'utilisateur <strong>{selectedUser?.public_id || selectedUser?.email}</strong> comme restauré.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  <strong>Important:</strong> Cette action marque l'utilisateur comme restauré dans l'archive. 
                  Pour recréer le compte Supabase Auth, vous devez utiliser le dashboard Supabase.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes de restauration (optionnel)</label>
                <Textarea
                  placeholder="Raison de la restauration..."
                  value={restoreNotes}
                  onChange={(e) => setRestoreNotes(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoring}>
              {restoring ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Restauration...</>
              ) : (
                <><RotateCcw className="h-4 w-4 mr-2" /> Confirmer</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
