import { useState, useEffect } from 'react';
import { dataManager } from '@/services/DataManager';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface PaymentLink {
  id: string;
  payment_id: string;
  vendeur_id: string;
  client_id?: string;
  produit: string;
  description?: string;
  montant: number;
  frais: number;
  total: number;
  devise: string;
  status: 'pending' | 'success' | 'failed' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  client?: {
    name: string;
    email: string;
  };
}

export interface PaymentStats {
  total_links: number;
  successful_payments: number;
  pending_payments: number;
  failed_payments: number;
  expired_payments: number;
  total_revenue: number;
  total_fees: number;
  avg_payment_amount: number;
}

export interface CreatePaymentLinkData {
  produit: string;
  description?: string;
  montant: number;
  devise: string;
  client_id?: string;
  remise?: number;
  type_remise?: 'percentage' | 'fixed';
}

export function usePaymentLinks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);

  // Charger l'ID du vendeur
  useEffect(() => {
    loadVendorId();
  }, [user?.id]);

  // Charger les payment links quand le vendorId est disponible
  useEffect(() => {
    if (vendorId) {
      loadPaymentLinks();
    }
  }, [vendorId]);

  const loadVendorId = async () => {
    if (!user?.id) return;

    try {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (vendor) {
        setVendorId(vendor.id);
      }
    } catch (error) {
      console.error('Erreur chargement vendor ID:', error);
    }
  };

  const loadPaymentLinks = async (filters?: { status?: string; search?: string }) => {
    if (!vendorId) return;

    try {
      setLoading(true);

      // Utiliser DataManager pour la requête avec cache et realtime
      const queryConfig: any = {
        table: 'payment_links',
        select: `
          *,
          client:profiles!payment_links_client_id_fkey(
            id,
            public_id,
            first_name,
            last_name,
            email
          )
        `,
        filters: {
          vendeur_id: vendorId
        },
        orderBy: { column: 'created_at', ascending: false },
        realtime: true // Active les mises à jour en temps réel
      };

      // Ajouter le filtre de statut si fourni
      if (filters?.status && filters.status !== 'all') {
        queryConfig.filters.status = filters.status;
      }

      const links = await dataManager.query<any[]>(queryConfig);

      if (links) {
        // Filtrer par recherche côté client si nécessaire
        let filteredLinks = links;
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          filteredLinks = links.filter((link: any) =>
            link.produit?.toLowerCase().includes(searchLower) ||
            link.description?.toLowerCase().includes(searchLower) ||
            link.payment_id?.toLowerCase().includes(searchLower)
          );
        }

        // Formater les données
        const formattedLinks: PaymentLink[] = filteredLinks.map((link: any) => ({
          ...link,
          client: link.client ? {
            name: `${link.client.first_name || ''} ${link.client.last_name || ''}`.trim(),
            email: link.client.email
          } : undefined
        }));

        setPaymentLinks(formattedLinks);
        calculateStats(formattedLinks);
      }
    } catch (error) {
      console.error('Erreur chargement payment links:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les liens de paiement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (links: PaymentLink[]) => {
    const successfulLinks = links.filter(l => l.status === 'success');
    const totalRevenue = successfulLinks.reduce((sum, l) => sum + (l.total || 0), 0);

    setStats({
      total_links: links.length,
      pending_payments: links.filter(l => l.status === 'pending').length,
      successful_payments: successfulLinks.length,
      expired_payments: links.filter(l => l.status === 'expired').length,
      failed_payments: links.filter(l => l.status === 'failed').length,
      total_revenue: totalRevenue,
      total_fees: successfulLinks.reduce((sum, l) => sum + (l.frais || 0), 0),
      avg_payment_amount: successfulLinks.length > 0 ? totalRevenue / successfulLinks.length : 0
    });
  };

  const createPaymentLink = async (data: CreatePaymentLinkData): Promise<string | null> => {
    if (!vendorId) {
      toast({
        title: "Erreur",
        description: "Vendeur non trouvé",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Calculer le montant après remise
      let montantFinal = data.montant;
      const remise = data.remise || 0;
      
      if (remise > 0) {
        if (data.type_remise === 'percentage') {
          montantFinal = data.montant * (1 - remise / 100);
        } else {
          montantFinal = data.montant - remise;
        }
      }
      
      const frais = montantFinal * 0.01; // 1% de frais
      const total = montantFinal + frais;

      // Générer un ID de paiement unique au format simple
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 9).toUpperCase();
      const paymentId = `PAY-${timestamp}-${randomPart}`;

      // Si un client_id est fourni, trouver l'UUID correspondant
      let clientUuid: string | null = null;
      if (data.client_id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('public_id', data.client_id)
          .single();

        if (profileError || !profile) {
          toast({
            title: "Erreur",
            description: "ID client introuvable",
            variant: "destructive"
          });
          return null;
        }
        clientUuid = profile.id;
      }

      // Créer le lien directement dans Supabase
      const { data: newLink, error } = await supabase
        .from('payment_links')
        .insert({
          payment_id: paymentId,
          vendeur_id: vendorId,
          client_id: clientUuid,
          produit: data.produit,
          description: data.description || null,
          montant: data.montant,
          remise: remise,
          type_remise: data.type_remise || 'percentage',
          frais: frais,
          total: total,
          devise: data.devise,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur création payment link:', error);
        throw new Error(error.message);
      }

      if (newLink) {
        // Si un client est spécifié, envoyer une notification
        if (clientUuid) {
          try {
            await supabase
              .from('notifications')
              .insert({
                user_id: clientUuid,
                type: 'payment_link',
                title: 'Nouveau lien de paiement',
                message: `Vous avez reçu un lien de paiement pour ${data.produit}. Montant: ${data.montant} ${data.devise}`,
                data: {
                  payment_id: paymentId,
                  payment_link: `${window.location.origin}/payment/${paymentId}`
                },
                is_read: false
              });
          } catch (notifError) {
            console.error('Erreur envoi notification:', notifError);
          }
        }

        toast({
          title: "Succès",
          description: clientUuid 
            ? "Lien créé et envoyé au client !" 
            : "Lien de paiement créé avec succès !",
        });

        // Recharger les liens
        await loadPaymentLinks();

        return paymentId;
      }

      return null;
    } catch (error: any) {
      console.error('Erreur création payment link:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le lien de paiement",
        variant: "destructive"
      });
      return null;
    }
  };

  const updatePaymentLinkStatus = async (paymentId: string, status: PaymentLink['status']) => {
    try {
      await dataManager.mutate({
        table: 'payment_links',
        operation: 'update',
        data: { status },
        filters: { payment_id: paymentId }
      });

      toast({
        title: "Succès",
        description: "Statut mis à jour",
      });

      await loadPaymentLinks();
    } catch (error: any) {
      console.error('Erreur mise à jour statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const deletePaymentLink = async (paymentId: string) => {
    try {
      await dataManager.mutate({
        table: 'payment_links',
        operation: 'delete',
        filters: { payment_id: paymentId }
      });

      toast({
        title: "Succès",
        description: "Lien de paiement supprimé",
      });

      await loadPaymentLinks();
    } catch (error: any) {
      console.error('Erreur suppression payment link:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le lien",
        variant: "destructive"
      });
    }
  };

  return {
    paymentLinks,
    stats,
    loading,
    vendorId,
    loadPaymentLinks,
    createPaymentLink,
    updatePaymentLinkStatus,
    deletePaymentLink
  };
}
