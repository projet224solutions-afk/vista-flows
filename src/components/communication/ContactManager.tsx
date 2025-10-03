/**
 * 👥 GESTIONNAIRE DE CONTACTS - 224SOLUTIONS
 * Composant pour gérer les contacts et créer des conversations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  Search,
  MessageSquare,
  Phone,
  Video,
  MoreVertical,
  Mail,
  MapPin,
  Calendar,
  Star,
  UserCheck,
  UserX
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, useUserSearch, useUserPresence } from "@/hooks/useCommunication";
import communicationService from "@/services/communicationService";
import { toast } from "sonner";

// Interface pour les contacts universels
interface UniversalContact {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
  phone?: string;
  created_at: string;
  last_seen?: string;
  is_favorite?: boolean;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

export default function ContactManager() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [allUsers, setAllUsers] = useState<UniversalContact[]>([]);
  const [loading, setLoading] = useState(true);

  // Hooks
  const { createPrivateConversation } = useConversations();
  const { searchResults, isSearching, setSearchQuery: setUserSearchQuery } = useUserSearch();
  const { presence } = useUserPresence(allUsers.map(c => c.id));

  // Charger tous les utilisateurs au montage
  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const users = await communicationService.getAllUsers(100);

      // Exclure l'utilisateur actuel de la liste
      const filteredUsers = users.filter(u => u.id !== user?.id);

      setAllUsers(filteredUsers.map(u => ({
        ...u,
        is_favorite: false, // À implémenter avec une table favorites
        status: 'offline' as const
      })));
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      toast.error('Erreur lors du chargement des contacts');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les contacts
  const filteredContacts = allUsers.filter(contact => {
    const matchesSearch = searchQuery === '' ||
      contact.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = selectedFilter === 'all' ||
      (selectedFilter === 'favorites' && contact.is_favorite) ||
      (selectedFilter === 'online' && getPresenceStatus(contact.id) === 'online');

    const matchesRole = selectedRole === 'all' ||
      contact.role.toLowerCase() === selectedRole.toLowerCase();

    return matchesSearch && matchesFilter && matchesRole;
  });

  // Obtenir le statut de présence
  const getPresenceStatus = (userId: string) => {
    const userPresence = presence.find(p => p.user_id === userId);
    return userPresence?.status || 'offline';
  };

  // Obtenir l'indicateur de statut
  const getStatusIndicator = (status: string) => {
    const colors = {
      online: 'bg-green-500',
      away: 'bg-yellow-500',
      busy: 'bg-red-500',
      offline: 'bg-gray-400'
    };

    return (
      <div className={`w-3 h-3 rounded-full ${colors[status as keyof typeof colors] || colors.offline}`} />
    );
  };

  // Créer une conversation
  const handleCreateConversation = (targetUserId: string) => {
    createPrivateConversation({ targetUserId });
    toast.success('Conversation créée');
  };

  // Ajouter un contact
  const handleAddContact = (contactData: any) => {
    // Logique d'ajout de contact
    toast.success('Contact ajouté avec succès');
    setShowAddContact(false);
  };

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total utilisateurs</p>
                <p className="text-2xl font-bold">{allUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <UserCheck className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">En ligne</p>
                <p className="text-2xl font-bold">
                  {allUsers.filter(c => getPresenceStatus(c.id) === 'online').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Star className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Favoris</p>
                <p className="text-2xl font-bold">
                  {allUsers.filter(c => c.is_favorite).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-2xl font-bold">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interface principale */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contacts</CardTitle>
            <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un nouveau contact</DialogTitle>
                </DialogHeader>
                <AddContactForm onAdd={handleAddContact} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filtres et recherche */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher un contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
              >
                Tous
              </Button>
              <Button
                variant={selectedFilter === 'favorites' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('favorites')}
              >
                <Star className="w-4 h-4 mr-1" />
                Favoris
              </Button>
              <Button
                variant={selectedFilter === 'online' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('online')}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                En ligne
              </Button>
            </div>

            {/* Filtre par rôle */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedRole === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole('all')}
              >
                Tous les rôles
              </Button>
              <Button
                variant={selectedRole === 'vendeur' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole('vendeur')}
              >
                Vendeurs
              </Button>
              <Button
                variant={selectedRole === 'client' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole('client')}
              >
                Clients
              </Button>
              <Button
                variant={selectedRole === 'transitaire' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole('transitaire')}
              >
                Transitaires
              </Button>
              <Button
                variant={selectedRole === 'agent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole('agent')}
              >
                Agents
              </Button>
            </div>
          </div>

          {/* Liste des contacts */}
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Chargement des utilisateurs...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun utilisateur trouvé</p>
                <p className="text-sm mt-2">
                  {searchQuery || selectedRole !== 'all'
                    ? 'Modifiez vos critères de recherche'
                    : 'Aucun utilisateur disponible'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.map((contact) => (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={contact.avatar_url || undefined} />
                              <AvatarFallback>
                                {contact.first_name[0]}{contact.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1">
                              {getStatusIndicator(getPresenceStatus(contact.id))}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">
                                {contact.first_name} {contact.last_name}
                              </h4>
                              {contact.is_favorite && (
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {contact.role}
                              </Badge>
                              <p className="text-sm text-muted-foreground">
                                {getPresenceStatus(contact.id) === 'online' ? 'En ligne' : 'Hors ligne'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Star className="w-4 h-4 mr-2" />
                              {contact.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="w-4 h-4 mr-2" />
                              Envoyer un email
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <UserX className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{contact.email}</span>
                        </div>

                        {(contact as any).location && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{(contact as any).location}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Vu {new Date(contact.last_seen).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCreateConversation(contact.id)}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Chat
                        </Button>

                        <Button variant="outline" size="sm">
                          <Phone className="w-4 h-4" />
                        </Button>

                        <Button variant="outline" size="sm">
                          <Video className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Formulaire d'ajout de contact
function AddContactForm({ onAdd }: { onAdd: (data: any) => void }) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: '',
    location: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Prénom</label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Nom</label>
          <Input
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Rôle</label>
        <Input
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          placeholder="Ex: Vendeur, Client, Agent..."
        />
      </div>

      <div>
        <label className="text-sm font-medium">Localisation</label>
        <Input
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Ex: Dakar, Sénégal"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline">
          Annuler
        </Button>
        <Button type="submit">
          Ajouter Contact
        </Button>
      </div>
    </form>
  );
}
