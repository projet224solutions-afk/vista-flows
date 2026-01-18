/**
 * 🔍 RECHERCHE ET AFFICHAGE COMPLET DES ACTIVITÉS UTILISATEUR
 * Permet au PDG de voir TOUT l'historique d'un utilisateur
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  History
} from 'lucide-react';
import { useUserActivityTracker, UserActivitySummary } from '@/hooks/useUserActivityTracker';
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
            Recherche d'Activité Utilisateur
          </CardTitle>
          <CardDescription>
            Entrez l'ID utilisateur (ex: VND0001, CLT0002, DRV0003) pour voir tout son historique
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
                  Exporter
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
                </div>

                {/* Stats rapides */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{activityData.accountAge}</p>
                  <p className="text-xs text-muted-foreground">jours d'ancienneté</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Stats en grille */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                  subValue={formatAmount(activityData.totalOrdersAmount)}
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
                />
                <StatCard 
                  icon={Star} 
                  label="Avis donnés" 
                  value={activityData.totalReviews}
                  subValue={`Moyenne: ${activityData.averageRating.toFixed(1)}★`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Onglets détaillés */}
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
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
              <TabsTrigger value="communication" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="other" className="gap-1">
                <Activity className="h-3 w-3" />
                Autres
              </TabsTrigger>
            </TabsList>

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
                              tx.sender_user_id === activityData.profile?.id 
                                ? 'bg-red-100 text-red-600' 
                                : 'bg-green-100 text-green-600'
                            }`}>
                              {tx.sender_user_id === activityData.profile?.id ? (
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
                                tx.sender_user_id === activityData.profile?.id 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }`}>
                                {tx.sender_user_id === activityData.profile?.id ? '-' : '+'}
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
                              <p className="font-medium">Commande #{order.order_number || order.id.slice(0, 8)}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(order.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatAmount(order.total_amount)}</p>
                            </div>
                            <Badge variant={
                              order.status === 'delivered' ? 'default' :
                              order.status === 'pending' ? 'secondary' :
                              order.status === 'cancelled' ? 'destructive' : 'outline'
                            }>
                              {order.status}
                            </Badge>
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

            {/* Messages */}
            <TabsContent value="communication">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Messages Envoyés</CardTitle>
                  <CardDescription>
                    {activityData.totalMessages} messages envoyés
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {activityData.messages.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucun message</p>
                      ) : (
                        activityData.messages.map((msg) => (
                          <div key={msg.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                              <MessageSquare className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{msg.content_preview}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Type: {msg.type} • Destinataire: {msg.recipient_id.slice(0, 8)}...
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-xs">
                                {msg.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(msg.created_at), 'dd/MM HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Autres */}
            <TabsContent value="other">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Livraisons */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Livraisons ({activityData.deliveries.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[250px]">
                      {activityData.deliveries.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Aucune livraison</p>
                      ) : (
                        activityData.deliveries.map((d) => (
                          <TimelineEvent
                            key={d.id}
                            icon={Package}
                            title={`Livraison ${d.status}`}
                            description={`${d.pickup_address?.slice(0, 20)}... → ${d.delivery_address?.slice(0, 20)}...`}
                            time={d.created_at}
                            status={d.status === 'delivered' ? 'success' : 'info'}
                          />
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
                      Courses ({activityData.rides.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[250px]">
                      {activityData.rides.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Aucune course</p>
                      ) : (
                        activityData.rides.map((r) => (
                          <TimelineEvent
                            key={r.id}
                            icon={Car}
                            title={`Course ${r.status}`}
                            description={r.fare ? formatAmount(r.fare) : undefined}
                            time={r.created_at}
                            status={r.status === 'completed' ? 'success' : 'info'}
                          />
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Avis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Avis donnés ({activityData.totalReviews})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[250px]">
                      {activityData.reviews.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Aucun avis</p>
                      ) : (
                        activityData.reviews.map((r) => (
                          <div key={r.id} className="flex items-start gap-2 py-2">
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs">{r.content || 'Aucun commentaire'}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(r.created_at), 'dd/MM/yyyy')}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Info spécifique au rôle */}
                {activityData.vendorInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Info Vendeur
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p><strong>Business:</strong> {activityData.vendorInfo.business_name}</p>
                      <p><strong>Type:</strong> {activityData.vendorInfo.business_type}</p>
                      <p><strong>Actif:</strong> {activityData.vendorInfo.is_active ? 'Oui' : 'Non'}</p>
                      <p><strong>Produits:</strong> {activityData.vendorInfo.total_products}</p>
                    </CardContent>
                  </Card>
                )}

                {activityData.driverInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Info Chauffeur
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p><strong>Véhicule:</strong> {activityData.driverInfo.vehicle_type}</p>
                      <p><strong>Licence:</strong> {activityData.driverInfo.license_number}</p>
                      <p><strong>Statut:</strong> {activityData.driverInfo.status}</p>
                      <p><strong>Note:</strong> {activityData.driverInfo.rating}★</p>
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
