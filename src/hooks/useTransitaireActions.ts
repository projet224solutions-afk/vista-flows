/**
 * TRANSITAIRE ACTIONS HOOK - 224SOLUTIONS
 * Hook centralisé pour toutes les actions CRUD de l'interface transitaire international
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// ============================================================================
// INTERFACES
// ============================================================================

interface ShipmentData {
  type: 'aerien' | 'maritime' | 'terrestre';
  origin: string;
  destination: string;
  weight: number;
  weight_unit: 'kg' | 'tonnes';
  dimensions?: string;
  description: string;
  declared_value?: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  estimated_delivery_days?: number;
}

interface CustomsData {
  shipment_id: string;
  country: string;
  declaration_number: string;
  customs_value: number;
  duties_paid: number;
  tax_paid: number;
  status: 'pending' | 'processing' | 'cleared' | 'held' | 'rejected';
  notes?: string;
}

interface DocumentData {
  shipment_id: string;
  document_type: 'invoice' | 'packing_list' | 'certificate' | 'manifest' | 'customs_form' | 'other';
  document_url: string;
  document_name: string;
  issued_date: string;
}

// ============================================================================
// HOOK CONFIGURATION
// ============================================================================

interface UseTransitaireActionsConfig {
  transitaireId?: string;
  onShipmentCreated?: (shipment: any) => void;
  onShipmentUpdated?: (shipment: any) => void;
  onShipmentDeleted?: (shipmentId: string) => void;
  onCustomsProcessed?: (customs: any) => void;
  onDocumentUploaded?: (document: any) => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useTransitaireActions = (config: UseTransitaireActionsConfig = {}) => {
  const [loading, setLoading] = useState(false);
  const {
    transitaireId,
    onShipmentCreated,
    onShipmentUpdated,
    onShipmentDeleted,
    onCustomsProcessed,
    onDocumentUploaded
  } = config;

  // ==========================================================================
  // SHIPMENT ACTIONS (Expéditions)
  // ==========================================================================

  /**
   * Créer une nouvelle expédition
   */
  const createShipment = useCallback(async (
    shipmentData: ShipmentData,
    targetTransitaireId?: string
  ) => {
    setLoading(true);
    try {
      const effectiveTransitaireId = targetTransitaireId || transitaireId;
      
      if (!effectiveTransitaireId) {
        throw new Error('ID transitaire requis pour créer une expédition');
      }

      // Validation
      if (!shipmentData.type || !shipmentData.origin || !shipmentData.destination) {
        throw new Error('Type, origine et destination requis');
      }

      if (!shipmentData.weight || shipmentData.weight <= 0) {
        throw new Error('Poids invalide');
      }

      if (!shipmentData.client_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipmentData.client_email)) {
        throw new Error('Email client invalide');
      }

      // Générer tracking number unique
      const trackingNumber = `INT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Calculer ETA basé sur type et estimation
      const estimatedDays = shipmentData.estimated_delivery_days || 
        (shipmentData.type === 'aerien' ? 5 : shipmentData.type === 'maritime' ? 30 : 15);
      const eta = new Date();
      eta.setDate(eta.getDate() + estimatedDays);

      // Insérer dans la table international_shipments
      const { data: shipment, error: shipmentError } = await supabase
        .from('international_shipments')
        .insert({
          transitaire_id: effectiveTransitaireId,
          tracking_number: trackingNumber,
          type: shipmentData.type,
          origin: shipmentData.origin,
          destination: shipmentData.destination,
          weight: shipmentData.weight,
          weight_unit: shipmentData.weight_unit || 'kg',
          dimensions: shipmentData.dimensions,
          description: shipmentData.description,
          declared_value: shipmentData.declared_value,
          client_name: shipmentData.client_name,
          client_email: shipmentData.client_email,
          client_phone: shipmentData.client_phone,
          status: 'pending',
          estimated_delivery: eta.toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      toast.success(`Expédition ${trackingNumber} créée avec succès`);
      onShipmentCreated?.(shipment);

      return { success: true, shipment };
    } catch (error: any) {
      console.error('Erreur création expédition:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'expédition');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [transitaireId, onShipmentCreated]);

  /**
   * Mettre à jour une expédition existante
   */
  const updateShipment = useCallback(async (
    shipmentId: string,
    updates: Partial<ShipmentData & { status?: string }>
  ) => {
    setLoading(true);
    try {
      const { data: shipment, error } = await supabase
        .from('international_shipments')
        .update(updates)
        .eq('id', shipmentId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Expédition mise à jour');
      onShipmentUpdated?.(shipment);

      return { success: true, shipment };
    } catch (error: any) {
      console.error('Erreur mise à jour expédition:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [onShipmentUpdated]);

  /**
   * Annuler/Supprimer une expédition
   */
  const deleteShipment = useCallback(async (shipmentId: string) => {
    setLoading(true);
    try {
      // Soft delete - changer le statut à 'cancelled'
      const { error } = await supabase
        .from('international_shipments')
        .update({ status: 'cancelled' })
        .eq('id', shipmentId);

      if (error) throw error;

      toast.success('Expédition annulée');
      onShipmentDeleted?.(shipmentId);

      return { success: true };
    } catch (error: any) {
      console.error('Erreur annulation expédition:', error);
      toast.error(error.message || 'Erreur lors de l\'annulation');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [onShipmentDeleted]);

  /**
   * Mettre à jour le statut de suivi d'une expédition
   */
  const updateTrackingStatus = useCallback(async (
    shipmentId: string,
    status: 'pending' | 'in_transit' | 'at_customs' | 'customs_cleared' | 'out_for_delivery' | 'delivered' | 'cancelled',
    location?: string,
    notes?: string
  ) => {
    setLoading(true);
    try {
      // Mettre à jour le statut principal
      const { error: updateError } = await supabase
        .from('international_shipments')
        .update({ status })
        .eq('id', shipmentId);

      if (updateError) throw updateError;

      // Ajouter une entrée dans l'historique de suivi
      const { error: trackingError } = await supabase
        .from('shipment_tracking_history')
        .insert({
          shipment_id: shipmentId,
          status,
          location: location || 'Non spécifié',
          notes: notes || `Statut mis à jour: ${status}`,
          timestamp: new Date().toISOString()
        });

      if (trackingError) console.warn('Erreur historique suivi:', trackingError);

      toast.success(`Statut mis à jour: ${status}`);

      return { success: true };
    } catch (error: any) {
      console.error('Erreur mise à jour statut:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du statut');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================================
  // CUSTOMS ACTIONS (Douanes)
  // ==========================================================================

  /**
   * Traiter une déclaration douanière
   */
  const processCustoms = useCallback(async (customsData: CustomsData) => {
    setLoading(true);
    try {
      // Validation
      if (!customsData.shipment_id || !customsData.country) {
        throw new Error('ID expédition et pays requis');
      }

      if (!customsData.declaration_number) {
        throw new Error('Numéro de déclaration requis');
      }

      // Insérer la déclaration douanière
      const { data: customs, error } = await supabase
        .from('customs_declarations')
        .insert({
          shipment_id: customsData.shipment_id,
          country: customsData.country,
          declaration_number: customsData.declaration_number,
          customs_value: customsData.customs_value || 0,
          duties_paid: customsData.duties_paid || 0,
          tax_paid: customsData.tax_paid || 0,
          status: customsData.status || 'pending',
          notes: customsData.notes,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour le statut de l'expédition si douane en cours
      if (customsData.status === 'processing' || customsData.status === 'pending') {
        await updateTrackingStatus(customsData.shipment_id, 'at_customs', customsData.country);
      } else if (customsData.status === 'cleared') {
        await updateTrackingStatus(customsData.shipment_id, 'customs_cleared', customsData.country);
      }

      toast.success(`Déclaration douanière ${customsData.declaration_number} enregistrée`);
      onCustomsProcessed?.(customs);

      return { success: true, customs };
    } catch (error: any) {
      console.error('Erreur traitement douanier:', error);
      toast.error(error.message || 'Erreur lors du traitement douanier');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [updateTrackingStatus, onCustomsProcessed]);

  // ==========================================================================
  // DOCUMENT ACTIONS (Documents)
  // ==========================================================================

  /**
   * Uploader un document pour une expédition
   */
  const uploadDocument = useCallback(async (documentData: DocumentData) => {
    setLoading(true);
    try {
      // Validation
      if (!documentData.shipment_id || !documentData.document_type) {
        throw new Error('ID expédition et type de document requis');
      }

      if (!documentData.document_url || !documentData.document_name) {
        throw new Error('URL et nom du document requis');
      }

      // Insérer le document
      const { data: document, error } = await supabase
        .from('shipment_documents')
        .insert({
          shipment_id: documentData.shipment_id,
          document_type: documentData.document_type,
          document_url: documentData.document_url,
          document_name: documentData.document_name,
          issued_date: documentData.issued_date || new Date().toISOString(),
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Document ${documentData.document_name} uploadé`);
      onDocumentUploaded?.(document);

      return { success: true, document };
    } catch (error: any) {
      console.error('Erreur upload document:', error);
      toast.error(error.message || 'Erreur lors de l\'upload du document');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [onDocumentUploaded]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    loading,
    createShipment,
    updateShipment,
    deleteShipment,
    updateTrackingStatus,
    processCustoms,
    uploadDocument
  };
};
