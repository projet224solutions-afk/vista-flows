/**
 * 🔍 RECHERCHE ET AFFICHAGE COMPLET DES ACTIVITÉS UTILISATEUR
 * Permet au PDG de voir TOUT l'historique d'un utilisateur - CONTENU COMPLET
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  User, 
  Wallet, 
  ShoppingCart, 
  Shield, 
  MessageSquare,
  Car,
  Package,
  Star,
  Clock,
  Download,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  History,
  Heart,
  Bell,
  Send,
  Inbox,
  Image,
  FileVideo,
  File,
  Headphones,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { useUserActivityTracker, UserActivitySummary, MessageActivity } from '@/hooks/useUserActivityTracker';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Composant pour afficher une stat
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  trend 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </div>
      {trend && (
        <div>
          {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
        </div>
      )}
    </div>
  );
}

// Composant pour afficher le contenu complet d'un message
function MessageDetailDialog({ message }: { message: MessageActivity }) {
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return FileVideo;
      case 'audio': return Headphones;
      case 'file': return File;
      default: return MessageSquare;
    }
  };

  const Icon = getMessageIcon(message.type);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Message {message.direction === 'sent' ? 'envoyé' : 'reçu'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Métadonnées */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Direction:</span>
              <Badge className={`ml-2 ${message.direction === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                {message.direction === 'sent' ? 'Envoyé' : 'Reçu'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>
              <Badge variant="outline" className="ml-2">{message.type}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Statut:</span>
              <Badge variant="secondary" className="ml-2">{message.status}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>
              <span className="ml-2">{format(new Date(message.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}</span>
            </div>
          </div>

          <Separator />

          {/* IDs */}
          <div className="grid grid-cols-2 gap-4 text-sm font-mono">
            <div>
              <span className="text-muted-foreground">Expéditeur:</span>
              <p className="text-xs break-all">{message.sender_id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Destinataire:</span>
              <p className="text-xs break-all">{message.recipient_id}</p>
            </div>
          </div>

          <Separator />

          {/* Contenu COMPLET du message */}
          <div>
            <h4 className="font-semibold mb-2">Contenu du message:</h4>
            <div className="bg-muted p-4 rounded-lg">
              {message.type === 'text' ? (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">[Fichier: {message.type}]</p>
                  {message.file_name && <p>Nom: {message.file_name}</p>}
                  {message.file_size && <p>Taille: {(message.file_size / 1024).toFixed(2)} KB</p>}
                  {message.file_url && (
                    <a 
                      href={message.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline flex items-center gap-1"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Voir le fichier
                    </a>
                  )}
                  {message.type === 'image' && message.file_url && (
                    <img src={message.file_url} alt="Image message" className="max-w-full h-auto rounded-lg mt-2" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lu */}
          {message.read_at && (
            <div className="text-sm text-muted-foreground">
              Lu le: {format(new Date(message.read_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
            </div>
          )}

          {/* Métadonnées supplémentaires */}
          {message.metadata && Object.keys(message.metadata).length > 0 && (
            <>
              <Separator />
              <details>
                <summary className="cursor-pointer text-sm text-primary">Métadonnées</summary>
                <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                  {JSON.stringify(message.metadata, null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Composant pour afficher un événement dans la timeline
function TimelineEvent({ 
  icon: Icon, 
  title, 
  description, 
  time, 
  status 
}: { 
  icon: any; 
  title: string; 
  description?: string; 
  time: string;
  status?: 'success' | 'warning' | 'error' | 'info';
}) {
  const statusColors = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    info: 'text-blue-500'
  };

  return (
    <div className="flex gap-3 py-2">
      <div className={`p-1.5 rounded-full bg-muted ${status ? statusColors[status] : ''}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(time), { addSuffix: true, locale: fr })}
        </p>
      </div>
    </div>
  );
}

export function UserActivitySearch() {
  const [searchId, setSearchId] = useState('');
  const { searchUserById, activityData, loading, error, exportToJson, reset } = useUserActivityTracker();

  const handleSearch = () => {
    if (searchId.trim()) {
      searchUserById(searchId);
    }
  };

  const getRoleBadge = (roleType: string | null) => {
    const roleColors: Record<string, string> = {
      vendor: 'bg-purple-100 text-purple-800',
      client: 'bg-blue-100 text-blue-800',
      driver: 'bg-green-100 text-green-800',
      agent: 'bg-orange-100 text-orange-800',
      pdg: 'bg-red-100 text-red-800',
      transitaire: 'bg-cyan-100 text-cyan-800'
    };
    return roleColors[roleType || ''] || 'bg-gray-100 text-gray-800';
  };

  const formatAmount = (amount: number, currency = 'GNF') => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0
    }).format(amount) + ' ' + currency;
  };

  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Recherche d'Activité Utilisateur Complète
          </CardTitle>
          <CardDescription>
            Entrez l'ID utilisateur (ex: VND0001, CLT0002, DRV0003) pour voir TOUT son historique complet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Entrez l'ID (ex: VND0001)..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="font-mono"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Rechercher
            </Button>
            {activityData && (
              <>
                <Button variant="outline" onClick={exportToJson}>
                  <Download className="h-4 w-4 mr-1" />
                  Exporter JSON
                </Button>
                <Button variant="ghost" onClick={reset}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive mt-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Résultats */}
      {activityData && (
        <>
          {/* En-tête du profil */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {activityData.profile?.avatar_url ? (
                    <img 
                      src={activityData.profile.avatar_url} 
                      alt="Avatar" 
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>

                {/* Infos principales */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold">
                      {activityData.profile?.first_name || ''} {activityData.profile?.last_name || 'Utilisateur'}
                    </h2>
                    <Badge className={getRoleBadge(activityData.roleType)}>
                      {activityData.roleType?.toUpperCase() || 'N/A'}
                    </Badge>
                    <Badge variant="outline" className="font-mono">
                      {activityData.customId}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {activityData.profile?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {activityData.profile.email}
                      </span>
                    )}
                    {activityData.profile?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {activityData.profile.phone}
                      </span>
                    )}
                    {activityData.registrationDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Inscrit le {format(new Date(activityData.registrationDate), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    )}
                  </div>

                  {/* UUID pour recherche avancée */}
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    UUID: {activityData.userId}
                  </p>
                </div>

                {/* Stats rapides */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{activityData.accountAge}</p>
                  <p className="text-xs text-muted-foreground">jours d'ancienneté</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Stats en grille */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <StatCard 
                  icon={Wallet} 
                  label="Solde wallet" 
                  value={formatAmount(activityData.wallet?.balance || 0)}
                />
                <StatCard 
                  icon={Activity} 
                  label="Transactions" 
                  value={activityData.totalTransactions}
                />
                <StatCard 
                  icon={ShoppingCart} 
                  label="Commandes" 
                  value={activityData.totalOrders}
                />
                <StatCard 
                  icon={Shield} 
                  label="Connexions" 
                  value={activityData.totalLogins}
                />
                <StatCard 
                  icon={MessageSquare} 
                  label="Messages" 
                  value={activityData.totalMessages}
                  subValue={`${activityData.messagesSent} env. / ${activityData.messagesReceived} reçus`}
                />
                <StatCard 
                  icon={Star} 
                  label="Avis" 
                  value={activityData.totalReviews}
                />
                <StatCard 
                  icon={Heart} 
                  label="Favoris" 
                  value={activityData.totalFavorites}
                />
                <StatCard 
                  icon={Bell} 
                  label="Notifications" 
                  value={activityData.totalNotifications}
                />
              </div>

              {/* Résumé financier */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                  <ArrowDownLeft className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <p className="text-lg font-bold text-green-600">{formatAmount(activityData.totalReceived)}</p>
                  <p className="text-xs text-muted-foreground">Total reçu</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                  <ArrowUpRight className="h-5 w-5 mx-auto text-red-600 mb-1" />
                  <p className="text-lg font-bold text-red-600">{formatAmount(activityData.totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">Total dépensé</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                  <CreditCard className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-lg font-bold text-blue-600">{formatAmount(activityData.totalOrdersAmount)}</p>
                  <p className="text-xs text-muted-foreground">Total commandes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onglets détaillés */}
          <Tabs defaultValue="messages" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-7 w-full">
              <TabsTrigger value="messages" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                Messages ({activityData.totalMessages})
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-1">
                <Wallet className="h-3 w-3" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1">
                <ShoppingCart className="h-3 w-3" />
                Commandes
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1">
                <Shield className="h-3 w-3" />
                Sécurité
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-1">
                <History className="h-3 w-3" />
                Audit
              </TabsTrigger>
              <TabsTrigger value="delivery" className="gap-1">
                <Package className="h-3 w-3" />
                Livraisons
              </TabsTrigger>
              <TabsTrigger value="other" className="gap-1">
                <Activity className="h-3 w-3" />
                Autres
              </TabsTrigger>
            </TabsList>

            {/* Messages - CONTENU COMPLET LISIBLE */}
            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Tous les Messages - Contenu Complet
                  </CardTitle>
                  <CardDescription>
                    {activityData.totalMessages} messages • 
                    <Send className="h-3 w-3 inline mx-1" /> {activityData.messagesSent} envoyés • 
                    <Inbox className="h-3 w-3 inline mx-1" /> {activityData.messagesReceived} reçus
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {activityData.messages.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucun message</p>
                      ) : (
                        activityData.messages.map((msg) => (
                          <div key={msg.id} className={`flex items-start gap-3 p-3 rounded-lg ${
                            msg.direction === 'sent' ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-green-50 dark:bg-green-950/30'
                          }`}>
                            <div className={`p-2 rounded-full ${
                              msg.direction === 'sent' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                            }`}>
                              {msg.direction === 'sent' ? <Send className="h-4 w-4" /> : <Inbox className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {msg.direction === 'sent' ? 'Envoyé' : 'Reçu'}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {msg.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm')}
                                </span>
                              </div>
                              
                              {/* Aperçu du contenu */}
                              <div className="bg-white dark:bg-gray-900 p-2 rounded border">
                                {msg.type === 'text' ? (
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content}
                                  </p>
                                ) : (
                                  <div className="flex items-center gap-2 text-sm">
                                    {msg.type === 'image' && <Image className="h-4 w-4" />}
                                    {msg.type === 'video' && <FileVideo className="h-4 w-4" />}
                                    {msg.type === 'audio' && <Headphones className="h-4 w-4" />}
                                    {msg.type === 'file' && <File className="h-4 w-4" />}
                                    <span>{msg.file_name || `Fichier ${msg.type}`}</span>
                                    {msg.file_size && <span className="text-muted-foreground">({(msg.file_size / 1024).toFixed(1)} KB)</span>}
                                  </div>
                                )}
                              </div>

                              {/* Destinataire/Expéditeur */}
                              <p className="text-xs text-muted-foreground mt-1">
                                {msg.direction === 'sent' 
                                  ? `→ ${msg.recipient_id.slice(0, 8)}...` 
                                  : `← ${msg.sender_id.slice(0, 8)}...`
                                }
                              </p>
                            </div>
                            
                            {/* Bouton voir détails */}
                            <MessageDetailDialog message={msg} />
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historique des Transactions</CardTitle>
                  <CardDescription>
                    {activityData.totalTransactions} transactions • 
                    Envoyé: {formatAmount(activityData.totalSpent)} • 
                    Reçu: {formatAmount(activityData.totalReceived)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {activityData.transactions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucune transaction</p>
                      ) : (
                        activityData.transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                            <div className={`p-2 rounded-full ${
                              tx.direction === 'sent' 
                                ? 'bg-red-100 text-red-600' 
                                : 'bg-green-100 text-green-600'
                            }`}>
                              {tx.direction === 'sent' ? (
                                <TrendingDown className="h-4 w-4" />
                              ) : (
                                <TrendingUp className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{tx.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {tx.description || 'Transaction'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${
                                tx.direction === 'sent' 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }`}>
                                {tx.direction === 'sent' ? '-' : '+'}
                                {formatAmount(tx.amount, tx.currency)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}
                              </p>
                            </div>
                            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                              {tx.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Commandes */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historique des Commandes</CardTitle>
                  <CardDescription>
                    {activityData.totalOrders} commandes pour un total de {formatAmount(activityData.totalOrdersAmount)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {activityData.orders.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucune commande</p>
                      ) : (
                        activityData.orders.map((order) => (
                          <div key={order.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                            <div className="p-2 rounded-full bg-primary/10">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">Commande #{order.order_number || order.id.slice(0, 8)}</p>
                                {order.role && (
                                  <Badge variant="outline" className="text-xs">
                                    {order.role === 'customer' ? 'Client' : 'Vendeur'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(order.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                {order.source && ` • Source: ${order.source}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatAmount(order.total_amount)}</p>
                              {order.payment_method && (
                                <p className="text-xs text-muted-foreground">{order.payment_method}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <Badge variant={
                                order.status === 'delivered' ? 'default' :
                                order.status === 'pending' ? 'secondary' :
                                order.status === 'cancelled' ? 'destructive' : 'outline'
                              }>
                                {order.status}
                              </Badge>
                              {order.payment_status && (
                                <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                                  {order.payment_status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sécurité */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historique de Sécurité</CardTitle>
                  <CardDescription>
                    {activityData.totalLogins} connexions réussies • Dernière: {
                      activityData.lastLogin 
                        ? formatDistanceToNow(new Date(activityData.lastLogin), { addSuffix: true, locale: fr })
                        : 'N/A'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {activityData.loginHistory.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucun historique de connexion</p>
                      ) : (
                        activityData.loginHistory.map((login) => (
                          <div key={login.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                            <div className={`p-2 rounded-full ${
                              login.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                              {login.success ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">
                                {login.success ? 'Connexion réussie' : 'Tentative échouée'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                IP: {login.ip_address || 'N/A'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-xs">
                                {login.user_agent || 'Agent inconnu'}
                              </p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              {format(new Date(login.attempted_at), 'dd/MM/yyyy HH:mm')}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Audit */}
            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Journal d'Audit Complet</CardTitle>
                  <CardDescription>
                    {activityData.totalAuditEvents} événements enregistrés
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {activityData.auditLogs.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucun événement d'audit</p>
                      ) : (
                        activityData.auditLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{log.action}</p>
                              {log.target_type && (
                                <p className="text-xs text-muted-foreground">
                                  Cible: {log.target_type} • {log.target_id?.slice(0, 8)}
                                </p>
                              )}
                              {log.data_json && (
                                <details className="mt-1">
                                  <summary className="text-xs text-primary cursor-pointer">
                                    Voir les données
                                  </summary>
                                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                                    {JSON.stringify(log.data_json, null, 2)}
                                  </pre>
                                </details>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                IP: {log.ip_address || 'N/A'}
                              </p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Livraisons & Courses */}
            <TabsContent value="delivery">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Livraisons */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Livraisons ({activityData.totalDeliveries})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      {activityData.deliveries.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Aucune livraison</p>
                      ) : (
                        activityData.deliveries.map((d) => (
                          <div key={d.id} className="p-3 mb-2 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{d.role || 'N/A'}</Badge>
                              <Badge>{d.status}</Badge>
                            </div>
                            <p className="text-sm font-medium">{formatAmount(d.price || 0)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(d.created_at), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Courses */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Courses ({activityData.totalRides})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      {activityData.rides.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Aucune course</p>
                      ) : (
                        activityData.rides.map((r) => (
                          <div key={r.id} className="p-3 mb-2 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{r.role || 'N/A'}</Badge>
                              <Badge>{r.status}</Badge>
                            </div>
                            <p className="text-sm font-medium">{formatAmount(r.fare || 0)}</p>
                            {r.distance_km && <p className="text-xs text-muted-foreground">{r.distance_km} km</p>}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Autres */}
            <TabsContent value="other">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Avis donnés */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Avis donnés ({activityData.reviewsGiven?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      {(activityData.reviewsGiven || []).length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Aucun avis</p>
                      ) : (
                        activityData.reviewsGiven.map((r) => (
                          <div key={r.id} className="p-2 mb-2 bg-muted/30 rounded-lg">
                            <div className="flex gap-0.5 mb-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                            <p className="text-xs">{r.content || 'Aucun commentaire'}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(r.created_at), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Favoris */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Favoris ({activityData.totalFavorites})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      {activityData.favorites.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Aucun favori</p>
                      ) : (
                        activityData.favorites.map((f: any) => (
                          <div key={f.id} className="p-2 mb-2 bg-muted/30 rounded-lg text-xs">
                            <p className="font-mono">{f.product_id?.slice(0, 8) || f.id.slice(0, 8)}...</p>
                            <p className="text-muted-foreground">
                              {f.created_at && format(new Date(f.created_at), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notifications ({activityData.totalNotifications})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      {activityData.notifications.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Aucune notification</p>
                      ) : (
                        activityData.notifications.slice(0, 20).map((n: any) => (
                          <div key={n.id} className="p-2 mb-2 bg-muted/30 rounded-lg text-xs">
                            <p className="font-medium">{n.title || n.type}</p>
                            <p className="text-muted-foreground truncate">{n.message || n.body}</p>
                            <p className="text-muted-foreground">
                              {n.created_at && format(new Date(n.created_at), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Info vendeur (si applicable) */}
                {activityData.vendorInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Info Vendeur
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><strong>Business:</strong> {activityData.vendorInfo.business_name}</p>
                      <p><strong>Type:</strong> {activityData.vendorInfo.business_type}</p>
                      <p><strong>Actif:</strong> {activityData.vendorInfo.is_active ? 'Oui' : 'Non'}</p>
                      <p><strong>Produits:</strong> {activityData.vendorInfo.total_products}</p>
                      {activityData.vendorInfo.products && activityData.vendorInfo.products.length > 0 && (
                        <details>
                          <summary className="cursor-pointer text-primary">Voir les produits</summary>
                          <ScrollArea className="h-[150px] mt-2">
                            {activityData.vendorInfo.products.map((p: any) => (
                              <div key={p.id} className="p-2 bg-muted rounded mb-1 text-xs">
                                <p className="font-medium">{p.name}</p>
                                <p>{formatAmount(p.price || 0)}</p>
                              </div>
                            ))}
                          </ScrollArea>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Info chauffeur (si applicable) */}
                {activityData.driverInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Info Chauffeur
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><strong>Véhicule:</strong> {activityData.driverInfo.vehicle_type}</p>
                      <p><strong>Licence:</strong> {activityData.driverInfo.license_number}</p>
                      <p><strong>Statut:</strong> {activityData.driverInfo.status}</p>
                      <p><strong>Note:</strong> {activityData.driverInfo.rating}★</p>
                      <p><strong>Total livraisons:</strong> {activityData.driverInfo.total_deliveries}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
