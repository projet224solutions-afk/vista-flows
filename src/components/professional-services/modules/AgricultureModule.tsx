/**
 * MODULE AGRICULTURE PROFESSIONNEL
 * Inspiré de: FarmLogs, AgroStar, Agrimarket
 * Gestion complète: catalogue produits, commandes, traçabilité, saisons
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { _Textarea } from '@/components/ui/textarea';
import { _Progress } from '@/components/ui/progress';
import {
  Sprout, Apple, Egg, Fish, DollarSign, TrendingUp,
  Plus, Package, ShoppingCart, Users, Calendar,
  MapPin, Truck, Sun, CloudRain, Leaf, _Scale
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AgricultureModuleProps {
  serviceId: string;
  businessName?: string;
}

interface AgriProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  pricePerUnit: number;
  stockQuantity: number;
  season: string;
  origin: string;
  organic: boolean;
  status: 'disponible' | 'stock_bas' | 'rupture' | 'hors_saison';
}

interface AgriOrder {
  id: string;
  clientName: string;
  clientPhone: string;
  clientType: 'particulier' | 'grossiste' | 'restaurant' | 'marche';
  items: { product: string; quantity: number; unit: string }[];
  total: number;
  status: 'nouveau' | 'prepare' | 'livre' | 'termine';
  date: string;
  deliveryType: 'collecte' | 'livraison';
}

const CATEGORIES = [
  { id: 'fruits', name: 'Fruits & Légumes', icon: Apple, emoji: '🍎', color: 'from-green-500 to-emerald-600' },
  { id: 'cereals', name: 'Céréales & Grains', icon: Sprout, emoji: '🌾', color: 'from-amber-500 to-yellow-600' },
  { id: 'dairy', name: 'Produits Laitiers', icon: Egg, emoji: '🥛', color: 'from-blue-400 to-cyan-500' },
  { id: 'meat', name: 'Viandes & Volaille', icon: Fish, emoji: '🥩', color: 'from-red-500 to-rose-600' },
  { id: 'fish', name: 'Poissons', icon: Fish, emoji: '🐟', color: 'from-cyan-500 to-blue-600' },
  { id: 'spices', name: 'Épices & Condiments', icon: Leaf, emoji: '🌿', color: 'from-orange-500 to-red-500' },
];

const SEASONS = ['Toute l\'année', 'Saison sèche (Nov-Avr)', 'Saison des pluies (Mai-Oct)', 'Été', 'Hiver'];

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  nouveau: { label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  prepare: { label: 'Préparé', color: 'bg-yellow-100 text-yellow-800' },
  livre: { label: 'Livré', color: 'bg-green-100 text-green-800' },
  termine: { label: 'Terminé', color: 'bg-muted text-muted-foreground' },
};

export function AgricultureModule({ _serviceId, businessName }: AgricultureModuleProps) {
  const [activeTab, setActiveTab] = useState('produits');
  const [showNewProduct, setShowNewProduct] = useState(false);

  const [products] = useState<AgriProduct[]>([
    { id: '1', name: 'Mangues Kent', category: 'fruits', unit: 'kg', pricePerUnit: 15000, stockQuantity: 500, season: 'Saison sèche (Nov-Avr)', origin: 'Kankan', organic: true, status: 'disponible' },
    { id: '2', name: 'Riz local étuvé', category: 'cereals', unit: 'sac 50kg', pricePerUnit: 350000, stockQuantity: 80, season: "Toute l'année", origin: 'Faranah', organic: false, status: 'disponible' },
    { id: '3', name: 'Poulet fermier', category: 'meat', unit: 'pièce', pricePerUnit: 85000, stockQuantity: 25, season: "Toute l'année", origin: 'Kindia', organic: true, status: 'disponible' },
    { id: '4', name: 'Tomates fraîches', category: 'fruits', unit: 'caisse 20kg', pricePerUnit: 120000, stockQuantity: 8, season: 'Saison sèche (Nov-Avr)', origin: 'Dalaba', organic: true, status: 'stock_bas' },
    { id: '5', name: 'Miel de forêt', category: 'spices', unit: 'litre', pricePerUnit: 45000, stockQuantity: 0, season: 'Saison sèche (Nov-Avr)', origin: 'N\'Zérékoré', organic: true, status: 'rupture' },
    { id: '6', name: 'Poisson fumé', category: 'fish', unit: 'kg', pricePerUnit: 35000, stockQuantity: 40, season: "Toute l'année", origin: 'Boffa', organic: false, status: 'disponible' },
  ]);

  const [orders] = useState<AgriOrder[]>([
    { id: '1', clientName: 'Restaurant Le Jardin', clientPhone: '+224 621 00 00 00', clientType: 'restaurant', items: [{ product: 'Mangues Kent', quantity: 50, unit: 'kg' }, { product: 'Tomates fraîches', quantity: 2, unit: 'caisse' }], total: 990000, status: 'prepare', date: '2026-03-19', deliveryType: 'livraison' },
    { id: '2', clientName: 'Mamadou Grossiste', clientPhone: '+224 622 00 00 00', clientType: 'grossiste', items: [{ product: 'Riz local étuvé', quantity: 10, unit: 'sac' }], total: 3500000, status: 'nouveau', date: '2026-03-19', deliveryType: 'collecte' },
    { id: '3', clientName: 'Mme Sow', clientPhone: '+224 623 00 00 00', clientType: 'particulier', items: [{ product: 'Poulet fermier', quantity: 3, unit: 'pièce' }], total: 255000, status: 'livre', date: '2026-03-18', deliveryType: 'livraison' },
  ]);

  // Stats
  const totalProducts = products.length;
  const availableProducts = products.filter(p => p.status === 'disponible').length;
  const lowStock = products.filter(p => p.status === 'stock_bas' || p.status === 'rupture').length;
  const organicCount = products.filter(p => p.organic).length;
  const totalOrderValue = orders.reduce((acc, o) => acc + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'nouveau' || o.status === 'prepare').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
            <Sprout className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{businessName || 'Exploitation Agricole'}</h2>
            <p className="text-muted-foreground">Produits frais & locaux</p>
          </div>
        </div>
        <div className="flex gap-2">
          {organicCount > 0 && (
            <Badge className="bg-green-100 text-green-800 gap-1">
              <Leaf className="w-3 h-3" /> {organicCount} Bio
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <Package className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{totalProducts}</p>
            <p className="text-xs opacity-80">Produits</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <Apple className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{availableProducts}</p>
            <p className="text-xs opacity-80">Disponibles</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white">
          <CardContent className="p-4">
            <ShoppingCart className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{pendingOrders}</p>
            <p className="text-xs opacity-80">Commandes en cours</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-4">
            <DollarSign className="h-4 w-4 opacity-80" />
            <p className="text-lg font-bold mt-1">{(totalOrderValue / 1e6).toFixed(1)}M</p>
            <p className="text-xs opacity-80">Ventes GNF</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-orange-500 text-white">
          <CardContent className="p-4">
            <TrendingUp className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{lowStock}</p>
            <p className="text-xs opacity-80">Alertes stock</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
          <CardContent className="p-4">
            <Leaf className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{organicCount}</p>
            <p className="text-xs opacity-80">Produits Bio</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="produits"><Package className="h-4 w-4 mr-1 hidden sm:inline" /> Produits</TabsTrigger>
          <TabsTrigger value="commandes"><ShoppingCart className="h-4 w-4 mr-1 hidden sm:inline" /> Commandes</TabsTrigger>
          <TabsTrigger value="clients"><Users className="h-4 w-4 mr-1 hidden sm:inline" /> Clients</TabsTrigger>
          <TabsTrigger value="saisons"><Sun className="h-4 w-4 mr-1 hidden sm:inline" /> Saisons</TabsTrigger>
        </TabsList>

        {/* PRODUITS */}
        <TabsContent value="produits" className="space-y-4">
          {/* Categories */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORIES.map(cat => {
              const _Icon = cat.icon;
              const count = products.filter(p => p.category === cat.id).length;
              return (
                <Card key={cat.id} className="cursor-pointer hover:shadow-md transition-all group">
                  <CardContent className="p-3 text-center">
                    <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <span className="text-lg">{cat.emoji}</span>
                    </div>
                    <p className="text-xs font-medium">{cat.name}</p>
                    <p className="text-[10px] text-muted-foreground">{count} articles</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Mes produits ({products.length})</h3>
            <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau produit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ajouter un produit agricole</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nom du produit</Label><Input placeholder="Ex: Mangues Kent" /></div>
                    <div className="space-y-2">
                      <Label>Catégorie</Label>
                      <Select><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Prix/unité (GNF)</Label><Input type="number" placeholder="0" /></div>
                    <div className="space-y-2"><Label>Unité</Label><Input placeholder="kg, pièce, sac..." /></div>
                    <div className="space-y-2"><Label>Stock</Label><Input type="number" placeholder="0" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Origine</Label><Input placeholder="Région de production" /></div>
                    <div className="space-y-2">
                      <Label>Saison</Label>
                      <Select><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>{SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewProduct(false)}>Annuler</Button>
                  <Button onClick={() => { toast.success('Produit ajouté'); setShowNewProduct(false); }}>Ajouter</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Product list */}
          <div className="space-y-3">
            {products.map(product => {
              const cat = CATEGORIES.find(c => c.id === product.category);
              const stockBadge = product.status === 'disponible'
                ? <Badge className="bg-green-100 text-green-800 text-xs">{product.stockQuantity} {product.unit}</Badge>
                : product.status === 'stock_bas'
                ? <Badge className="bg-yellow-100 text-yellow-800 text-xs">Stock bas ({product.stockQuantity})</Badge>
                : <Badge className="bg-red-100 text-red-800 text-xs">Rupture</Badge>;
              return (
                <Card key={product.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{cat?.emoji || '🌱'}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm">{product.name}</h4>
                            {stockBadge}
                            {product.organic && <Badge className="bg-green-50 text-green-700 text-[10px] border-green-200">🌿 Bio</Badge>}
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                            <span><MapPin className="w-3 h-3 inline" /> {product.origin}</span>
                            <span><Calendar className="w-3 h-3 inline" /> {product.season}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-bold text-primary">{product.pricePerUnit.toLocaleString()} GNF</p>
                        <p className="text-xs text-muted-foreground">/{product.unit}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* COMMANDES */}
        <TabsContent value="commandes" className="space-y-4">
          <h3 className="font-semibold">Commandes ({orders.length})</h3>
          <div className="space-y-3">
            {orders.map(order => {
              const st = ORDER_STATUS[order.status];
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{order.clientName}</h4>
                          <Badge className={st.color}>{st.label}</Badge>
                          <Badge variant="outline" className="text-xs">
                            {order.clientType === 'grossiste' ? '📦 Grossiste' : order.clientType === 'restaurant' ? '🍽️ Restaurant' : order.clientType === 'marche' ? '🏪 Marché' : '👤 Particulier'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.deliveryType === 'livraison' ? <><Truck className="w-3 h-3 inline" /> Livraison</> : <><MapPin className="w-3 h-3 inline" /> Collecte sur place</>}
                          {' • '}{order.date}
                        </p>
                      </div>
                      <p className="font-bold text-primary">{order.total.toLocaleString()} GNF</p>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {order.items.map((item, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{item.quantity} {item.unit} {item.product}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* CLIENTS */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Réseau de distribution</CardTitle>
              <CardDescription>Vos acheteurs réguliers et partenaires</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { type: 'Particuliers', icon: '👤', count: 45, color: 'bg-blue-100' },
                  { type: 'Restaurants', icon: '🍽️', count: 12, color: 'bg-orange-100' },
                  { type: 'Grossistes', icon: '📦', count: 8, color: 'bg-purple-100' },
                  { type: 'Marchés', icon: '🏪', count: 5, color: 'bg-green-100' },
                ].map(seg => (
                  <Card key={seg.type} className={`${seg.color} border-none`}>
                    <CardContent className="p-4 text-center">
                      <span className="text-3xl">{seg.icon}</span>
                      <p className="text-2xl font-bold mt-1">{seg.count}</p>
                      <p className="text-xs font-medium">{seg.type}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAISONS */}
        <TabsContent value="saisons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sun className="w-5 h-5 text-amber-500" /> Calendrier de production</CardTitle>
              <CardDescription>Disponibilité saisonnière de vos produits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['Saison sèche (Nov-Avr)', 'Saison des pluies (Mai-Oct)', "Toute l'année"].map(season => {
                  const seasonProducts = products.filter(p => p.season === season);
                  return (
                    <div key={season} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {season.includes('sèche') ? <Sun className="w-4 h-4 text-amber-500" /> :
                         season.includes('pluie') ? <CloudRain className="w-4 h-4 text-blue-500" /> :
                         <Calendar className="w-4 h-4 text-green-500" />}
                        <h4 className="font-semibold text-sm">{season}</h4>
                        <Badge variant="outline" className="text-xs">{seasonProducts.length} produits</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {seasonProducts.map(p => {
                          const cat = CATEGORIES.find(c => c.id === p.category);
                          return <Badge key={p.id} variant="secondary" className="text-xs">{cat?.emoji} {p.name}</Badge>;
                        })}
                        {seasonProducts.length === 0 && <p className="text-xs text-muted-foreground">Aucun produit pour cette saison</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
