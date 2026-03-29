/**
 * MODULE MAISON & DÃ‰CO PROFESSIONNEL
 * InspirÃ© de: IKEA, Wayfair, Made.com, Houzz
 * Gestion catalogue, projets de dÃ©coration, commandes et showroom
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Home, Sofa, Lamp, Bed, DollarSign, Package,
  Plus, ShoppingCart, TrendingUp, Eye, Star,
  Palette, Ruler, Users, CheckCircle, Clock,
  Image, MapPin
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface HomeDecorModuleProps {
  serviceId: string;
  businessName?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image?: string;
  dimensions?: string;
  material?: string;
  status: 'en_stock' | 'stock_bas' | 'rupture' | 'sur_commande';
}

interface DecoProject {
  id: string;
  clientName: string;
  clientPhone: string;
  roomType: string;
  style: string;
  budget: number;
  status: 'consultation' | 'devis' | 'en_cours' | 'livre' | 'termine';
  startDate: string;
  progress: number;
}

interface Order {
  id: string;
  customerName: string;
  items: number;
  total: number;
  status: 'pending' | 'preparing' | 'shipped' | 'delivered';
  date: string;
}

const CATEGORIES = [
  { id: 'furniture', name: 'Meubles', icon: Sofa, count: 45, color: 'from-amber-500 to-orange-500' },
  { id: 'lighting', name: 'Ã‰clairage', icon: Lamp, count: 32, color: 'from-yellow-400 to-amber-500' },
  { id: 'bedroom', name: 'Chambre', icon: Bed, count: 28, color: 'from-blue-500 to-indigo-500' },
  { id: 'decor', name: 'DÃ©coration', icon: Home, count: 52, color: 'from-pink-500 to-rose-500' },
  { id: 'kitchen', name: 'Cuisine', icon: Package, count: 18, color: 'from-primary-blue-500 to-primary-orange-500' },
  { id: 'textiles', name: 'Textiles', icon: Palette, count: 24, color: 'from-purple-500 to-violet-500' },
];

const ROOM_TYPES = ['Salon', 'Chambre', 'Cuisine', 'Salle de bain', 'Bureau', 'Terrasse', 'EntrÃ©e'];
const STYLES = ['Moderne', 'Traditionnel', 'Scandinave', 'BohÃ¨me', 'Industriel', 'Art DÃ©co', 'Minimaliste'];

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  consultation: { label: 'Consultation', color: 'bg-blue-100 text-blue-800' },
  devis: { label: 'Devis envoyÃ©', color: 'bg-yellow-100 text-yellow-800' },
  en_cours: { label: 'En cours', color: 'bg-purple-100 text-purple-800' },
  livre: { label: 'LivrÃ©', color: 'bg-primary-blue-100 text-primary-blue-800' },
  termine: { label: 'TerminÃ©', color: 'bg-primary-orange-100 text-primary-orange-800' },
};

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  preparing: { label: 'PrÃ©paration', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'ExpÃ©diÃ©', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'LivrÃ©', color: 'bg-primary-orange-100 text-primary-orange-800' },
};

export function HomeDecorModule({ serviceId, businessName }: HomeDecorModuleProps) {
  const [activeTab, setActiveTab] = useState('catalog');
  const [showNewProject, setShowNewProject] = useState(false);

  const [products] = useState<Product[]>([
    { id: '1', name: 'CanapÃ© 3 places Abidjan', category: 'furniture', price: 2500000, stock: 5, dimensions: '220x90x85 cm', material: 'Tissu + Bois massif', status: 'en_stock' },
    { id: '2', name: 'Lampe suspension bambou', category: 'lighting', price: 180000, stock: 12, material: 'Bambou tressÃ©', status: 'en_stock' },
    { id: '3', name: 'Table basse manguier', category: 'furniture', price: 850000, stock: 2, dimensions: '120x60x45 cm', material: 'Bois de manguier', status: 'stock_bas' },
    { id: '4', name: 'Tapis berbÃ¨re 200x300', category: 'textiles', price: 650000, stock: 0, dimensions: '200x300 cm', material: 'Laine naturelle', status: 'rupture' },
    { id: '5', name: 'Lit king-size Confort+', category: 'bedroom', price: 3200000, stock: 3, dimensions: '180x200 cm', material: 'Bois massif + cuir', status: 'en_stock' },
    { id: '6', name: 'Vase artisanal cÃ©ramique', category: 'decor', price: 85000, stock: 20, material: 'CÃ©ramique faite main', status: 'en_stock' },
  ]);

  const [projects] = useState<DecoProject[]>([
    { id: '1', clientName: 'Mme Diallo', clientPhone: '+224 621 00 00 00', roomType: 'Salon', style: 'Moderne', budget: 15000000, status: 'en_cours', startDate: '2026-03-01', progress: 65 },
    { id: '2', clientName: 'M. Camara', clientPhone: '+224 622 00 00 00', roomType: 'Chambre', style: 'Scandinave', budget: 8000000, status: 'devis', startDate: '2026-03-10', progress: 15 },
    { id: '3', clientName: 'HÃ´tel Riviera', clientPhone: '+224 623 00 00 00', roomType: 'Hall d\'entrÃ©e', style: 'Art DÃ©co', budget: 35000000, status: 'consultation', startDate: '2026-03-15', progress: 5 },
  ]);

  const [orders] = useState<Order[]>([
    { id: '1', customerName: 'Aissatou Bah', items: 3, total: 3530000, status: 'preparing', date: '2026-03-18' },
    { id: '2', customerName: 'Mohamed Sylla', items: 1, total: 2500000, status: 'shipped', date: '2026-03-17' },
    { id: '3', customerName: 'Fatoumata Sow', items: 5, total: 1200000, status: 'delivered', date: '2026-03-15' },
  ]);

  // Stats
  const totalProducts = products.length;
  const lowStock = products.filter(p => p.status === 'stock_bas' || p.status === 'rupture').length;
  const totalCatalogValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const activeProjects = projects.filter(p => p.status === 'en_cours').length;
  const orderRevenue = orders.reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
            <Home className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{businessName || 'Maison & DÃ©co'}</h2>
            <p className="text-muted-foreground">Showroom & DÃ©coration d'intÃ©rieur</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          <Package className="w-3 h-3" />
          {totalProducts} articles
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <Package className="h-4 w-4 text-primary mb-1" />
            <p className="text-2xl font-bold">{totalProducts}</p>
            <p className="text-xs text-muted-foreground">Articles en catalogue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <DollarSign className="h-4 w-4 text-primary-orange-500 mb-1" />
            <p className="text-lg font-bold">{(totalCatalogValue / 1e6).toFixed(1)}M</p>
            <p className="text-xs text-muted-foreground">Valeur stock GNF</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Palette className="h-4 w-4 text-purple-500 mb-1" />
            <p className="text-2xl font-bold">{activeProjects}</p>
            <p className="text-xs text-muted-foreground">Projets dÃ©co actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <ShoppingCart className="h-4 w-4 text-blue-500 mb-1" />
            <p className="text-lg font-bold">{(orderRevenue / 1e6).toFixed(1)}M</p>
            <p className="text-xs text-muted-foreground">Ventes GNF</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className={`h-4 w-4 mb-1 ${lowStock > 0 ? 'text-red-500' : 'text-primary-orange-500'}`} />
            <p className="text-2xl font-bold">{lowStock}</p>
            <p className="text-xs text-muted-foreground">Alertes stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="catalog"><Package className="h-4 w-4 mr-1 hidden sm:inline" /> Catalogue</TabsTrigger>
          <TabsTrigger value="projects"><Palette className="h-4 w-4 mr-1 hidden sm:inline" /> Projets DÃ©co</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-1 hidden sm:inline" /> Commandes</TabsTrigger>
          <TabsTrigger value="showroom"><Image className="h-4 w-4 mr-1 hidden sm:inline" /> Showroom</TabsTrigger>
        </TabsList>

        {/* CATALOGUE */}
        <TabsContent value="catalog" className="space-y-4">
          {/* Categories grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <Card key={cat.id} className="cursor-pointer hover:shadow-md transition-all group">
                  <CardContent className="p-3 text-center">
                    <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium">{cat.name}</p>
                    <p className="text-[10px] text-muted-foreground">{cat.count} articles</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Product list */}
          <div className="space-y-3">
            {products.map(product => {
              const stockBadge = product.status === 'en_stock'
                ? <Badge className="bg-primary-orange-100 text-primary-orange-800 text-xs">En stock ({product.stock})</Badge>
                : product.status === 'stock_bas'
                ? <Badge className="bg-yellow-100 text-yellow-800 text-xs">Stock bas ({product.stock})</Badge>
                : <Badge className="bg-red-100 text-red-800 text-xs">Rupture</Badge>;
              return (
                <Card key={product.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{product.name}</h4>
                          {stockBadge}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          {product.dimensions && <span>ðŸ“ {product.dimensions}</span>}
                          {product.material && <span>ðŸªµ {product.material}</span>}
                        </div>
                      </div>
                      <p className="font-bold text-primary shrink-0 ml-4">{product.price.toLocaleString()} GNF</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* PROJETS DÃ‰CO */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Projets de dÃ©coration ({projects.length})</h3>
            <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau projet</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouveau projet de dÃ©coration</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Client</Label><Input placeholder="Nom du client" /></div>
                    <div className="space-y-2"><Label>TÃ©lÃ©phone</Label><Input placeholder="+224 6XX XX XX XX" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PiÃ¨ce</Label>
                      <Select><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>{ROOM_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <Select><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>{STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Budget (GNF)</Label><Input type="number" placeholder="0" /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="PrÃ©fÃ©rences du client..." /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewProject(false)}>Annuler</Button>
                  <Button onClick={() => { toast.success('Projet crÃ©Ã©'); setShowNewProject(false); }}>CrÃ©er</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {projects.map(project => {
              const st = STATUS_STYLES[project.status];
              return (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{project.clientName}</h4>
                          <Badge className={st.color}>{st.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">ðŸ  {project.roomType} â€¢ ðŸŽ¨ Style {project.style}</p>
                      </div>
                      <p className="font-bold text-primary">{project.budget.toLocaleString()} GNF</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progression</span>
                        <span className="font-bold">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* COMMANDES */}
        <TabsContent value="orders" className="space-y-4">
          <h3 className="font-semibold">Commandes rÃ©centes ({orders.length})</h3>
          <div className="space-y-3">
            {orders.map(order => {
              const st = ORDER_STATUS[order.status];
              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{order.customerName}</h4>
                          <Badge className={st.color}>{st.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{order.items} article(s) â€¢ {order.date}</p>
                      </div>
                      <p className="font-bold text-primary">{order.total.toLocaleString()} GNF</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* SHOWROOM */}
        <TabsContent value="showroom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Image className="w-5 h-5" /> Showroom Virtuel</CardTitle>
              <CardDescription>PrÃ©sentez vos rÃ©alisations et inspirations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['Salon Moderne', 'Chambre Cosy', 'Cuisine Ouverte', 'Terrasse Zen', 'Bureau Design', 'Salle de Bain Luxe'].map((room, i) => (
                  <div key={room} className="aspect-[4/3] rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center cursor-pointer hover:shadow-md transition-all group border-2 border-dashed border-muted-foreground/20 hover:border-primary/30">
                    <div className="text-center">
                      <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      <p className="text-sm font-medium text-muted-foreground">{room}</p>
                      <p className="text-xs text-muted-foreground/60">Ajouter des photos</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
