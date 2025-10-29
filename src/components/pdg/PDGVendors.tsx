/**
 * 🏪 PDG VENDORS MANAGEMENT
 * Gestion centralisée des vendeurs
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Store, CheckCircle, XCircle, RefreshCw, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Vendor {
  id: string;
  business_name: string;
  user_id: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export default function PDGVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    active: 0,
    inactive: 0,
    total: 0
  });

  const loadVendors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVendors(data || []);
      
      const active = data?.filter(v => v.is_active).length || 0;
      const inactive = data?.filter(v => !v.is_active).length || 0;
      
      setStats({ 
        active, 
        inactive,
        total: data?.length || 0
      });
    } catch (error: any) {
      console.error('Erreur chargement vendeurs:', error);
      toast.error('Erreur lors du chargement des vendeurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>Chargement des vendeurs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Vendeurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.total}</span>
              <Store className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.active}</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Inactifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.inactive}</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des vendeurs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liste des Vendeurs</CardTitle>
              <CardDescription>{vendors.length} vendeurs enregistrés</CardDescription>
            </div>
            <Button onClick={loadVendors} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Store className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{vendor.business_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {vendor.is_verified ? 'Vérifié' : 'En attente'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={vendor.is_active ? 'default' : 'secondary'}>
                    {vendor.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
