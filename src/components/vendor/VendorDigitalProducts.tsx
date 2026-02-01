/**
 * Gestion des produits numériques du vendeur
 * Optimisé mobile-first
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, Plus, Eye, Edit, Trash2, ExternalLink, 
  Laptop, FileText, BookOpen, Plane, Box, Loader2
} from "lucide-react";
import { useMerchantDigitalProducts, DigitalProduct } from "@/hooks/useDigitalProducts";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DigitalProductForm } from "@/components/digital-products/DigitalProductForm";

const categoryIcons: Record<string, React.ComponentType<any>> = {
  voyage: Plane,
  logiciel: Laptop,
  formation: FileText,
  livre: BookOpen,
  dropshipping: Box,
  custom: Package,
};

const categoryColors: Record<string, string> = {
  voyage: "bg-accent text-accent-foreground",
  logiciel: "bg-accent text-accent-foreground",
  formation: "bg-accent text-accent-foreground",
  livre: "bg-accent text-accent-foreground",
  dropshipping: "bg-accent text-accent-foreground",
  custom: "bg-accent text-accent-foreground",
};

const statusColors: Record<string, string> = {
  published: "bg-primary text-primary-foreground",
  draft: "bg-muted text-foreground",
  pending: "bg-secondary text-secondary-foreground",
  rejected: "bg-destructive text-destructive-foreground",
  archived: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  published: "Publié",
  draft: "Brouillon",
  pending: "En attente",
  rejected: "Rejeté",
  archived: "Archivé",
};

export default function VendorDigitalProducts() {
  const navigate = useNavigate();
  const { products, loading, refresh } = useMerchantDigitalProducts();
  const [deleteProduct, setDeleteProduct] = useState<DigitalProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DigitalProduct | null>(null);

  const handleDelete = async () => {
    if (!deleteProduct) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('digital_products')
        .delete()
        .eq('id', deleteProduct.id);
      
      if (error) throw error;
      
      toast.success("Produit supprimé avec succès");
      refresh();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast.error("Impossible de supprimer le produit");
    } finally {
      setIsDeleting(false);
      setDeleteProduct(null);
    }
  };

  const formatPrice = (price: number, currency: string = 'GNF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(price);
  };

  if (editingProduct) {
    return (
      <DigitalProductForm
        category={editingProduct.category as any}
        mode="edit"
        initialProduct={editingProduct}
        onBack={() => setEditingProduct(null)}
        onSuccess={() => {
          setEditingProduct(null);
          refresh();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-foreground">Produits Numériques</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gérez vos produits numériques et affiliations
          </p>
        </div>
        <Button onClick={() => navigate('/digital-products')} className="w-full sm:w-auto gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un produit
        </Button>
      </div>

      {/* Stats rapides - Compact sur mobile */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="text-lg sm:text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground truncate">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {products.filter(p => p.status === 'published').length}
            </div>
            <p className="text-xs text-muted-foreground truncate">Publiés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="text-lg sm:text-2xl font-bold text-purple-600">
              {products.filter(p => p.product_mode === 'affiliate').length}
            </div>
            <p className="text-xs text-muted-foreground truncate">Affiliations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">
              {products.reduce((sum, p) => sum + (p.views_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground truncate">Vues</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des produits */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Aucun produit numérique</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm px-4">
              Commencez à vendre des produits numériques ou à promouvoir des affiliations
            </p>
            <Button onClick={() => navigate('/digital-products')} className="gap-2">
              <Plus className="w-4 h-4" />
              Créer mon premier produit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-3">
          {products.map((product) => {
            const CategoryIcon = categoryIcons[product.category] || Package;
            const mainImage = product.images?.[0] || '/placeholder.svg';
            
            return (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Image - Plus compacte sur mobile */}
                <div className="relative h-32 sm:h-40 bg-muted">
                  <img
                    src={mainImage}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  {/* Badges positionnés */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge className={`text-[10px] px-1.5 py-0.5 ${categoryColors[product.category] || categoryColors.custom}`}>
                      <CategoryIcon className="w-3 h-3 mr-1" />
                      {product.category}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className={`text-[10px] px-1.5 py-0.5 ${statusColors[product.status] || statusColors.draft}`}>
                      {statusLabels[product.status] || product.status}
                    </Badge>
                  </div>
                  {product.product_mode === 'affiliate' && (
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="outline" className="bg-white/90 text-[10px] px-1.5 py-0.5">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Affiliation
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content - Compact sur mobile */}
                <CardContent className="p-3 sm:p-4">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-1 mb-1">
                    {product.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2 sm:mb-3">
                    {product.short_description || product.description || 'Aucune description'}
                  </p>

                  {/* Prix */}
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div>
                      {product.price > 0 ? (
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className="font-bold text-base sm:text-lg text-primary">
                            {formatPrice(product.price, product.currency)}
                          </span>
                          {product.original_price && product.original_price > product.price && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(product.original_price, product.currency)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-bold text-base sm:text-lg text-green-600">Gratuit</span>
                      )}
                    </div>
                    {product.product_mode === 'affiliate' && product.commission_rate > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {product.commission_rate}%
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {product.views_count || 0} vues
                    </span>
                    <span className="truncate">
                      {formatDistanceToNow(new Date(product.created_at), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </span>
                  </div>

                  {/* Actions - Layout optimisé mobile */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs sm:text-sm"
                      onClick={() => navigate(`/digital-product/${product.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1.5" />
                      Voir
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setEditingProduct(product)}
                      aria-label="Modifier le produit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setDeleteProduct(product)}
                      aria-label="Supprimer le produit"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le produit "{deleteProduct?.title}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
