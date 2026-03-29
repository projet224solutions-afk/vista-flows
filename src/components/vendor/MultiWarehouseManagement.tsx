// @ts-nocheck
/**
 * Gestion Multi-EntrepÃ´ts & Multi-POS
 * 224SOLUTIONS - Interface vendeur professionnelle
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Warehouse, 
  Store, 
  MapPin, 
  Plus, 
  ArrowRightLeft, 
  AlertTriangle, 
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Star,
  Eye,
  Phone,
  Mail,
  User,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  ChevronRight,
  Building2,
  ShoppingBag,
  AlertCircle
} from 'lucide-react';
import { useMultiWarehouse, VendorLocation, StockTransfer, CreateLocationInput, CreateTransferInput } from '@/hooks/useMultiWarehouse';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Composant pour les stats d'un lieu
function LocationStatsCard({ stats }: { stats: any }) {
  if (!stats) return null;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      <div className="text-center p-2 bg-muted/50 rounded-lg">
        <p className="text-2xl font-bold text-primary">{stats.total_products || 0}</p>
        <p className="text-xs text-muted-foreground">Produits</p>
      </div>
      <div className="text-center p-2 bg-muted/50 rounded-lg">
        <p className="text-2xl font-bold">{stats.total_quantity || 0}</p>
        <p className="text-xs text-muted-foreground">UnitÃ©s</p>
      </div>
      <div className="text-center p-2 bg-muted/50 rounded-lg">
        <p className="text-2xl font-bold text-amber-600">{stats.low_stock_count || 0}</p>
        <p className="text-xs text-muted-foreground">Stock bas</p>
      </div>
      <div className="text-center p-2 bg-muted/50 rounded-lg">
        <p className="text-2xl font-bold text-red-600">{stats.out_of_stock_count || 0}</p>
        <p className="text-xs text-muted-foreground">Rupture</p>
      </div>
    </div>
  );
}

// Carte d'un lieu (entrepÃ´t ou POS)
function LocationCard({ 
  location, 
  onEdit, 
  onDelete, 
  onTogglePOS, 
  onSetDefault,
  onViewStock 
}: { 
  location: VendorLocation;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePOS: () => void;
  onSetDefault: () => void;
  onViewStock: () => void;
}) {
  const isPos = location.is_pos_enabled;
  
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-lg",
      isPos && "border-primary-orange-500/50 bg-primary-blue-50/30 dark:bg-primary-orange-950/20",
      location.is_default && "ring-2 ring-primary"
    )}>
      {/* Badge type */}
      <div className="absolute top-3 right-3 flex gap-2">
        {location.is_default && (
          <Badge variant="default" className="bg-primary">
            <Star className="w-3 h-3 mr-1" />
            Par dÃ©faut
          </Badge>
        )}
        <Badge variant={isPos ? "default" : "secondary"} className={cn(
          isPos && "bg-primary-orange-600"
        )}>
          {isPos ? (
            <>
              <Store className="w-3 h-3 mr-1" />
              POS
            </>
          ) : (
            <>
              <Warehouse className="w-3 h-3 mr-1" />
              EntrepÃ´t
            </>
          )}
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-3 rounded-xl",
            isPos ? "bg-primary-orange-100 dark:bg-primary-orange-900/50" : "bg-blue-100 dark:bg-blue-900/50"
          )}>
            {isPos ? (
              <Store className={cn("w-6 h-6", isPos ? "text-primary-orange-600" : "text-blue-600")} />
            ) : (
              <Warehouse className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate pr-20">{location.name}</CardTitle>
            {location.code && (
              <p className="text-sm text-muted-foreground font-mono">{location.code}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Adresse */}
        {(location.address || location.city) && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="line-clamp-2">
              {[location.address, location.city, location.country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}

        {/* Manager */}
        {location.manager_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4 shrink-0" />
            <span>{location.manager_name}</span>
            {location.manager_phone && (
              <span className="text-xs">â€¢ {location.manager_phone}</span>
            )}
          </div>
        )}

        {/* Stats */}
        <LocationStatsCard stats={location.stats} />

        {/* Transferts en attente */}
        {(location.stats?.pending_transfers_in > 0 || location.stats?.pending_transfers_out > 0) && (
          <div className="flex gap-2 pt-2">
            {location.stats?.pending_transfers_in > 0 && (
              <Badge variant="outline" className="text-blue-600">
                <Truck className="w-3 h-3 mr-1" />
                {location.stats.pending_transfers_in} entrÃ©e(s)
              </Badge>
            )}
            {location.stats?.pending_transfers_out > 0 && (
              <Badge variant="outline" className="text-orange-600">
                <Truck className="w-3 h-3 mr-1" />
                {location.stats.pending_transfers_out} sortie(s)
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-3 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={onViewStock}
        >
          <Eye className="w-4 h-4 mr-1" />
          Stock
        </Button>
        
        <Button
          variant={isPos ? "secondary" : "default"}
          size="sm"
          onClick={onTogglePOS}
          className={cn(
            "flex-1",
            isPos ? "bg-primary-orange-100 text-primary-orange-700 hover:bg-primary-orange-100" : ""
          )}
        >
          <Store className="w-4 h-4 mr-1" />
          {isPos ? 'DÃ©sactiver POS' : 'Activer POS'}
        </Button>

        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>

        {!location.is_default && (
          <Button variant="ghost" size="icon" onClick={onSetDefault}>
            <Star className="w-4 h-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// Badge de statut de transfert
function TransferStatusBadge({ status }: { status: string }) {
  const config = {
    pending: { label: 'En attente', color: 'bg-gray-100 text-gray-700', icon: Clock },
    in_transit: { label: 'En transit', color: 'bg-blue-100 text-blue-700', icon: Truck },
    delivered: { label: 'LivrÃ©', color: 'bg-purple-100 text-purple-700', icon: Package },
    completed: { label: 'ComplÃ©tÃ©', color: 'bg-primary-orange-100 text-primary-orange-700', icon: CheckCircle2 },
    partial: { label: 'Partiel', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
    cancelled: { label: 'AnnulÃ©', color: 'bg-red-100 text-red-700', icon: XCircle },
  }[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };

  const Icon = config.icon;

  return (
    <Badge className={cn("font-medium", config.color)}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

// Composant principal
export default function MultiWarehouseManagement() {
  const {
    locations,
    warehouses,
    posLocations,
    transfers,
    pendingTransfers,
    inTransitTransfers,
    losses,
    totalLossValue,
    loading,
    createLocation,
    updateLocation,
    deleteLocation,
    togglePOS,
    setDefaultLocation,
    getLocationStock,
    createTransfer,
    shipTransfer,
    confirmTransferReception,
    cancelTransfer,
    refresh
  } = useMultiWarehouse();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('locations');
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Selected items
  const [selectedLocation, setSelectedLocation] = useState<VendorLocation | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [locationStock, setLocationStock] = useState<any[]>([]);
  
  // Form states
  const [newLocation, setNewLocation] = useState<CreateLocationInput>({
    name: '',
    code: '',
    location_type: 'warehouse',
    address: '',
    city: '',
    manager_name: '',
    manager_phone: '',
  });

  const [transferForm, setTransferForm] = useState<CreateTransferInput>({
    from_location_id: '',
    to_location_id: '',
    items: [],
    notes: ''
  });

  // Charger le stock d'un lieu
  const handleViewStock = async (location: VendorLocation) => {
    setSelectedLocation(location);
    const stock = await getLocationStock(location.id);
    setLocationStock(stock);
    setShowStockDialog(true);
  };

  // CrÃ©er un nouveau lieu
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createLocation(newLocation);
    if (result) {
      setShowCreateDialog(false);
      setNewLocation({
        name: '',
        code: '',
        location_type: 'warehouse',
        address: '',
        city: '',
        manager_name: '',
        manager_phone: '',
      });
    }
  };

  // Toggle POS
  const handleTogglePOS = async (location: VendorLocation) => {
    await togglePOS(location.id, !location.is_pos_enabled);
  };

  // CrÃ©er un transfert
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.items.length === 0) {
      toast({
        title: "Erreur",
        description: "Ajoutez au moins un produit au transfert",
        variant: "destructive"
      });
      return;
    }
    const result = await createTransfer(transferForm);
    if (result) {
      setShowTransferDialog(false);
      setTransferForm({
        from_location_id: '',
        to_location_id: '',
        items: [],
        notes: ''
      });
    }
  };

  // ExpÃ©dier un transfert
  const handleShipTransfer = async (transfer: StockTransfer) => {
    if (window.confirm(`ExpÃ©dier le transfert ${transfer.transfer_number} ?\n\nLe stock sera immÃ©diatement retirÃ© de l'entrepÃ´t source.`)) {
      await shipTransfer(transfer.id);
    }
  };

  // Confirmer rÃ©ception
  const handleConfirmReception = async () => {
    if (!selectedTransfer) return;
    
    // Pour simplifier, on confirme tout comme reÃ§u
    const items = selectedTransfer.items?.map(item => ({
      product_id: item.product_id,
      quantity_received: item.quantity_sent,
    })) || [];

    await confirmTransferReception({
      transfer_id: selectedTransfer.id,
      items
    });
    
    setShowConfirmDialog(false);
    setSelectedTransfer(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Chargement du systÃ¨me multi-entrepÃ´ts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* En-tÃªte */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Gestion Multi-Sites</h1>
              <p className="text-muted-foreground">
                {locations.length} lieu(x) â€¢ {posLocations.length} POS actif(s)
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={() => refresh()} className="flex-1 md:flex-none">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 md:flex-none">
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Transfert
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex-1 md:flex-none bg-primary hover:bg-primary/90 shadow-lg shadow-primary/40">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Lieu
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Alertes */}
      {pendingTransfers.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <Truck className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">Transferts en attente</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            {pendingTransfers.length} transfert(s) en attente d'expÃ©dition
          </AlertDescription>
        </Alert>
      )}

      {inTransitTransfers.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Truck className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Transferts en transit</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            {inTransitTransfers.length} transfert(s) en cours de livraison - Ã€ confirmer Ã  la rÃ©ception
          </AlertDescription>
        </Alert>
      )}

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="locations" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden md:inline">Lieux</span>
            <Badge variant="secondary" className="ml-1">{locations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="transfers" className="gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            <span className="hidden md:inline">Transferts</span>
            <Badge variant="secondary" className="ml-1">{transfers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pos" className="gap-2">
            <Store className="w-4 h-4" />
            <span className="hidden md:inline">Points de vente</span>
            <Badge variant="secondary" className="ml-1">{posLocations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="losses" className="gap-2">
            <TrendingDown className="w-4 h-4" />
            <span className="hidden md:inline">Pertes</span>
            <Badge variant="secondary" className="ml-1">{losses.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Lieux */}
        <TabsContent value="locations" className="space-y-4">
          {locations.length === 0 ? (
            <Card className="p-12 text-center">
              <Warehouse className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucun lieu configurÃ©</h3>
              <p className="text-muted-foreground mb-4">
                CrÃ©ez votre premier entrepÃ´t ou point de vente pour commencer
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                CrÃ©er un lieu
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  onEdit={() => {
                    setSelectedLocation(location);
                    setNewLocation({
                      name: location.name,
                      code: location.code || '',
                      location_type: location.location_type,
                      address: location.address || '',
                      city: location.city || '',
                      manager_name: location.manager_name || '',
                      manager_phone: location.manager_phone || '',
                    });
                    setShowCreateDialog(true);
                  }}
                  onDelete={() => {
                    if (window.confirm(`Supprimer "${location.name}" ?`)) {
                      deleteLocation(location.id);
                    }
                  }}
                  onTogglePOS={() => handleTogglePOS(location)}
                  onSetDefault={() => setDefaultLocation(location.id)}
                  onViewStock={() => handleViewStock(location)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Transferts */}
        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Historique des transferts</CardTitle>
                  <CardDescription>
                    GÃ©rez les mouvements de stock entre vos diffÃ©rents lieux
                  </CardDescription>
                </div>
                <Button onClick={() => setShowTransferDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau transfert
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {transfers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun transfert effectuÃ©</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transfers.map((transfer) => (
                    <Card key={transfer.id} className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <ArrowRightLeft className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{transfer.transfer_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {transfer.from_location?.name} â†’ {transfer.to_location?.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium">{transfer.total_items || transfer.total_quantity_sent || 0} article(s)</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(transfer.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </p>
                          </div>
                          <TransferStatusBadge status={transfer.status} />
                        </div>

                        <div className="flex gap-2">
                          {transfer.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleShipTransfer(transfer)}
                              >
                                <Truck className="w-4 h-4 mr-1" />
                                ExpÃ©dier
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => cancelTransfer(transfer.id)}
                              >
                                Annuler
                              </Button>
                            </>
                          )}
                          {transfer.status === 'in_transit' && (
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedTransfer(transfer);
                                setShowConfirmDialog(true);
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Confirmer rÃ©ception
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* DÃ©tails des items */}
                      {transfer.items && transfer.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex flex-wrap gap-2">
                            {transfer.items.slice(0, 3).map((item) => (
                              <Badge key={item.id} variant="outline">
                                {item.product?.name || 'Produit'} Ã— {item.quantity_sent}
                              </Badge>
                            ))}
                            {transfer.items.length > 3 && (
                              <Badge variant="secondary">
                                +{transfer.items.length - 3} autres
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: POS */}
        <TabsContent value="pos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary-orange-600" />
                Points de vente actifs
              </CardTitle>
              <CardDescription>
                Les lieux avec POS activÃ© peuvent effectuer des ventes directes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {posLocations.length === 0 ? (
                <div className="text-center py-8">
                  <Store className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Aucun point de vente activÃ©</p>
                  <p className="text-sm text-muted-foreground">
                    Activez le POS sur un entrepÃ´t pour commencer Ã  vendre
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {posLocations.map((location) => (
                    <Card key={location.id} className="border-primary-orange-200 bg-primary-blue-50/50 dark:bg-primary-orange-950/20">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Store className="w-5 h-5 text-primary-orange-600" />
                            <span className="font-semibold">{location.name}</span>
                          </div>
                          <Badge className="bg-primary-orange-600">Actif</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {location.address && (
                            <p className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {location.address}
                            </p>
                          )}
                          {location.manager_name && (
                            <p className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {location.manager_name}
                            </p>
                          )}
                        </div>
                        <LocationStatsCard stats={location.stats} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pertes */}
        <TabsContent value="losses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    Registre des pertes
                  </CardTitle>
                  <CardDescription>
                    Historique des produits manquants et endommagÃ©s
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">
                    {totalLossValue.toLocaleString()} GNF
                  </p>
                  <p className="text-xs text-muted-foreground">Valeur totale des pertes</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {losses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-primary-orange-500" />
                  <p>Aucune perte enregistrÃ©e</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RÃ©fÃ©rence</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Lieu</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>QuantitÃ©</TableHead>
                      <TableHead>Valeur</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {losses.map((loss) => (
                      <TableRow key={loss.id}>
                        <TableCell className="font-mono text-sm">{loss.loss_number}</TableCell>
                        <TableCell>{loss.product?.name || 'N/A'}</TableCell>
                        <TableCell>{loss.location?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{loss.source_type}</Badge>
                        </TableCell>
                        <TableCell>{loss.quantity}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {loss.total_loss_value?.toLocaleString()} GNF
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(loss.reported_at), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: CrÃ©er/Modifier un lieu */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLocation ? (
                <>
                  <Edit className="w-5 h-5" />
                  Modifier le lieu
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Nouveau lieu
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedLocation 
                ? "Modifiez les informations de ce lieu"
                : "CrÃ©ez un nouvel entrepÃ´t ou point de vente"
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLocation} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nom du lieu *</Label>
                <Input
                  id="name"
                  placeholder="Ex: EntrepÃ´t Principal"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="code">Code (optionnel)</Label>
                <Input
                  id="code"
                  placeholder="Ex: ENT01"
                  value={newLocation.code}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="type">Type de lieu</Label>
                <Select 
                  value={newLocation.location_type} 
                  onValueChange={(v) => setNewLocation(prev => ({ ...prev, location_type: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse">
                      <span className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4" />
                        EntrepÃ´t
                      </span>
                    </SelectItem>
                    <SelectItem value="pos">
                      <span className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Point de vente (POS)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  placeholder="Adresse complÃ¨te"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  placeholder="Ex: Conakry"
                  value={newLocation.city}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="manager_name">Responsable</Label>
                <Input
                  id="manager_name"
                  placeholder="Nom du responsable"
                  value={newLocation.manager_name}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, manager_name: e.target.value }))}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="manager_phone">TÃ©lÃ©phone responsable</Label>
                <Input
                  id="manager_phone"
                  placeholder="+224 XXX XXX XXX"
                  value={newLocation.manager_phone}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, manager_phone: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setSelectedLocation(null);
                setNewLocation({
                  name: '',
                  code: '',
                  location_type: 'warehouse',
                  address: '',
                  city: '',
                  manager_name: '',
                  manager_phone: '',
                });
              }}>
                Annuler
              </Button>
              <Button type="submit">
                {selectedLocation ? 'Enregistrer' : 'CrÃ©er'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: CrÃ©er un transfert */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              CrÃ©er un transfert de stock
            </DialogTitle>
            <DialogDescription>
              TransfÃ©rez des produits entre vos diffÃ©rents lieux
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTransfer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lieu source *</Label>
                <Select 
                  value={transferForm.from_location_id}
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, from_location_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="SÃ©lectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.filter(l => l.id !== transferForm.to_location_id).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        <span className="flex items-center gap-2">
                          {loc.is_pos_enabled ? <Store className="w-4 h-4" /> : <Warehouse className="w-4 h-4" />}
                          {loc.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Lieu destination *</Label>
                <Select 
                  value={transferForm.to_location_id}
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, to_location_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="SÃ©lectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.filter(l => l.id !== transferForm.from_location_id).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        <span className="flex items-center gap-2">
                          {loc.is_pos_enabled ? <Store className="w-4 h-4" /> : <Warehouse className="w-4 h-4" />}
                          {loc.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea
                placeholder="Notes pour ce transfert..."
                value={transferForm.notes}
                onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                SÃ©lectionnez les produits Ã  transfÃ©rer depuis la vue stock du lieu source
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTransferDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={!transferForm.from_location_id || !transferForm.to_location_id}>
                CrÃ©er le transfert
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Voir le stock d'un lieu */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Stock - {selectedLocation?.name}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[500px]">
            {locationStock.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun stock dans ce lieu</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">RÃ©servÃ©</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationStock.map((stock) => (
                    <TableRow key={stock.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {stock.product?.images?.[0] && (
                            <img 
                              src={stock.product.images[0]} 
                              alt="" 
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <span className="font-medium">{stock.product?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {stock.product?.sku || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">{stock.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {stock.reserved_quantity || 0}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary-orange-600">
                        {stock.available_quantity}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {stock.minimum_stock}
                      </TableCell>
                      <TableCell>
                        {stock.quantity === 0 ? (
                          <Badge variant="destructive">Rupture</Badge>
                        ) : stock.quantity <= stock.minimum_stock ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Stock bas
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-primary-orange-600 border-primary-orange-300">
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmer rÃ©ception */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la rÃ©ception</DialogTitle>
            <DialogDescription>
              Transfert {selectedTransfer?.transfer_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p>Confirmez-vous avoir reÃ§u tous les articles de ce transfert ?</p>
            
            {selectedTransfer?.items && (
              <div className="space-y-2">
                {selectedTransfer.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>{item.product?.name}</span>
                    <Badge>{item.quantity_sent} unitÃ©(s)</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmReception} className="bg-primary-orange-600 hover:bg-primary-orange-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Tout reÃ§u
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
