/**
 * Modal de détail pour chaque statistique client
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, TrendingUp, Heart, CreditCard, CheckCircle, XCircle, Clock, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ClientStatDetailModalProps {
  open: boolean;
  onClose: () => void;
  statType: 'orders' | 'active' | 'favorites' | 'spent' | null;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('fr-FR').format(price) + ' GNF';

export function ClientStatDetailModal({ open, onClose, statType }: ClientStatDetailModalProps) {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!open || !statType || !user?.id) return;
    loadData();
  }, [open, statType, user?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Résoudre customer_id
      const { data: cust } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      const customerId = cust?.id;

      if (statType === 'orders') {
        if (!customerId) { setData([]); setSummary({ total: 0, completed: 0, cancelled: 0, pending: 0 }); return; }
        const { data: orders } = await supabase
          .from('orders')
          .select('id, status, total_amount, created_at, order_number')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(50);
        setData(orders || []);
        const list = orders || [];
        setSummary({
          total: list.length,
          completed: list.filter(o => ['delivered', 'completed'].includes(o.status)).length,
          cancelled: list.filter(o => o.status === 'cancelled').length,
          pending: list.filter(o => ['pending', 'processing', 'confirmed'].includes(o.status)).length,
        });
      }

      if (statType === 'active') {
        if (!customerId) { setData([]); return; }
        const { data: orders } = await supabase
          .from('orders')
          .select('id, status, total_amount, created_at, order_number')
          .eq('customer_id', customerId)
          .in('status', ['pending', 'processing', 'confirmed', 'in_transit', 'preparing', 'ready'])
          .order('created_at', { ascending: false });
        setData(orders || []);
      }

      if (statType === 'favorites') {
        const { data: favs } = await supabase
          .from('wishlists')
          .select('id, product_id, created_at, products:product_id(name, price, image_url)')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(50);
        setData(favs || []);
      }

      if (statType === 'spent') {
        if (!customerId) { setData([]); setSummary({ total: 0, avg: 0, count: 0, max: 0 }); return; }
        const { data: orders } = await supabase
          .from('orders')
          .select('id, status, total_amount, created_at, order_number')
          .eq('customer_id', customerId)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false });
        const list = orders || [];
        const total = list.reduce((s, o) => s + (o.total_amount || 0), 0);
        const max = list.length > 0 ? Math.max(...list.map(o => o.total_amount || 0)) : 0;
        setData(list);
        setSummary({
          total,
          avg: list.length > 0 ? total / list.length : 0,
          count: list.length,
          max,
        });
      }
    } catch (err) {
      console.error('Erreur chargement détail stat:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'En attente', variant: 'outline' },
      processing: { label: 'Traitement', variant: 'secondary' },
      confirmed: { label: 'Confirmée', variant: 'secondary' },
      preparing: { label: 'Préparation', variant: 'secondary' },
      ready: { label: 'Prête', variant: 'secondary' },
      in_transit: { label: 'En transit', variant: 'default' },
      delivered: { label: 'Livrée', variant: 'default' },
      completed: { label: 'Terminée', variant: 'default' },
      cancelled: { label: 'Annulée', variant: 'destructive' },
    };
    const info = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  const titles: Record<string, { title: string; icon: any; color: string }> = {
    orders: { title: 'Toutes vos commandes', icon: Package, color: 'text-client-primary' },
    active: { title: 'Commandes en cours', icon: TrendingUp, color: 'text-orange-600' },
    favorites: { title: 'Vos favoris', icon: Heart, color: 'text-purple-600' },
    spent: { title: 'Détail des dépenses', icon: CreditCard, color: 'text-green-600' },
  };

  const config = statType ? titles[statType] : null;
  const Icon = config?.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${config?.color}`} />}
            {config?.title}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 max-h-[60vh]">
            {/* ORDERS - Résumé + liste */}
            {statType === 'orders' && (
              <div className="space-y-4">
                {summary && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <p className="text-lg font-bold">{summary.total}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <p className="text-lg font-bold text-green-600">{summary.completed}</p>
                      <p className="text-[10px] text-muted-foreground">Livrées</p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <p className="text-lg font-bold text-orange-600">{summary.pending}</p>
                      <p className="text-[10px] text-muted-foreground">En cours</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <p className="text-lg font-bold text-red-600">{summary.cancelled}</p>
                      <p className="text-[10px] text-muted-foreground">Annulées</p>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {data.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune commande</p>}
                  {data.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">#{order.order_number || order.id.slice(0, 8)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatPrice(order.total_amount || 0)}</span>
                        {statusBadge(order.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVE - Liste des commandes en cours */}
            {statType === 'active' && (
              <div className="space-y-2">
                {data.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                    <p className="text-muted-foreground">Aucune commande en cours</p>
                    <p className="text-xs text-muted-foreground mt-1">Toutes vos commandes sont terminées</p>
                  </div>
                )}
                {data.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-orange-50/50 dark:bg-orange-950/10 rounded-lg border border-orange-200/50 dark:border-orange-800/30">
                    <div className="flex items-center gap-3">
                      {order.status === 'shipped' ? (
                        <Truck className="w-5 h-5 text-orange-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">#{order.order_number || order.id.slice(0, 8)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatPrice(order.total_amount || 0)}</p>
                      {statusBadge(order.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FAVORITES - Liste des favoris */}
            {statType === 'favorites' && (
              <div className="space-y-2">
                {data.length === 0 && (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground">Aucun favori</p>
                    <p className="text-xs text-muted-foreground mt-1">Ajoutez des produits à vos favoris</p>
                  </div>
                )}
                {data.map((fav: any) => (
                  <div key={fav.id} className="flex items-center gap-3 p-3 bg-purple-50/50 dark:bg-purple-950/10 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
                    {fav.products?.image_url ? (
                      <img src={fav.products.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-purple-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fav.products?.name || 'Produit'}</p>
                      <p className="text-[10px] text-muted-foreground">Ajouté le {formatDate(fav.created_at)}</p>
                    </div>
                    <p className="text-sm font-bold text-purple-600">{formatPrice(fav.products?.price || 0)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* SPENT - Détail des dépenses */}
            {statType === 'spent' && (
              <div className="space-y-4">
                {summary && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Total dépensé</p>
                      <p className="text-lg font-bold text-green-600">{formatPrice(summary.total)}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Panier moyen</p>
                      <p className="text-lg font-bold">{formatPrice(Math.round(summary.avg))}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Nb commandes</p>
                      <p className="text-lg font-bold">{summary.count}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Plus grosse commande</p>
                      <p className="text-lg font-bold">{formatPrice(summary.max)}</p>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Historique</p>
                  {data.length === 0 && <p className="text-center text-muted-foreground py-4">Aucune dépense</p>}
                  {data.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-xs font-medium">#{order.order_number || order.id.slice(0, 8)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(order.created_at)}</p>
                      </div>
                      <p className="text-sm font-bold text-green-600">-{formatPrice(order.total_amount || 0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
