/**
 * CHINA SUPPLIERS LIST COMPONENT
 * Liste et gestion des fournisseurs chinois
 * Extension du module dropshipping existant
 * 
 * @module ChinaSuppliersList
 * @version 1.0.0
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  MoreVertical,
  Star,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Clock,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  MessageSquare,
  ExternalLink,
  Filter,
  RefreshCw,
  Loader2,
  Building2
} from 'lucide-react';
import type {
  ChinaSupplierExtension,
  ChinaPlatformType,
  SupplierScoreLevel,
  Incoterm
} from '@/types/china-dropshipping';
import { CHINA_PLATFORMS, INCOTERMS } from '@/types/china-dropshipping';

// ==================== INTERFACES ====================

interface ChinaSuppliersListProps {
  suppliers: ChinaSupplierExtension[];
  loading: boolean;
  onAdd: (supplier: Partial<ChinaSupplierExtension>) => Promise<ChinaSupplierExtension | null>;
  onUpdate: (id: string, updates: Partial<ChinaSupplierExtension>) => Promise<boolean>;
  onVerify: (id: string) => Promise<boolean>;
  onDisable: (id: string, reason: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

// ==================== HELPERS ====================

const getScoreBadgeVariant = (level: SupplierScoreLevel) => {
  switch (level) {
    case 'GOLD': return 'default';
    case 'SILVER': return 'secondary';
    case 'BRONZE': return 'outline';
    case 'BLACKLISTED': return 'destructive';
    default: return 'outline';
  }
};

const getScoreIcon = (level: SupplierScoreLevel) => {
  switch (level) {
    case 'GOLD': return <ShieldCheck className="w-4 h-4 text-yellow-500" />;
    case 'SILVER': return <Shield className="w-4 h-4 text-gray-400" />;
    case 'BRONZE': return <Shield className="w-4 h-4 text-orange-600" />;
    case 'BLACKLISTED': return <ShieldOff className="w-4 h-4 text-red-500" />;
    default: return <ShieldAlert className="w-4 h-4 text-gray-400" />;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

// ==================== COMPOSANT PRINCIPAL ====================

export function ChinaSuppliersList({
  suppliers,
  loading,
  onAdd,
  onUpdate,
  onVerify,
  onDisable,
  onRefresh
}: ChinaSuppliersListProps) {
  // États
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<ChinaPlatformType | 'ALL'>('ALL');
  const [filterLevel, setFilterLevel] = useState<SupplierScoreLevel | 'ALL'>('ALL');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<ChinaSupplierExtension | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form état pour ajout
  const [newSupplier, setNewSupplier] = useState({
    platform_type: 'ALIBABA' as ChinaPlatformType,
    platform_shop_url: '',
    platform_shop_id: '',
    moq: 10,
    production_time_days: 3,
    domestic_shipping_days: 2,
    international_shipping_days: 15,
    incoterm: 'FOB' as Incoterm,
    chinese_language_support: true,
    english_language_support: false,
    wechat_id: '',
    alibaba_trade_assurance: false,
    notes: ''
  });

  // Filtrage des fournisseurs
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchSearch = !searchTerm || 
        s.platform_shop_url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.platform_shop_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchPlatform = filterPlatform === 'ALL' || s.platform_type === filterPlatform;
      const matchLevel = filterLevel === 'ALL' || s.score_level === filterLevel;
      
      return matchSearch && matchPlatform && matchLevel;
    });
  }, [suppliers, searchTerm, filterPlatform, filterLevel]);

  // Stats
  const stats = useMemo(() => ({
    total: suppliers.length,
    verified: suppliers.filter(s => s.verified_by_admin).length,
    gold: suppliers.filter(s => s.score_level === 'GOLD').length,
    flagged: suppliers.filter(s => s.score_level === 'BLACKLISTED').length
  }), [suppliers]);

  // ==================== HANDLERS ====================

  const handleAddSupplier = async () => {
    setIsSubmitting(true);
    try {
      const result = await onAdd(newSupplier);
      if (result) {
        setShowAddDialog(false);
        setNewSupplier({
          platform_type: 'ALIBABA',
          platform_shop_url: '',
          platform_shop_id: '',
          moq: 10,
          production_time_days: 3,
          domestic_shipping_days: 2,
          international_shipping_days: 15,
          incoterm: 'FOB',
          chinese_language_support: true,
          english_language_support: false,
          wechat_id: '',
          alibaba_trade_assurance: false,
          notes: ''
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async () => {
    if (!selectedSupplier || !disableReason) return;
    
    setIsSubmitting(true);
    try {
      await onDisable(selectedSupplier.id, disableReason);
      setShowDisableDialog(false);
      setSelectedSupplier(null);
      setDisableReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vérifiés</p>
                <p className="text-2xl font-bold">{stats.verified}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gold</p>
                <p className="text-2xl font-bold">{stats.gold}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blacklistés</p>
                <p className="text-2xl font-bold">{stats.flagged}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterPlatform} onValueChange={(v) => setFilterPlatform(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Plateforme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes</SelectItem>
              <SelectItem value="ALIBABA">Alibaba</SelectItem>
              <SelectItem value="ALIEXPRESS">AliExpress</SelectItem>
              <SelectItem value="1688">1688</SelectItem>
              <SelectItem value="PRIVATE">Privé</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="GOLD">Gold</SelectItem>
              <SelectItem value="SILVER">Silver</SelectItem>
              <SelectItem value="BRONZE">Bronze</SelectItem>
              <SelectItem value="UNVERIFIED">Non vérifié</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Liste des fournisseurs */}
      <Card>
        <CardContent className="p-0">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">Aucun fournisseur chinois</h3>
              <p className="text-muted-foreground mb-4">
                Ajoutez vos fournisseurs Alibaba, AliExpress ou 1688
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un fournisseur
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Plateforme</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Délais</TableHead>
                    <TableHead>MOQ</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10">
                              {CHINA_PLATFORMS[supplier.platform_type]?.logo || '🏭'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium line-clamp-1">
                              {supplier.platform_shop_id || 'Fournisseur'}
                            </p>
                            {supplier.verified_by_admin && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Vérifié
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline">
                          {CHINA_PLATFORMS[supplier.platform_type]?.name || supplier.platform_type}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getScoreIcon(supplier.score_level)}
                          <div>
                            <span className={`font-medium ${getScoreColor(supplier.internal_score)}`}>
                              {supplier.internal_score}/100
                            </span>
                            <p className="text-xs text-muted-foreground">{supplier.score_level}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="w-3 h-3 text-muted-foreground" />
                            <span>{supplier.on_time_rate || 0}% à temps</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Package className="w-3 h-3" />
                            <span>{supplier.successful_deliveries}/{supplier.total_deliveries} OK</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span>{supplier.production_time_days || 0}j prod</span>
                          </div>
                          <div className="text-muted-foreground">
                            +{supplier.international_shipping_days || 0}j livr.
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-medium">{supplier.moq || 1}</span>
                        <span className="text-muted-foreground text-sm"> min</span>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {supplier.platform_shop_url && (
                              <DropdownMenuItem
                                onClick={() => window.open(supplier.platform_shop_url!, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Voir la boutique
                              </DropdownMenuItem>
                            )}
                            {supplier.wechat_id && (
                              <DropdownMenuItem>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                WeChat: {supplier.wechat_id}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!supplier.verified_by_admin && (
                              <DropdownMenuItem onClick={() => onVerify(supplier.id)}>
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                Vérifier
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedSupplier(supplier);
                                setShowDisableDialog(true);
                              }}
                            >
                              <ShieldOff className="w-4 h-4 mr-2" />
                              Désactiver
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Ajout Fournisseur */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un fournisseur chinois</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plateforme</Label>
                <Select
                  value={newSupplier.platform_type}
                  onValueChange={(v) => setNewSupplier(p => ({ ...p, platform_type: v as ChinaPlatformType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALIBABA">🏭 Alibaba</SelectItem>
                    <SelectItem value="ALIEXPRESS">🛒 AliExpress</SelectItem>
                    <SelectItem value="1688">🇨🇳 1688</SelectItem>
                    <SelectItem value="PRIVATE">🤝 Privé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Incoterm</Label>
                <Select
                  value={newSupplier.incoterm}
                  onValueChange={(v) => setNewSupplier(p => ({ ...p, incoterm: v as Incoterm }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INCOTERMS).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        {key} - {info.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>URL de la boutique</Label>
              <Input
                placeholder="https://shop.alibaba.com/..."
                value={newSupplier.platform_shop_url}
                onChange={(e) => setNewSupplier(p => ({ ...p, platform_shop_url: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>ID Boutique</Label>
              <Input
                placeholder="Ex: CN1234567890"
                value={newSupplier.platform_shop_id}
                onChange={(e) => setNewSupplier(p => ({ ...p, platform_shop_id: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>MOQ (Quantité min.)</Label>
                <Input
                  type="number"
                  min={1}
                  value={newSupplier.moq}
                  onChange={(e) => setNewSupplier(p => ({ ...p, moq: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Délai production (jours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={newSupplier.production_time_days}
                  onChange={(e) => setNewSupplier(p => ({ ...p, production_time_days: parseInt(e.target.value) || 3 }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Livraison Chine (jours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={newSupplier.domestic_shipping_days}
                  onChange={(e) => setNewSupplier(p => ({ ...p, domestic_shipping_days: parseInt(e.target.value) || 2 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Livraison internationale (jours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={newSupplier.international_shipping_days}
                  onChange={(e) => setNewSupplier(p => ({ ...p, international_shipping_days: parseInt(e.target.value) || 15 }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>WeChat ID</Label>
              <Input
                placeholder="Optionnel"
                value={newSupplier.wechat_id}
                onChange={(e) => setNewSupplier(p => ({ ...p, wechat_id: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Notes internes..."
                value={newSupplier.notes}
                onChange={(e) => setNewSupplier(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddSupplier} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ajout...
                </>
              ) : (
                'Ajouter'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Désactivation */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Désactiver le fournisseur
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Cette action va blacklister le fournisseur. Tous ses produits seront désactivés.
            </p>
            
            <div className="space-y-2">
              <Label>Raison de désactivation *</Label>
              <Textarea
                placeholder="Ex: Livraisons en retard répétées, produits de mauvaise qualité..."
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDisable}
              disabled={!disableReason || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Désactivation...
                </>
              ) : (
                'Confirmer la désactivation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChinaSuppliersList;
