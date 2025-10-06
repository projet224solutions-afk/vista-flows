/**
 * 🛡️ API ESCROW - FACTURES
 * Endpoint pour créer et gérer les factures dynamiques
 */

import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Créer une nouvelle facture
    try {
      const {
        id,
        driverId,
        clientId,
        clientName,
        clientPhone,
        amount,
        description,
        startLocation,
        endLocation,
        startCoordinates,
        endCoordinates,
        status,
        paymentLink,
        notes
      } = req.body;

      // Validation des données
      if (!driverId || !amount || !startLocation || !endLocation) {
        return res.status(400).json({ error: 'Données requises manquantes' });
      }

      const invoiceId = id || uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

      // Créer la facture
      const { data: invoice, error: invoiceError } = await supabase
        .from('escrow_invoices')
        .insert({
          id: invoiceId,
          driver_id: driverId,
          client_id: clientId,
          client_name: clientName,
          client_phone: clientPhone,
          amount: parseFloat(amount),
          description: description || `Trajet de ${startLocation} vers ${endLocation}`,
          start_location: startLocation,
          end_location: endLocation,
          start_latitude: startCoordinates?.latitude,
          start_longitude: startCoordinates?.longitude,
          end_latitude: endCoordinates?.latitude,
          end_longitude: endCoordinates?.longitude,
          status: status || 'draft',
          payment_link: paymentLink || `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceId}`,
          notes: notes,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Erreur création facture:', invoiceError);
        return res.status(500).json({ error: 'Erreur création facture' });
      }

      console.log(`🛡️ Facture créée: ${invoiceId}`);

      return res.status(201).json({
        success: true,
        invoice: {
          id: invoiceId,
          driverId,
          amount: parseFloat(amount),
          description: invoice.description,
          startLocation,
          endLocation,
          status: invoice.status,
          paymentLink: invoice.payment_link,
          createdAt: Date.now(),
          expiresAt: expiresAt.getTime()
        }
      });

    } catch (error) {
      console.error('Erreur API facture:', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  if (req.method === 'GET') {
    // Récupérer une facture par ID
    try {
      const { invoiceId } = req.query;

      if (!invoiceId) {
        return res.status(400).json({ error: 'invoiceId requis' });
      }

      const { data: invoice, error } = await supabase
        .from('escrow_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) {
        console.error('Erreur récupération facture:', error);
        return res.status(404).json({ error: 'Facture non trouvée' });
      }

      // Vérifier si la facture a expiré
      if (new Date(invoice.expires_at) < new Date()) {
        return res.status(410).json({ error: 'Facture expirée' });
      }

      return res.status(200).json({
        success: true,
        invoice: {
          id: invoice.id,
          driverId: invoice.driver_id,
          clientId: invoice.client_id,
          clientName: invoice.client_name,
          clientPhone: invoice.client_phone,
          amount: invoice.amount,
          description: invoice.description,
          startLocation: invoice.start_location,
          endLocation: invoice.end_location,
          startCoordinates: invoice.start_latitude ? {
            latitude: invoice.start_latitude,
            longitude: invoice.start_longitude
          } : undefined,
          endCoordinates: invoice.end_latitude ? {
            latitude: invoice.end_latitude,
            longitude: invoice.end_longitude
          } : undefined,
          status: invoice.status,
          paymentLink: invoice.payment_link,
          notes: invoice.notes,
          createdAt: new Date(invoice.created_at).getTime(),
          expiresAt: new Date(invoice.expires_at).getTime()
        }
      });

    } catch (error) {
      console.error('Erreur API récupération facture:', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  if (req.method === 'PUT') {
    // Mettre à jour une facture
    try {
      const { invoiceId, updates } = req.body;

      if (!invoiceId) {
        return res.status(400).json({ error: 'invoiceId requis' });
      }

      const { data: invoice, error } = await supabase
        .from('escrow_invoices')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) {
        console.error('Erreur mise à jour facture:', error);
        return res.status(500).json({ error: 'Erreur mise à jour facture' });
      }

      return res.status(200).json({
        success: true,
        invoice
      });

    } catch (error) {
      console.error('Erreur API mise à jour facture:', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  if (req.method === 'DELETE') {
    // Supprimer une facture
    try {
      const { invoiceId } = req.body;

      if (!invoiceId) {
        return res.status(400).json({ error: 'invoiceId requis' });
      }

      const { error } = await supabase
        .from('escrow_invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) {
        console.error('Erreur suppression facture:', error);
        return res.status(500).json({ error: 'Erreur suppression facture' });
      }

      return res.status(200).json({
        success: true,
        message: 'Facture supprimée'
      });

    } catch (error) {
      console.error('Erreur API suppression facture:', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
