// @ts-nocheck
/**
 * Composant de création de transfert de stock
 * 224SOLUTIONS - Sélection avancée des produits
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Warehouse,
  Store,
  ArrowRightLeft,
  Package,
  Search,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Check,
  ArrowRight
} from 'lucide-react';
import { useMultiWarehouse, VendorLocation, CreateTransferInput, LocationStock } from '@/hooks/useMultiWarehouse';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TransferItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  product_image?: string;
  available_quantity: number;
  quantity_to_send: number;
}

interface TransferCreatorProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TransferCreator({ onSuccess, onCancel }: TransferCreatorProps) {
  const {
    locations,
    getLocationStock,
    createTransfer
  } = useMultiWarehouse();

  const { toast } = useToast();

  // Étapes du wizard
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Sélection des lieux
  const [fromLocationId, setFromLocationId] = useState<string>('');
  const [toLocationId, setToLocationId] = useState<string>('');

  // Stock source et items à transférer
  const [sourceStock, setSourceStock] = useState<LocationStock[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);

  // Notes
  const [notes, setNotes] = useState('');

  // Soumission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lieux disponibles pour la source
  const sourceLocations = useMemo(() => 
    locations.filter(l => l.id !== toLocationId),
    [locations, toLocationId]
  );

  // Lieux disponibles pour la destination
  const destinationLocations = useMemo(() =>
    locations.filter(l => l.id !== fromLocationId),
    [locations, fromLocationId]
  );

  // Lieu source sélectionné
  const fromLocation = useMemo(() =>
    locations.find(l => l.id === fromLocationId),
    [locations, fromLocationId]
  );

  // Lieu destination sélectionné
  const toLocation = useMemo(() =>
    locations.find(l => l.id === toLocationId),
    [locations, toLocationId]
  );

  // Charger le stock quand on sélectionne un lieu source
  useEffect(() => {
    if (fromLocationId) {
      loadSourceStock();
    } else {
      setSourceStock([]);
    }
  }, [fromLocationId]);

  const loadSourceStock = async () => {
    setLoadingStock(true);
    try {
      const stock = await getLocationStock(fromLocationId);
      setSourceStock(stock.filter(s => s.available_quantity > 0));
    } finally {
      setLoadingStock(false);
    }
  };

  // Filtrer le stock par recherche
  const filteredStock = useMemo(() => {
    if (!searchQuery.trim()) return sourceStock;
    const q = searchQuery.toLowerCase();
    return sourceStock.filter(s => 
      s.product?.name?.toLowerCase().includes(q) ||
      s.product?.sku?.toLowerCase().includes(q)
    );
  }, [sourceStock, searchQuery]);

  // Ajouter un produit au transfert
  const addToTransfer = (stock: LocationStock) => {
    const existing = transferItems.find(i => i.product_id === stock.product_id);
    if (existing) {
      // Incrémenter la quantité
      updateQuantity(stock.product_id, existing.quantity_to_send + 1);
    } else {
      setTransferItems(prev => [...prev, {
        product_id: stock.product_id,
        product_name: stock.product?.name || 'Produit',
        product_sku: stock.product?.sku || '',
        product_image: stock.product?.images?.[0],
        available_quantity: stock.available_quantity,
        quantity_to_send: 1
      }]);
    }
  };

  // Mettre à jour la quantité d'un item
  const updateQuantity = (productId: string, quantity: number) => {
    setTransferItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(0, Math.min(quantity, item.available_quantity));
        return { ...item, quantity_to_send: newQty };
      }
      return item;
    }).filter(item => item.quantity_to_send > 0));
  };

  // Supprimer un item
  const removeItem = (productId: string) => {
    setTransferItems(prev => prev.filter(i => i.product_id !== productId));
  };

  // Vérifier si un produit est déjà dans le transfert
  const isInTransfer = (productId: string) => 
    transferItems.some(i => i.product_id === productId);

  // Total des items
  const totalItems = transferItems.reduce((sum, i) => sum + i.quantity_to_send, 0);

  // Soumettre le transfert
  const handleSubmit = async () => {
    if (!fromLocationId || !toLocationId || transferItems.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner les lieux et ajouter des produits",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTransfer({
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        items: transferItems.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity_to_send
        })),
        notes
      });

      if (result) {
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Peut-on passer à l'étape suivante ?
  const canProceed = () => {
    if (step === 1) return fromLocationId && toLocationId;
    if (step === 2) return transferItems.length > 0;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Étape {step} sur {totalSteps}</span>
          <span className="font-medium">
            {step === 1 && 'Sélection des lieux'}
            {step === 2 && 'Choix des produits'}
            {step === 3 && 'Confirmation'}
          </span>
        </div>
        <Progress value={(step / totalSteps) * 100} className="h-2" />
      </div>

      {/* Étape 1: Sélection des lieux */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Sélectionnez les lieux</CardTitle>
            <CardDescription>
              Choisissez le lieu source et la destination du transfert
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Lieu source */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Lieu source</Label>
                <Select value={fromLocationId} onValueChange={setFromLocationId}>
                  <SelectTrigger className="h-14">
                    <SelectValue placeholder="D'où transférer ?" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-1.5 rounded",
                            loc.is_pos_enabled ? "bg-green-100" : "bg-blue-100"
                          )}>
                            {loc.is_pos_enabled ? (
                              <Store className="w-4 h-4 text-green-600" />
                            ) : (
                              <Warehouse className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{loc.name}</p>
                            {loc.code && (
                              <p className="text-xs text-muted-foreground">{loc.code}</p>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {fromLocation && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          fromLocation.is_pos_enabled ? "bg-green-100" : "bg-blue-100"
                        )}>
                          {fromLocation.is_pos_enabled ? (
                            <Store className="w-5 h-5 text-green-600" />
                          ) : (
                            <Warehouse className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{fromLocation.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {fromLocation.city || fromLocation.address || 'Adresse non définie'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 bg-background rounded">
                          <p className="text-lg font-bold">{fromLocation.stats?.total_products || 0}</p>
                          <p className="text-xs text-muted-foreground">Produits</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="text-lg font-bold">{fromLocation.stats?.total_quantity || 0}</p>
                          <p className="text-xs text-muted-foreground">Unités</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Flèche */}
              <div className="hidden md:flex items-center justify-center">
                <div className="p-4 rounded-full bg-muted">
                  <ArrowRight className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>

              {/* Lieu destination */}
              <div className="space-y-3 md:-mt-16">
                <Label className="text-base font-semibold">Lieu destination</Label>
                <Select value={toLocationId} onValueChange={setToLocationId}>
                  <SelectTrigger className="h-14">
                    <SelectValue placeholder="Vers où transférer ?" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-1.5 rounded",
                            loc.is_pos_enabled ? "bg-green-100" : "bg-blue-100"
                          )}>
                            {loc.is_pos_enabled ? (
                              <Store className="w-4 h-4 text-green-600" />
                            ) : (
                              <Warehouse className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{loc.name}</p>
                            {loc.code && (
                              <p className="text-xs text-muted-foreground">{loc.code}</p>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {toLocation && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          toLocation.is_pos_enabled ? "bg-green-100" : "bg-blue-100"
                        )}>
                          {toLocation.is_pos_enabled ? (
                            <Store className="w-5 h-5 text-green-600" />
                          ) : (
                            <Warehouse className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{toLocation.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {toLocation.city || toLocation.address || 'Adresse non définie'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 2: Sélection des produits */}
      {step === 2 && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Stock disponible */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stock disponible</CardTitle>
              <CardDescription>
                {fromLocation?.name} - {sourceStock.length} produit(s)
              </CardDescription>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingStock ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredStock.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Aucun stock disponible</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredStock.map(stock => {
                      const inTransfer = isInTransfer(stock.product_id);
                      const item = transferItems.find(i => i.product_id === stock.product_id);
                      
                      return (
                        <div
                          key={stock.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                            inTransfer 
                              ? "bg-primary/5 border-primary/30" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => addToTransfer(stock)}
                        >
                          {/* Image */}
                          <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0">
                            {stock.product?.images?.[0] ? (
                              <img 
                                src={stock.product.images[0]} 
                                alt="" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{stock.product?.name}</p>
                            {stock.product?.sku && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {stock.product.sku}
                              </p>
                            )}
                          </div>

                          {/* Quantité disponible */}
                          <div className="text-right shrink-0">
                            <p className="font-bold">{stock.available_quantity}</p>
                            <p className="text-xs text-muted-foreground">dispo.</p>
                          </div>

                          {/* Bouton ou check */}
                          <div className="shrink-0">
                            {inTransfer ? (
                              <div className="p-2 rounded-full bg-primary text-primary-foreground">
                                <Check className="w-4 h-4" />
                              </div>
                            ) : (
                              <Button size="icon" variant="ghost">
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Panier de transfert */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">À transférer</CardTitle>
                  <CardDescription>
                    {transferItems.length} produit(s) • {totalItems} unité(s)
                  </CardDescription>
                </div>
                {transferItems.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setTransferItems([])}
                  >
                    Vider
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {transferItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Cliquez sur les produits à transférer</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {transferItems.map(item => (
                      <div
                        key={item.product_id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        {/* Image */}
                        <div className="w-10 h-10 rounded bg-background overflow-hidden shrink-0">
                          {item.product_image ? (
                            <img 
                              src={item.product_image} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Max: {item.available_quantity}
                          </p>
                        </div>

                        {/* Contrôles de quantité */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product_id, item.quantity_to_send - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            max={item.available_quantity}
                            value={item.quantity_to_send}
                            onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-center"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product_id, item.quantity_to_send + 1)}
                            disabled={item.quantity_to_send >= item.available_quantity}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Supprimer */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeItem(item.product_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Étape 3: Confirmation */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmer le transfert</CardTitle>
            <CardDescription>
              Vérifiez les détails avant de créer le transfert
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Résumé des lieux */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="flex-1 text-center">
                <div className={cn(
                  "inline-flex p-3 rounded-lg mb-2",
                  fromLocation?.is_pos_enabled ? "bg-green-100" : "bg-blue-100"
                )}>
                  {fromLocation?.is_pos_enabled ? (
                    <Store className="w-6 h-6 text-green-600" />
                  ) : (
                    <Warehouse className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <p className="font-semibold">{fromLocation?.name}</p>
                <p className="text-sm text-muted-foreground">Source</p>
              </div>

              <div className="p-3 rounded-full bg-primary/10">
                <ArrowRight className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-1 text-center">
                <div className={cn(
                  "inline-flex p-3 rounded-lg mb-2",
                  toLocation?.is_pos_enabled ? "bg-green-100" : "bg-blue-100"
                )}>
                  {toLocation?.is_pos_enabled ? (
                    <Store className="w-6 h-6 text-green-600" />
                  ) : (
                    <Warehouse className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <p className="font-semibold">{toLocation?.name}</p>
                <p className="text-sm text-muted-foreground">Destination</p>
              </div>
            </div>

            {/* Liste des items */}
            <div>
              <h4 className="font-semibold mb-3">
                Produits à transférer ({transferItems.length})
              </h4>
              <div className="space-y-2">
                {transferItems.map(item => (
                  <div key={item.product_id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="font-medium">{item.product_name}</span>
                    <Badge variant="secondary">{item.quantity_to_send} unité(s)</Badge>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{totalItems} unité(s)</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                placeholder="Ajoutez des notes pour ce transfert..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Alerte */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Le stock sera retiré de la source uniquement après l'expédition du transfert.
                La destination devra confirmer la réception pour finaliser le transfert.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              onCancel?.();
            }
          }}
        >
          {step === 1 ? 'Annuler' : 'Retour'}
        </Button>

        {step < totalSteps ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Continuer
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-blue-500 to-purple-600"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Création...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Créer le transfert
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
