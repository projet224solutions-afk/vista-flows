import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
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
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { 
  Package, 
  Search, 
  Eye, 
  Edit, 
  Ban, 
  Trash2, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Box 
} from 'lucide-react';

interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  total_stock?: number;
}

interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  lowStock: number;
  totalValue: number;
  totalStock: number;
}

interface VendorInfo {
  id: string;
  user_id: string;
}

interface ManageProductsSectionProps {
  agentId: string;
}

export default function ManageProductsSection({ agentId }: ManageProductsSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [stats, setStats] = useState<ProductStats>({
    total: 0,
    active: 0,
    inactive: 0,
    lowStock: 0,
    totalValue: 0,
    totalStock: 0
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('agent-get-products');
      
      if (error) throw error;
      
      if (data) {
        setProducts(data.products || []);
        setVendors(data.vendors || []);
        setStats(data.stats || {
          total: 0,
          active: 0,
          inactive: 0,
          lowStock: 0,
          totalValue: 0,
          totalStock: 0
        });
      }
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('agent-toggle-product-status', {
        body: { productId, currentStatus }
      });

      if (error) throw error;

      toast.success(`Produit ${!currentStatus ? 'activé' : 'désactivé'} avec succès`);
      await loadProducts();
    } catch (error) {
      console.error('Erreur modification statut:', error);
      toast.error('Erreur lors de la modification du statut');
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.functions.invoke('agent-delete-product', {
        body: { productId }
      });

      if (error) throw error;

      toast.success('Produit supprimé avec succès');
      setShowDeleteConfirm(null);
      await loadProducts();
    } catch (error) {
      console.error('Erreur suppression produit:', error);
      toast.error('Erreur lors de la suppression du produit');
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;
    
    try {
      const { error } = await supabase.functions.invoke('agent-update-product', {
        body: {
          productId: editingProduct.id,
          updates: {
            name: editingProduct.name,
            description: editingProduct.description,
            price: parseFloat(editingProduct.price.toString()) || 0,
            sku: editingProduct.sku,
            is_active: editingProduct.is_active
          }
        }
      });

      if (error) throw error;

      toast.success('Produit mis à jour avec succès');
      setEditingProduct(null);
      await loadProducts();
    } catch (error) {
      console.error('Erreur mise à jour produit:', error);
      toast.error('Erreur lors de la mise à jour du produit');
    }
  };

  const getVendorInfo = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? `ID: ${vendor.user_id.slice(0, 8)}...` : 'Vendeur inconnu';
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gestion des Produits</h2>
          <p className="text-muted-foreground mt-1">Administration des produits de la plateforme</p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">produits enregistrés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.active}
            </div>
            <p className="text-xs text-muted-foreground mt-1">en vente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats.inactive}
            </div>
            <p className="text-xs text-muted-foreground mt-1">suspendus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
            <Box className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {stats.totalStock.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">unités en stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock Bas</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats.lowStock}
            </div>
            <p className="text-xs text-muted-foreground mt-1">produits concernés</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valeur Totale</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.totalValue.toLocaleString('fr-FR')} GNF
            </div>
            <p className="text-xs text-muted-foreground mt-1">valeur catalogue</p>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Rechercher un produit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des produits */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Produits ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <Package className="w-10 h-10 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{product.name}</h3>
                      {product.sku && (
                        <Badge variant="outline" className="text-xs">
                          {product.sku}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Prix: {product.price.toLocaleString()} GNF</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Box className="w-3 h-3" />
                          Stock: <span className="font-medium text-foreground">{product.total_stock || 0}</span> unités
                        </span>
                        <span className="text-xs">Vendeur: {getVendorInfo(product.vendor_id)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {product.is_active ? (
                      <Badge className="bg-green-500">Actif</Badge>
                    ) : (
                      <Badge className="bg-red-500">Inactif</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setViewProduct(product)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingProduct({ ...product })}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleProductStatus(product.id, product.is_active)}
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(product.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun produit trouvé</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Détails Produit */}
      <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du Produit</DialogTitle>
          </DialogHeader>
          {viewProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nom</Label>
                  <p className="font-medium">{viewProduct.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">SKU</Label>
                  <p className="font-medium">{viewProduct.sku || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Prix</Label>
                  <p className="font-medium">{viewProduct.price.toLocaleString()} GNF</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Stock</Label>
                  <p className="font-medium">{viewProduct.total_stock || 0} unités</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vendeur</Label>
                  <p className="font-medium">{getVendorInfo(viewProduct.vendor_id)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Statut</Label>
                  <Badge className={viewProduct.is_active ? "bg-green-500" : "bg-red-500"}>
                    {viewProduct.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date de création</Label>
                  <p className="font-medium">
                    {new Date(viewProduct.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              {viewProduct.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{viewProduct.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Édition Produit */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le Produit</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Prix (GNF)</Label>
                  <Input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editingProduct.is_active}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">Produit actif</Label>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Confirmation Suppression */}
      <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteConfirm && deleteProduct(showDeleteConfirm)}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
