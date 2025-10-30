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
  vendor_code: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  profiles?: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    custom_id: string;
  };
  agent_info?: string; // Nom de l'agent créateur
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
        .select(`
          *,
          profiles!inner(email, first_name, last_name, phone, custom_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrichir avec les infos agents
      const enrichedVendors = await Promise.all((data || []).map(async (vendor) => {
        // Récupérer l'info de l'agent créateur
        const { data: agentLink } = await supabase
          .from('agent_created_users')
          .select('agents_management(name)')
          .eq('user_id', vendor.user_id)
          .single();

        return {
          ...vendor,
          agent_info: agentLink?.agents_management?.name || null
        };
      }));

      setVendors(enrichedVendors as any);
      
      const active = enrichedVendors.filter(v => v.is_active).length || 0;
      const inactive = enrichedVendors.filter(v => !v.is_active).length || 0;
      
      setStats({ 
        active, 
        inactive,
        total: enrichedVendors.length || 0
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

    // Abonnement temps réel pour les nouveaux vendeurs
    const channel = supabase
      .channel('vendors-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'vendors' },
        () => {
          console.log('🔄 Nouveau vendeur détecté, rechargement...');
          loadVendors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
            {vendors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun vendeur enregistré</p>
              </div>
            ) : (
              vendors.map((vendor) => (
                <div key={vendor.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-lg">{vendor.business_name}</p>
                          <Badge variant={vendor.is_verified ? 'default' : 'secondary'} className="text-xs">
                            {vendor.is_verified ? '✓ Vérifié' : '⏳ En attente'}
                          </Badge>
                          <Badge variant={vendor.is_active ? 'default' : 'destructive'} className="text-xs">
                            {vendor.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>📧 {vendor.profiles?.email || 'Email non disponible'}</p>
                          <p>👤 {vendor.profiles?.first_name} {vendor.profiles?.last_name}</p>
                          {vendor.profiles?.phone && <p>📱 {vendor.profiles.phone}</p>}
                          <p>🆔 Code Vendeur: <span className="font-mono font-semibold text-primary">{vendor.vendor_code}</span></p>
                          {vendor.agent_info && (
                            <p>👥 Créé par l'agent: <span className="font-medium">{vendor.agent_info}</span></p>
                          )}
                          <p className="text-xs">📅 Créé le: {new Date(vendor.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
