/**
 * Liste des fournisseurs chinois
 * Avec scoring et filtres
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Star, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Globe,
  Clock,
  Package,
  TrendingUp
} from 'lucide-react';
import { useDropshippingChina } from '@/hooks/useDropshippingChina';
import type { ChinaPlatformType } from '@/types/dropshipping-china';

export function ChinaSuppliersList() {
  const { chinaSuppliers, loading } = useDropshippingChina();
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'orders'>('score');

  const filteredSuppliers = chinaSuppliers
    .filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (platformFilter !== 'all' && s.platform_type !== platformFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.quality_score || 0) - (a.quality_score || 0);
      if (sortBy === 'orders') return (b.total_orders || 0) - (a.total_orders || 0);
      return a.name.localeCompare(b.name);
    });

  const getPlatformColor = (platform: ChinaPlatformType) => {
    const colors: Record<ChinaPlatformType, string> = {
      ALIBABA: 'bg-orange-500',
      ALIEXPRESS: 'bg-red-500',
      '1688': 'bg-blue-600',
      PRIVATE: 'bg-gray-500'
    };
    return colors[platform] || 'bg-gray-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-500';
    if (score >= 4) return 'text-emerald-500';
    if (score >= 3.5) return 'text-yellow-500';
    if (score >= 3) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un fournisseur..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Plateforme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les plateformes</SelectItem>
                <SelectItem value="ALIBABA">Alibaba</SelectItem>
                <SelectItem value="ALIEXPRESS">AliExpress</SelectItem>
                <SelectItem value="1688">1688</SelectItem>
                <SelectItem value="PRIVATE">Privé</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="orders">Commandes</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{chinaSuppliers.length}</p>
              <p className="text-xs text-muted-foreground">Fournisseurs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {chinaSuppliers.filter(s => s.is_verified).length}
              </p>
              <p className="text-xs text-muted-foreground">Vérifiés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Star className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {chinaSuppliers.length 
                  ? (chinaSuppliers.reduce((sum, s) => sum + (s.quality_score || 0), 0) / chinaSuppliers.length).toFixed(1)
                  : '0'}
              </p>
              <p className="text-xs text-muted-foreground">Score moyen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {chinaSuppliers.reduce((sum, s) => sum + (s.total_orders || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Commandes totales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste fournisseurs */}
      <div className="grid gap-4">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Info principale */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={getPlatformColor(supplier.platform_type)}>
                      {supplier.platform_type}
                    </Badge>
                    <h3 className="font-semibold text-lg">{supplier.name}</h3>
                    {supplier.is_verified && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {supplier.country} • {supplier.currency}
                  </p>
                  {supplier.website_url && (
                    <a 
                      href={supplier.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Visiter le site
                    </a>
                  )}
                </div>

                {/* Score */}
                <div className="text-center px-4">
                  <div className={`text-3xl font-bold ${getScoreColor(supplier.quality_score || 0)}`}>
                    {supplier.quality_score?.toFixed(1) || '—'}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`h-3 w-3 ${
                          star <= (supplier.quality_score || 0) 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Score qualité</p>
                </div>

                {/* Métriques */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {supplier.international_shipping_days || '?'}j livraison
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>MOQ: {supplier.moq || 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.delivery_success_rate || 100}% succès</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.dispute_rate || 0}% litiges</span>
                  </div>
                </div>

                {/* Incoterm */}
                <div className="text-center">
                  <Badge variant="outline" className="text-lg px-4 py-1">
                    {supplier.incoterm || 'EXW'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Incoterm</p>
                </div>
              </div>

              {/* Badges supplémentaires */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                {supplier.chinese_language_support && (
                  <Badge variant="secondary">🇨🇳 Support chinois</Badge>
                )}
                {supplier.on_time_rate >= 95 && (
                  <Badge variant="secondary" className="text-green-600">
                    ⏰ Ponctuel ({supplier.on_time_rate}%)
                  </Badge>
                )}
                {supplier.total_orders > 100 && (
                  <Badge variant="secondary">
                    📦 {supplier.total_orders}+ commandes
                  </Badge>
                )}
                {supplier.production_time_days && (
                  <Badge variant="outline">
                    🏭 Production: {supplier.production_time_days}j
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredSuppliers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Aucun fournisseur trouvé</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
