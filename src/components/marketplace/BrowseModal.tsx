/**
 * BROWSE MODAL - Fenêtre de navigation rapide
 * Affiche catégories, produits récents, vendeurs et fournisseurs certifiés
 */
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Store, ShieldCheck, LayoutGrid, Star, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LocalPrice } from "@/components/ui/LocalPrice";

interface BrowseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCategory: (categoryId: string) => void;
  onSelectProduct: (productId: string) => void;
  onSelectVendor: (vendorId: string) => void;
  categories: { id: string; name: string; image_url?: string; is_active: boolean }[];
}

interface VendorItem {
  id: string;
  business_name: string;
  logo_url?: string;
  country?: string;
  is_certified?: boolean;
  rating?: number;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  currency?: string;
  images?: string[];
}

export function BrowseModal({
  open,
  onOpenChange,
  onSelectCategory,
  onSelectProduct,
  onSelectVendor,
  categories,
}: BrowseModalProps) {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [certifiedVendors, setCertifiedVendors] = useState<VendorItem[]>([]);
  const [recentProducts, setRecentProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    Promise.all([
      // Vendeurs actifs
      (supabase
        .from("vendors")
        .select("id, business_name, logo_url, country, rating")
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .limit(20) as any),
      // Fournisseurs certifiés
      (supabase
        .from("vendors")
        .select("id, business_name, logo_url, country, rating")
        .eq("is_active", true)
        .eq("is_verified", true)
        .order("rating", { ascending: false })
        .limit(10) as any),
      // Produits récents
      (supabase
        .from("products")
        .select("id, name, price, images")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12) as any),
    ]).then(([vendorsRes, certifiedRes, productsRes]) => {
      setVendors((vendorsRes.data as VendorItem[] | null) || []);
      setCertifiedVendors((certifiedRes.data as VendorItem[] | null) || []);
      setRecentProducts((productsRes.data as ProductItem[] | null) || []);
      setLoading(false);
    });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-h-[85vh] p-0 gap-0" style={{ maxWidth: '768px' }}>
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl font-bold">Explorer le Marketplace</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="categories" className="w-full">
          <div className="px-4 sm:px-6 pb-3 sm:pb-4 overflow-x-auto">
            <TabsList className="inline-flex h-10 sm:h-11 w-full bg-muted/60 rounded-xl p-1 gap-1">
              <TabsTrigger value="categories" className="flex-1 min-w-0 text-[11px] sm:text-sm gap-1 sm:gap-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all px-2 sm:px-3 whitespace-nowrap">
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">Catégories</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="flex-1 min-w-0 text-[11px] sm:text-sm gap-1 sm:gap-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all px-2 sm:px-3 whitespace-nowrap">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">Produits</span>
              </TabsTrigger>
              <TabsTrigger value="vendors" className="flex-1 min-w-0 text-[11px] sm:text-sm gap-1 sm:gap-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all px-2 sm:px-3 whitespace-nowrap">
                <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">Vendeurs</span>
              </TabsTrigger>
              <TabsTrigger value="certified" className="flex-1 min-w-0 text-[11px] sm:text-sm gap-1 sm:gap-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium transition-all px-2 sm:px-3 whitespace-nowrap">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">Certifiés</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[55vh] px-6 pb-6">
            {/* CATÉGORIES */}
            <TabsContent value="categories" className="mt-0 space-y-2">
              {categories.filter(c => c.id !== "all").map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { onSelectCategory(cat.id); onOpenChange(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-accent/50 transition-all text-left group"
                >
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <LayoutGrid className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <span className="flex-1 font-medium text-sm text-foreground">{cat.name}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
              {categories.filter(c => c.id !== "all").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune catégorie disponible</p>
              )}
            </TabsContent>

            {/* PRODUITS RÉCENTS */}
            <TabsContent value="products" className="mt-0">
              <div className="grid grid-cols-2 gap-2">
                {recentProducts.map((product) => {
                  const img = Array.isArray(product.images) ? product.images[0] : undefined;
                  return (
                    <button
                      key={product.id}
                      onClick={() => { onSelectProduct(product.id); onOpenChange(false); }}
                      className="flex flex-col rounded-xl border border-border/50 hover:border-primary/40 hover:shadow-md transition-all overflow-hidden text-left group"
                    >
                      <div className="h-28 bg-muted flex items-center justify-center overflow-hidden">
                        {img ? (
                          <img src={img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <Package className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="p-2.5 space-y-1">
                        <p className="text-xs font-medium line-clamp-1 text-foreground">{product.name}</p>
                        <LocalPrice amount={product.price} currency={product.currency || 'GNF'} size="sm" className="text-xs font-bold" />
                      </div>
                    </button>
                  );
                })}
              </div>
              {recentProducts.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun produit disponible</p>
              )}
            </TabsContent>

            {/* VENDEURS */}
            <TabsContent value="vendors" className="mt-0 space-y-2">
              {vendors.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { onSelectVendor(v.id); onOpenChange(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-accent/50 transition-all text-left group"
                >
                  {v.logo_url ? (
                    <img src={v.logo_url} alt={v.business_name} className="w-10 h-10 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{v.business_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {v.country && <span className="text-[11px] text-muted-foreground">{v.country}</span>}
                      {(v.rating ?? 0) > 0 && (
                        <span className="text-[11px] text-amber-600 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {(v.rating ?? 0).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  {v.is_certified && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      <ShieldCheck className="w-3 h-3 mr-0.5" /> Certifié
                    </Badge>
                  )}
                </button>
              ))}
              {vendors.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun vendeur disponible</p>
              )}
            </TabsContent>

            {/* FOURNISSEURS CERTIFIÉS */}
            <TabsContent value="certified" className="mt-0 space-y-2">
              {certifiedVendors.length > 0 ? certifiedVendors.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { onSelectVendor(v.id); onOpenChange(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20 hover:border-green-400 hover:shadow-md transition-all text-left group"
                >
                  {v.logo_url ? (
                    <img src={v.logo_url} alt={v.business_name} className="w-10 h-10 rounded-full object-cover border-2 border-green-300" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{v.business_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {v.country && <span className="text-[11px] text-muted-foreground">{v.country}</span>}
                      {(v.rating ?? 0) > 0 && (
                        <span className="text-[11px] text-amber-600 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {(v.rating ?? 0).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white text-[10px] shrink-0">
                    <ShieldCheck className="w-3 h-3 mr-0.5" /> Certifié
                  </Badge>
                </button>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun fournisseur certifié pour le moment</p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
