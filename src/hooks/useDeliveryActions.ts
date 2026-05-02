/**
 * Hook pour gérer les actions de livraison
 * Extrait la logique métier du composant principal
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseDeliveryActionsProps {
  driverId: string | null;
  onDeliveryAccepted?: () => void;
  onDeliveryStarted?: () => void;
  onDeliveryCompleted?: () => void;
  onDeliveryCancelled?: () => void;
}

export function useDeliveryActions({
  driverId,
  onDeliveryAccepted,
  onDeliveryStarted,
  onDeliveryCompleted,
  onDeliveryCancelled,
}: UseDeliveryActionsProps) {

  /**
   * Accepter une livraison
   */
  const acceptDelivery = useCallback(async (deliveryId: string) => {
    if (!driverId) {
      toast.error('Vous devez être connecté pour accepter une livraison');
      return;
    }

    try {
      const { data: delivery, error: fetchError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', deliveryId)
        .single();

      if (fetchError) throw fetchError;

      if (delivery.status !== 'pending') {
        toast.error('Cette livraison n\'est plus disponible');
        return;
      }

      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          driver_id: driverId,
          status: 'assigned',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      if (updateError) throw updateError;

      toast.success('Livraison acceptée! Direction le point de collecte.');
      onDeliveryAccepted?.();
    } catch (error) {
      console.error('Error accepting delivery:', error);
      toast.error('Impossible d\'accepter cette livraison');
      throw error;
    }
  }, [driverId, onDeliveryAccepted]);

  /**
   * Démarrer une livraison (collecte effectuée)
   */
  const startDelivery = useCallback(async (deliveryId: string) => {
    if (!driverId) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      const { data: delivery, error: fetchError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', deliveryId)
        .single();

      if (fetchError) throw fetchError;

      if (delivery.status !== 'assigned') {
        toast.error('Cette livraison n\'est pas dans le bon état');
        return;
      }

      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          status: 'picked_up',
          started_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      if (updateError) throw updateError;

      toast.success('Livraison démarrée! En route vers le client.');
      onDeliveryStarted?.();
    } catch (error) {
      console.error('Error starting delivery:', error);
      toast.error('Impossible de démarrer la livraison');
      throw error;
    }
  }, [driverId, onDeliveryStarted]);

  /**
   * Mettre à jour le statut d'une livraison
   */
  const updateDeliveryStatus = useCallback(async (
    deliveryId: string,
    status: 'in_transit' | 'delivered' | 'cancelled'
  ) => {
    if (!driverId) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      const updateData: any = { status };

      if (status === 'delivered') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId)
        .eq('driver_id', driverId);

      if (error) throw error;

      if (status === 'delivered') {
        toast.success('🎉 Livraison terminée avec succès!');
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast.error('Impossible de mettre à jour le statut');
      throw error;
    }
  }, [driverId]);

  /**
   * Annuler une livraison
   */
  const cancelDelivery = useCallback(async (deliveryId: string, reason: string) => {
    if (!driverId) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'cancelled',
          driver_notes: reason,
          completed_at: new Date().toISOString(),
        })
        .eq('id', deliveryId)
        .eq('driver_id', driverId);

      if (error) throw error;

      toast.info('Livraison annulée');
      onDeliveryCancelled?.();
    } catch (error) {
      console.error('Error cancelling delivery:', error);
      toast.error('Impossible d\'annuler la livraison');
      throw error;
    }
  }, [driverId, onDeliveryCancelled]);

  /**
   * Terminer une livraison avec preuve
   */
  const completeDeliveryWithProof = useCallback(async (
    deliveryId: string,
    photoUrl: string,
    signature: string
  ) => {
    if (!driverId) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      console.log('🎯 [useDeliveryActions] Completing delivery:', deliveryId);

      // Vérifier que la livraison existe et appartient au driver
      const { data: existingDelivery, error: checkError } = await supabase
        .from('deliveries')
        .select('id, status, driver_id')
        .eq('id', deliveryId)
        .eq('driver_id', driverId)
        .single();

      if (checkError || !existingDelivery) {
        console.error('❌ Delivery not found or not assigned to driver');
        toast.error('Livraison introuvable');
        return;
      }

      if (existingDelivery.status === 'delivered') {
        console.warn('⚠️ Delivery already completed');
        toast.info('Cette livraison est déjà terminée');
        onDeliveryCompleted?.();
        return;
      }

      // Enregistrer photo et signature
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          proof_photo_url: photoUrl,
          client_signature: signature,
          status: 'delivered',
          completed_at: new Date().toISOString(),
        })
        .eq('id', deliveryId)
        .eq('driver_id', driverId);

      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw updateError;
      }

      console.log('✅ Delivery completed successfully');
      toast.success('🎉 Livraison terminée avec succès!');

      // Forcer le rechargement après un délai pour laisser la DB se synchroniser
      setTimeout(() => {
        onDeliveryCompleted?.();
      }, 500);
    } catch (error) {
      console.error('❌ Error completing delivery with proof:', error);
      toast.error('Erreur lors de la finalisation');
      throw error;
    }
  }, [driverId, onDeliveryCompleted]);

  /**
   * Signaler un problème
   */
  const reportProblem = useCallback(async (deliveryId: string, problem: string) => {
    if (!driverId) return;

    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          driver_notes: problem,
        })
        .eq('id', deliveryId);

      if (error) throw error;

      toast.warning('Problème signalé au support!');
    } catch (error) {
      console.error('Error reporting problem:', error);
      toast.error('Impossible de signaler le problème');
    }
  }, [driverId]);

  return {
    acceptDelivery,
    startDelivery,
    updateDeliveryStatus,
    cancelDelivery,
    completeDeliveryWithProof,
    reportProblem,
  };
}
