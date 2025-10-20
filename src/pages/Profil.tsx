// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { User, Settings, ShoppingBag, History, LogOut, Edit, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import QuickFooter from "@/components/QuickFooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const userTypes = {
  client: {
    label: "Client",
    description: "Acheteur sur la plateforme",
    color: "bg-client-primary"
  },
  vendeur: {
    label: "Vendeur",
    description: "Vendeur de produits",
    color: "bg-vendeur-primary"
  },
  livreur: {
    label: "Livreur",
    description: "Livreur de commandes",
    color: "bg-livreur-primary"
  },
  taxi: {
    label: "Taxi-Moto",
    description: "Conducteur de taxi-moto",
    color: "bg-taxi-primary"
  },
  transitaire: {
    label: "Transitaire",
    description: "Transitaire international",
    color: "bg-transitaire-primary"
  }
};

const menuItems = [
  {
    id: 'orders',
    title: 'Mes commandes',
    description: 'Voir toutes mes commandes',
    icon: ShoppingBag
  },
  {
    id: 'history',
    title: 'Historique',
    description: 'Historique des transactions',
    icon: History
  },
  {
    id: 'settings',
    title: 'Paramètres',
    description: 'Gérer mon compte',
    icon: Settings
  }
];

type ActivityItem = { id: string | number; type?: string; title: string; description?: string; timestamp: string; status?: string };

export default function Profil() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const userTypeInfo = (profile?.role && userTypes[profile.role as keyof typeof userTypes]) 
    ? userTypes[profile.role as keyof typeof userTypes] 
    : userTypes.client;

  const loadOrders = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20) as any;
      
      if (!error && data) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50) as any;
      
      if (!error && data) {
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleMenuClick = async (itemId: string) => {
    if (itemId === 'orders') {
      await loadOrders();
    } else if (itemId === 'history') {
      await loadTransactions();
    }
    setOpenDialog(itemId);
  };

  useEffect(() => {
    const loadActivity = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, created_at, target_type')
        .eq('actor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) {
        const { data: orders, error: e2 } = await supabase
          .from('orders')
          .select('id, status, created_at, total_amount')
          .order('created_at', { ascending: false })
          .limit(10);
        if (!e2 && orders) {
          setActivities(
            orders.map((o: any) => ({
              id: o.id,
              title: `Commande #${o.id}`,
              description: `Montant: ${o.total_amount?.toLocaleString?.() || o.total_amount} GNF`,
              timestamp: o.created_at,
              status: o.status
            }))
          );
        }
        return;
      }
      setActivities(
        (data || []).map((a: any) => ({
          id: a.id,
          title: a.action || 'Activité',
          description: a.target_type || '',
          timestamp: a.created_at
        }))
      );
    };
    loadActivity();
  }, [user]);

  const onAvatarClick = async () => {
    if (!isEditing) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !user) return;
      try {
        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('public-assets').upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('public-assets').getPublicUrl(filePath);
        const avatarUrl = publicUrl.publicUrl;
        const { error: updErr } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
        if (updErr) throw updErr;
        toast.success('Avatar mis à jour');
        window.location.reload();
      } catch (e: any) {
        toast.error(e?.message || 'Erreur upload avatar');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-card border-b border-border">
          <div className="px-4 py-6">
            <h1 className="text-2xl font-bold text-foreground">Profil</h1>
          </div>
        </header>

        <section className="px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Connectez-vous</h2>
              <p className="text-muted-foreground mb-6">
                Vous devez vous connecter pour accéder à votre profil
              </p>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-vendeur-primary hover:bg-vendeur-primary/90"
              >
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Mon Profil</h1>
            <div className="flex items-center gap-2">
              {profile?.role === 'vendeur' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/vendeur')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                  Retour
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Info */}
      <section className="px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="relative" onClick={onAvatarClick}>
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-xl">
                    {profile?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold">
                    {profile?.first_name && profile?.last_name 
                      ? `${profile.first_name} ${profile.last_name}`
                      : user.email
                    }
                  </h2>
                  <Badge className={`${userTypeInfo.color} text-white text-xs`}>
                    {userTypeInfo.label}
                  </Badge>
                </div>
                
                <p className="text-muted-foreground mb-2">{user.email}</p>
                
                {profile?.phone && (
                  <p className="text-sm text-muted-foreground mb-2">{profile.phone}</p>
                )}
                
                <p className="text-sm text-muted-foreground">
                  {userTypeInfo.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Menu Items */}
      <section className="px-4 py-2">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.id} className="cursor-pointer hover:shadow-elegant transition-all" onClick={() => handleMenuClick(item.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-accent rounded-lg">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Orders Dialog */}
      <Dialog open={openDialog === 'orders'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mes Commandes</DialogTitle>
          </DialogHeader>
          {loadingData ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune commande trouvée</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">Commande #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge>{order.status}</Badge>
                    </div>
                    <p className="text-lg font-bold">{order.total_amount?.toLocaleString()} GNF</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transactions Dialog */}
      <Dialog open={openDialog === 'history'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historique des Transactions</DialogTitle>
          </DialogHeader>
          {loadingData ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune transaction trouvée</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <Card key={tx.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{tx.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString('fr-FR')}
                        </p>
                        {tx.description && (
                          <p className="text-sm text-muted-foreground mt-1">{tx.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount?.toLocaleString()} GNF
                        </p>
                        <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={openDialog === 'settings'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paramètres du Compte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Rôle</label>
              <p className="text-muted-foreground">{profile?.role || 'client'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <p className="text-muted-foreground">{profile?.phone || 'Non renseigné'}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Activity */}
      <section className="px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length === 0 && (
                <div className="text-sm text-muted-foreground">Aucune activité récente.</div>
              )}
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-accent rounded-lg">
                  <div className="w-2 h-2 bg-vendeur-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{activity.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {activity.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sign Out */}
      <section className="px-4 pb-6">
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Se déconnecter
        </Button>
      </section>

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
}