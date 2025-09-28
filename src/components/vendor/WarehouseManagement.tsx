import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Warehouse, Package, MapPin, Plus, ArrowRightLeft } from 'lucide-react';
import { useWarehouseManagement } from '@/hooks/useWarehouseManagement';
import { useToast } from '@/hooks/use-toast';

export default function WarehouseManagement() {
  const { 
    warehouses, 
    warehouseStocks,
    stockMovements,
    loading, 
    error, 
    createWarehouse, 
    updateWarehouse,
    deleteWarehouse,
    updateStock,
    transferStock
  } = useWarehouseManagement();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    address: '',
    contact_person: '',
    contact_phone: ''
  });
  const [transferData, setTransferData] = useState({
    product_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: '',
    notes: ''
  });

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const warehouseData = {
        name: newWarehouse.name,
        address: newWarehouse.address,
        contact_person: newWarehouse.contact_person,
        contact_phone: newWarehouse.contact_phone
      };

      await createWarehouse(warehouseData);
      toast({
        title: "Entrepôt créé",
        description: "L'entrepôt a été ajouté avec succès"
      });
      setIsCreateDialogOpen(false);
      setNewWarehouse({ name: '', address: '', contact_person: '', contact_phone: '' });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'entrepôt",
        variant: "destructive"
      });
    }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await transferStock(
        transferData.product_id,
        transferData.from_warehouse_id,
        transferData.to_warehouse_id,
        parseInt(transferData.quantity),
        transferData.notes
      );
      toast({
        title: "Transfert effectué",
        description: "Le stock a été transféré avec succès"
      });
      setIsTransferDialogOpen(false);
      setTransferData({ product_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: '', notes: '' });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer le transfert",
        variant: "destructive"
      });
    }
  };

  const handleDeleteWarehouse = async (warehouseId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet entrepôt ?')) return;

    try {
      await deleteWarehouse(warehouseId);
      toast({
        title: "Entrepôt supprimé",
        description: "L'entrepôt a été supprimé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entrepôt",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-6 w-6" />
            Gestion des Entrepôts
          </h1>
          <p className="text-muted-foreground">
            Gérez vos entrepôts et les stocks multi-sites
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transférer Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transférer du Stock</DialogTitle>
                <DialogDescription>
                  Déplacez du stock entre vos entrepôts
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransferStock}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="product_id">ID Produit</Label>
                    <Input
                      id="product_id"
                      placeholder="UUID du produit"
                      value={transferData.product_id}
                      onChange={(e) => setTransferData(prev => ({ ...prev, product_id: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="from_warehouse">Entrepôt source</Label>
                      <select 
                        id="from_warehouse"
                        className="w-full p-2 border rounded-md"
                        value={transferData.from_warehouse_id}
                        onChange={(e) => setTransferData(prev => ({ ...prev, from_warehouse_id: e.target.value }))}
                        required
                      >
                        <option value="">Choisir...</option>
                        {warehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="to_warehouse">Entrepôt destination</Label>
                      <select 
                        id="to_warehouse"
                        className="w-full p-2 border rounded-md"
                        value={transferData.to_warehouse_id}
                        onChange={(e) => setTransferData(prev => ({ ...prev, to_warehouse_id: e.target.value }))}
                        required
                      >
                        <option value="">Choisir...</option>
                        {warehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantité</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="0"
                      value={transferData.quantity}
                      onChange={(e) => setTransferData(prev => ({ ...prev, quantity: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (optionnel)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Raison du transfert..."
                      value={transferData.notes}
                      onChange={(e) => setTransferData(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
                
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Transférer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvel Entrepôt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouvel entrepôt</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau site de stockage
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateWarehouse}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom de l'entrepôt</Label>
                    <Input
                      id="name"
                      placeholder="Entrepôt Central Conakry"
                      value={newWarehouse.name}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Adresse</Label>
                    <Textarea
                      id="address"
                      placeholder="Adresse complète de l'entrepôt"
                      value={newWarehouse.address}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contact_person">Personne de contact</Label>
                      <Input
                        id="contact_person"
                        placeholder="Nom du responsable"
                        value={newWarehouse.contact_person}
                        onChange={(e) => setNewWarehouse(prev => ({ ...prev, contact_person: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_phone">Téléphone</Label>
                      <Input
                        id="contact_phone"
                        placeholder="+224 xxx xxx xxx"
                        value={newWarehouse.contact_phone}
                        onChange={(e) => setNewWarehouse(prev => ({ ...prev, contact_phone: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Créer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((warehouse) => (
          <Card key={warehouse.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                {warehouse.name}
              </CardTitle>
              <CardDescription>
                Créé le {new Date(warehouse.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {warehouse.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {warehouse.address}
                  </div>
                )}
                
                {warehouse.contact_person && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4" />
                    Contact: {warehouse.contact_person}
                  </div>
                )}

                {warehouse.contact_phone && (
                  <div className="text-sm text-muted-foreground">
                    Tél: {warehouse.contact_phone}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteWarehouse(warehouse.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {warehouses.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun entrepôt trouvé</h3>
              <p className="text-muted-foreground text-center mb-4">
                Commencez par créer votre premier entrepôt pour gérer vos stocks multi-sites
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Stock Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Mouvements de Stock Récents
          </CardTitle>
          <CardDescription>
            Historique des transferts et ajustements de stock
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockMovements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun mouvement de stock enregistré</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Produit ID</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockMovements.slice(0, 10).map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <Badge variant={
                        movement.movement_type === 'in' ? 'default' :
                        movement.movement_type === 'out' ? 'destructive' :
                        'secondary'
                      }>
                        {movement.movement_type === 'in' ? 'Entrée' :
                         movement.movement_type === 'out' ? 'Sortie' :
                         'Transfert'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {movement.product_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>{movement.quantity}</TableCell>
                    <TableCell>
                      {new Date(movement.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}